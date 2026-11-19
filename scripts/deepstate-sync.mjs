import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const BASE = 'https://deepstatemap.live/api';
const OUTPUT = join(process.cwd(), 'public/data/deepstate');
const COLORS = {
  liberated: ['#58a65c', '#4caf50', '#66bb6a', '#5aa469', '#70ad47'],
  liberated_recent: ['#2196d2', '#2196f3', '#03a9f4', '#29b6f6', '#00a8ff'],
  gray: ['#bdbdbd', '#9e9e9e', '#a6a6a6'],
  occupied: ['#a52714', '#c62828', '#b71c1c', '#d32f2f'],
  crimea_ordlo: ['#6a1b9a', '#7b1fa2', '#512da8', '#4a148c'],
  foreign_occupied: ['#e91e63', '#ec407a', '#f06292', '#ff69b4'],
};
const LABELS = {
  liberated: ['Звільнена територія', 'Liberated territory'],
  liberated_recent: ['Звільнена за останні 2 тижні', 'Liberated in the last 2 weeks'],
  gray: ['Сіра зона / потребує уточнення', 'Gray zone / needs clarification'],
  occupied: ['Окупована територія', 'Occupied territory'],
  crimea_ordlo: ['Крим та ОРДЛО', 'Crimea and ORDLO'],
  foreign_occupied: ['Окуповані території інших держав', 'Occupied territories of other states'],
};
function classify(feature) {
  const p = feature?.properties ?? {};
  const fill = String(p.fill ?? '').toLowerCase();
  const name = String(p.name ?? '').toLowerCase();
  for (const [type, colors] of Object.entries(COLORS)) if (colors.includes(fill)) return type;
  if (/крим|crimea|ордло|донецк.{0,12}луганск|севастопол/.test(name)) return 'crimea_ordlo';
  if (/придністров|трансністр|абхаз|цхінвал|окупован.{0,20}(держав|територ)/.test(name)) return 'foreign_occupied';
  if (/невідом|сіра зона|gray|unknown/.test(name)) return 'gray';
  if (/звільнен.{0,20}(2 тиж|14 д|recent)|liberated.{0,20}(2 week|14 day)/.test(name)) return 'liberated_recent';
  if (/звільнен|liberated|під контролем україни/.test(name)) return 'liberated';
  if (/окупован|occupied/.test(name)) return 'occupied';
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
      originalFill: feature.properties?.fill || COLORS[zoneType][0],
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
    categories: Object.fromEntries(Object.keys(COLORS).map((key) => [key, features.filter((f) => f.properties.zoneType === key).length])),
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
