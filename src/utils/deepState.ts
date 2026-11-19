export type DeepStateZoneType = 'liberated' | 'liberated_recent' | 'gray' | 'occupied' | 'crimea_ordlo' | 'foreign_occupied';

export const DEEPSTATE_ZONES: Record<DeepStateZoneType, { label: string; labelEn: string; color: string; aliases: string[] }> = {
  liberated: { label: 'Звільнена територія', labelEn: 'Liberated territory', color: '#58a65c', aliases: ['#58a65c', '#4caf50', '#66bb6a', '#5aa469', '#70ad47'] },
  liberated_recent: { label: 'Звільнена за останні 2 тижні', labelEn: 'Liberated in the last 2 weeks', color: '#2196d2', aliases: ['#2196d2', '#2196f3', '#03a9f4', '#29b6f6', '#00a8ff'] },
  gray: { label: 'Сіра зона / потребує уточнення', labelEn: 'Gray zone / needs clarification', color: '#bdbdbd', aliases: ['#bdbdbd', '#9e9e9e', '#a6a6a6'] },
  occupied: { label: 'Окупована територія', labelEn: 'Occupied territory', color: '#a52714', aliases: ['#a52714', '#c62828', '#b71c1c', '#d32f2f'] },
  crimea_ordlo: { label: 'Крим та ОРДЛО', labelEn: 'Crimea and ORDLO', color: '#6a1b9a', aliases: ['#6a1b9a', '#7b1fa2', '#512da8', '#4a148c'] },
  foreign_occupied: { label: 'Окуповані території інших держав', labelEn: 'Occupied territories of other states', color: '#e91e63', aliases: ['#e91e63', '#ec407a', '#f06292', '#ff69b4'] },
};

export const DEEPSTATE_ZONE_ORDER: DeepStateZoneType[] = ['liberated', 'liberated_recent', 'gray', 'occupied', 'crimea_ordlo', 'foreign_occupied'];

export function classifyDeepStateFeature(feature: any): DeepStateZoneType | null {
  const props = feature?.properties ?? {};
  const fill = String(props.fill ?? props.originalFill ?? '').trim().toLowerCase();
  const name = String(props.name ?? '').toLowerCase();
  const known = DEEPSTATE_ZONE_ORDER.find((key) => DEEPSTATE_ZONES[key].aliases.includes(fill));
  if (known) return known;
  if (/крим|crimea|ордло|донецк.{0,12}луганск|севастопол/.test(name)) return 'crimea_ordlo';
  if (/придністров|трансністр|абхаз|цхінвал|північн.{0,8}ірланд|окупован.{0,20}(держав|територ)/.test(name)) return 'foreign_occupied';
  if (/невідом|сіра зона|gray|unknown|needs clarification/.test(name)) return 'gray';
  if (/звільнен.{0,20}(2 тиж|14 д|recent)|liberated.{0,20}(2 week|14 day)/.test(name)) return 'liberated_recent';
  if (/звільнен|liberated|під контролем україни/.test(name)) return 'liberated';
  if (/окупован|occupied/.test(name)) return 'occupied';
  return null;
}

export function getDeepStateAreaKm2(feature: any): number | null {
  const geometry = feature?.geometry;
  if (!geometry) return null;
  const rings: number[][][][] = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  if (!rings.length) return null;
  const ringArea = (ring: number[][]) => {
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const [lon1, lat1] = ring[i];
      const [lon2, lat2] = ring[i + 1];
      const toRad = Math.PI / 180;
      sum += (lon2 - lon1) * toRad * (2 + Math.sin(lat1 * toRad) + Math.sin(lat2 * toRad));
    }
    return Math.abs(sum * 6371008.8 * 6371008.8 / 2);
  };
  let area = 0;
  for (const polygon of rings) {
    polygon.forEach((ring, index) => { area += (index === 0 ? 1 : -1) * ringArea(ring); });
  }
  const km2 = area / 1_000_000;
  return Number.isFinite(km2) && km2 >= 0 ? km2 : null;
}
