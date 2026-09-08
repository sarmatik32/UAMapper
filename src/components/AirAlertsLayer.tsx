import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from '../leaflet-fix';
import { AirAlert, Language } from '../types';
import {
  matchAlertToFeature,
  getAlertVisuals,
  formatAlertDuration,
  formatTimeOnly,
  cleanAlertLocationTitle,
  normalizeLocationName,
} from '../utils/alertsService';
import { SETTLEMENTS } from '../data/settlements';

interface AirAlertsLayerProps {
  map: L.Map | null;
  alerts: AirAlert[];
  showAlerts: boolean;
  showAlertPolygons?: boolean;
  showAlertMarkers?: boolean;
  alertsOpacity?: number;
  alertsStrokeWidth?: number;
  language: Language;
  onAlertClick?: (alert: AirAlert, lat?: number, lng?: number) => void;
}

export const AirAlertsLayer: React.FC<AirAlertsLayerProps> = ({
  map,
  alerts,
  showAlerts,
  showAlertPolygons = true,
  showAlertMarkers = true,
  alertsOpacity = 0.30,
  alertsStrokeWidth = 2.5,
  language,
  onAlertClick,
}) => {
  const [oblastsGeojson, setOblastsGeojson] = useState<any | null>(null);
  const [raionsGeojson, setRaionsGeojson] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(() => (map ? map.getZoom() : 7));

  const alertPolygonsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const alertMarkersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Track map zoom level to dynamically adapt radar markers
  useEffect(() => {
    if (!map) return;
    const updateZoom = () => {
      setZoomLevel(map.getZoom());
    };
    map.on('zoomend', updateZoom);
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  // 1. Load GeoJSON boundary datasets once
  useEffect(() => {
    let isMounted = true;

    async function loadGeojson() {
      try {
        const [oblastsRes, raionsRes] = await Promise.all([
          fetch('/data/ukraine_oblasts.geojson'),
          fetch('/data/ukraine_raions.geojson'),
        ]);

        if (oblastsRes.ok) {
          const oblData = await oblastsRes.json();
          if (isMounted) setOblastsGeojson(oblData);
        }

        if (raionsRes.ok) {
          const raiData = await raionsRes.json();
          if (isMounted) setRaionsGeojson(raiData);
        }
      } catch (err) {
        console.error('Failed to load Ukraine GeoJSON boundaries:', err);
      }
    }

    loadGeojson();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initialize LayerGroups on map
  useEffect(() => {
    if (!map) return;

    if (!alertPolygonsLayerGroupRef.current) {
      // Create dedicated background pane if doesn't exist
      // zIndex 230: Strictly in the background above base tiles (200), behind all icons (600), lines (480), settlements (380), and district boundaries (340)
      if (!map.getPane('airAlertsPolygonsPane')) {
        const pane = map.createPane('airAlertsPolygonsPane');
        pane.style.zIndex = '230';
        pane.style.pointerEvents = 'none';
      }
      alertPolygonsLayerGroupRef.current = L.layerGroup([], {
        pane: 'airAlertsPolygonsPane',
      } as any).addTo(map);
    }

    if (!alertMarkersLayerGroupRef.current) {
      // zIndex 240: Background ambient radars below tactical markers (600) and lines (480)
      if (!map.getPane('airAlertsMarkersPane')) {
        const pane = map.createPane('airAlertsMarkersPane');
        pane.style.zIndex = '240';
      }
      alertMarkersLayerGroupRef.current = L.layerGroup([], {
        pane: 'airAlertsMarkersPane',
      } as any).addTo(map);
    }

    return () => {
      if (alertPolygonsLayerGroupRef.current) {
        alertPolygonsLayerGroupRef.current.clearLayers();
      }
      if (alertMarkersLayerGroupRef.current) {
        alertMarkersLayerGroupRef.current.clearLayers();
      }
    };
  }, [map]);

  // 3. Render active alert layers onto map
  const renderAlerts = useCallback(() => {
    if (!map || !alertPolygonsLayerGroupRef.current || !alertMarkersLayerGroupRef.current) {
      return;
    }

    alertPolygonsLayerGroupRef.current.clearLayers();
    alertMarkersLayerGroupRef.current.clearLayers();

    if (!showAlerts || alerts.length === 0) {
      return;
    }

    const activeOblastAlerts = alerts.filter((a) => a.location_type === 'oblast');
    const activeRaionAlerts = alerts.filter((a) => a.location_type === 'raion');

    // --- A. Render Oblast Polygons ---
    if (showAlertPolygons && oblastsGeojson && oblastsGeojson.features) {
      oblastsGeojson.features.forEach((feature: any) => {
        const matchedAlert = activeOblastAlerts.find((alert) =>
          matchAlertToFeature(alert, feature.properties)
        );

        if (matchedAlert) {
          const visuals = getAlertVisuals(matchedAlert, language);
          const duration = formatAlertDuration(matchedAlert.started_at, language);
          const time = formatTimeOnly(matchedAlert.started_at);

          const polyLayer = L.geoJSON(feature, {
            pane: 'airAlertsPolygonsPane',
            interactive: false,
            style: {
              fillColor: visuals.fillColor,
              fillOpacity: alertsOpacity,
              color: visuals.color,
              weight: alertsStrokeWidth,
              opacity: 0.95,
              dashArray: '6, 6',
            },
          });

          // Popup
          const popupHtml = `
            <div class="p-2 min-w-[200px] text-slate-800 font-sans select-none">
              <div class="flex items-center gap-1.5 font-bold text-sm border-b pb-1.5 mb-1.5" style="color: ${visuals.color}; border-color: ${visuals.color}33;">
                <span class="text-base animate-pulse">${visuals.icon}</span>
                <span>${matchedAlert.location_title}</span>
                ${visuals.levelTitle ? `<span class="ml-auto text-[10px] px-1.5 py-0.5 rounded font-bold" style="background-color: ${visuals.fillColor}22; color: ${visuals.color};">${visuals.levelTitle}</span>` : ''}
              </div>
              <div class="text-xs space-y-1">
                <div class="flex justify-between items-center text-slate-600">
                  <span>${language === 'uk' ? 'Тип загрози:' : 'Threat Type:'}</span>
                  <span class="font-bold" style="color: ${visuals.color};">${visuals.title}</span>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                  <span>${language === 'uk' ? 'Початок:' : 'Started:'}</span>
                  <span class="font-mono font-bold">${time}</span>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                  <span>${language === 'uk' ? 'Тривалість:' : 'Duration:'}</span>
                  <span class="font-mono font-bold text-amber-700">${duration}</span>
                </div>
                ${matchedAlert.notes ? `<div class="mt-1 text-[10px] text-slate-500 italic">${matchedAlert.notes}</div>` : ''}
              </div>
            </div>
          `;

          polyLayer.bindPopup(popupHtml, {
            className: 'air-alert-leaflet-popup',
          });

          polyLayer.on('click', () => {
            if (onAlertClick) {
              const center = feature.properties.center;
              onAlertClick(
                matchedAlert,
                center ? center[1] : undefined,
                center ? center[0] : undefined
              );
            }
          });

          alertPolygonsLayerGroupRef.current?.addLayer(polyLayer);
        }
      });
    }

    // --- B. Render Raion Polygons ---
    if (showAlertPolygons && raionsGeojson && raionsGeojson.features) {
      raionsGeojson.features.forEach((feature: any) => {
        const matchedAlert = activeRaionAlerts.find((alert) =>
          matchAlertToFeature(alert, feature.properties)
        );

        if (matchedAlert) {
          const visuals = getAlertVisuals(matchedAlert, language);
          const duration = formatAlertDuration(matchedAlert.started_at, language);
          const time = formatTimeOnly(matchedAlert.started_at);

          const polyLayer = L.geoJSON(feature, {
            pane: 'airAlertsPolygonsPane',
            interactive: false,
            style: {
              fillColor: visuals.fillColor,
              fillOpacity: Math.min(0.85, alertsOpacity + 0.15),
              color: visuals.color,
              weight: Math.max(1, alertsStrokeWidth * 1.1),
              opacity: 0.95,
              dashArray: '3, 4',
            },
          });

          const popupHtml = `
            <div class="p-2 min-w-[200px] text-slate-800 font-sans select-none">
              <div class="flex items-center gap-1.5 font-bold text-sm border-b pb-1.5 mb-1.5" style="color: ${visuals.color}; border-color: ${visuals.color}33;">
                <span class="text-base animate-pulse">${visuals.icon}</span>
                <span>${matchedAlert.location_title}</span>
                ${visuals.levelTitle ? `<span class="ml-auto text-[10px] px-1.5 py-0.5 rounded font-bold" style="background-color: ${visuals.fillColor}22; color: ${visuals.color};">${visuals.levelTitle}</span>` : ''}
              </div>
              <div class="text-xs space-y-1">
                ${matchedAlert.location_oblast ? `<div class="text-[11px] text-slate-500">${matchedAlert.location_oblast}</div>` : ''}
                <div class="flex justify-between items-center text-slate-600">
                  <span>${language === 'uk' ? 'Тип загрози:' : 'Threat Type:'}</span>
                  <span class="font-bold" style="color: ${visuals.color};">${visuals.title}</span>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                  <span>${language === 'uk' ? 'Початок:' : 'Started:'}</span>
                  <span class="font-mono font-bold">${time}</span>
                </div>
                <div class="flex justify-between items-center text-slate-600">
                  <span>${language === 'uk' ? 'Тривалість:' : 'Duration:'}</span>
                  <span class="font-mono font-bold text-amber-700">${duration}</span>
                </div>
                ${matchedAlert.notes ? `<div class="mt-1 text-[10px] text-slate-500 italic">${matchedAlert.notes}</div>` : ''}
              </div>
            </div>
          `;

          polyLayer.bindPopup(popupHtml, {
            className: 'air-alert-leaflet-popup',
          });

          polyLayer.on('click', () => {
            if (onAlertClick) {
              onAlertClick(matchedAlert);
            }
          });

          alertPolygonsLayerGroupRef.current?.addLayer(polyLayer);
        }
      });
    }

    // --- C. Render City / Hromada Siren Radar Markers (Zoom-Adaptive & Anti-Clutter) ---
    if (showAlertMarkers && alerts.length > 0) {
      const currentZoom = map.getZoom();

      // Only target cities & hromadas (plus Kyiv city) when polygons are enabled.
      // Raions and oblasts already have boundary polygons and must NOT spam rectangular banners.
      const targetAlerts = alerts.filter((alert) => {
        if (!showAlertPolygons) return true;
        const isCityOrHromada = alert.location_type === 'city' || alert.location_type === 'hromada';
        const isKyivCity =
          alert.location_title.toLowerCase().includes('київ') &&
          !alert.location_title.toLowerCase().includes('область');
        return isCityOrHromada || isKyivCity;
      });

      interface ClusteredAlertPoint {
        key: string;
        lat: number;
        lng: number;
        displayName: string;
        primaryAlert: AirAlert;
        alerts: AirAlert[];
      }

      const pointsMap = new Map<string, ClusteredAlertPoint>();

      targetAlerts.forEach((alert) => {
        const cleanName = cleanAlertLocationTitle(alert.location_title);
        const normAlertClean = normalizeLocationName(cleanName);

        // Find settlement match in settlements list
        let matchedSettlement = SETTLEMENTS.find(
          (s) => normalizeLocationName(s.name) === normAlertClean
        );

        if (!matchedSettlement) {
          matchedSettlement = SETTLEMENTS.find((s) => {
            const normS = normalizeLocationName(s.name);
            return (
              normAlertClean.startsWith(normS) ||
              normS.startsWith(normAlertClean) ||
              (normAlertClean.length >= 4 && normS.includes(normAlertClean))
            );
          });
        }

        let lat = matchedSettlement?.lat;
        let lng = matchedSettlement?.lng;
        let finalDisplayName = matchedSettlement?.name || cleanName;

        if (lat === undefined && alert.location_title.toLowerCase().includes('київ')) {
          lat = 50.4501;
          lng = 30.5234;
          finalDisplayName = 'Київ';
        }

        if (lat !== undefined && lng !== undefined) {
          // Cluster nearby points (~3-4 km) to prevent multiple identical overlapping badges
          const gridKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;

          if (pointsMap.has(gridKey)) {
            const existing = pointsMap.get(gridKey)!;
            existing.alerts.push(alert);
            const existingVisuals = getAlertVisuals(existing.primaryAlert, language);
            const newVisuals = getAlertVisuals(alert, language);
            // Elevate to red level if any combined alert has red threat
            if (newVisuals.level === 'red' && existingVisuals.level !== 'red') {
              existing.primaryAlert = alert;
              existing.displayName = finalDisplayName;
            }
          } else {
            pointsMap.set(gridKey, {
              key: gridKey,
              lat,
              lng,
              displayName: finalDisplayName,
              primaryAlert: alert,
              alerts: [alert],
            });
          }
        }
      });

      // Render clustered points according to current zoom level
      pointsMap.forEach((pt) => {
        const visuals = getAlertVisuals(pt.primaryAlert, language);
        const duration = formatAlertDuration(pt.primaryAlert.started_at, language);

        let markerHtml = '';
        let iconAnchor: [number, number] = [0, 0];

        if (currentZoom <= 7) {
          // --- Macro view (Ukraine overview, zoom <= 7) ---
          // Minimalist Radar Beacon: clean 20px beacon with soft ambient wave, NO overlapping text banners!
          iconAnchor = [10, 10];
          markerHtml = `
            <div class="relative flex items-center justify-center cursor-pointer group select-none pointer-events-auto" style="width: 20px; height: 20px;">
              <!-- Soft ambient radar wave -->
              <div class="absolute inset-0 rounded-full animate-ping opacity-25 pointer-events-none" style="background-color: ${visuals.color};"></div>
              
              <!-- Beacon Dot -->
              <div class="relative z-10 flex items-center justify-center w-5 h-5 rounded-full shadow-md transition-transform duration-150 group-hover:scale-125"
                   style="background-color: ${visuals.fillColor}; border: 1.5px solid rgba(255, 255, 255, 0.95);">
                <span class="text-[10px] leading-none">${visuals.icon}</span>
              </div>
            </div>
          `;
        } else if (currentZoom >= 8 && currentZoom <= 9) {
          // --- Regional view (zoom 8-9) ---
          // Compact pill: discrete height, clean dark frosted glass, short settlement name
          iconAnchor = [12, 12];
          markerHtml = `
            <div class="relative flex items-center justify-center cursor-pointer group select-none pointer-events-auto">
              <!-- Soft pulse -->
              <div class="absolute -inset-0.5 rounded-full animate-pulse opacity-25 pointer-events-none" style="background-color: ${visuals.color};"></div>
              
              <!-- Clean Compact Chip -->
              <div class="relative z-10 flex items-center gap-1 px-2 py-0.5 rounded-full shadow-lg border transition-all duration-150 group-hover:scale-105"
                   style="background-color: rgba(15, 23, 42, 0.92); border-color: ${visuals.color}66; backdrop-filter: blur(4px);">
                <span class="text-[11px] leading-none">${visuals.icon}</span>
                <span class="text-[10px] font-semibold text-slate-100 whitespace-nowrap">${pt.displayName}</span>
                ${pt.alerts.length > 1 ? `<span class="text-[9px] font-mono px-1 rounded bg-red-500/30 text-red-300 font-bold">+${pt.alerts.length - 1}</span>` : ''}
              </div>
            </div>
          `;
        } else {
          // --- Detailed city view (zoom >= 10) ---
          // Full tactical HUD badge with duration & clean typography
          iconAnchor = [14, 14];
          markerHtml = `
            <div class="relative flex items-center justify-center cursor-pointer group select-none pointer-events-auto">
              <div class="absolute -inset-1 rounded-full animate-pulse opacity-25 pointer-events-none" style="background-color: ${visuals.color};"></div>
              
              <div class="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-xl border transition-all duration-150 group-hover:scale-105"
                   style="background-color: rgba(15, 23, 42, 0.94); border-color: ${visuals.color}88; backdrop-filter: blur(6px);">
                <span class="text-xs leading-none">${visuals.icon}</span>
                <span class="text-[11px] font-bold text-white whitespace-nowrap">${pt.displayName}</span>
                <span class="text-[9px] font-bold px-1.5 py-0.2 rounded" style="background-color: ${visuals.fillColor}33; color: ${visuals.color}; border: 1px solid ${visuals.color}44;">
                  ${visuals.levelTitle}
                </span>
                ${duration ? `<span class="text-[10px] font-mono text-amber-300 bg-black/40 px-1.5 py-0.2 rounded">${duration}</span>` : ''}
              </div>
            </div>
          `;
        }

        const icon = L.divIcon({
          className: 'air-alert-siren-marker',
          html: markerHtml,
          iconSize: [0, 0],
          iconAnchor,
        });

        const marker = L.marker([pt.lat, pt.lng], {
          icon,
          pane: 'airAlertsMarkersPane',
          zIndexOffset: 0,
        });

        // Tooltip for quick inspection (especially valuable at zoom <= 7 where label is hidden)
        const tooltipHtml = `
          <div class="flex items-center gap-1.5 font-sans">
            <span class="text-xs">${visuals.icon}</span>
            <span class="font-bold text-white">${pt.displayName}</span>
            <span class="text-[10px] px-1 py-0.2 rounded font-semibold" style="color: ${visuals.color}; background: ${visuals.fillColor}33;">${visuals.levelTitle}</span>
            ${duration ? `<span class="text-[10px] text-amber-300 font-mono">(${duration})</span>` : ''}
          </div>
        `;

        marker.bindTooltip(tooltipHtml, {
          className: 'air-alert-tooltip',
          direction: 'top',
          offset: [0, -14],
          opacity: 0.95,
        });

        // Full Detailed Popup
        const popupItemsHtml = pt.alerts
          .map((al) => {
            const vis = getAlertVisuals(al, language);
            const dur = formatAlertDuration(al.started_at, language);
            const t = formatTimeOnly(al.started_at);
            return `
              <div class="p-1.5 rounded bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                <div class="flex items-center justify-between font-semibold" style="color: ${vis.color};">
                  <span>${vis.icon} ${vis.title}</span>
                  <span class="text-[10px] px-1 rounded font-bold" style="background: ${vis.fillColor}22;">${vis.levelTitle}</span>
                </div>
                <div class="flex justify-between text-slate-500 text-[11px]">
                  <span>${language === 'uk' ? 'Початок:' : 'Started:'} ${t}</span>
                  <span class="font-mono text-amber-700 font-bold">(${dur})</span>
                </div>
                ${al.notes ? `<div class="text-[10px] text-slate-500 italic border-t pt-1 mt-1">${al.notes}</div>` : ''}
              </div>
            `;
          })
          .join('');

        const popupHtml = `
          <div class="p-2 min-w-[220px] max-w-[280px] text-slate-800 font-sans select-none space-y-1.5">
            <div class="flex items-center gap-1.5 font-bold text-sm border-b pb-1.5" style="color: ${visuals.color}; border-color: ${visuals.color}33;">
              <span class="text-base">${visuals.icon}</span>
              <span>${pt.displayName}</span>
              <span class="ml-auto text-[10px] px-1.5 py-0.5 rounded font-bold" style="background-color: ${visuals.fillColor}22; color: ${visuals.color};">${visuals.levelTitle}</span>
            </div>
            ${pt.primaryAlert.location_oblast ? `<div class="text-[11px] text-slate-500 font-medium">${pt.primaryAlert.location_oblast}</div>` : ''}
            <div class="space-y-1.5 pt-0.5">
              ${popupItemsHtml}
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, {
          className: 'air-alert-leaflet-popup',
        });

        marker.on('click', () => {
          if (onAlertClick) {
            onAlertClick(pt.primaryAlert, pt.lat, pt.lng);
          }
        });

        alertMarkersLayerGroupRef.current?.addLayer(marker);
      });
    }
  }, [
    map,
    alerts,
    showAlerts,
    showAlertPolygons,
    showAlertMarkers,
    alertsOpacity,
    alertsStrokeWidth,
    language,
    oblastsGeojson,
    raionsGeojson,
    onAlertClick,
  ]);

  // Trigger render when alerts, boundaries, zoom or settings change
  useEffect(() => {
    renderAlerts();
  }, [renderAlerts, zoomLevel]);

  return null;
};
