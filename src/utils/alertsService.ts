import { AirAlert, AirAlertsResponse, AlertType } from '../types';

export const RAION_ALIASES: Record<string, string[]> = {
  'самарівський': ['новомосковський', 'самарський', 'самарівський'],
  'новомосковський': ['самарівський', 'новомосковський'],
  'камʼянський': ["кам'янський", 'кам’янський', 'камянський'],
  "кам'янський": ["кам'янський", 'кам’янський', 'камянський'],
  'дніпровський': ['дніпропетровський', 'дніпровський'],
  'криворізький': ['криворізький', 'кривийріг', 'кривий ріг'],
  'кривийріг': ['криворізький', 'кривийріг', 'кривий ріг'],
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
    .replace(/область|район|територіальнагромада|міськагромада|сільськагромада|селищнагромада|громада|міськатериторіальнагромада|автономнареспубліка|м\.|місто/gi, '')
    .trim();
}

export function cleanAlertLocationTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^м\.\s*/i, '')
    .replace(/^місто\s+/i, '')
    .replace(/^смт\s+/i, '')
    .replace(/^с\.\s*/i, '')
    .replace(/\s+(міська|селищна|сільська)?\s*територіальна\s+громада/gi, '')
    .replace(/\s+територіальна\s+громада/gi, '')
    .replace(/\s+громада/gi, '')
    .replace(/\s+міська\s+рада/gi, '')
    .replace(/\s+район/gi, '')
    .replace(/\s+область/gi, '')
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

  // If matching a raion or city/hromada
  if (alert.location_type === 'raion' || alert.location_type === 'city' || alert.location_type === 'hromada') {
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

      // Check aliases (e.g. Kryvyi Rih / Kryvorizkyi, Samarivskyi / Novomoskovskyi)
      const aliases = RAION_ALIASES[normAlertTitle];
      if (aliases && aliases.some(a => normalizeLocationName(a) === normFeatName)) {
        return true;
      }
    }
    return false;
  }

  return false;
}

export interface AlertVisuals {
  title: string;
  color: string;
  fillColor: string;
  glowColor: string;
  badgeBg: string;
  iconName: string;
  icon: string;
  level: 'red' | 'yellow' | 'orange' | 'maroon' | 'purple' | 'lime' | 'cyan' | string;
  levelTitle: string;
  threatType?: string;
  sourceMessage?: string;
}

export function getAlertVisuals(
  alertOrType: AirAlert | AlertType | string,
  lang: 'uk' | 'en' = 'uk'
): AlertVisuals {
  const isUa = lang === 'uk';
  const alertObj: AirAlert | null =
    typeof alertOrType === 'object' && alertOrType !== null ? (alertOrType as AirAlert) : null;
  const alertTypeStr: string = alertObj ? alertObj.alert_type : (alertOrType as string) || 'air_raid';
  const alertLevel = alertObj?.alert_level?.toLowerCase();
  const threats = alertObj?.threats || [];

  // 1. Check for special alert_types: artillery, urban fights, chemical, nuclear
  if (alertTypeStr === 'artillery_shelling') {
    return {
      title: isUa ? 'Артилерійський обстріл' : 'Artillery Shelling Threat',
      color: '#f97316', // Orange
      fillColor: '#ea580c',
      glowColor: 'rgba(249, 115, 22, 0.7)',
      badgeBg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      iconName: 'ShieldAlert',
      icon: '💥',
      level: 'orange',
      levelTitle: isUa ? 'Артилерія' : 'Artillery',
      threatType: 'artillery_shelling',
      sourceMessage: alertObj?.notes || undefined,
    };
  }

  if (alertTypeStr === 'urban_fights') {
    return {
      title: isUa ? 'Вуличні бої' : 'Urban Combat',
      color: '#b91c1c', // Deep Crimson / Maroon
      fillColor: '#991b1b',
      glowColor: 'rgba(185, 28, 28, 0.7)',
      badgeBg: 'bg-rose-950/40 text-rose-300 border-rose-700/40',
      iconName: 'Crosshair',
      icon: '⚔️',
      level: 'maroon',
      levelTitle: isUa ? 'Вуличні бої' : 'Urban Fights',
      threatType: 'urban_fights',
      sourceMessage: alertObj?.notes || undefined,
    };
  }

  if (alertTypeStr === 'chemical') {
    return {
      title: isUa ? 'Хімічна загроза' : 'Chemical Threat',
      color: '#a855f7', // Purple
      fillColor: '#9333ea',
      glowColor: 'rgba(168, 85, 247, 0.7)',
      badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      iconName: 'Biohazard',
      icon: '☣️',
      level: 'purple',
      levelTitle: isUa ? 'Хімічна небезпека' : 'Chemical Threat',
      threatType: 'chemical',
      sourceMessage: alertObj?.notes || undefined,
    };
  }

  if (alertTypeStr === 'nuclear' || alertTypeStr === 'nuclear_threat') {
    return {
      title: isUa ? 'Радіаційна небезпека' : 'Radiation Threat',
      color: '#84cc16', // Warning Lime
      fillColor: '#65a30d',
      glowColor: 'rgba(132, 204, 22, 0.7)',
      badgeBg: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
      iconName: 'Radiation',
      icon: '☢️',
      level: 'lime',
      levelTitle: isUa ? 'Радіаційна загроза' : 'Radiation Threat',
      threatType: 'nuclear',
      sourceMessage: alertObj?.notes || undefined,
    };
  }

  // 2. Yellow Level: Drone / UAV threat (Жовтий рівень - Дронова небезпека)
  // Check if API specifies alert_level === 'yellow' or threats has yellow / drones
  const isYellowLevel =
    alertLevel === 'yellow' ||
    alertTypeStr === 'yellow' ||
    alertTypeStr === 'drones' ||
    (!alertLevel && threats.some((t) => t.level === 'yellow' || t.threat_type === 'drones'));

  if (isYellowLevel) {
    const droneThreat = threats.find((t) => t.threat_type === 'drones' || t.level === 'yellow');
    const sourceMsg = droneThreat?.source_message || alertObj?.notes;
    return {
      title: sourceMsg || (isUa ? 'Дронова загроза (Жовтий рівень)' : 'Drone Threat (Yellow Level)'),
      color: '#f59e0b', // Amber-500 / Yellow alert
      fillColor: '#d97706', // Rich amber fill
      glowColor: 'rgba(245, 158, 11, 0.75)',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      iconName: 'AlertTriangle',
      icon: '🛸',
      level: 'yellow',
      levelTitle: isUa ? 'Жовтий рівень' : 'Yellow Level',
      threatType: 'drones',
      sourceMessage: sourceMsg || undefined,
    };
  }

  // 3. Red Level: Missile / Ballistic / Aviation / General Air Raid (Червоний рівень)
  const redThreat = threats.find((t) => t.level === 'red') || threats[0];
  const threatType = redThreat?.threat_type || '';
  const sourceMsg = redThreat?.source_message || alertObj?.notes;

  if (threatType === 'ballistic_missiles') {
    return {
      title: sourceMsg || (isUa ? 'Балістична загроза (Червоний рівень)' : 'Ballistic Threat (Red Level)'),
      color: '#ef4444',
      fillColor: '#dc2626',
      glowColor: 'rgba(239, 68, 68, 0.75)',
      badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
      iconName: 'AlertTriangle',
      icon: '🚀',
      level: 'red',
      levelTitle: isUa ? 'Червоний рівень' : 'Red Level',
      threatType: 'ballistic_missiles',
      sourceMessage: sourceMsg || undefined,
    };
  }

  if (threatType === 'cruise_missiles') {
    return {
      title: sourceMsg || (isUa ? 'Крилаті ракети (Червоний рівень)' : 'Cruise Missiles (Red Level)'),
      color: '#ef4444',
      fillColor: '#dc2626',
      glowColor: 'rgba(239, 68, 68, 0.75)',
      badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
      iconName: 'AlertTriangle',
      icon: '🚀',
      level: 'red',
      levelTitle: isUa ? 'Червоний рівень' : 'Red Level',
      threatType: 'cruise_missiles',
      sourceMessage: sourceMsg || undefined,
    };
  }

  if (threatType === 'unspecified_missiles') {
    return {
      title: sourceMsg || (isUa ? 'Ракетна небезпека (Червоний рівень)' : 'Missile Threat (Red Level)'),
      color: '#ef4444',
      fillColor: '#dc2626',
      glowColor: 'rgba(239, 68, 68, 0.75)',
      badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
      iconName: 'AlertTriangle',
      icon: '🚀',
      level: 'red',
      levelTitle: isUa ? 'Червоний рівень' : 'Red Level',
      threatType: 'unspecified_missiles',
      sourceMessage: sourceMsg || undefined,
    };
  }

  if (threatType === 'guided_aerial_bombs') {
    return {
      title: sourceMsg || (isUa ? 'Загроза КАБ (Червоний рівень)' : 'Guided Aerial Bombs (Red Level)'),
      color: '#f43f5e',
      fillColor: '#e11d48',
      glowColor: 'rgba(244, 63, 94, 0.75)',
      badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      iconName: 'AlertTriangle',
      icon: '💣',
      level: 'red',
      levelTitle: isUa ? 'Червоний рівень' : 'Red Level',
      threatType: 'guided_aerial_bombs',
      sourceMessage: sourceMsg || undefined,
    };
  }

  if (threatType === 'mig31k_departure') {
    return {
      title: sourceMsg || (isUa ? 'Зліт МіГ-31К (Червоний рівень)' : 'MiG-31K Launch (Red Level)'),
      color: '#ef4444',
      fillColor: '#dc2626',
      glowColor: 'rgba(239, 68, 68, 0.75)',
      badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
      iconName: 'AlertTriangle',
      icon: '✈️',
      level: 'red',
      levelTitle: isUa ? 'Червоний рівень' : 'Red Level',
      threatType: 'mig31k_departure',
      sourceMessage: sourceMsg || undefined,
    };
  }

  if (threatType === 'strategic_aircraft_activity') {
    return {
      title: sourceMsg || (isUa ? 'Стратегічна авіація (Червоний рівень)' : 'Strategic Aviation (Red Level)'),
      color: '#ef4444',
      fillColor: '#dc2626',
      glowColor: 'rgba(239, 68, 68, 0.75)',
      badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
      iconName: 'AlertTriangle',
      icon: '✈️',
      level: 'red',
      levelTitle: isUa ? 'Червоний рівень' : 'Red Level',
      threatType: 'strategic_aircraft_activity',
      sourceMessage: sourceMsg || undefined,
    };
  }

  if (threatType === 'tactic_aircraft_activity') {
    return {
      title: sourceMsg || (isUa ? 'Тактична авіація (Червоний рівень)' : 'Tactical Aviation (Red Level)'),
      color: '#f97316',
      fillColor: '#ea580c',
      glowColor: 'rgba(249, 115, 22, 0.75)',
      badgeBg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      iconName: 'AlertTriangle',
      icon: '🛩️',
      level: 'red',
      levelTitle: isUa ? 'Червоний рівень' : 'Red Level',
      threatType: 'tactic_aircraft_activity',
      sourceMessage: sourceMsg || undefined,
    };
  }

  if (threatType === 'air_defense') {
    return {
      title: sourceMsg || (isUa ? 'Робота ППО' : 'Air Defense Active'),
      color: '#06b6d4',
      fillColor: '#0891b2',
      glowColor: 'rgba(6, 182, 212, 0.75)',
      badgeBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      iconName: 'ShieldAlert',
      icon: '🛡️',
      level: 'cyan',
      levelTitle: isUa ? 'ППО' : 'Air Defense',
      threatType: 'air_defense',
      sourceMessage: sourceMsg || undefined,
    };
  }

  // Default Red Air Raid Alert
  return {
    title: sourceMsg || (isUa ? 'Повітряна тривога (Червоний рівень)' : 'Air Raid Alert (Red Level)'),
    color: '#ef4444', // Vivid Neon Red
    fillColor: '#dc2626',
    glowColor: 'rgba(239, 68, 68, 0.65)',
    badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
    iconName: 'AlertTriangle',
    icon: '🚨',
    level: 'red',
    levelTitle: isUa ? 'Червоний рівень' : 'Red Level',
    threatType: 'air_raid',
    sourceMessage: sourceMsg || undefined,
  };
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

export const DEFAULT_ALERTS_TOKEN = '3a0222c65a8814cbf1c92f1ce831c62e24d51f63ab2203';

export async function fetchActiveAlerts(customToken?: string, customApiUrl?: string): Promise<AirAlertsResponse> {
  const token = customToken || localStorage.getItem('uamapper_alerts_token') || DEFAULT_ALERTS_TOKEN;
  const endpoint = customApiUrl || localStorage.getItem('uamapper_alerts_custom_url') || '/api/alerts';

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['X-Alerts-Token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 1. Try configured endpoint (default: /api/alerts)
  try {
    const url = endpoint.includes('?')
      ? `${endpoint}&t=${Date.now()}`
      : `${endpoint}?t=${Date.now()}`;

    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data && Array.isArray(data.alerts)) {
          try {
            localStorage.setItem('uamapper_last_cached_alerts', JSON.stringify(data));
          } catch {
            // storage quota
          }
          return data;
        }
      }
      // If server returned index.html (SPA 404 rewrite)
      const text = await response.text();
      if (text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (data && Array.isArray(data.alerts)) {
          return data;
        }
      }
    }
  } catch (err) {
    // Silently continue to fallback strategy
  }

  // 2. If /api/alerts failed or returned non-JSON, try direct alerts.in.ua query if token is present
  if (token) {
    try {
      const directUrl = `https://api.alerts.in.ua/v1/alerts/active.json?token=${encodeURIComponent(token)}`;
      const directResp = await fetch(directUrl, { headers: { Accept: 'application/json' } });
      if (directResp.ok) {
        const data = await directResp.json();
        if (data && Array.isArray(data.alerts)) {
          try {
            localStorage.setItem('uamapper_last_cached_alerts', JSON.stringify(data));
          } catch {
            // storage quota
          }
          return data;
        }
      }
    } catch {
      // Direct browser fetch blocked by CORS or network
    }
  }

  // 3. Fallback to localStorage cache if previously saved
  try {
    const cached = localStorage.getItem('uamapper_last_cached_alerts');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.alerts)) {
        return {
          ...parsed,
          cached: true,
        };
      }
    }
  } catch {
    // Ignore JSON parse error
  }

  // 4. Return safe empty alerts structure
  return {
    alerts: [],
    last_updated_at: new Date().toISOString(),
    disclaimer: 'Alerts service currently offline or updating',
  };
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
