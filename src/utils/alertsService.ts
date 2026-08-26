import { AirAlert, AirAlertsResponse, AlertType } from '../types';

export const RAION_ALIASES: Record<string, string[]> = {
  'самарівський': ['новомосковський', 'самарський', 'самарівський'],
  'новомосковський': ['самарівський', 'новомосковський'],
  'камʼянський': ["кам'янський", 'кам’янський', 'камянський'],
  "кам'янський": ["кам'янський", 'кам’янський', 'камянський'],
  'дніпровський': ['дніпропетровський', 'дніпровський'],
  'корсуньшевченківський': ['корсунь-шевченківський'],
  'могилівподільський': ['могилів-подільський'],
  'червоноградський': ['шептицький', 'червоноградський'],
  'шептицький': ['шептицький', 'червоноградський'],
};

export function normalizeLocationName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\s\-_'’`ʼ\.]/g, '')
    .replace(/область|район|територіальнагромада|міськагромада|сільськагромада|селищнагромада|громада|автономнареспубліка|м\.|місто/gi, '')
    .trim();
}

export function matchAlertToFeature(alert: AirAlert, featureProps: any): boolean {
  if (!alert || !featureProps) return false;

  const featName = featureProps.name || featureProps.NAME_1 || featureProps.NAME_2 || featureProps.ADM1_UA || featureProps.ADM2_UA || '';
  const featOblast = featureProps.oblast || featureProps.ADM1_UA || '';
  const featType = featureProps.type || '';

  const normAlertTitle = normalizeLocationName(alert.location_title);
  const normFeatName = normalizeLocationName(featName);

  // If matching an oblast
  if (alert.location_type === 'oblast') {
    if (featType === 'oblast' || featType === 'city_oblast') {
      if (normAlertTitle === normFeatName || normFeatName.includes(normAlertTitle) || normAlertTitle.includes(normFeatName)) {
        return true;
      }
    }
    return false;
  }

  // If matching a raion
  if (alert.location_type === 'raion') {
    if (featType === 'raion') {
      // Check direct equality or containment
      if (normAlertTitle === normFeatName || normFeatName.includes(normAlertTitle) || normAlertTitle.includes(normFeatName)) {
        // If oblast information is available in both, check it
        if (alert.location_oblast && featOblast) {
          const normAlertObl = normalizeLocationName(alert.location_oblast);
          const normFeatObl = normalizeLocationName(featOblast);
          return normFeatObl.includes(normAlertObl) || normAlertObl.includes(normFeatObl);
        }
        return true;
      }

      // Check aliases (e.g. Samarivskyi / Novomoskovskyi)
      const aliases = RAION_ALIASES[normAlertTitle];
      if (aliases && aliases.some(a => normalizeLocationName(a) === normFeatName)) {
        return true;
      }
    }
    return false;
  }

  return false;
}

export function getAlertVisuals(alertType: AlertType, lang: 'uk' | 'en' = 'uk') {
  switch (alertType) {
    case 'artillery_shelling':
      return {
        title: lang === 'uk' ? 'Артилерійський обстріл' : 'Artillery Shelling Threat',
        color: '#f97316', // Orange
        fillColor: '#ea580c',
        glowColor: 'rgba(249, 115, 22, 0.6)',
        badgeBg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        iconName: 'ShieldAlert',
        icon: '💥',
      };
    case 'urban_fights':
      return {
        title: lang === 'uk' ? 'Вуличні бої' : 'Urban Combat',
        color: '#b91c1c', // Deep Crimson
        fillColor: '#991b1b',
        glowColor: 'rgba(185, 28, 28, 0.6)',
        badgeBg: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
        iconName: 'Crosshair',
        icon: '⚔️',
      };
    case 'chemical':
      return {
        title: lang === 'uk' ? 'Хімічна загроза' : 'Chemical Threat',
        color: '#a855f7', // Purple
        fillColor: '#9333ea',
        glowColor: 'rgba(168, 85, 247, 0.6)',
        badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        iconName: 'Biohazard',
        icon: '☣️',
      };
    case 'nuclear_threat':
      return {
        title: lang === 'uk' ? 'Радіаційна небезпека' : 'Radiation Threat',
        color: '#eab308', // Yellow
        fillColor: '#ca8a04',
        glowColor: 'rgba(234, 179, 8, 0.6)',
        badgeBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        iconName: 'Radiation',
        icon: '☢️',
      };
    case 'air_raid':
    default:
      return {
        title: lang === 'uk' ? 'Повітряна тривога' : 'Air Raid Alert',
        color: '#ef4444', // Vivid Neon Red
        fillColor: '#dc2626',
        glowColor: 'rgba(239, 68, 68, 0.65)',
        badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
        iconName: 'AlertTriangle',
        icon: '🚨',
      };
  }
}

export function formatAlertDuration(startedAtStr: string, lang: 'uk' | 'en' = 'uk'): string {
  if (!startedAtStr) return '';
  const started = new Date(startedAtStr).getTime();
  if (isNaN(started)) return '';

  const now = Date.now();
  const diffMs = Math.max(0, now - started);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    return lang === 'uk' ? `${days} д ${remainingHours} год` : `${days}d ${remainingHours}h`;
  }
  if (hours > 0) {
    return lang === 'uk' ? `${hours} год ${minutes} хв` : `${hours}h ${minutes}m`;
  }
  return lang === 'uk' ? `${minutes} хв` : `${minutes}m`;
}

export function formatTimeOnly(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export async function fetchActiveAlerts(customToken?: string): Promise<AirAlertsResponse> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (customToken) {
    headers['X-Alerts-Token'] = customToken;
  }

  const response = await fetch('/api/alerts', { headers });
  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `HTTP error ${response.status}`);
  }
  return await response.json();
}

/**
 * Play a synthesized sound alert using browser Web Audio API
 */
let audioCtx: AudioContext | null = null;

export function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // First beep
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second chime
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.18); // E6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.35); // A6
    gain2.gain.setValueAtTime(0.18, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('Could not play audio alert:', err);
  }
}
