import React, { useEffect, useRef } from 'react';
import L from '../leaflet-fix';
import { NeptunThreat, Language } from '../types';
import { getHeadingCompass, getThreatVisuals } from '../utils/neptunService';

interface LiveThreatsLayerProps {
  map: L.Map | null;
  isLiveMode: boolean;
  threats: NeptunThreat[];
  showTrails?: boolean;
  language: Language;
  onSelectThreat?: (threat: NeptunThreat) => void;
}

export const LiveThreatsLayer: React.FC<LiveThreatsLayerProps> = ({
  map,
  isLiveMode,
  threats,
  showTrails = true,
  language,
  onSelectThreat,
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
              pane: 'liveThreatsTrailsPane',
            });
            layerGroupRef.current?.addLayer(dot);
          });
        }
      }

      // 2. Build tactical SVG icon depending on threat type and heading
      let iconSvg = '';
      if (threat.type === 'uav') {
        // Shahed delta-wing strike drone silhouette
        iconSvg = `
          <svg viewBox="0 0 24 24" class="w-5 h-5 drop-shadow-[0_0_8px_${visuals.color}]" fill="currentColor">
            <path d="M12 2L4 18l4-2 4 4 4-4 4 2L12 2z"/>
          </svg>
        `;
      } else if (threat.type === 'mig31k') {
        // Supersonic jet silhouette
        iconSvg = `
          <svg viewBox="0 0 24 24" class="w-6 h-6 drop-shadow-[0_0_10px_${visuals.color}]" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        `;
      } else if (threat.type === 'fpv') {
        // FPV quadcopter
        iconSvg = `
          <svg viewBox="0 0 24 24" class="w-5 h-5 drop-shadow-[0_0_8px_${visuals.color}]" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <path d="M5 5l4 4M19 5l-4 4M5 19l4-4M19 19l-4-4" />
            <circle cx="5" cy="5" r="2" />
            <circle cx="19" cy="5" r="2" />
            <circle cx="5" cy="19" r="2" />
            <circle cx="19" cy="19" r="2" />
          </svg>
        `;
      } else if (threat.type === 'missile' || threat.type === 'cruise_missile' || threat.type === 'ballistic') {
        // Missile rocket
        iconSvg = `
          <svg viewBox="0 0 24 24" class="w-5 h-5 drop-shadow-[0_0_8px_${visuals.color}]" fill="currentColor">
            <path d="M12 2.5s-4 5-4 10.5c0 2 .5 3.5 1 4.5l-2 2.5h10l-2-2.5c.5-1 1-2.5 1-4.5 0-5.5-4-10.5-4-10.5z" />
          </svg>
        `;
      } else {
        // Radar / generic threat target
        iconSvg = `
          <svg viewBox="0 0 24 24" class="w-5 h-5 drop-shadow-[0_0_8px_${visuals.color}]" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="3" x2="12" y2="21" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        `;
      }

      // 3. Rotation style if heading is provided
      const rotationTransform = heading !== null ? `transform: rotate(${heading}deg);` : '';

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
          <div class="relative w-8 h-8 rounded-full border-2 border-white ring-2 ring-black/80 shadow-[0_0_14px_rgba(0,0,0,0.9),0_0_6px_${visuals.color}] flex items-center justify-center text-white z-1" 
               style="background: radial-gradient(circle, ${visuals.color} 55%, #050505 100%);">
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
        iconSize: [36, 48],
        iconAnchor: [18, 20],
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
        <div class="p-3 bg-slate-950 text-slate-100 rounded-xl border border-white/15 shadow-2xl min-w-[210px] max-w-[260px] font-sans text-xs">
          <div class="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full animate-pulse" style="background-color: ${visuals.color};"></span>
              <strong class="font-extrabold text-sm text-white">${threat.title}</strong>
              ${count ? `<span class="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 font-mono text-[10px] font-bold">${count}x</span>` : ''}
            </div>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold text-slate-400 bg-white/5 border border-white/10">
              LIVE
            </span>
          </div>

          ${localityFull ? `
            <div class="mb-1.5 text-slate-300 font-medium flex items-start gap-1">
              <span>📍</span>
              <span>${localityFull}</span>
            </div>
          ` : ''}

          <div class="grid grid-cols-2 gap-1.5 my-2 p-2 rounded-lg bg-white/5 border border-white/5 font-mono text-[10px]">
            <div>
              <span class="text-slate-500 block uppercase">${isUa ? 'Курс' : 'Course'}</span>
              <span class="text-slate-200 font-bold">${headingText}</span>
            </div>
            <div>
              <span class="text-slate-500 block uppercase">${isUa ? 'Швидкість' : 'Speed'}</span>
              <span class="text-slate-200 font-bold">${speedKmh ? `${speedKmh} ${isUa ? 'км/г' : 'km/h'}` : '—'}</span>
            </div>
            ${threat.sourceCount ? `
              <div>
                <span class="text-slate-500 block uppercase">${isUa ? 'Джерел' : 'Sources'}</span>
                <span class="text-emerald-400 font-bold">${threat.sourceCount}</span>
              </div>
            ` : ''}
            ${timeStr ? `
              <div>
                <span class="text-slate-500 block uppercase">${isUa ? 'Час' : 'Time'}</span>
                <span class="text-slate-200">${timeStr}</span>
              </div>
            ` : ''}
          </div>

          ${threat.explanationShort ? `
            <p class="text-[11px] text-slate-400 leading-relaxed border-t border-white/5 pt-1.5 mt-1">
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
  }, [map, isLiveMode, threats, showTrails, language, onSelectThreat]);

  return null;
};
