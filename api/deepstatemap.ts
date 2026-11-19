import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'node:fs';
import path from 'node:path';

type ZoneType = 'liberated' | 'liberated_recent' | 'gray' | 'occupied' | 'crimea_ordlo' | 'foreign_occupied';
type CacheEntry = { data: any; at: number };
let cache: CacheEntry | null = null;
let pending: Promise<any> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
const SOURCE = 'https://deepstatemap.live/api';

function normalizeColor(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(raw)) return '#' + raw.slice(1).split('').map((c) => c + c).join('');
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : '';
}
function colorToHsl(hex: string): { h: number; s: number; l: number } | null {
  if (!hex) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}
function classifyFeature(feature: any): ZoneType | null {
  const props = feature?.properties ?? {};
  const name = String(props.name ?? '').toLowerCase();
  const fill = normalizeColor(props.fill ?? props.originalFill);
  if (/крим|crimea|севастопол|ордло|донецк.{0,20}луганск/.test(name)) return 'crimea_ordlo';
  if (/придністров|трансністр|transnistria|абхаз|abkhazia|цхінвал|south ossetia|куриль|kuril|карелі|karelia|петсамо|petsamo|саатсе|естон|estonia|латві|latvia|окупован.{0,30}(держав|територ)/.test(name)) return 'foreign_occupied';
  const hsl = colorToHsl(fill);
  if (!hsl) return null;
  if (hsl.s < 0.20) return 'gray';
  if (hsl.h >= 80 && hsl.h <= 165) return 'liberated';
  if (hsl.h >= 175 && hsl.h <= 235) return 'liberated_recent';
  if (hsl.h >= 245 && hsl.h <= 315) return 'crimea_ordlo';
  if ((hsl.h >= 316 && hsl.h <= 349) || ((hsl.h <= 18 || hsl.h >= 350) && hsl.l > 0.58)) return 'foreign_occupied';
  if (hsl.h <= 18 || hsl.h >= 350) return 'occupied';
  return null;
}
function readFallback(): any | null {
  const candidates = [
    path.join(process.cwd(), 'public/data/deepstate/latest.geojson'),
    path.join(process.cwd(), 'public/data/deepstatemap_occupied_fallback.json'),
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data?.type === 'FeatureCollection' && Array.isArray(data.features) && data.features.length) return data;
    } catch (error) {
      console.warn('[DeepState] Invalid local fallback:', error instanceof Error ? error.message : error);
    }
  }
  return null;
}
async function fetchJson(url: string, timeoutMs: number): Promise<any> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'KRRIG-Map/1.0 (+https://t.me/krrig_alerts)' },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`DeepState HTTP ${response.status}`);
  return response.json();
}
async function loadLatest(): Promise<any> {
  const history = await fetchJson(`${SOURCE}/history/public`, 12000);
  if (!Array.isArray(history) || !history.length) throw new Error('DeepState history is empty');
  const valid = history.filter((item: any) => item && item.id && item.status !== false);
  valid.sort((a: any, b: any) => {
    const ta = Date.parse(a.createdAt || a.updatedAt || '') || Number(a.id);
    const tb = Date.parse(b.createdAt || b.updatedAt || '') || Number(b.id);
    return ta - tb;
  });
  const last = valid[valid.length - 1];
  if (!last?.id) throw new Error('DeepState latest update is missing');
  const raw = await fetchJson(`${SOURCE}/history/${encodeURIComponent(String(last.id))}/geojson`, 25000);
  if (!Array.isArray(raw?.features) || !raw.features.length) throw new Error('DeepState GeoJSON is empty');
  const snapshotDate = last.createdAt || last.updatedAt || new Date().toISOString();
  const features = raw.features.flatMap((feature: any, index: number) => {
    if (!feature?.geometry || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) return [];
    const zoneType = classifyFeature(feature);
    if (!zoneType) return [];
    const rawName = String(feature.properties?.name || '');
    const [name, nameEn] = rawName.split('///').map((part: string) => part.trim());
    return [{
      type: 'Feature',
      id: feature.id ?? `deepstate-${last.id}-${index}`,
      properties: {
        ...feature.properties,
        name: name || zoneType,
        nameEn: nameEn || name || zoneType,
        zoneType,
        originalFill: normalizeColor(feature.properties?.fill) || '#808080',
        originalStroke: feature.properties?.stroke || '#555555',
        source: 'DeepStateMap.live',
        historyId: last.id,
        snapshotDate,
        updateDescription: String(last.description || ''),
        updateDescriptionEn: String(last.descriptionEn || ''),
      },
      geometry: feature.geometry,
    }];
  });
  if (!features.length) throw new Error('No DeepState territory polygons could be classified from source fill colors');
  return {
    type: 'FeatureCollection',
    properties: {
      source: 'DeepStateMap.live',
      sourceUrl: 'https://deepstatemap.live/',
      historyId: last.id,
      updatedAt: last.updatedAt || snapshotDate,
      snapshotDate,
      datetime: last.datetime || '',
      description: last.description || '',
      descriptionEn: last.descriptionEn || '',
      featureCount: features.length,
      categories: Object.fromEntries(['liberated','liberated_recent','gray','occupied','crimea_ordlo','foreign_occupied'].map((key) => [key, features.filter((f: any) => f.properties.zoneType === key).length])),
    },
    updatedAt: last.updatedAt || snapshotDate,
    datetime: last.datetime || '',
    historyId: last.id,
    features,
    source: 'DeepStateMap.live',
    cached: false,
  };
}
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=180');
  res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ...cache.data, cached: true, cacheAgeMs: now - cache.at }));
    return;
  }
  try {
    if (!pending) pending = loadLatest().finally(() => { pending = null; });
    const data = await pending;
    cache = { data, at: Date.now() };
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    const fallback = readFallback();
    if (fallback) {
      res.statusCode = 200;
      res.end(JSON.stringify({ ...fallback, cached: true, stale: true, warning: 'DeepState upstream is temporarily unavailable' }));
      return;
    }
    const message = error instanceof Error ? error.message : 'DeepState request failed';
    console.error('[DeepState API]', message);
    res.statusCode = 502;
    res.end(JSON.stringify({ type: 'FeatureCollection', features: [], error: 'DeepState data temporarily unavailable' }));
  }
}
