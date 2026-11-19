import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const BASE = 'https://deepstatemap.live/api';
const OUTPUT = join(process.cwd(), 'public/data/deepstate');
const ZONE_TYPES = ['liberated', 'liberated_recent', 'gray', 'occupied', 'crimea_ordlo', 'foreign_occupied'];
const LABELS = {
  liberated: ['Звільнена територія', 'Liberated territory'],
  liberated_recent: ['Звільнена за останні 2 тижні', 'Liberated in the last 2 weeks'],
  gray: ['Сіра зона', 'Gray zone'],
  occupied: ['Окупована територія', 'Occupied territory'],
  crimea_ordlo: ['Крим та ОРДЛО', 'Crimea and ORDLO'],
  foreign_occupied: ['Окуповані території інших держав', 'Occupied territories of other states'],
};
function normalizeColor(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(raw)) return '#' + raw.slice(1).split('').map((c) => c + c).join('');
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : '';
}
function toHsl(hex) {
  if (!hex) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  return { h, s: delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1)), l };
}
const EXACT_FILL_TYPES = {
  '#0f9d58': 'liberated',
  '#0288d1': 'liberated_recent',
  '#01579b': 'liberated_recent',
  '#bcaaa4': 'gray',
  '#bdbdbd': 'gray',
  '#a52714': 'occupied',
  '#880e4f': 'crimea_ordlo',
  '#ff5252': 'foreign_occupied',
};
function classify(feature) {
  const p = feature?.properties ?? {};
  const name = String(p.name ?? '').toLowerCase();
  const fill = normalizeColor(p.fill ?? p.originalFill);
  if (/крим|crimea|севастопол|ордло|донецк.{0,20}луганск|тузла|tuzla/.test(name)) return 'crimea_ordlo';
  if (EXACT_FILL_TYPES[fill]) return EXACT_FILL_TYPES[fill];
  if (/придністров|трансністр|transnistria|абхаз|abkhazia|цхінвал|south ossetia|куриль|kuril|карелі|karelia|петсамо|petsamo|саатсе|естон|estonia|латві|latvia/.test(name)) return 'foreign_occupied';
  const hsl = toHsl(normalizeColor(p.fill ?? p.originalFill));
  if (!hsl) return null;
  if (hsl.s < 0.20) return 'gray';
  if (hsl.h >= 80 && hsl.h <= 165) return 'liberated';
  if (hsl.h >= 175 && hsl.h <= 235) return 'liberated_recent';
  if (hsl.h >= 245 && hsl.h <= 315) return 'crimea_ordlo';
  if ((hsl.h >= 316 && hsl.h <= 349) || ((hsl.h <= 18 || hsl.h >= 350) && hsl.l > 0.58)) return 'foreign_occupied';
  if (hsl.h <= 18 || hsl.h >= 350) return 'occupied';
  return null;
}
const response = await fetch(`${BASE}/history/public`, { headers: { accept: 'application/json', 'user-agent': 'KRRIG-Alerts-DeepState-Sync/1.0' }, signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`DeepState history HTTP ${response.status}`);
const history = await response.json();
const last = Array.isArray(history) ? [...history].reverse().find((item) => item?.id && item.status !== false) : null;
if (!last) throw new Error('DeepState history does not contain a valid update');
const geoResponse = await fetch(`${BASE}/history/${last.id}/geojson`, { headers: { accept: 'application/json', 'user-agent': 'KRRIG-Alerts-DeepState-Sync/1.0' }, signal: AbortSignal.timeout(30000) });
if (!geoResponse.ok) throw new Error(`DeepState GeoJSON HTTP ${geoResponse.status}`);
const raw = await geoResponse.json();
if (!Array.isArray(raw?.features) || raw.features.length === 0) throw new Error('DeepState GeoJSON is empty; refusing to overwrite last snapshot');
const features = raw.features.flatMap((feature, index) => {
  if (!feature?.geometry || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) return [];
  const zoneType = classify(feature);
  if (!zoneType) return [];
  const [name, nameEn] = String(feature.properties?.name ?? '').split('///').map((part) => part.trim());
  return [{
    type: 'Feature',
    id: feature.id ?? `deepstate-${last.id}-${index}`,
    properties: {
      ...feature.properties,
      name: name || LABELS[zoneType][0],
      nameEn: nameEn || LABELS[zoneType][1],
      zoneType,
      originalFill: normalizeColor(feature.properties?.fill) || '#808080',
      originalStroke: feature.properties?.stroke || '#333333',
      source: 'DeepStateMap.live',
      historyId: last.id,
      snapshotDate: last.createdAt || last.updatedAt || new Date().toISOString(),
      updateDescription: last.description || '',
      updateDescriptionEn: last.descriptionEn || '',
    },
    geometry: feature.geometry,
  }];
});
if (!features.length) throw new Error('No classifiable DeepState territory polygons found; refusing to overwrite snapshot');
const snapshot = {
  type: 'FeatureCollection',
  properties: {
    source: 'DeepStateMap.live',
    sourceUrl: 'https://deepstatemap.live/',
    historyId: last.id,
    updatedAt: last.updatedAt || last.createdAt || new Date().toISOString(),
    snapshotDate: last.createdAt || last.updatedAt || new Date().toISOString(),
    datetime: last.datetime || '',
    description: last.description || '',
    descriptionEn: last.descriptionEn || '',
    featureCount: features.length,
    categories: Object.fromEntries(ZONE_TYPES.map((key) => [key, features.filter((f) => f.properties.zoneType === key).length])),
  },
  features,
};
await mkdir(OUTPUT, { recursive: true });
const date = new Date(snapshot.properties.snapshotDate).toISOString().slice(0, 10);
const latestPath = join(OUTPUT, 'latest.geojson');
let previous = null;
try { previous = JSON.parse(await readFile(latestPath, 'utf8')); } catch {}
if (previous?.properties?.historyId === last.id) {
  console.log(`No new DeepState history record (${last.id}); snapshot unchanged.`);
} else {
  const datedPath = join(OUTPUT, `${date}-${last.id}.geojson`);
  await writeFile(datedPath, JSON.stringify(snapshot));
  await writeFile(latestPath, JSON.stringify(snapshot));
  const indexPath = join(OUTPUT, 'history.json');
  let index = [];
  try { index = JSON.parse(await readFile(indexPath, 'utf8')); } catch {}
  index = Array.isArray(index) ? index : [];
  if (!index.some((entry) => String(entry.historyId) === String(last.id))) {
    index.push({ historyId: last.id, date, updatedAt: snapshot.properties.updatedAt, datetime: snapshot.properties.datetime, description: snapshot.properties.description, descriptionEn: snapshot.properties.descriptionEn, featureCount: features.length, file: `${date}-${last.id}.geojson`, categories: snapshot.properties.categories });
  }
  index.sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
  await writeFile(indexPath, JSON.stringify(index));
  console.log(`Saved DeepState snapshot ${last.id}: ${features.length} polygons, date ${date}`);
}
