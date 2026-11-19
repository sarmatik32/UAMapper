export type DeepStateZoneType = 'liberated' | 'liberated_recent' | 'gray' | 'occupied' | 'crimea_ordlo' | 'foreign_occupied';

export const DEEPSTATE_ZONES: Record<DeepStateZoneType, { label: string; labelEn: string; color: string; aliases: string[] }> = {
  liberated: { label: 'Звільнена територія', labelEn: 'Liberated territory', color: '#0f9d58', aliases: ['#0f9d58', '#0f9d58', '#0f9d58', '#0f9d58', '#0f9d58'] },
  liberated_recent: { label: 'Звільнена за останні 2 тижні', labelEn: 'Liberated in the last 2 weeks', color: '#0288d1', aliases: ['#0288d1', '#0288d1', '#0288d1', '#0288d1', '#0288d1'] },
  gray: { label: 'Сіра зона', labelEn: 'Gray zone', color: '#bcaaa4', aliases: ['#bcaaa4', '#bcaaa4', '#bcaaa4'] },
  occupied: { label: 'Окупована територія', labelEn: 'Occupied territory', color: '#a52714', aliases: ['#a52714', '#c62828', '#b71c1c', '#d32f2f'] },
  crimea_ordlo: { label: 'Крим та ОРДЛО', labelEn: 'Crimea and ORDLO', color: '#880e4f', aliases: ['#880e4f', '#880e4f', '#880e4f', '#880e4f'] },
  foreign_occupied: { label: 'Окуповані території інших держав', labelEn: 'Occupied territories of other states', color: '#ff5252', aliases: ['#ff5252', '#ff5252', '#ff5252', '#ff5252'] },
};

export const DEEPSTATE_ZONE_ORDER: DeepStateZoneType[] = ['liberated', 'liberated_recent', 'gray', 'occupied', 'crimea_ordlo', 'foreign_occupied'];

const EXACT_FILL_TYPES: Record<string, DeepStateZoneType> = {
  '#0f9d58': 'liberated',
  '#0288d1': 'liberated_recent',
  '#01579b': 'liberated_recent',
  '#bcaaa4': 'gray',
  '#bcaaa4': 'gray',
  '#a52714': 'occupied',
  '#880e4f': 'crimea_ordlo',
  '#ff5252': 'foreign_occupied',
};

export function classifyDeepStateFeature(feature: any): DeepStateZoneType | null {
  const props = feature?.properties ?? {};
  const name = String(props.name ?? '').toLowerCase();
  const raw = String(props.fill ?? props.originalFill ?? '').trim().toLowerCase();
  const fill = /^#[0-9a-f]{3}$/.test(raw) ? '#' + raw.slice(1).split('').map((c) => c + c).join('') : raw;
  if (EXACT_FILL_TYPES[fill]) return EXACT_FILL_TYPES[fill];
  if (/крим|crimea|севастопол|ордло|донецк.{0,20}луганск|тузла|tuzla/.test(name)) return 'crimea_ordlo';
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
    if ((h >= 316 && h <= 349) || ((h <= 18 || h >= 350) && l > 0.58)) return 'foreign_occupied';
    if (h <= 18 || h >= 350) return 'occupied';
  }
  if (/крим|crimea|севастопол|ордло|донецк.{0,20}луганск/.test(name)) return 'crimea_ordlo';
  if (/придністров|трансністр|transnistria|абхаз|abkhazia|цхінвал|south ossetia|куриль|kuril|карелі|karelia|петсамо|petsamo|саатсе|естон|estonia|латві|latvia/.test(name)) return 'foreign_occupied';
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
