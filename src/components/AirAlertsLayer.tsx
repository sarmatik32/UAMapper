import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from '../leaflet-fix';
import { AirAlert, Language } from '../types';
import { matchAlertToFeature, getAlertVisuals, formatAlertDuration, formatTimeOnly } from '../utils/alertsService';
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

  const alertPolygonsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const alertMarkersLayerGroupRef = useRef<L.LayerGroup | null>(null);

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
      // Create dedicated pane if doesn't exist
      if (!map.getPane('airAlertsPolygonsPane')) {
        const pane = map.createPane('airAlertsPolygonsPane');
        pane.style.zIndex = '350'; // Above tile layers, below markers
      }
      alertPolygonsLayerGroupRef.current = L.layerGroup([], {
        pane: 'airAlertsPolygonsPane',
      } as any).addTo(map);
    }

    if (!alertMarkersLayerGroupRef.current) {
      if (!map.getPane('airAlertsMarkersPane')) {
        const pane = map.createPane('airAlertsMarkersPane');
        pane.style.zIndex = '620'; // Above standard icons
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
    const activeCityAlerts = alerts.filter((a) => a.location_type === 'city' || a.location_type === 'hromada');

    // --- A. Render Oblast Polygons ---
    if (showAlertPolygons && oblastsGeojson && oblastsGeojson.features) {
      oblastsGeojson.features.forEach((feature: any) => {
        const matchedAlert = activeOblastAlerts.find((alert) =>
          matchAlertToFeature(alert, feature.properties)
        );

        if (matchedAlert) {
          const visuals = getAlertVisuals(matchedAlert.alert_type, language);
          const duration = formatAlertDuration(matchedAlert.started_at, language);
          const time = formatTimeOnly(matchedAlert.started_at);

          const polyLayer = L.geoJSON(feature, {
            pane: 'airAlertsPolygonsPane',
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
              <div class="flex items-center gap-1.5 font-bold text-sm text-red-600 border-b border-red-100 pb-1.5 mb-1.5">
                <span class="text-base animate-pulse">🚨</span>
                <span>${matchedAlert.location_title}</span>
              </div>
              <div class="text-xs space-y-1">
                <div class="flex justify-between items-center text-slate-600">
                  <span>${language === 'uk' ? 'Тип загрози:' : 'Threat Type:'}</span>
                  <span class="font-bold text-red-700">${visuals.title}</span>
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
          const visuals = getAlertVisuals(matchedAlert.alert_type, language);
          const duration = formatAlertDuration(matchedAlert.started_at, language);
          const time = formatTimeOnly(matchedAlert.started_at);

          const polyLayer = L.geoJSON(feature, {
            pane: 'airAlertsPolygonsPane',
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
              <div class="flex items-center gap-1.5 font-bold text-sm text-red-600 border-b border-red-100 pb-1.5 mb-1.5">
                <span class="text-base animate-pulse">⚠️</span>
                <span>${matchedAlert.location_title}</span>
              </div>
              <div class="text-xs space-y-1">
                ${matchedAlert.location_oblast ? `<div class="text-[11px] text-slate-500">${matchedAlert.location_oblast}</div>` : ''}
                <div class="flex justify-between items-center text-slate-600">
                  <span>${language === 'uk' ? 'Тип загрози:' : 'Threat Type:'}</span>
                  <span class="font-bold text-red-700">${visuals.title}</span>
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

    // --- C. Render City / Hromada Siren Radar Markers ---
    if (showAlertMarkers && alerts.length > 0) {
      // Find coordinates for city & hromada alerts, as well as specific notable active alerts
      alerts.forEach((alert) => {
        // Try to find matching coordinates in SETTLEMENTS list
        const normAlertTitle = alert.location_title.toLowerCase().replace(/[\s\-_'’`ʼ\.]/g, '');
        const matchedSettlement = SETTLEMENTS.find((s) => {
          const normName = s.name.toLowerCase().replace(/[\s\-_'’`ʼ\.]/g, '');
          return normAlertTitle.includes(normName) || normName.includes(normAlertTitle);
        });

        if (matchedSettlement || alert.location_type === 'city' || alert.location_type === 'hromada') {
          const lat = matchedSettlement?.lat;
          const lng = matchedSettlement?.lng;

          if (lat !== undefined && lng !== undefined) {
            const visuals = getAlertVisuals(alert.alert_type, language);
            const duration = formatAlertDuration(alert.started_at, language);

            const isCityAlert = alert.location_type === 'city' || alert.location_type === 'hromada';

            const sirenMarkerHtml = `
              <div class="relative flex items-center justify-center cursor-pointer group select-none">
                <!-- Outer Pulsing Radar Ring -->
                <div class="absolute w-12 h-12 rounded-full animate-ping opacity-60 pointer-events-none" style="background-color: ${visuals.color};"></div>
                <div class="absolute w-8 h-8 rounded-full animate-pulse opacity-40 pointer-events-none" style="background-color: ${visuals.color};"></div>
                
                <!-- Main Badge Core -->
                <div class="relative z-10 flex items-center gap-1 px-2 py-1 rounded-full shadow-2xl border-2 border-white backdrop-blur-md transition-transform group-hover:scale-110" style="background-color: ${visuals.fillColor};">
                  <span class="text-xs animate-bounce">🚨</span>
                  <span class="text-[11px] font-black text-white whitespace-nowrap tracking-wide uppercase">${alert.location_title}</span>
                  ${isCityAlert ? `<span class="bg-black/40 text-[9px] font-mono px-1 py-0.2 rounded text-amber-200">${duration}</span>` : ''}
                </div>
              </div>
            `;

            const icon = L.divIcon({
              className: 'air-alert-siren-marker',
              html: sirenMarkerHtml,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            });

            const marker = L.marker([lat, lng], {
              icon,
              pane: 'airAlertsMarkersPane',
              zIndexOffset: 2500,
            });

            const popupHtml = `
              <div class="p-2 min-w-[200px] text-slate-800 font-sans select-none">
                <div class="flex items-center gap-1.5 font-bold text-sm text-red-600 border-b border-red-100 pb-1.5 mb-1.5">
                  <span class="text-base animate-pulse">🚨</span>
                  <span>${alert.location_title}</span>
                </div>
                <div class="text-xs space-y-1">
                  ${alert.location_oblast ? `<div class="text-[11px] text-slate-500">${alert.location_oblast}</div>` : ''}
                  <div class="flex justify-between items-center text-slate-600">
                    <span>${language === 'uk' ? 'Тип загрози:' : 'Threat Type:'}</span>
                    <span class="font-bold text-red-700">${visuals.title}</span>
                  </div>
                  <div class="flex justify-between items-center text-slate-600">
                    <span>${language === 'uk' ? 'Початок:' : 'Started:'}</span>
                    <span class="font-mono font-bold">${formatTimeOnly(alert.started_at)}</span>
                  </div>
                  <div class="flex justify-between items-center text-slate-600">
                    <span>${language === 'uk' ? 'Тривалість:' : 'Duration:'}</span>
                    <span class="font-mono font-bold text-amber-700">${duration}</span>
                  </div>
                  ${alert.notes ? `<div class="mt-1 text-[10px] text-slate-500 italic">${alert.notes}</div>` : ''}
                </div>
              </div>
            `;

            marker.bindPopup(popupHtml, {
              className: 'air-alert-leaflet-popup',
            });

            marker.on('click', () => {
              if (onAlertClick) {
                onAlertClick(alert, lat, lng);
              }
            });

            alertMarkersLayerGroupRef.current?.addLayer(marker);
          }
        }
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

  // Trigger render when alerts or boundaries or settings change
  useEffect(() => {
    renderAlerts();
  }, [renderAlerts]);

  return null;
};
