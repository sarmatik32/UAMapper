import { NeptunThreat, NeptunVelocity, NeptunTrailPoint } from './neptunService';

export interface KrThreat {
  id: string;
  type: string; // 'shahed' | 'geran4' | 'molniya' | 'fpv' | 'lancet' | 'rozvidka' | 'kab' | 'cruise' | string;
  lat: number;
  lng: number;
  bearing?: number;
  speed?: number;
  showDirection?: boolean;
  label?: string;
  displayLabel?: string;
  currentPlace?: string;
  previousPlace?: string;
  courseTarget?: string;
  detectedAt?: string | number;
  circling?: boolean;
  trail?: [number, number][] | { lat: number; lng: number }[];
  count?: number;
  radiusKm?: number;
  kind?: string;
  zoneColor?: string;
  attentionType?: string;
  attentionSig?: string;
  geometry?: any;
  source?: string;
  regionLabel?: string;
  updatedAt?: string | number;
  freshAt?: string | number;
  falseTarget?: boolean;
  opacity?: number;
  path?: [number, number][];
  popupNote?: string;
  popupRows?: string[];
  pathColor?: string;
  strategic?: boolean;
  droneKind?: string;
  popupFooter?: string;
}

export interface KrFeedItem {
  id: string;
  time: string;
  text: string;
  tone: 'danger' | 'calm' | 'warning' | string;
  source?: string;
}

export interface KrAttention {
  id?: string;
  geometry?: any;
  count?: number;
  attentionSig?: string;
}

export interface KrMonitoringResponse {
  threats: KrThreat[];
  attention?: KrAttention | null;
  feed: KrFeedItem[];
  telegram?: any;
  scope?: string;
  cached?: boolean;
  last_synced_at?: string;
}

/**
 * Maps KR Monitoring threat type to normalized Neptun type for unified rendering
 */
export function mapKrTypeToCategory(type: string): string {
  const norm = String(type || '').trim().toLowerCase();
  if (norm.includes('shahed') || norm.includes('geran') || norm.includes('lancet')) {
    return 'uav';
  }
  if (norm.includes('molniya') || norm.includes('fpv')) {
    return 'fpv';
  }
  if (norm.includes('rozvidka') || norm.includes('zala') || norm.includes('orlan') || norm.includes('supercam')) {
    return 'recon';
  }
  if (norm.includes('kab')) {
    return 'aviation';
  }
  if (norm.includes('cruise') || norm.includes('kr') || norm.includes('ракета')) {
    return 'cruise_missile';
  }
  if (norm.includes('ballistic') || norm.includes('балісти')) {
    return 'ballistic';
  }
  if (norm.includes('mig') || norm.includes('kinzhal')) {
    return 'mig31k';
  }
  return 'uav';
}

/**
 * Converts a KR Monitoring threat object to a NeptunThreat so it can be seamlessly rendered
 * by the existing high-performance LiveThreatsLayer or inspected in detail.
 */
export function krThreatToNeptunThreat(kr: KrThreat): NeptunThreat {
  const normType = mapKrTypeToCategory(kr.type);
  const title = kr.displayLabel || kr.label || (
    kr.type === 'shahed' ? 'Shahed / Герань-2' :
    kr.type === 'geran4' ? 'Реактивний шахед' :
    kr.type === 'molniya' ? 'Молнія (FPV-крило)' :
    kr.type === 'fpv' ? 'FPV-дрон' :
    kr.type === 'lancet' ? 'Ланцет' :
    kr.type === 'rozvidka' ? 'Розвідувальний БпЛА' :
    kr.type === 'kab' ? 'КАБ' :
    kr.type === 'cruise' ? 'Крилата ракета' :
    kr.type
  );

  const velocity: NeptunVelocity = {
    bearingDeg: typeof kr.bearing === 'number' ? kr.bearing : undefined,
    speedKmh: typeof kr.speed === 'number' ? kr.speed : undefined,
  };

  // Convert trail points if provided
  let trail: NeptunTrailPoint[] | undefined;
  if (Array.isArray(kr.trail) && kr.trail.length > 0) {
    trail = kr.trail.map((p) => {
      if (Array.isArray(p)) {
        return { lat: p[0], lon: p[1] };
      }
      return { lat: (p as any).lat, lon: (p as any).lng ?? (p as any).lon };
    });
  } else if (Array.isArray(kr.path) && kr.path.length > 0) {
    trail = kr.path.map(([lat, lon]) => ({ lat, lon }));
  }

  let courseExplanation = '';
  if (kr.currentPlace && kr.courseTarget) {
    courseExplanation = `${kr.currentPlace} → ${kr.courseTarget}`;
  } else if (kr.courseTarget) {
    courseExplanation = `Курс на ${kr.courseTarget}`;
  } else if (kr.currentPlace) {
    courseExplanation = `Район: ${kr.currentPlace}`;
  }

  return {
    id: `kr-${kr.id}`,
    type: normType,
    title,
    locality: kr.currentPlace || undefined,
    region: kr.regionLabel || 'Криворіжжя / Південь',
    lat: Number(kr.lat),
    lon: Number(kr.lng),
    heading: typeof kr.bearing === 'number' ? kr.bearing : null,
    confidenceLevel: 'high',
    count: kr.count || 1,
    updatedAt: typeof kr.updatedAt === 'number' ? new Date(kr.updatedAt).toISOString() : String(kr.updatedAt || ''),
    explanationShort: courseExplanation || kr.popupNote || undefined,
    status: kr.falseTarget ? 'Хибна ціль / РЕБ' : 'Активна',
    velocity,
    uncertaintyKm: kr.radiusKm,
    trail,
    destination: Boolean(kr.courseTarget),
    presumptiveCourse: Boolean(kr.showDirection),
  };
}

/**
 * Fetches active threats and intelligence feed from KR Monitoring
 */
export async function fetchKrMonitoringData(): Promise<KrMonitoringResponse> {
  const res = await fetch('/api/kr-threats', {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch KR Monitoring: ${res.status}`);
  }

  const data: KrMonitoringResponse = await res.json();
  return {
    threats: Array.isArray(data.threats) ? data.threats : [],
    attention: data.attention || null,
    feed: Array.isArray(data.feed) ? data.feed : [],
    telegram: data.telegram,
    scope: data.scope,
    cached: data.cached,
    last_synced_at: data.last_synced_at,
  };
}
