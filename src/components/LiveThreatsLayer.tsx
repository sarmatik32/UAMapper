import React, { useEffect, useRef } from 'react';
import L from '../leaflet-fix';
import { NeptunThreat, Language } from '../types';
import { MONITORWAR_ICON_ASSETS } from './IconLibrary';
import { DEFAULT_LIVE_ICON_MAPPING, normalizeThreatType } from '../utils/liveIconConfig';
import { DEFAULT_LIVE_ICON_MAPPING, normalizeThreatType } from '../utils/liveIconConfig';
import { getHeadingCompass, getThreatVisuals } from '../utils/neptunService';

interface LiveThreatsLayerProps {
  map: L.Map | null;
  isLiveMode: boolean;
  threats: NeptunThreat[];
  showTrails?: boolean;
  language: Language;
  onSelectThreat?: (threat: NeptunThreat) => void;
  iconMapping?: Record<string, string>;
  iconPresets?: Record<string, import('../types').IconPreset>;
  customLibrary?: { id: string; name: string; dataUrl: string }[];
  iconMapping?: Record<string, string>;
  iconPresets?: Record<string, import('../types').IconPreset>;
  customLibrary?: { id: string; name: string; dataUrl: string }[];
}

export const LiveThreatsLayer: React.FC<LiveThreatsLayerProps> = ({
  map,
  isLiveMode,
  threats,
  showTrails = true,
  language,
  onSelectThreat,
  iconMapping = {},
  iconPresets = {},
  customLibrary = [],
}) => {
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize or remove LayerGroup
  useEffect(() => {
    if (!map) return;

    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (layerGroupRef.current && map) {
        layerGroupRef.current.clearLayers();
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map]);

  // Render threats whenever isLiveMode, threats or showTrails change
  useEffect(() => {
    if (!layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    if (!isLiveMode || !threats || threats.length === 0) {
      return;
    }

    const isUa = language === 'uk';

    // Ensure custom panes exist with high z-index so Live threats & trails are rendered strictly on top of
    // air alerts (zIndex 230-240), DeepState occupied territories (zIndex 310), and all other layers
    if (!map.getPane('liveThreatsTrailsPane')) {
      const p = map.createPane('liveThreatsTrailsPane');
      p.style.zIndex = '620';
      p.style.pointerEvents = 'none';
    }
    if (!map.getPane('liveThreatsMarkersPane')) {
      const p = map.createPane('liveThreatsMarkersPane');
      p.style.zIndex = '650';
    }

    threats.forEach((threat) => {
      if (typeof threat.lat !== 'number' || typeof threat.lon !== 'number' || isNaN(threat.lat) || isNaN(threat.lon)) {
        return;
      }

      const visuals = getThreatVisuals(threat.type);
      const heading = threat.heading ?? threat.velocity?.bearingDeg ?? null;
      const speedKmh = threat.velocity?.speedKmh ? Math.round(threat.velocity.speedKmh) : null;
      const count = threat.count && threat.count > 1 ? threat.count : null;
      const compassDir = heading !== null ? getHeadingCompass(heading, language) : '';

      // 1. Draw flight trail if available (strictly on top of occupied territories & alerts)
      if (showTrails && threat.trail && threat.trail.length >= 2) {
        const latLngs: [number, number][] = threat.trail
          .filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number' && !isNaN(p.lat) && !isNaN(p.lon))
          .map((p) => [p.lat, p.lon]);

        // Add current location as the last point
        latLngs.push([threat.lat, threat.lon]);

        if (latLngs.length >= 2) {
          // Trail line glow aura
          const trailGlow = L.polyline(latLngs, {
            color: visuals.color,
            weight: 5,
            opacity: 0.5,
            interactive: false,
            pane: 'liveThreatsTrailsPane',
          });
          layerGroupRef.current?.addLayer(trailGlow);

          // Trail dashed core line (high contrast white)
          const trailCore = L.polyline(latLngs, {
            color: '#ffffff',
            weight: 2.5,
            opacity: 0.95,
            dashArray: '3, 6',
            interactive: false,
            pane: 'liveThreatsTrailsPane',
          });
          layerGroupRef.current?.addLayer(trailCore);

          // Trail dots
          latLngs.slice(0, -1).forEach((pt) => {
            const dot = L.circleMarker(pt, {
              radius: 3,
              color: visuals.color,
              fillColor: '#ffffff',
              fillOpacity: 1,
              weight: 1.5,
              interactive: false,
              pane: 'liveThreat      const normalizedType = normalizeThreatType(threat.type);
      const liveIconId = iconMapping[normalizedType] || iconMapping[threat.type] || DEFAULT_LIVE_ICON_MAPPING[normalizedType] || (
        threat.type === 'uav' ? 'monitorwar-drone-1'
        : threat.type === 'fpv' ? 'monitorwar-drone-2'
        : threat.type === 'mig31k' ? 'monitorwar-aircraft-1'
        : threat.type === 'recon' ? 'monitorwar-aircraft-2'
        : threat.type === 'missile' || threat.type === 'cruise_missile' ? 'monitorwar-missile-1'
        : threat.type === 'ballistic' ? 'monitorwar-missile-2'
        : 'monitorwar-target'
      );
      const customIcon = customLibrary.find((item) => item.id === liveIconId);
      const iconPreset = iconPresets[liveIconId] || iconPresets[normalizedType] || {};
      const iconSize = Math.max(20, Math.min(96, Number(iconPreset.size) || 32));
      const iconRotation = Number.isFinite(Number(iconPreset.rotation)) ? Number(iconPreset.rotation) : 0;
      const iconAsset = customIcon?.dataUrl || MONITORWAR_ICON_ASSETS[liveIconId];
      const iconSvg = iconAsset
        ? `<img src="${iconAsset}" alt="" draggable="false" style="width:${Math.min(32, iconSize)}px;height:${Math.min(32, iconSize)}px;object-fit:contain;display:block;filter:${customIcon ? 'none' : 'brightness(0) invert(1)'};" />`
        : `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>`;idth:${Math.min(32, iconSize)}px;height:${Math.min(32, iconSize)}px;object-fit:contain;display:block;filter:${customIcon ? 'none' : 'brightness(0) invert(1)'};" />`
        : `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>`;

      // 3. Rotation style if heading is provided
      const rotationTransform = `transform: rotate(${(heading ?? 0) + iconRotation}deg);`;

      // Directional arrow if heading is available (with black outline for sharp contrast against red zones)
      const courseIndicatorHtml = heading !== null
        ? `
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 pointer-events-none" style="transform: rotate(${heading}deg); transform-origin: center 20px;">
            <svg viewBox="0 0 12 12" class="w-3.5 h-3.5 text-white filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" fill="currentColor" stroke="#000" stroke-width="1.2">
              <polygon points="6,0 12,12 6,9 0,12" />
            </svg>
          </div>
        `
        : '';

      const countBadgeHtml = count
        ? `<div class="absolute -top-2 -right-2 bg-red-600 text-white font-mono font-black text-[9px] px-1.5 py-0.5 rounded-full border border-white shadow-lg leading-none z-10">${count}x</div>`
        : '';

      const localityLabel = threat.locality || threat.title || (isUa ? 'Ціль' : 'Target');
      const speedLabel = speedKmh ? ` • ${speedKmh} ${isUa ? 'км/г' : 'km/h'}` : '';

      const html = `
        <div class="relative flex flex-col items-center justify-center cursor-pointer group select-none transition-transform hover:scale-115">
          <!-- Pulsing Radar Ping Ring -->
          <div class="absolute -inset-2.5 rounded-full animate-ping opacity-75 pointer-events-none" style="background-color: ${visuals.color};"></div>
          
          <!-- Direction course arrow indicator -->
          ${courseIndicatorHtml}

          <!-- Tactical Icon Core: high-contrast white ring + black rim so it pops even over red occupied territory -->
          <div class="relative rounded-full border-2 border-white ring-2 ring-black/80 shadow-[0_0_14px_rgba(0,0,0,0.9),0_0_6px_${visuals.color}] flex items-center justify-center text-white z-1" style="width:${Math.min(44, Math.max(28, iconSize))}px;height:${Math.min(44, Math.max(28, iconSize))}px;background: radial-gradient(circle, ${visuals.color} 55%, #050505 100%);" 
               >
            <div style="${rotationTransform} transition: transform 0.3s ease;">
              ${iconSvg}
            </div>
            ${countBadgeHtml}
          </div>

          <!-- Bottom Label: dark pill with high-contrast text and border -->
          <div class="mt-1 px-1.5 py-0.5 rounded-md bg-black/95 backdrop-blur-md border border-white/40 ring-1 ring-black/70 text-white font-mono text-[9px] font-black tracking-tight whitespace-nowrap shadow-xl pointer-events-none flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background-color: ${visuals.color};"></span>
            <span>${localityLabel}${speedLabel}</span>
          </div>
        </div>
      `;

      const divIcon = L.divIcon({
        html,
        className: 'neptun-live-threat-marker',
        iconSize: [Math.max(36, Math.min(52, iconSize + 8)), 48],
        iconAnchor: [Math.max(18, Math.min(26, (iconSize + 8) / 2)), 20],
      });

      const marker = L.marker([threat.lat, threat.lon], {
        icon: divIcon,
        pane: 'liveThreatsMarkersPane',
        zIndexOffset: 2000,
      });

      // 4. Tactical Tooltip / Popup Details
      const headingText = heading !== null ? `${Math.round(heading)}° ${compassDir ? `(${compassDir})` : ''}` : (isUa ? 'Невідомо' : 'Unknown');
      const timeStr = threat.updatedAt ? new Date(threat.updatedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
      const localityFull = [threat.locality, threat.region].filter(Boolean).join(', ');

      const popupHtml = `
        <div class="neptun-live-target-card">
          <div class="neptun-live-target-card__header">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full animate-pulse" style="background-color: ${visuals.color};"></span>
              <strong class="neptun-live-target-card__title">${threat.title}</strong>
              ${count ? `<span class="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 font-mono text-[10px] font-bold">${count}x</span>` : ''}
            </div>
            <span class="neptun-live-target-card__badge">
              LIVE
            </span>
          </div>

          ${localityFull ? `
            <div class="neptun-live-target-card__location">
              <span>📍</span>
              <span>${localityFull}</span>
            </div>
          ` : ''}

          <div class="neptun-live-target-card__grid">
            <div>
              <span class="neptun-live-target-card__label">${isUa ? 'Курс' : 'Course'}</span>
              <span class="neptun-live-target-card__value">${headingText}</span>
            </div>
            <div>
              <span class="neptun-live-target-card__label">${isUa ? 'Швидкість' : 'Speed'}</span>
              <span class="neptun-live-target-card__value">${speedKmh ? `${speedKmh} ${isUa ? 'км/г' : 'km/h'}` : '—'}</span>
            </div>
            ${threat.sourceCount ? `
              <div>
                <span class="text-slate-500 block uppercase">${isUa ? 'Джерел' : 'Sources'}</span>
                <span class="neptun-live-target-card__value">${threat.sourceCount}</span>
              </div>
            ` : ''}
            ${timeStr ? `
              <div>
                <span class="text-slate-500 block uppercase">${isUa ? 'Час' : 'Time'}</span>
                <span class="neptun-live-target-card__value">${timeStr}</span>
              </div>
            ` : ''}
          </div>

          ${threat.explanationShort ? `
            <p class="neptun-live-target-card__description">
              ${threat.explanationShort}
            </p>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'neptun-threat-popup',
        closeButton: false,
        offset: [0, -15],
      });

      marker.on('click', () => {
        if (onSelectThreat) {
          onSelectThreat(threat);
        }
      });

      layerGroupRef.current?.addLayer(marker);
    });
  }, [map, isLiveMode, threats, showTrails, language, onSelectThreat, iconMapping, iconPresets, customLibrary]);

  return null;
};
