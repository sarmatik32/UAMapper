export type DeepStateZoneType = 'liberated' | 'liberated_recent' | 'gray' | 'occupied' | 'crimea_ordlo' | 'foreign_occupied';

export const DEEPSTATE_ZONES: Record<DeepStateZoneType, { label: string; labelEn: string; color: string; aliases: string[] }> = {
  liberated: { label: 'Звільнена територія', labelEn: 'Liberated territory', color: '#58a65c', aliases: ['#58a65c', '#4caf50', '#66bb6a', '#5aa469', '#70ad47'] },
  liberated_recent: { label: 'Звільнена за останні 2 тижні', labelEn: 'Liberated in the last 2 weeks', color: '#2196d2', aliases: ['#2196d2', '#2196f3', '#03a9f4', '#29b6f6', '#00a8ff'] },
  gray: { label: 'Сіра зона', labelEn: 'Gray zone', color: '#bdbdbd', aliases: ['#bdbdbd', '#9e9e9e', '#a6a6a6'] },
  occupied: { label: 'Окупована територія', labelEn: 'Occupied territory', color: '#a52714', aliases: ['#a52714', '#c62828', '#b71c1c', '#d32f2f'] },
  crimea_ordlo: { label: 'Крим та ОРДЛО', labelEn: 'Crimea and ORDLO', color: '#6a1b9a', aliases: ['#6a1b9a', '#7b1fa2', '#512da8', '#4a148c'] },
  foreign_occupied: { label: 'Окуповані території інших держав', labelEn: 'Occupied territories of other states', color: '#e91e63', aliases: ['#e91e63', '#ec407a', '#f06292', '#ff69b4'] },
};

export const DEEPSTATE_ZONE_ORDER: DeepStateZoneType[] = ['liberated', 'liberated_recent', 'gray', 'occupied', 'crimea_ordlo', 'foreign_occupied'];

export function classifyDeepStateFeature(feature: any): DeepStateZoneType | null {
  const props = feature?.properties ?? {};
  const name = String(props.name ?? '').toLowerCase();
  const raw = String(props.fill ?? props.originalFill ?? '').trim().toLowerCase();
  const fill = /^#[0-9a-f]{3}$/.test(raw) ? '#' + raw.slice(1).split('').map((c) => c + c).join('') : raw;
  if (/^#[0-9a-f]{6}$/.test(fill)) {
    const r = parseInt(fill.slice(1, 3), 16) / 255;
    const g = parseInt(fill.slice(3, 5), 16) / 255;
    const b = parseInt(fill.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    let h = 0;
    if (delta) {
      if (max === r) h = 60 * (((g - b) / delta) % 6);
      else if (max === g) h = 60 * ((b - r) / delta + 2);
      else h = 60 * ((r - g) / delta + 4);
    }
    if (h < 0) h += 360;
    const l = (max + min) / 2;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    if (saturation < 0.20) return 'gray';
    if (h >= 80 && h <= 165) return 'liberated';
    if (h >= 175 && h <= 235) return 'liberated_recent';
    if (h >= 245 && h <= 315) return 'crimea_ordlo';
    if (h >= 316 && h <= 349) return 'foreign_occupied';
    if (h <= 18 || h >= 350) return 'occupied';
  }
  if (/крим|crimea|севастопол|ордло|донецк.{0,20}луганск/.test(name)) return 'crimea_ordlo';
  if (/придністров|трансністр|абхаз|цхінвал|куриль|карелі|петсамо|саатсе|естон|латві/.test(name)) return 'foreign_occupied';
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
