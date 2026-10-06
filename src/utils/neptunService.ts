export interface NeptunVelocity {
  bearingDeg?: number;
  speedKmh?: number;
}

export interface NeptunTrailPoint {
  lat: number;
  lon: number;
  t?: string;
}

export interface NeptunThreat {
  id: string;
  type: 'uav' | 'fpv' | 'mig31k' | 'missile' | 'cruise_missile' | 'ballistic' | 'recon' | 'aviation' | string;
  title: string;
  region?: string;
  district?: string;
  locality?: string;
  lat: number;
  lon: number;
  heading?: number | null;
  confidenceLevel?: 'high' | 'medium' | 'low' | string;
  sourceCount?: number;
  count?: number;
  updatedAt?: string;
  confirmedAt?: string;
  explanationShort?: string;
  status?: string;
  velocity?: NeptunVelocity;
  uncertaintyKm?: number;
  positionQuality?: string;
  trail?: NeptunTrailPoint[];
  lifecycle?: string;
  displayConfidence?: string;
  destination?: boolean;
  presumptiveCourse?: boolean;
  advisory?: boolean;
}

export interface NeptunMessage {
  channel: string;
  text: string;
  date: string;
}

export interface NeptunThreatsResponse {
  serverTime?: string;
  threats: NeptunThreat[];
}

export interface NeptunMessagesResponse {
  messages: NeptunMessage[];
  updatedAt?: string;
}

const DIRECT_THREATS_URL = 'https://neptun.in.ua/api/v1/threats';
const DIRECT_MESSAGES_URL = 'https://neptun.in.ua/api/v1/messages';
const PROXY_THREATS_URL = '/api/neptun/api/v1/threats';
const PROXY_MESSAGES_URL = '/api/neptun/api/v1/messages';

/**
 * Fetch active threats from neptun.in.ua with automatic proxy fallback
 */
export async function fetchNeptunThreats(): Promise<NeptunThreat[]> {
  try {
    const res = await fetch(DIRECT_THREATS_URL, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data: NeptunThreatsResponse = await res.json();
      return Array.isArray(data.threats) ? data.threats : [];
    }
  } catch (err) {
    // If direct fetch fails (e.g. strict CSP or transient network), try local proxy
    try {
      const proxyRes = await fetch(PROXY_THREATS_URL, {
        headers: { Accept: 'application/json' },
      });
      if (proxyRes.ok) {
        const data: NeptunThreatsResponse = await proxyRes.json();
        return Array.isArray(data.threats) ? data.threats : [];
      }
    } catch (proxyErr) {
      console.warn('Proxy threats fetch also failed', proxyErr);
    }
  }
  return [];
}

/**
 * Fetch operational radar messages from neptun.in.ua with automatic proxy fallback
 */
export async function fetchNeptunMessages(): Promise<NeptunMessage[]> {
  try {
    const res = await fetch(DIRECT_MESSAGES_URL, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data: NeptunMessagesResponse = await res.json();
      return Array.isArray(data.messages) ? data.messages : [];
    }
  } catch (err) {
    try {
      const proxyRes = await fetch(PROXY_MESSAGES_URL, {
        headers: { Accept: 'application/json' },
      });
      if (proxyRes.ok) {
        const data: NeptunMessagesResponse = await proxyRes.json();
        return Array.isArray(data.messages) ? data.messages : [];
      }
    } catch (proxyErr) {
      console.warn('Proxy messages fetch also failed', proxyErr);
    }
  }
  return [];
}

/**
 * Helper to get cardinal direction from degrees
 */
export function getHeadingCompass(heading: number | undefined | null, lang: 'uk' | 'en' = 'uk'): string {
  if (heading === undefined || heading === null) return '';
  const directionsUk = ['Пн', 'Пн-Сх', 'Сх', 'Пд-Сх', 'Пд', 'Пд-Зх', 'Зх', 'Пн-Зх'];
  const directionsEn = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirs = lang === 'uk' ? directionsUk : directionsEn;
  const index = Math.round(((heading % 360) / 45)) % 8;
  return dirs[index];
}

/**
 * Helper to get readable threat category title and theme colors
 */
export function getThreatVisuals(type: string): {
  color: string;
  glowColor: string;
  iconType: 'drone' | 'plane' | 'missile' | 'radar' | 'crosshair';
  badgeBg: string;
  badgeBorder: string;
} {
  switch (type?.toLowerCase()) {
    case 'uav':
      return {
        color: '#ef4444', // Red
        glowColor: 'rgba(239, 68, 68, 0.45)',
        iconType: 'drone',
        badgeBg: 'bg-red-500/15',
        badgeBorder: 'border-red-500/30',
      };
    case 'fpv':
      return {
        color: '#f59e0b', // Amber
        glowColor: 'rgba(245, 158, 11, 0.45)',
        iconType: 'crosshair',
        badgeBg: 'bg-amber-500/15',
        badgeBorder: 'border-amber-500/30',
      };
    case 'mig31k':
      return {
        color: '#dc2626', // Crimson
        glowColor: 'rgba(220, 38, 38, 0.5)',
        iconType: 'plane',
        badgeBg: 'bg-red-600/20',
        badgeBorder: 'border-red-500/40',
      };
    case 'missile':
    case 'cruise_missile':
    case 'ballistic':
      return {
        color: '#e11d48', // Rose red
        glowColor: 'rgba(225, 29, 72, 0.5)',
        iconType: 'missile',
        badgeBg: 'bg-rose-500/20',
        badgeBorder: 'border-rose-500/40',
      };
    case 'recon':
      return {
        color: '#06b6d4', // Cyan
        glowColor: 'rgba(6, 182, 212, 0.45)',
        iconType: 'radar',
        badgeBg: 'bg-cyan-500/15',
        badgeBorder: 'border-cyan-500/30',
      };
    default:
      return {
        color: '#f97316', // Orange
        glowColor: 'rgba(249, 115, 22, 0.45)',
        iconType: 'crosshair',
        badgeBg: 'bg-orange-500/15',
        badgeBorder: 'border-orange-500/30',
      };
  }
}
