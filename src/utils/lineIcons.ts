import L from 'leaflet';

export function createExplosionIcon(color: string, sizeMultiplier = 1) {
  const size = Math.max(32, Math.min(64, 28 + sizeMultiplier * 2));
  const html = `
    <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
      <div class="absolute inset-0 rounded-full bg-amber-500/40 blur-sm animate-ping"></div>
      <div class="relative flex items-center justify-center text-red-500 font-extrabold filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" style="font-size: ${size * 0.85}px; line-height: 1;">
        💥
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-explosion-endpoint',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createCustomImageIcon(
  dataUrl: string,
  color: string,
  sizeMultiplier = 1,
  angleDegrees?: number
) {
  const size = Math.max(24, Math.min(60, 22 + sizeMultiplier * 2));
  const rotateStyle = angleDegrees !== undefined ? `transform: rotate(${angleDegrees - 90}deg);` : '';
  
  let iconContent = '';
  if (dataUrl) {
    if (color && color !== 'transparent' && color !== 'none') {
      iconContent = `
        <div style="
          width: 100%;
          height: 100%;
          background-color: ${color};
          -webkit-mask-image: url('${dataUrl}');
          mask-image: url('${dataUrl}');
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
        "></div>
      `;
    } else {
      iconContent = `<img src="${dataUrl}" class="w-full h-full object-contain pointer-events-none" alt="icon" />`;
    }
  } else {
    iconContent = `
      <svg width="${size * 0.8}" height="${size * 0.8}" viewBox="0 0 24 24" fill="${color || '#ef4444'}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
    `;
  }

  const html = `
    <div class="flex items-center justify-center pointer-events-none" style="width: ${size}px; height: ${size}px; ${rotateStyle}">
      ${iconContent}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-image-endpoint',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createFadeGlowIcon(color: string, sizeMultiplier = 1) {
  const size = Math.max(20, Math.min(40, 16 + sizeMultiplier * 2));
  const html = `
    <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
      <div class="absolute inset-0 rounded-full blur-md opacity-80" style="background-color: ${color};"></div>
      <div class="relative rounded-full border border-white/80 shadow-md" style="width: ${size * 0.5}px; height: ${size * 0.5}px; background-color: ${color}; opacity: 0.9;"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-fade-endpoint',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createArrowIcon(color: string, angleDegrees: number, sizeMultiplier = 1) {
  const size = Math.max(22, Math.min(42, 20 + sizeMultiplier * 2));
  const html = `
    <div class="flex items-center justify-center" style="width: ${size}px; height: ${size}px; transform: rotate(${angleDegrees - 90}deg);">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="${color}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-arrow-endpoint',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createDotIcon(color: string, sizeMultiplier = 1) {
  const size = Math.max(12, Math.min(28, 10 + sizeMultiplier * 2));
  const html = `
    <div class="rounded-full shadow-sm" style="width: ${size}px; height: ${size}px; background-color: ${color};"></div>
  `;
  return L.divIcon({
    html,
    className: 'custom-dot-endpoint',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Calculates bearing angle in degrees from point 1 to point 2
 */
export function calculateBearing(
  p1OrLat1: [number, number] | number,
  p2OrLng1: [number, number] | number,
  lat2?: number,
  lng2?: number
): number {
  let lat1Num = 0;
  let lng1Num = 0;
  let lat2Num = 0;
  let lng2Num = 0;

  if (Array.isArray(p1OrLat1) && Array.isArray(p2OrLng1)) {
    lat1Num = p1OrLat1[0];
    lng1Num = p1OrLat1[1];
    lat2Num = p2OrLng1[0];
    lng2Num = p2OrLng1[1];
  } else {
    lat1Num = p1OrLat1 as number;
    lng1Num = p2OrLng1 as number;
    lat2Num = lat2 || 0;
    lng2Num = lng2 || 0;
  }

  const rad = Math.PI / 180;
  const phi1 = lat1Num * rad;
  const phi2 = lat2Num * rad;
  const deltaLambda = (lng2Num - lng1Num) * rad;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}
