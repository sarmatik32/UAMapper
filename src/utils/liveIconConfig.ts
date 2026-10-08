import { IconPreset } from '../types';
import { getIconSvgContent } from '../components/IconLibrary';

export interface LiveThreatCategory {
  id: string;
  labelUa: string;
  labelEn: string;
  fallbackIcon: string;
  defaultColor: string;
  defaultBorderColor: string;
}

export const LIVE_THREAT_CATEGORIES: LiveThreatCategory[] = [
  { id: 'uav', labelUa: 'БпЛА (Шахед / Герань)', labelEn: 'UAV (Shahed / Geran)', fallbackIcon: 'uav-kamikaze', defaultColor: '#ef4444', defaultBorderColor: '#ffffff' },
  { id: 'fpv', labelUa: 'FPV-дрон', labelEn: 'FPV Drone', fallbackIcon: 'drone', defaultColor: '#f59e0b', defaultBorderColor: '#ffffff' },
  { id: 'mig31k', labelUa: 'МіГ-31К (Кинджал)', labelEn: 'MiG-31K (Kinzhal)', fallbackIcon: 'plane', defaultColor: '#dc2626', defaultBorderColor: '#ffffff' },
  { id: 'missile', labelUa: 'Ракета (Загальна)', labelEn: 'Missile (General)', fallbackIcon: 'missile-cruise', defaultColor: '#e11d48', defaultBorderColor: '#ffffff' },
  { id: 'cruise_missile', labelUa: 'Крилата ракета (Х-101 / Калібр)', labelEn: 'Cruise Missile', fallbackIcon: 'missile-cruise', defaultColor: '#e11d48', defaultBorderColor: '#ffffff' },
  { id: 'ballistic', labelUa: 'Балістика (Іскандер-М / KN-23)', labelEn: 'Ballistic Missile', fallbackIcon: 'missile-ballistic', defaultColor: '#b91c1c', defaultBorderColor: '#ffffff' },
  { id: 'recon', labelUa: 'Розвідник (Орлан / ZALA / Supercam)', labelEn: 'Recon UAV (Orlan/ZALA)', fallbackIcon: 'uav-recon', defaultColor: '#06b6d4', defaultBorderColor: '#ffffff' },
  { id: 'aviation', labelUa: 'Тактична авіація (Су-34 / Су-35)', labelEn: 'Tactical Aviation', fallbackIcon: 'plane', defaultColor: '#f97316', defaultBorderColor: '#ffffff' },
  { id: 'other', labelUa: 'Невідома ціль / інше', labelEn: 'Unknown Target / Other', fallbackIcon: 'target', defaultColor: '#f97316', defaultBorderColor: '#ffffff' },
];

export const DEFAULT_LIVE_ICON_MAPPING: Record<string, string> = {
  uav: 'uav-kamikaze',
  fpv: 'drone',
  mig31k: 'plane',
  missile: 'missile-cruise',
  cruise_missile: 'missile-cruise',
  ballistic: 'missile-ballistic',
  recon: 'uav-recon',
  aviation: 'plane',
  other: 'target',
};

export const LEGACY_ICON_URL_MAP: Record<string, string> = {
  '/img/Шахед.png': '/img/shahed.png',
  '/img/ШАХЕД.png': '/img/shahed_hd.png',
  '/img/Орлан.png': '/img/orlan.png',
  '/img/Молнія.png': '/img/molniya.png',
  '/img/РЕАКТИВ.png': '/img/reactiv.png',
  '/img/Турбо.png': '/img/turbo.png',
  '/img/ФП1.png': '/img/fp1.png',
  '/img/ББ.png': '/img/bb.png',
  '/img/невідомо.png': '/img/unknown.png',
};

export function normalizeLegacyIconUrl(url: string): string {
  if (!url) return url;
  if (LEGACY_ICON_URL_MAP[url]) return LEGACY_ICON_URL_MAP[url];
  try {
    const decoded = decodeURIComponent(url);
    if (LEGACY_ICON_URL_MAP[decoded]) return LEGACY_ICON_URL_MAP[decoded];
  } catch {}
  return url;
}

export const DEFAULT_UPLOADED_ICONS = [
  { id: 'custom_shahed', name: 'Шахед (Зображення)', dataUrl: '/img/shahed.png' },
  { id: 'custom_shahed_hd', name: 'ШАХЕД HD (Зображення)', dataUrl: '/img/shahed_hd.png' },
  { id: 'custom_orlan', name: 'Орлан (Зображення)', dataUrl: '/img/orlan.png' },
  { id: 'custom_molniya', name: 'Молнія (Зображення)', dataUrl: '/img/molniya.png' },
  { id: 'custom_reactiv', name: 'РЕАКТИВ (Зображення)', dataUrl: '/img/reactiv.png' },
  { id: 'custom_turbo', name: 'Турбо (Зображення)', dataUrl: '/img/turbo.png' },
  { id: 'custom_fp1', name: 'ФП1 (Зображення)', dataUrl: '/img/fp1.png' },
  { id: 'custom_bb', name: 'ББ (Зображення)', dataUrl: '/img/bb.png' },
  { id: 'custom_unknown', name: 'Невідомо (Зображення)', dataUrl: '/img/unknown.png' },
];

export function normalizeThreatType(rawType: string): string {
  const norm = String(rawType || '').trim().toLowerCase();
  if (norm === 'cruise_missile' || norm === 'missile_cruise') return 'cruise_missile';
  if (norm === 'ballistic' || norm === 'ballistic_missile') return 'ballistic';
  if (norm === 'uav' || norm === 'shahed' || norm === 'geran') return 'uav';
  if (norm === 'fpv') return 'fpv';
  if (norm === 'mig31k' || norm === 'mig-31k' || norm === 'mig_31k') return 'mig31k';
  if (norm === 'recon') return 'recon';
  if (norm === 'aviation' || norm === 'plane' || norm === 'aircraft') return 'aviation';
  if (norm === 'missile') return 'missile';
  return norm || 'other';
}

export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildDropShadowOutline(borderColor: string, lineWidth: number): string {
  if (!borderColor || borderColor === 'transparent' || borderColor === 'none' || lineWidth <= 0) {
    return '';
  }
  const r = Math.max(1, Math.min(8, Math.round(lineWidth)));
  const offsets = [
    [-r, 0], [r, 0], [0, -r], [0, r],
    [-r, -r], [-r, r], [r, -r], [r, r],
  ];
  return offsets.map(([x, y]) => `drop-shadow(${x}px ${y}px 0 ${borderColor})`).join(' ');
}

export function renderLiveIconInnerHtml(
  iconId: string,
  preset: Partial<IconPreset>,
  customLibrary: { id: string; name: string; dataUrl: string }[],
  fallbackColor: string
): string {
  const custom = customLibrary.find((item) => item.id === iconId);
  const color = preset.color && preset.color !== 'transparent' && preset.color !== 'none' ? preset.color : '';
  const borderColor = preset.borderColor || '#ffffff';
  const lineWidth = Number.isFinite(Number(preset.lineWidth)) && Number(preset.lineWidth) >= 0
    ? Number(preset.lineWidth)
    : 1.5;
  const outlineFilter = buildDropShadowOutline(borderColor, lineWidth);
  const filterStyle = outlineFilter ? `filter: ${outlineFilter};` : '';

  if (custom) {
    const safeUrl = escapeAttr(custom.dataUrl);
    // If the user picked a specific custom color (other than pure white/transparent), tint using mask
    if (color && color.toLowerCase() !== '#ffffff') {
      return `
        <div aria-hidden="true" style="
          width: 100%;
          height: 100%;
          background-color: ${color};
          -webkit-mask-image: url('${safeUrl}');
          mask-image: url('${safeUrl}');
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
          ${filterStyle}
        "></div>
      `;
    }
    // Otherwise render pure raster/SVG image as uploaded without color alteration
    return `
      <img src="${safeUrl}" alt="" draggable="false" style="
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        ${filterStyle}
      " />
    `;
  }

  // Built-in vector icons
  const fillColor = color || fallbackColor || '#ffffff';
  return getIconSvgContent(iconId, fillColor, borderColor);
}

export function hexToRgba(hex: string, alpha: number = 0.2): string {
  if (!hex || typeof hex !== 'string') return `rgba(239, 68, 68, ${alpha})`;
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) return `rgba(239, 68, 68, ${alpha})`;
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function renderLiveZoneHtml(
  hasZone?: boolean,
  zoneSize?: number,
  zoneColor?: string,
  zoneBorderStyle: 'dashed' | 'solid' | 'dotted' = 'dashed',
  zoneOpacity: number = 0.18
): string {
  if (!hasZone) return '';
  const size = Math.max(24, Math.min(320, zoneSize || 70));
  const color = zoneColor || '#ef4444';
  const border = zoneBorderStyle === 'solid' ? 'solid' : zoneBorderStyle === 'dotted' ? 'dotted' : 'dashed';
  const bg = hexToRgba(color, zoneOpacity);

  return `
    <div class="pointer-events-none absolute rounded-full" style="
      width: ${size}px;
      height: ${size}px;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      border: 2px ${border} ${color};
      background-color: ${bg};
      z-index: 1;
      filter: drop-shadow(0 0 4px ${hexToRgba(color, 0.35)});
    "></div>
  `;
}

export function renderDirectionLineHtml(
  heading: number | null,
  lineType: 'solid' | 'dashed' | 'dotted' | 'arrow' | 'gradient' | 'none',
  length: number,
  width: number,
  color: string,
  iconSize: number,
  offset: number = 0
): string {
  if (heading === null || lineType === 'none' || length <= 0) return '';

  const safeColor = color || '#ef4444';
  const safeLength = Math.max(6, Math.min(120, length));
  const safeWidth = Math.max(1.5, Math.min(8, width));
  // Seamless start directly at the edge of the icon body (never floating next to it / "не поряд")
  const startDistance = Math.max(1, Math.round(iconSize * 0.28) + (offset || 0));
  const yStart = -startDistance;
  const yEnd = -(startDistance + safeLength);

  let innerElements = '';

  if (lineType === 'arrow') {
    const arrowHeadLen = Math.max(7, Math.min(16, safeWidth * 2.8));
    const arrowHeadHalfWidth = Math.max(4.5, Math.min(11, safeWidth * 1.7));
    const shaftEnd = yEnd + arrowHeadLen * 0.8;

    innerElements = `
      <line x1="0" y1="${yStart}" x2="0" y2="${shaftEnd}" stroke="${safeColor}" stroke-width="${safeWidth}" stroke-linecap="round" />
      <polygon points="0,${yEnd} ${-arrowHeadHalfWidth},${yEnd + arrowHeadLen} ${arrowHeadHalfWidth},${yEnd + arrowHeadLen}" fill="${safeColor}" />
    `;
  } else if (lineType === 'dashed') {
    innerElements = `
      <line x1="0" y1="${yStart}" x2="0" y2="${yEnd}" stroke="${safeColor}" stroke-width="${safeWidth}" stroke-dasharray="4, 3" stroke-linecap="round" />
    `;
  } else if (lineType === 'dotted') {
    innerElements = `
      <line x1="0" y1="${yStart}" x2="0" y2="${yEnd}" stroke="${safeColor}" stroke-width="${safeWidth}" stroke-dasharray="1.5, ${Math.max(3, safeWidth * 1.8)}" stroke-linecap="round" />
    `;
  } else if (lineType === 'gradient') {
    const gradId = `live_grad_${Math.round(startDistance)}_${Math.round(safeLength)}_${safeColor.replace('#', '')}`;
    innerElements = `
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="${yStart}" x2="0" y2="${yEnd}" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${safeColor}" stop-opacity="1" />
          <stop offset="70%" stop-color="${safeColor}" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.95" />
        </linearGradient>
      </defs>
      <line x1="0" y1="${yStart}" x2="0" y2="${yEnd}" stroke="url(#${gradId})" stroke-width="${safeWidth}" stroke-linecap="round" />
    `;
  } else {
    // Solid line
    innerElements = `
      <line x1="0" y1="${yStart}" x2="0" y2="${yEnd}" stroke="${safeColor}" stroke-width="${safeWidth}" stroke-linecap="round" />
    `;
  }

  return `
    <svg class="pointer-events-none absolute live-direction-line" style="
      left: 50%;
      top: 50%;
      width: 0;
      height: 0;
      overflow: visible;
      z-index: 15;
      filter: drop-shadow(0 0 2px ${safeColor});
    ">
      <g transform="rotate(${heading})">
        ${innerElements}
      </g>
    </svg>
  `;
}

/**
 * Calculates a dynamic CSS style for threat labels so they NEVER overlap the direction line.
 * If direction line points towards a quadrant, the label is placed in the OPPOSITE direction.
 */
export function calculateNonOverlappingLabelStyle(
  heading: number | null,
  preference: 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'none' = 'auto',
  iconSize: number = 36
): { style: string; visible: boolean } {
  if (preference === 'none') {
    return { style: 'display: none;', visible: false };
  }

  const clearance = Math.max(5, Math.round(iconSize * 0.15));

  if (preference === 'top') {
    return {
      style: `position:absolute; bottom:calc(100% + ${clearance}px); left:50%; transform:translateX(-50%); pointer-events:none; z-index:30;`,
      visible: true,
    };
  }
  if (preference === 'bottom') {
    return {
      style: `position:absolute; top:calc(100% + ${clearance}px); left:50%; transform:translateX(-50%); pointer-events:none; z-index:30;`,
      visible: true,
    };
  }
  if (preference === 'left') {
    return {
      style: `position:absolute; right:calc(100% + ${clearance}px); top:50%; transform:translateY(-50%); pointer-events:none; z-index:30;`,
      visible: true,
    };
  }
  if (preference === 'right') {
    return {
      style: `position:absolute; left:calc(100% + ${clearance}px); top:50%; transform:translateY(-50%); pointer-events:none; z-index:30;`,
      visible: true,
    };
  }

  // Auto mode: place label in the quadrant OPPOSITE to heading
  if (heading === null) {
    return {
      style: `position:absolute; top:calc(100% + ${clearance}px); left:50%; transform:translateX(-50%); pointer-events:none; z-index:30;`,
      visible: true,
    };
  }

  const norm = ((Number(heading) % 360) + 360) % 360;

  // Heading points North (315° - 45°): line goes UP -> place label strictly BELOW
  if (norm >= 315 || norm < 45) {
    return {
      style: `position:absolute; top:calc(100% + ${clearance}px); left:50%; transform:translateX(-50%); pointer-events:none; z-index:30;`,
      visible: true,
    };
  }
  // Heading points East (45° - 135°): line goes RIGHT -> place label strictly to the LEFT (West)
  if (norm >= 45 && norm < 135) {
    return {
      style: `position:absolute; right:calc(100% + ${clearance}px); top:50%; transform:translateY(-50%); pointer-events:none; z-index:30;`,
      visible: true,
    };
  }
  // Heading points South (135° - 225°): line goes DOWN -> place label strictly ABOVE
  if (norm >= 135 && norm < 225) {
    return {
      style: `position:absolute; bottom:calc(100% + ${clearance}px); left:50%; transform:translateX(-50%); pointer-events:none; z-index:30;`,
      visible: true,
    };
  }
  // Heading points West (225° - 315°): line goes LEFT -> place label strictly to the RIGHT (East)
  return {
    style: `position:absolute; left:calc(100% + ${clearance}px); top:50%; transform:translateY(-50%); pointer-events:none; z-index:30;`,
    visible: true,
  };
}
