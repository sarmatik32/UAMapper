import React from 'react';

// Definitions of beautiful vector icons
export const ICON_TYPES = [
  { id: 'uav-recon', nameUa: 'БПЛА Розвідник 🛩️', nameEn: 'Recon UAV 🛩️' },
  { id: 'uav-kamikaze', nameUa: 'БПЛА-Камікадзе ⚡', nameEn: 'Kamikaze UAV ⚡' },
  { id: 'uav-strike', nameUa: 'Ударний БПЛА 💥', nameEn: 'Strike UAV 💥' },
  { id: 'uav-flyingwing', nameUa: 'БПЛА "Летюче Крило" 🦅', nameEn: 'Stealth Flying Wing 🦅' },
  { id: 'missile-cruise', nameUa: 'Крилата Ракета 🚀', nameEn: 'Cruise Missile 🚀' },
  { id: 'missile-ballistic', nameUa: 'Балістична Ракета 🎯', nameEn: 'Ballistic Missile 🎯' },
  { id: 'bomb-air', nameUa: 'Авіабомба 💣', nameEn: 'Aerial Bomb 💣' },
  { id: 'target', nameUa: 'Ціль', nameEn: 'Target' },
  { id: 'explosion', nameUa: 'Вибух 💥', nameEn: 'Explosion 💥' },
  { id: 'warning', nameUa: 'Увага', nameEn: 'Warning' },
  { id: 'pin', nameUa: 'Шпилька', nameEn: 'Location Pin' },
  { id: 'arrow', nameUa: 'Стрілка (напрямок)', nameEn: 'Arrow (Direction)' },
  { id: 'car', nameUa: 'Легкове авто', nameEn: 'Car' },
  { id: 'truck', nameUa: 'Вантажівка', nameEn: 'Truck' },
  { id: 'plane', nameUa: 'Літак', nameEn: 'Airplane' },
  { id: 'boat', nameUa: 'Корабель', nameEn: 'Ship/Boat' },
  { id: 'person', nameUa: 'Пішохід', nameEn: 'Pedestrian' },
  { id: 'drone', nameUa: 'Квадрокоптер', nameEn: 'Quadcopter' },
  { id: 'star', nameUa: 'Зірка', nameEn: 'Star' },
  { id: 'circle', nameUa: 'Точка', nameEn: 'Point' },
];

export const PRESET_COLORS = [
  { nameUa: 'Червоний', nameEn: 'Red', hex: '#ef4444' },
  { nameUa: 'Помаранчевий', nameEn: 'Orange', hex: '#f97316' },
  { nameUa: 'Жовтий', nameEn: 'Yellow', hex: '#eab308' },
  { nameUa: 'Зелений', nameEn: 'Green', hex: '#22c55e' },
  { nameUa: 'Блакитний', nameEn: 'Teal', hex: '#06b6d4' },
  { nameUa: 'Синій', nameEn: 'Blue', hex: '#3b82f6' },
  { nameUa: 'Фіолетовий', nameEn: 'Purple', hex: '#a855f7' },
  { nameUa: 'Рожевий', nameEn: 'Pink', hex: '#ec4899' },
  { nameUa: 'Чорний', nameEn: 'Black', hex: '#1e293b' },
  { nameUa: 'Білий', nameEn: 'White', hex: '#ffffff' },
];

export function getIconSvgContent(type: string, fillColor: string = 'currentColor', strokeColor: string = 'white'): string {
  const isTransparent = fillColor === 'transparent' || fillColor === 'none';
  const fill = isTransparent ? 'none' : fillColor;
  const stroke = strokeColor;
  const strokeWidth = isTransparent ? '2.5' : '1.5';

  switch (type) {
    case 'uav-recon':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 3 C 11.3 3 10.7 4 10.7 7 L 10.7 9 L 2 9 C 1 9 1 11 2 11 L 10.7 11 L 10.7 18 L 8 18 C 7.5 18 7.5 19 8 19 L 16 19 C 16.5 19 16.5 18 16 18 L 13.3 18 L 13.3 11 L 22 11 C 23 11 23 9 22 9 L 13.3 9 L 13.3 7 C 13.3 4 12.7 3 12 3 Z"/>
        </svg>
      `;
    case 'uav-kamikaze':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 2 L 2 17 L 2 21 L 3.5 21 L 3.5 18.5 L 12 16 L 20.5 18.5 L 20.5 21 L 22 21 L 22 17 Z" />
        </svg>
      `;
    case 'uav-strike':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 2 C 11.2 2 10.5 3.5 10.5 7 L 10.5 10 L 1 10 C 0.5 10 0.5 11 1 11 L 10.5 11 L 10.5 16 L 7.5 19.5 L 8.5 20.5 L 12 18 L 15.5 20.5 L 16.5 19.5 L 13.5 16 L 13.5 11 L 23 11 C 23.5 11 23.5 10 23 10 L 13.5 10 L 13.5 7 C 13.5 3.5 12.8 2 12 2 Z"/>
          <rect x="5.5" y="8" width="1.5" height="4.5" rx="0.5" fill="${stroke}" stroke="${stroke}" stroke-width="0.5" />
          <rect x="17" y="8" width="1.5" height="4.5" rx="0.5" fill="${stroke}" stroke="${stroke}" stroke-width="0.5" />
        </svg>
      `;
    case 'uav-flyingwing':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 4 L 22 13 L 18 15 L 15 14 L 12 16 L 9 14 L 6 15 L 2 13 Z"/>
        </svg>
      `;
    case 'missile-cruise':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 2 C 10.5 2 9.5 4 9.5 7 L 9.5 10 L 3 13 L 3 14 L 9.5 12 L 9.5 19 L 7 21 L 7 22 L 12 21 L 17 22 L 17 21 L 14.5 19 L 14.5 12 L 21 14 L 21 13 L 14.5 10 L 14.5 7 C 14.5 4 13.5 2 12 2 Z" />
        </svg>
      `;
    case 'missile-ballistic':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 1 C 11.3 1 10.5 3 10.5 5 L 10.5 7 L 8 8 L 8 9 L 10.5 9 L 10.5 17 L 6 19 L 6 21 L 10.5 21 L 10.5 23 L 13.5 23 L 13.5 21 L 18 21 L 18 19 L 13.5 17 L 13.5 9 L 16 9 L 16 8 L 13.5 7 L 13.5 5 C 13.5 3 12.7 1 12 1 Z" />
        </svg>
      `;
    case 'bomb-air':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <path d="M 12 2 C 9.5 2 8 4 8 9 L 8 15 C 8 17 6.5 18 5.5 19 L 5.5 21 L 9.5 21 L 10.5 18.5 L 13.5 18.5 L 14.5 21 L 18.5 21 L 18.5 19 C 17.5 18 16 17 16 15 L 16 9 C 16 4 14.5 2 12 2 Z" />
        </svg>
      `;
    case 'circle':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      `;
    case 'square':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
        </svg>
      `;
    case 'triangle':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <polygon points="12,3 3,20 21,20"/>
        </svg>
      `;
    case 'arrow':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" class="w-full h-full">
          <polygon points="12,3 4,21 12,17 20,21"/>
        </svg>
      `;
    case 'pin':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;
    case 'car':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-5h14v5z"/>
          <circle cx="7.5" cy="14.5" r="1.5" fill="${stroke}"/>
          <circle cx="16.5" cy="14.5" r="1.5" fill="${stroke}"/>
        </svg>
      `;
    case 'truck':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm12 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2-5.5h-3V9h3v4z"/>
        </svg>
      `;
    case 'plane':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1" class="w-full h-full">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l7 2.5z"/>
        </svg>
      `;
    case 'boat':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v-2h2c1.02 0 1.85-.51 2.63-1.14l.05-.04 1.4-1.17c1.47-1.23 3.44-1.9 5.42-1.9s3.95.67 5.42 1.9l1.4 1.17.05.04c.78.63 1.61 1.14 2.63 1.14h2v2h-2zM20 11l-3.32-4.43C16.32 6.13 15.7 5.8 15.05 5.8H12V3h-2v2.8H7l-3 4.2V14h16v-3z"/>
        </svg>
      `;
    case 'person':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
        </svg>
      `;
    case 'drone':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">
          <circle cx="12" cy="12" r="3" fill="${fill}" stroke="${stroke}" stroke-width="1"/>
          <path d="M12 2v7M12 15v7M2 12h7M15 12h7" stroke="${stroke}" stroke-width="2"/>
          <circle cx="12" cy="2" r="1.5" fill="${stroke}" stroke="${stroke}"/>
          <circle cx="12" cy="22" r="1.5" fill="${stroke}" stroke="${stroke}"/>
          <circle cx="2" cy="12" r="1.5" fill="${stroke}" stroke="${stroke}"/>
          <circle cx="22" cy="12" r="1.5" fill="${stroke}" stroke="${stroke}"/>
        </svg>
      `;
    case 'star':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      `;
    case 'target':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.5" class="w-full h-full">
          <circle cx="12" cy="12" r="10" stroke="${stroke}" fill="none"/>
          <circle cx="12" cy="12" r="6" stroke="${stroke}" fill="none"/>
          <circle cx="12" cy="12" r="1.5" fill="${stroke}"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="${stroke}"/>
        </svg>
      `;
    case 'warning':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="w-full h-full">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
      `;
    case 'explosion':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-full h-full">
          <text x="50%" y="55%" dominant-baseline="central" text-anchor="middle" font-size="22">💥</text>
        </svg>
      `;
    default:
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" class="w-full h-full">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      `;
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || hex === 'transparent' || hex === 'none') return 'transparent';
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createMarkerHtml(
  title: string,
  color: string,
  size: number,
  rotation: number,
  iconType: string,
  labelVisible: boolean,
  isSelected: boolean,
  customIconUrl?: string,
  borderColor: string = '#ffffff',
  endPointStyle: string = 'none',
  hasZone?: boolean,
  zoneColor?: string,
  zoneSize?: number
): string {
  let innerContent = '';
  if (customIconUrl) {
    if (color && color !== 'transparent' && color !== 'none' && color !== '#ffffff') {
      innerContent = `
        <div style="
          width: 100%;
          height: 100%;
          background-color: ${color};
          -webkit-mask-image: url('${customIconUrl}');
          mask-image: url('${customIconUrl}');
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
        "></div>
      `;
    } else {
      innerContent = `
        <img src="${customIconUrl}" alt="${title}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;" referrerPolicy="no-referrer" />
      `;
    }
  } else {
    innerContent = getIconSvgContent(iconType, color, borderColor);
  }
  const borderStyle = isSelected ? `outline: 3px solid #3b82f6; outline-offset: 4px; box-shadow: 0 0 15px ${color};` : '';

  // Handle End Point style indicators (extra small decorators if requested)
  let decoratorHtml = '';

  // Generate circular zone CSS/HTML
  let zoneHtml = '';
  if (hasZone) {
    const finalZoneColor = zoneColor || color || '#ef4444';
    const rgbaBg = hexToRgba(finalZoneColor, 0.5);
    zoneHtml = `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${zoneSize || 60}px;
        height: ${zoneSize || 60}px;
        border: 2.5px dashed ${finalZoneColor};
        background-color: ${rgbaBg};
        border-radius: 50%;
        z-index: -1;
        pointer-events: none;
      "></div>
    `;
  }

  return `
    <div class="relative flex items-center justify-center ${isSelected ? 'selected-marker-highlight' : ''}" style="width: ${size}px; height: ${size}px; ${borderStyle} transition: all 0.2s ease;">
      <!-- Circular tactical zone (rendered behind the main icon) -->
      ${zoneHtml}

      <!-- Main rotating icon container (rotates icon and label together) -->
      <div style="transform: rotate(${rotation}deg); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); transition: transform 0.1s ease; z-index: 2; position: relative;">
        ${innerContent}

        <!-- Label directly below icon, rotating at the exact same angle -->
        ${labelVisible ? `
          <div class="absolute select-none pointer-events-none" style="top: 100%; left: 50%; transform: translateX(-50%); margin-top: 5px; z-index: 1000;">
            <div style="background-color: rgba(15, 23, 42, 0.95); color: #ffffff; border: 1.5px solid ${borderColor}; border-radius: 5px; padding: 2px 7px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,0.6); letter-spacing: 0.01em;">
              ${title || 'Маркер'}
            </div>
          </div>
        ` : ''}
      </div>
      
      ${decoratorHtml}
    </div>
  `;
}
