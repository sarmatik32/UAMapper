import React, { useState, useEffect, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { CustomMarker, TileLayerConfig, Language, InteractionMode, DrawnLine, LineEndpointType, LineDrawMethod, WatermarkType, AirAlert, MapFontFamily, IconPreset, MapLegendConfig, DeepStateOccupiedConfig, UkraineBoundaryConfig, BoundaryStyleConfig } from './types';
import { MapContainer, MapContainerRef } from './components/MapContainer';
import { Sidebar } from './components/Sidebar';
import { AddSettlementModal } from './components/AddSettlementModal';
import { TelegramExportModal } from './components/TelegramExportModal';
import { AirAlertsPanel } from './components/AirAlertsPanel';
import { fetchActiveAlerts } from './utils/alertsService';
import { Settlement, SettlementCategory, SETTLEMENTS } from './data/settlements';
import { safeSetItem } from './utils/storage';
import { preloadFontEmbedCSS } from './utils/mapFonts';
import { RotateCw, Compass, Sparkles, AlertCircle, Sliders, PenTool, Hand, RotateCcw, Trash2, Check, Camera, Sun, Moon, Spline, Ruler, ShieldAlert, Building2, Edit2, X, Radio, Bell, PanelRightOpen, PanelRightClose, Copy } from 'lucide-react';
import { ICON_TYPES } from './components/IconLibrary';

const TILE_LAYERS: TileLayerConfig[] = [
  {
    id: 'carto_dark',
    nameEn: 'Dark Canvas (Clean)',
    nameUa: 'Темна (Чиста, без водяних знаків)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    tms: false,
    subdomains: '',
    maxZoom: 19,
    attribution: '© Esri, HERE, Garmin, NGA, USGS',
    requiresKey: false,
    isDark: true,
  },
  {
    id: 'carto_light',
    nameEn: 'Light Canvas (Clean)',
    nameUa: 'Світла (Чиста, без водяних знаків)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    tms: false,
    subdomains: '',
    maxZoom: 19,
    attribution: '© Esri, HERE, Garmin, NGA, USGS',
    requiresKey: false,
    isDark: false,
  },
  {
    id: 'carto_voyager',
    nameEn: 'Detailed Street Map',
    nameUa: 'Детальна вулична (Street Map)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    tms: false,
    subdomains: '',
    maxZoom: 19,
    attribution: '© Esri, HERE, Garmin, USGS',
    requiresKey: false,
    isDark: false,
  },
  {
    id: 'deepstatemap',
    nameEn: 'DeepStateMap.live (Tactical)',
    nameUa: 'DeepStateMap.live (Тактична карта)',
    url: 'https://st1.deepstatemap.live/styles/DSUkraineUk/{z}/{x}/{y}{r}.webp',
    tms: false,
    subdomains: '',
    minZoom: 2,
    maxZoom: 19,
    attribution: '© DeepStateMap.live, OpenStreetMap contributors',
    requiresKey: false,
    isDark: false,
  },
  {
    id: 'apple_maps',
    nameEn: 'Apple Maps (Standard Light, Clean)',
    nameUa: 'Apple Maps (Світла, без водяних знаків)',
    url: '/api/tiles/apple/{z}/{x}/{y}.png',
    tms: false,
    subdomains: '',
    minZoom: 1,
    maxZoom: 19,
    attribution: '© Apple Maps (maps.apple.com)',
    requiresKey: false,
    isDark: false,
  },
  {
    id: 'apple_maps_satellite',
    nameEn: 'Apple Maps Satellite (Clean, High-Res)',
    nameUa: 'Apple Maps Супутник (Чистий супутник Apple)',
    url: '/api/tiles/apple-satellite/{z}/{x}/{y}.jpg',
    tms: false,
    subdomains: '',
    minZoom: 2,
    maxZoom: 19,
    attribution: '© Apple Maps (maps.apple.com)',
    requiresKey: false,
    isDark: true,
  },
  {
    id: 'apple_maps_hybrid',
    nameEn: 'Apple Maps Hybrid (Satellite + Labels)',
    nameUa: 'Apple Maps Гібрид (Супутник + Підписи українською)',
    url: '/api/tiles/apple-satellite/{z}/{x}/{y}.jpg',
    overlayUrl: '/api/tiles/apple-hybrid/{z}/{x}/{y}.png',
    tms: false,
    subdomains: '',
    minZoom: 2,
    maxZoom: 19,
    attribution: '© Apple Maps (maps.apple.com)',
    requiresKey: false,
    isDark: true,
  },
  {
    id: 'osm',
    nameEn: 'OpenStreetMap (Standard)',
    nameUa: 'OpenStreetMap Стандартна',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tms: false,
    subdomains: 'abc',
    maxZoom: 19,
    attribution: 'Map data © OpenStreetMap contributors',
    requiresKey: false,
    isDark: false,
  },
  {
    id: 'esri_satellite',
    nameEn: 'Esri World Imagery (Satellite)',
    nameUa: 'Супутникова карта Esri Satellite (Підписи міст та сіл українською)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: '/api/tiles/apple-hybrid/{z}/{x}/{y}.png',
    tms: false,
    subdomains: '',
    maxZoom: 19,
    attribution: '© Esri, DigitalGlobe, © Apple Maps (Підписи українською)',
    requiresKey: false,
    isDark: true,
  },
  {
    id: 'visicom',
    nameEn: 'Visicom Maps (Requires API Key to remove watermark)',
    nameUa: 'Візіком Карта (Потрібен API-ключ для прибрання водяного знаку)',
    url: 'https://tms{s}.visicom.ua/2.0.0/planet3/base/{z}/{x}/{y}.png?key={key}',
    tms: true,
    subdomains: '0123',
    maxZoom: 19,
    attribution: '© Visicom (Візіком)',
    requiresKey: true,
    isDark: false,
  },
];

// Default Ukraine Air Threat Tactical Markers in Kryvyi Rih region
const DEFAULT_MARKERS: CustomMarker[] = [
  {
    id: 'threat_krr_center',
    lat: 47.90,
    lng: 33.34,
    title: 'Кривий Ріг (Центр)',
    description: 'Розвідувальний БпЛА здійснює збір даних',
    color: '#ef4444',
    borderColor: '#ffffff',
    size: 28,
    rotation: 220,
    iconType: 'uav-recon',
    draggable: true,
    labelVisible: true,
    endPointStyle: 'none',
    endLat: 47.83,
    endLng: 33.22,
  },
  {
    id: 'threat_krr_saksahan',
    lat: 47.95,
    lng: 33.41,
    title: 'Саксаганський р-н',
    description: 'Керована авіаційна бомба в напрямку міста',
    color: '#f97316',
    borderColor: '#ffffff',
    size: 28,
    rotation: 200,
    iconType: 'bomb-air',
    draggable: true,
    labelVisible: true,
    endPointStyle: 'none',
    endLat: 47.91,
    endLng: 33.39,
  },
  {
    id: 'threat_krr_radushna',
    lat: 47.82,
    lng: 33.51,
    title: 'Радушна',
    description: 'Ударний БпЛА типу "Шахед" вздовж траси',
    color: '#ef4444',
    borderColor: '#ffffff',
    size: 28,
    rotation: 215,
    iconType: 'uav-kamikaze',
    draggable: true,
    labelVisible: true,
    endPointStyle: 'none',
    endLat: 47.75,
    endLng: 33.42,
  },
  {
    id: 'threat_krr_pokrovsky',
    lat: 48.06,
    lng: 33.46,
    title: 'Покровський р-н',
    description: 'Швидкісна ракета повз район',
    color: '#ef4444',
    borderColor: '#ffffff',
    size: 32,
    rotation: 180,
    iconType: 'missile-cruise',
    draggable: true,
    labelVisible: true,
    endPointStyle: 'none',
  },
];

export function getDefaultIconName(iconType: string, language: Language): string {
  const found = ICON_TYPES.find((t) => t.id === iconType);
  if (found) {
    return language === 'uk' ? found.nameUa : found.nameEn;
  }
  return language === 'uk' ? 'Маркер' : 'Marker';
}

export default function App() {
  const mapRef = useRef<MapContainerRef | null>(null);
  const [clearAllTrigger, setClearAllTrigger] = useState<number>(0);

  const [customIconTitles, setCustomIconTitles] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('visicom_custom_icon_titles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const handleUpdateCustomIconTitle = (iconType: string, title: string) => {
    setCustomIconTitles((prev) => {
      const next = { ...prev, [iconType]: title };
      localStorage.setItem('visicom_custom_icon_titles', JSON.stringify(next));
      return next;
    });
  };

  // Per-icon custom saved settings profile (color, size, rotation, label, zone, line endpoint, etc.)
  const [iconPresets, setIconPresets] = useState<Record<string, IconPreset>>(() => {
    const saved = localStorage.getItem('visicom_icon_presets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      'uav-recon': {
        color: '#ef4444',
        borderColor: '#ffffff',
        size: 32,
        rotation: 0,
        draggable: true,
        labelVisible: true,
        endPointStyle: 'none',
        lineWidth: 3,
        hasZone: false,
        zoneColor: '#ef4444',
        zoneRadiusKm: 10,
        zoneSize: 10,
      },
      'missile-cruise': {
        color: '#ef4444',
        borderColor: '#ffffff',
        size: 32,
        rotation: 180,
        draggable: true,
        labelVisible: true,
        endPointStyle: 'none',
        lineWidth: 3,
        hasZone: false,
        zoneColor: '#ef4444',
        zoneRadiusKm: 25,
        zoneSize: 25,
      },
      'explosion': {
        color: '#eab308',
        borderColor: '#ffffff',
        size: 36,
        rotation: 0,
        draggable: true,
        labelVisible: true,
        endPointStyle: 'none',
        lineWidth: 3,
        hasZone: false,
        zoneColor: '#eab308',
        zoneRadiusKm: 5,
        zoneSize: 5,
      },
    };
  });

  const handleUpdateIconPreset = useCallback((iconType: string, presetUpdates: Partial<IconPreset>) => {
    if (!iconType) return;
    setIconPresets((prev) => {
      const existing = prev[iconType] || {};
      const updated = {
        ...existing,
        ...presetUpdates,
      };
      const next = { ...prev, [iconType]: updated };
      localStorage.setItem('visicom_icon_presets', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleResetIconPreset = useCallback((iconType: string) => {
    if (!iconType) return;
    setIconPresets((prev) => {
      const next = { ...prev };
      delete next[iconType];
      localStorage.setItem('visicom_icon_presets', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleApplyPresetToAllIcons = useCallback((preset: Partial<IconPreset>) => {
    setIconPresets((prev) => {
      const next: Record<string, IconPreset> = { ...prev };
      ICON_TYPES.forEach((t) => {
        next[t.id] = {
          ...(prev[t.id] || {}),
          ...preset,
        };
      });
      try {
        const rawCustom = localStorage.getItem('visicom_custom_library');
        if (rawCustom) {
          const parsed = JSON.parse(rawCustom);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item && item.id) {
                next[item.id] = {
                  ...(prev[item.id] || {}),
                  ...preset,
                };
              }
            });
          }
        }
      } catch (e) {}
      localStorage.setItem('visicom_icon_presets', JSON.stringify(next));
      return next;
    });
  }, []);

  const [markers, setMarkers] = useState<CustomMarker[]>(() => {
    try {
      const saved = localStorage.getItem('visicom_custom_markers');
      const loaded = saved ? JSON.parse(saved) : DEFAULT_MARKERS;
      return (Array.isArray(loaded) ? loaded : DEFAULT_MARKERS)
        .filter((m: any) => m && !isNaN(Number(m.lat)) && !isNaN(Number(m.lng)))
        .map((m: any) => ({
          ...m,
          lat: Number(m.lat),
          lng: Number(m.lng),
          rotation: isNaN(Number(m.rotation)) ? 0 : Number(m.rotation),
          endLat: m.endLat !== undefined && !isNaN(Number(m.endLat)) ? Number(m.endLat) : undefined,
          endLng: m.endLng !== undefined && !isNaN(Number(m.endLng)) ? Number(m.endLng) : undefined,
          endPointStyle: m.endPointStyle === 'explosion' || m.endPointStyle === 'line' ? m.endPointStyle : 'none',
        }));
    } catch (e) {
      return DEFAULT_MARKERS;
    }
  });

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Drawn Lines State
  const [drawnLines, setDrawnLines] = useState<DrawnLine[]>(() => {
    try {
      const saved = localStorage.getItem('visicom_drawn_lines');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .map((l: any) => ({
              ...l,
              points: (l.points || [])
                .filter((pt: any) => Array.isArray(pt) && !isNaN(Number(pt[0])) && !isNaN(Number(pt[1])))
                .map((pt: any) => [Number(pt[0]), Number(pt[1])]),
              startPointStyle: l.startPointStyle === 'arrow' || l.startPointStyle === 'explosion' || l.startPointStyle === 'custom_icon' ? l.startPointStyle : 'none',
              endPointStyle: l.endPointStyle === 'arrow' || l.endPointStyle === 'explosion' || l.endPointStyle === 'custom_icon' ? l.endPointStyle : 'none',
            }))
            .filter((l: any) => l.points.length >= 2);
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  // Line drawing settings state
  const [lineColor, setLineColor] = useState<string>('#ef4444');
  const [lineWeight, setLineWeight] = useState<number>(5);
  const [lineSmoothed, setLineSmoothed] = useState<boolean>(true);
  const [lineStartStyle, setLineStartStyle] = useState<LineEndpointType>('none');
  const [lineStartCustomIcon, setLineStartCustomIcon] = useState<string>('');
  const [lineStartIconRotation, setLineStartIconRotation] = useState<number>(0);
  const [lineStartIconSize, setLineStartIconSize] = useState<number>(32);
  const [lineEndStyle, setLineEndStyle] = useState<LineEndpointType>('none');
  const [lineEndCustomIcon, setLineEndCustomIcon] = useState<string>('');
  const [lineEndIconRotation, setLineEndIconRotation] = useState<number>(0);
  const [lineEndIconSize, setLineEndIconSize] = useState<number>(32);
  const [lineDashStyle, setLineDashStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [lineDrawMethod, setLineDrawMethod] = useState<LineDrawMethod>(() => {
    try {
      const saved = localStorage.getItem('visicom_line_draw_method');
      if (saved === 'points' || saved === 'freehand') return saved;
    } catch {}
    return 'freehand'; // Default to freehand (Paint-style auto-smoothed)
  });

  const handleSetLineDrawMethod = useCallback((method: LineDrawMethod) => {
    setLineDrawMethod(method);
    try {
      localStorage.setItem('visicom_line_draw_method', method);
    } catch {}
  }, []);

  // Tactical Conventional Signs Legend ("УМОВНІ ПОЗНАЧЕННЯ:") state
  const [mapLegendConfig, setMapLegendConfig] = useState<MapLegendConfig>(() => {
    try {
      const saved = localStorage.getItem('tactical_map_legend_cfg');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      enabled: false,
      title: 'УМОВНІ ПОЗНАЧЕННЯ:',
      position: 'bottom-left',
      items: [],
    };
  });

  const handleUpdateMapLegendConfig = useCallback((cfg: MapLegendConfig) => {
    setMapLegendConfig(cfg);
    try {
      localStorage.setItem('tactical_map_legend_cfg', JSON.stringify(cfg));
    } catch {}
  }, []);

  // Custom Icons Library (custom uploaded PNG / SVG / JPG icons) state
  const [customLibrary, setCustomLibrary] = useState<{ id: string; name: string; dataUrl: string }[]>(() => {
    try {
      const saved = localStorage.getItem('visicom_custom_library');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleUpdateCustomLibrary = useCallback((lib: { id: string; name: string; dataUrl: string }[]) => {
    setCustomLibrary(lib);
    safeSetItem('visicom_custom_library', JSON.stringify(lib));
  }, []);

  const handleAddDrawnLine = (newLine: DrawnLine) => {
    setDrawnLines((prev) => {
      const updated = [...prev, newLine];
      try {
        localStorage.setItem('visicom_drawn_lines', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setSelectedLineId(newLine.id);
  };

  const handleUpdateDrawnLine = (updatedLine: DrawnLine) => {
    setDrawnLines((prev) => {
      const updated = prev.map((l) => (l.id === updatedLine.id ? updatedLine : l));
      try {
        localStorage.setItem('visicom_drawn_lines', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleDeleteDrawnLine = (lineId: string) => {
    setDrawnLines((prev) => {
      const updated = prev.filter((l) => l.id !== lineId);
      try {
        localStorage.setItem('visicom_drawn_lines', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    if (selectedLineId === lineId) {
      setSelectedLineId(null);
    }
  };

  const handleClearDrawnLines = () => {
    setDrawnLines([]);
    setSelectedLineId(null);
    localStorage.removeItem('visicom_drawn_lines');
  };

  const [activeTileLayer, setActiveTileLayer] = useState<TileLayerConfig>(() => {
    const savedId = localStorage.getItem('visicom_active_layer');
    if (savedId === 'esri_light_gray') {
      const light = TILE_LAYERS.find((l) => l.id === 'carto_light' || l.id === 'apple_maps');
      if (light) return light;
    }
    if (savedId === 'esri_dark_gray') {
      const dark = TILE_LAYERS.find((l) => l.id === 'carto_dark');
      if (dark) return dark;
    }
    if (savedId === 'esri_topo') {
      const deepstate = TILE_LAYERS.find((l) => l.id === 'deepstatemap');
      if (deepstate) return deepstate;
    }
    const matched = TILE_LAYERS.find((l) => l.id === savedId);
    return matched || TILE_LAYERS.find((l) => l.id === 'apple_maps') || TILE_LAYERS.find((l) => l.id === 'carto_dark') || TILE_LAYERS[0];
  });

  const [watermarkType, setWatermarkType] = useState<WatermarkType>(() => {
    return (localStorage.getItem('visicom_watermark_type') as WatermarkType) || 'text';
  });

  const [watermarkText, setWatermarkText] = useState<string>(() => {
    return localStorage.getItem('visicom_watermark_text') || 'UA Mapper';
  });

  const [watermarkImageUrl, setWatermarkImageUrl] = useState<string>(() => {
    return localStorage.getItem('visicom_watermark_image_url') || '';
  });

  const [watermarkSize, setWatermarkSize] = useState<number>(() => {
    const saved = localStorage.getItem('visicom_watermark_size');
    return saved ? Number(saved) : 14;
  });

  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('visicom_watermark_opacity');
    return saved !== null ? Number(saved) : 0.10;
  });

  const [watermarkRotation, setWatermarkRotation] = useState<number>(() => {
    const saved = localStorage.getItem('visicom_watermark_rotation');
    return saved !== null ? Number(saved) : -25;
  });

  const [showLegendOverlay, setShowLegendOverlay] = useState<boolean>(() => {
    const saved = localStorage.getItem('visicom_show_legend_overlay');
    return saved !== null ? saved === 'true' : true;
  });

  const [showLogoAndLegendOnMap, setShowLogoAndLegendOnMap] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_logo_and_legend_on_map');
    return saved !== null ? saved === 'true' : true;
  });

  const [legendOverlayText, setLegendOverlayText] = useState<string>(() => {
    const saved = localStorage.getItem('visicom_legend_overlay_text');
    return saved !== null 
      ? saved 
      : 'Ця карта має інформаційний характер, не є офіційним джерелом. Дані які відображені на карті сформовані виключно на основі інформації з каналу @krrig_alerts';
  });

  const [showRadarOverlay, setShowRadarOverlay] = useState<boolean>(() => {
    const saved = localStorage.getItem('visicom_show_radar_overlay');
    return saved !== null ? saved === 'true' : true;
  });

  const [blurMapOnExport, setBlurMapOnExport] = useState<boolean>(() => {
    const saved = localStorage.getItem('visicom_blur_map_on_export');
    return saved !== null ? saved === 'true' : false;
  });

  const [showCityBoundary, setShowCityBoundary] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_city_boundary');
    return saved !== null ? saved === 'true' : true;
  });

  const [showDistrictBoundary, setShowDistrictBoundary] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_district_boundary');
    return saved !== null ? saved === 'true' : true;
  });

  const [cityBoundaryConfig, setCityBoundaryConfig] = useState<BoundaryStyleConfig>(() => {
    const saved = localStorage.getItem('uamapper_city_boundary_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      enabled: true,
      color: '#38bdf8',
      weight: 2.0,
      opacity: 0.95,
      strokeStyle: 'dashed',
    };
  });

  const handleUpdateCityBoundaryConfig = (updates: Partial<BoundaryStyleConfig>) => {
    setCityBoundaryConfig(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('uamapper_city_boundary_config', JSON.stringify(next));
      return next;
    });
  };

  const [districtBoundaryConfig, setDistrictBoundaryConfig] = useState<BoundaryStyleConfig>(() => {
    const saved = localStorage.getItem('uamapper_district_boundary_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      enabled: true,
      color: '#10b981',
      weight: 2.2,
      opacity: 0.95,
      strokeStyle: 'solid',
    };
  });

  const handleUpdateDistrictBoundaryConfig = (updates: Partial<BoundaryStyleConfig>) => {
    setDistrictBoundaryConfig(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('uamapper_district_boundary_config', JSON.stringify(next));
      return next;
    });
  };

  const [hromadaBoundariesConfig, setHromadaBoundariesConfig] = useState<BoundaryStyleConfig>(() => {
    const saved = localStorage.getItem('uamapper_hromada_boundaries_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      enabled: true,
      color: '#475569',
      weight: 1.4,
      opacity: 0.85,
      strokeStyle: 'dashed',
    };
  });

  const handleUpdateHromadaBoundariesConfig = (updates: Partial<BoundaryStyleConfig>) => {
    setHromadaBoundariesConfig(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('uamapper_hromada_boundaries_config', JSON.stringify(next));
      return next;
    });
  };

  const [showUkraineBoundary, setShowUkraineBoundary] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_ukraine_boundary');
    return saved !== null ? saved === 'true' : true;
  });

  const [ukraineBoundaryConfig, setUkraineBoundaryConfig] = useState<UkraineBoundaryConfig>(() => {
    const saved = localStorage.getItem('uamapper_ukraine_boundary_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      enabled: true,
      color: '#f59e0b',
      weight: 2.8,
      opacity: 0.95,
      strokeStyle: 'solid',
    };
  });

  const handleToggleUkraineBoundary = (val: boolean) => {
    setShowUkraineBoundary(val);
    localStorage.setItem('uamapper_show_ukraine_boundary', String(val));
  };

  const handleUpdateUkraineBoundaryConfig = (updates: Partial<UkraineBoundaryConfig>) => {
    setUkraineBoundaryConfig(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('uamapper_ukraine_boundary_config', JSON.stringify(next));
      return next;
    });
  };

  const [showHromadaBoundaries, setShowHromadaBoundaries] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_hromada_boundaries');
    return saved !== null ? saved === 'true' : true;
  });

  const [showQuickSettlements, setShowQuickSettlements] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_quick_settlements');
    return saved !== null ? saved === 'true' : true;
  });

  const handleUpdateShowQuickSettlements = (val: boolean) => {
    setShowQuickSettlements(val);
    localStorage.setItem('uamapper_show_quick_settlements', String(val));
  };

  const [deepStateOccupiedConfig, setDeepStateOccupiedConfig] = useState<DeepStateOccupiedConfig>(() => {
    const defaultCfg: DeepStateOccupiedConfig = {
      enabled: false,
      fillColor: '#b91c1c',
      fillOpacity: 0.35,
      fillPattern: 'solid',
      patternDensity: 10,
      patternStrokeWidth: 1.5,
      patternBgOpacity: 0.1,
      showStroke: true,
      strokeColor: '#7f1d1d',
      strokeWidth: 1.5,
      strokeOpacity: 0.9,
      strokeStyle: 'solid',
      includeGrayZone: true,
      grayZoneFillColor: '#6b7280',
      grayZoneOpacity: 0.25,
      grayZonePattern: 'diagonal-right',
      grayZoneStrokeColor: '#4b5563',
      grayZoneStrokeWidth: 1.2,
      grayZoneStrokeStyle: 'dashed',
    };
    const saved = localStorage.getItem('uamapper_deepstate_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultCfg, ...parsed };
      } catch {}
    }
    return defaultCfg;
  });

  const [deepStateGeoJson, setDeepStateGeoJson] = useState<any>(null);
  const [isLoadingDeepState, setIsLoadingDeepState] = useState<boolean>(false);
  const [deepStateLastSync, setDeepStateLastSync] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('uamapper_deepstate_config', JSON.stringify(deepStateOccupiedConfig));
    } catch {}
  }, [deepStateOccupiedConfig]);

  const handleUpdateDeepStateConfig = useCallback((updates: Partial<DeepStateOccupiedConfig>) => {
    setDeepStateOccupiedConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleToggleDeepStateOccupied = useCallback((enabled: boolean) => {
    setDeepStateOccupiedConfig((prev) => ({ ...prev, enabled }));
  }, []);

  const fetchDeepStateData = useCallback(async () => {
    setIsLoadingDeepState(true);
    try {
      const res = await fetch('/api/deepstatemap/occupied');
      if (res.ok) {
        const data = await res.json();
        setDeepStateGeoJson(data);
        const timeStr = data.datetime || (data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setDeepStateLastSync(timeStr);
      }
    } catch (e) {
      console.warn('Failed to fetch DeepState data:', e);
    } finally {
      setIsLoadingDeepState(false);
    }
  }, []);

  useEffect(() => {
    if (deepStateOccupiedConfig.enabled && !deepStateGeoJson && !isLoadingDeepState) {
      fetchDeepStateData();
    }
  }, [deepStateOccupiedConfig.enabled, deepStateGeoJson, isLoadingDeepState, fetchDeepStateData]);

  const [mapFont, setMapFont] = useState<MapFontFamily>(() => {
    const saved = localStorage.getItem('uamapper_map_font');
    return (saved as MapFontFamily) || 'inter';
  });

  useEffect(() => {
    preloadFontEmbedCSS(mapFont);
  }, [mapFont]);

  const handleUpdateMapFont = (font: MapFontFamily) => {
    setMapFont(font);
    localStorage.setItem('uamapper_map_font', font);
    preloadFontEmbedCSS(font);
  };

  const [showSettlementLabels, setShowSettlementLabels] = useState<boolean>(() => {
    const saved = localStorage.getItem('visicom_show_settlement_labels');
    return saved !== null ? saved === 'true' : true;
  });

  const [settlementLabelMode, setSettlementLabelMode] = useState<'all' | 'districts_cities' | 'districts_only'>(() => {
    const saved = localStorage.getItem('visicom_settlement_label_mode');
    return (saved as any) || 'all';
  });

  const [disabledSettlementCategories, setDisabledSettlementCategories] = useState<SettlementCategory[]>(() => {
    try {
      const saved = localStorage.getItem('visicom_disabled_settlement_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleSettlementLabels = (show: boolean) => {
    setShowSettlementLabels(show);
    localStorage.setItem('visicom_show_settlement_labels', String(show));
  };

  const handleToggleSettlementCategory = (category: SettlementCategory) => {
    setDisabledSettlementCategories((prev) => {
      const isCurrentlyDisabled = prev.includes(category);
      const updated = isCurrentlyDisabled
        ? prev.filter((c) => c !== category)
        : [...prev, category];
      localStorage.setItem('visicom_disabled_settlement_categories', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSetSettlementLabelMode = (mode: 'all' | 'districts_cities' | 'districts_only') => {
    setSettlementLabelMode(mode);
    localStorage.setItem('visicom_settlement_label_mode', mode);

    let newDisabled: SettlementCategory[] = [];
    if (mode === 'districts_only') {
      newDisabled = ['city', 'town', 'village', 'small_village'];
    } else if (mode === 'districts_cities') {
      newDisabled = ['town', 'village', 'small_village'];
    } else {
      newDisabled = [];
    }
    setDisabledSettlementCategories(newDisabled);
    localStorage.setItem('visicom_disabled_settlement_categories', JSON.stringify(newDisabled));
  };

  const [customSettlements, setCustomSettlements] = useState<Settlement[]>(() => {
    try {
      const saved = localStorage.getItem('visicom_custom_settlements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('visicom_custom_settlements', JSON.stringify(customSettlements));
    } catch (err) {
      console.error('Failed to sync custom settlements:', err);
    }
  }, [customSettlements]);

  const [isAddSettlementModalOpen, setIsAddSettlementModalOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [pendingSettlementLatLng, setPendingSettlementLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const handleAddCustomSettlementPoint = (lat: number, lng: number) => {
    setEditingSettlement(null);
    setPendingSettlementLatLng({ lat, lng });
    setIsAddSettlementModalOpen(true);
  };

  const handleEditSettlement = (settlement: Settlement) => {
    setEditingSettlement(settlement);
    setPendingSettlementLatLng({ lat: settlement.lat, lng: settlement.lng });
    setIsAddSettlementModalOpen(true);
  };

  const handleSaveCustomSettlement = (savedSettlement: Settlement) => {
    setCustomSettlements((prev) => {
      const existsIndex = prev.findIndex((s) => s.id === savedSettlement.id);
      let updated: Settlement[];
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = savedSettlement;
      } else {
        updated = [...prev, savedSettlement];
      }
      localStorage.setItem('visicom_custom_settlements', JSON.stringify(updated));
      return updated;
    });
    setShowSettlementLabels(true);
    localStorage.setItem('visicom_show_settlement_labels', 'true');
  };

  // Telegram Export state & handler
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramImageBlob, setTelegramImageBlob] = useState<Blob | null>(null);
  const [isCapturingTelegram, setIsCapturingTelegram] = useState(false);

  const captureTelegramImage = async () => {
    setIsCapturingTelegram(true);
    try {
      if (mapRef.current?.getMapBlob) {
        const blob = await mapRef.current.getMapBlob('export');
        setTelegramImageBlob(blob);
      }
    } catch (e) {
      console.error('Failed to capture map for Telegram', e);
    } finally {
      setIsCapturingTelegram(false);
    }
  };

  const handleExportTelegram = () => {
    setIsTelegramModalOpen(true);
    if (mobileView !== 'map') {
      setMobileView('map');
      setTimeout(() => {
        captureTelegramImage();
      }, 450);
    } else {
      captureTelegramImage();
    }
  };

  const handleDeleteCustomSettlement = (id: string) => {
    setCustomSettlements((prev) => {
      let updated: Settlement[];
      if (id.startsWith('custom_')) {
        updated = prev.filter((s) => s.id !== id);
      } else {
        const existsIndex = prev.findIndex((s) => s.id === id);
        const deletedMarker = { id, name: '', type: 'village', lat: 0, lng: 0, priority: 5, isDeleted: true } as Settlement;
        if (existsIndex >= 0) {
          updated = [...prev];
          updated[existsIndex] = deletedMarker;
        } else {
          updated = [...prev, deletedMarker];
        }
      }
      localStorage.setItem('visicom_custom_settlements', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllCustomSettlements = () => {
    setCustomSettlements((prev) => {
      const updated = prev.filter((s) => !s.id.startsWith('custom_'));
      localStorage.setItem('visicom_custom_settlements', JSON.stringify(updated));
      return updated;
    });
  };

  const handleExportCustomSettlements = () => {
    const userCustomSettlements = customSettlements.filter(
      (s) => s.id.startsWith('custom_') && !(s as any).isDeleted
    );
    if (userCustomSettlements.length === 0) {
      alert(language === 'uk' ? 'Немає власних точок для експорту!' : 'No custom settlement points to export!');
      return;
    }
    const exportData = {
      version: 1,
      type: 'custom_settlements',
      exportedAt: new Date().toISOString(),
      settlements: userCustomSettlements,
    };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `custom_settlements_${dateStr}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCustomSettlements = (importedSettlements: Settlement[]) => {
    if (!Array.isArray(importedSettlements) || importedSettlements.length === 0) {
      alert(language === 'uk' ? 'Недійсний файл або порожній список точок!' : 'Invalid file or empty list of points!');
      return;
    }

    setCustomSettlements((prev) => {
      const updatedMap = new Map(prev.map((s) => [s.id, s]));
      let addedCount = 0;

      importedSettlements.forEach((s) => {
        if (!s || typeof s.lat !== 'number' || typeof s.lng !== 'number') return;
        const validId = s.id ? (s.id.startsWith('custom_') ? s.id : `custom_${s.id}`) : `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const itemToSave: Settlement = {
          ...s,
          id: validId,
          type: s.type || 'village',
          name: s.name || 'Населений пункт',
        };
        if (!updatedMap.has(validId)) {
          addedCount++;
        }
        updatedMap.set(validId, itemToSave);
      });

      const updated = Array.from(updatedMap.values());
      localStorage.setItem('visicom_custom_settlements', JSON.stringify(updated));

      const countMsg = language === 'uk'
        ? `Успішно імпортовано/оновлено ${importedSettlements.length} точок НП!`
        : `Successfully imported/updated ${importedSettlements.length} settlement points!`;
      alert(countMsg);

      return updated;
    });

    setShowSettlementLabels(true);
    localStorage.setItem('visicom_show_settlement_labels', 'true');
  };

  const [visicomKey, setVisicomKey] = useState<string>(() => {
    const saved = localStorage.getItem('visicom_api_key');
    if (!saved || saved === '3526483023228b81241c7c4a406a1fd9') {
      return 'da8a72ade6f663ff3743cd79f3c2d9f3';
    }
    return saved;
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('visicom_ui_lang') as Language) || 'uk';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('visicom_theme') as 'dark' | 'light') || 'dark';
  });

  const [showAlert, setShowAlert] = useState<boolean>(true);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('draw');

  // --- Real-Time Air Raid Alerts (alerts.in.ua) State ---
  const [activeAlerts, setActiveAlerts] = useState<AirAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);
  const [lastAlertsUpdated, setLastAlertsUpdated] = useState<string | null>(null);
  const [showAlerts, setShowAlerts] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_alerts');
    return saved !== null ? saved === 'true' : true;
  });
  const [showAirAlertsPanel, setShowAirAlertsPanel] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_alerts_panel');
    return saved !== null ? saved === 'true' : false;
  });
  const [showAlertPolygons, setShowAlertPolygons] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_alert_polygons');
    return saved !== null ? saved === 'true' : true;
  });
  const [showAlertMarkers, setShowAlertMarkers] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_alert_markers');
    return saved !== null ? saved === 'true' : true;
  });
  const [alertsOpacity, setAlertsOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('uamapper_alerts_opacity');
    return saved !== null ? Number(saved) : 0.30;
  });
  const [alertsStrokeWidth, setAlertsStrokeWidth] = useState<number>(() => {
    const saved = localStorage.getItem('uamapper_alerts_stroke_width');
    return saved !== null ? Number(saved) : 2.5;
  });
  const [alertSoundEnabled, setAlertSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_alert_sound');
    return saved !== null ? saved === 'true' : false;
  });

  const refreshAlerts = useCallback(async () => {
    setIsLoadingAlerts(true);
    try {
      const data = await fetchActiveAlerts();
      setActiveAlerts(data.alerts || []);
      setLastAlertsUpdated(data.last_updated_at);
    } catch (err) {
      console.warn('Alerts update notice:', err);
    } finally {
      setIsLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    refreshAlerts();
    const interval = setInterval(refreshAlerts, 15000);
    return () => clearInterval(interval);
  }, [refreshAlerts]);

  const handleSelectAlert = useCallback((alert: AirAlert, customLat?: number, customLng?: number) => {
    if (customLat !== undefined && customLng !== undefined) {
      mapRef.current?.centerOnLocation(customLat, customLng);
      return;
    }

    const normAlertTitle = alert.location_title.toLowerCase().replace(/[\s\-_'’`ʼ\.]/g, '');
    const matched = SETTLEMENTS.find((s) => {
      const normName = s.name.toLowerCase().replace(/[\s\-_'’`ʼ\.]/g, '');
      return normAlertTitle.includes(normName) || normName.includes(normAlertTitle);
    });

    if (matched) {
      mapRef.current?.centerOnLocation(matched.lat, matched.lng);
    }
  }, []);

  const ALL_INTERACTION_MODES: InteractionMode[] = ['draw', 'pan', 'line', 'measure', 'redzone', 'settlement'];

  const handleCycleInteractionMode = () => {
    const currentIndex = ALL_INTERACTION_MODES.indexOf(interactionMode);
    const nextIndex = (currentIndex + 1) % ALL_INTERACTION_MODES.length;
    setInteractionMode(ALL_INTERACTION_MODES[nextIndex]);
  };

  const getModeInfo = (mode: InteractionMode) => {
    switch (mode) {
      case 'draw':
        return {
          icon: <PenTool className="w-5 h-5" />,
          title: language === 'uk' ? 'Режим: Нанесення значків' : 'Mode: Draw Markers',
        };
      case 'pan':
        return {
          icon: <Hand className="w-5 h-5" />,
          title: language === 'uk' ? 'Режим: Переміщення карти' : 'Mode: Pan Map',
        };
      case 'line':
        return {
          icon: <Spline className="w-5 h-5" />,
          title: language === 'uk' ? 'Режим: Малювання ліній' : 'Mode: Draw Lines',
        };
      case 'measure':
        return {
          icon: <Ruler className="w-5 h-5" />,
          title: language === 'uk' ? 'Режим: Вимірювання' : 'Mode: Measure',
        };
      case 'redzone':
        return {
          icon: <ShieldAlert className="w-5 h-5" />,
          title: language === 'uk' ? 'Режим: Зона ураження' : 'Mode: Red Zone',
        };
      case 'settlement':
        return {
          icon: <Building2 className="w-5 h-5" />,
          title: language === 'uk' ? 'Режим: Населений пункт' : 'Mode: Add Settlement',
        };
      default:
        return {
          icon: <PenTool className="w-5 h-5" />,
          title: language === 'uk' ? 'Режим: Нанесення значків' : 'Mode: Draw Markers',
        };
    }
  };

  useEffect(() => {
    if (interactionMode !== 'line' && selectedLineId !== null) {
      setSelectedLineId(null);
    }
  }, [interactionMode, selectedLineId]);
  const [mobileView, setMobileView] = useState<'map' | 'sidebar'>('map');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('uamapper_sidebar_open', String(next));
      return next;
    });
  };

  const [isQuickCopied, setIsQuickCopied] = useState<boolean>(false);

  const handleQuickCopyBuffer = async () => {
    if (mobileView !== 'map') {
      setMobileView('map');
      setTimeout(async () => {
        const success = await mapRef.current?.copyPNG();
        if (success !== false) {
          setIsQuickCopied(true);
          setTimeout(() => setIsQuickCopied(false), 2000);
        }
      }, 450);
    } else {
      const success = await mapRef.current?.copyPNG();
      if (success !== false) {
        setIsQuickCopied(true);
        setTimeout(() => setIsQuickCopied(false), 2000);
      }
    }
  };

  const [autoHighlightZone, setAutoHighlightZone] = useState<boolean>(() => {
    return localStorage.getItem('visicom_auto_highlight_zone') === 'true';
  });

  const handleToggleAutoHighlightZone = (enabled: boolean) => {
    setAutoHighlightZone(enabled);
    localStorage.setItem('visicom_auto_highlight_zone', enabled ? 'true' : 'false');
  };

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isReloading, setIsReloading] = useState<boolean>(false);

  const handleReloadPage = () => {
    setIsReloading(true);
    window.location.reload();
  };

  // GPS centering handler
  const handleFindMyLocation = () => {
    if (!navigator.geolocation) {
      alert(language === 'uk' ? 'Геолокація не підтримується вашим браузером' : 'Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapRef.current?.centerOnLocation(latitude, longitude, 12);
        setIsLocating(false);
      },
      (error) => {
        console.error('Error finding location', error);
        setIsLocating(false);
        alert(language === 'uk' ? 'Не вдалося визначити місцезнаходження. Будь ласка, дозвольте доступ до GPS у налаштуваннях.' : 'Failed to retrieve location. Please grant GPS permissions.');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Currently active style template for newly created markers
  const [activeStyle, setActiveStyle] = useState<Partial<CustomMarker>>(() => {
    const saved = localStorage.getItem('visicom_active_style');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    // Fallback: try to restore style from the last marker in saved custom markers
    const savedMarkers = localStorage.getItem('visicom_custom_markers');
    if (savedMarkers) {
      try {
        const parsed = JSON.parse(savedMarkers);
        if (parsed && parsed.length > 0) {
          const lastMarker = parsed[parsed.length - 1];
          return {
            color: lastMarker.color,
            borderColor: lastMarker.borderColor || '#ffffff',
            size: lastMarker.size,
            rotation: lastMarker.rotation,
            iconType: lastMarker.iconType,
            draggable: lastMarker.draggable,
            labelVisible: lastMarker.labelVisible,
            endPointStyle: lastMarker.endPointStyle || 'none',
            lineWidth: lastMarker.lineWidth !== undefined ? lastMarker.lineWidth : 3,
            customIconUrl: lastMarker.customIconUrl,
            hasZone: lastMarker.hasZone || false,
            zoneColor: lastMarker.zoneColor || lastMarker.color || '#ef4444',
            zoneRadiusKm: lastMarker.zoneRadiusKm !== undefined ? lastMarker.zoneRadiusKm : (lastMarker.zoneSize && lastMarker.zoneSize <= 200 ? lastMarker.zoneSize : 5),
            zoneSize: lastMarker.zoneSize || 5,
          };
        }
      } catch (e) {
        // ignore
      }
    }
    return {
      color: '#ef4444',
      borderColor: '#ffffff',
      size: 32,
      rotation: 0,
      iconType: 'uav-recon',
      draggable: true,
      labelVisible: true,
      endPointStyle: 'none',
      lineWidth: 3,
      hasZone: false,
      zoneColor: '#ef4444',
      zoneRadiusKm: 10,
      zoneSize: 10,
    };
  });

  const handleUndo = () => {
    if (markers.length === 0) return;
    setMarkers((prev) => prev.slice(0, -1));
    setSelectedMarkerId(null);
  };

  // Persistence to LocalStorage
  useEffect(() => {
    localStorage.setItem('visicom_active_style', JSON.stringify(activeStyle));
  }, [activeStyle]);

  useEffect(() => {
    localStorage.setItem('visicom_custom_markers', JSON.stringify(markers));
  }, [markers]);

  useEffect(() => {
    localStorage.setItem('visicom_active_layer', activeTileLayer.id);
  }, [activeTileLayer]);

  useEffect(() => {
    localStorage.setItem('visicom_api_key', visicomKey);
  }, [visicomKey]);

  useEffect(() => {
    localStorage.setItem('visicom_ui_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('visicom_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('visicom_watermark_type', watermarkType);
  }, [watermarkType]);

  useEffect(() => {
    localStorage.setItem('visicom_watermark_text', watermarkText);
  }, [watermarkText]);

  useEffect(() => {
    if (watermarkImageUrl) {
      safeSetItem('visicom_watermark_image_url', watermarkImageUrl);
    } else {
      localStorage.removeItem('visicom_watermark_image_url');
    }
  }, [watermarkImageUrl]);

  useEffect(() => {
    localStorage.setItem('visicom_watermark_size', String(watermarkSize));
  }, [watermarkSize]);

  useEffect(() => {
    localStorage.setItem('visicom_watermark_opacity', String(watermarkOpacity));
  }, [watermarkOpacity]);

  useEffect(() => {
    localStorage.setItem('visicom_watermark_rotation', String(watermarkRotation));
  }, [watermarkRotation]);

  useEffect(() => {
    localStorage.setItem('visicom_show_legend_overlay', String(showLegendOverlay));
  }, [showLegendOverlay]);

  useEffect(() => {
    localStorage.setItem('uamapper_show_logo_and_legend_on_map', String(showLogoAndLegendOnMap));
  }, [showLogoAndLegendOnMap]);

  useEffect(() => {
    localStorage.setItem('visicom_legend_overlay_text', legendOverlayText);
  }, [legendOverlayText]);

  useEffect(() => {
    localStorage.setItem('visicom_show_radar_overlay', String(showRadarOverlay));
  }, [showRadarOverlay]);

  useEffect(() => {
    localStorage.setItem('uamapper_show_city_boundary', String(showCityBoundary));
  }, [showCityBoundary]);

  useEffect(() => {
    localStorage.setItem('uamapper_show_district_boundary', String(showDistrictBoundary));
  }, [showDistrictBoundary]);

  useEffect(() => {
    localStorage.setItem('uamapper_show_ukraine_boundary', String(showUkraineBoundary));
  }, [showUkraineBoundary]);

  useEffect(() => {
    localStorage.setItem('uamapper_show_hromada_boundaries', String(showHromadaBoundaries));
  }, [showHromadaBoundaries]);

  // Handler: Select base layer
  const handleSelectTileLayer = (layer: TileLayerConfig) => {
    setActiveTileLayer(layer);
  };

  // Handler: Select a marker
  const handleSelectMarker = (id: string | null) => {
    setSelectedMarkerId(id);
    
    // When a marker is selected, sync its style choices as active styles and activate marker draw mode so they stay active per user intent!
    if (id) {
      setSelectedLineId(null);
      setInteractionMode('draw');
      if (!isSidebarOpen && window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      }
      const selectedMarker = markers.find((m) => m.id === id);
      if (selectedMarker) {
        setActiveStyle({
          color: selectedMarker.color,
          borderColor: selectedMarker.borderColor || '#ffffff',
          size: selectedMarker.size,
          rotation: selectedMarker.rotation,
          iconType: selectedMarker.iconType,
          draggable: selectedMarker.draggable,
          labelVisible: selectedMarker.labelVisible,
          endPointStyle: selectedMarker.endPointStyle || 'none',
          lineWidth: selectedMarker.lineWidth !== undefined ? selectedMarker.lineWidth : 3,
          customIconUrl: selectedMarker.customIconUrl,
          hasZone: selectedMarker.hasZone || false,
          zoneColor: selectedMarker.zoneColor || selectedMarker.color || '#ef4444',
          zoneRadiusKm: selectedMarker.zoneRadiusKm !== undefined ? selectedMarker.zoneRadiusKm : (selectedMarker.zoneSize && selectedMarker.zoneSize <= 200 ? selectedMarker.zoneSize : 5),
          zoneSize: selectedMarker.zoneSize || 5,
        });
      }
    }
  };

  // Handler: Select a drawn line (auto-activates line mode and syncs active line properties)
  const handleSelectLine = (id: string | null) => {
    setSelectedLineId(id);
    if (id) {
      setSelectedMarkerId(null);
      setInteractionMode('line');
      if (!isSidebarOpen && window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      }
      const foundLine = drawnLines.find((l) => l.id === id);
      if (foundLine) {
        setLineColor(foundLine.color);
        setLineWeight(foundLine.weight);
        setLineSmoothed(!!foundLine.smoothed);
        if (foundLine.dashStyle) setLineDashStyle(foundLine.dashStyle);
        if (foundLine.startPointStyle) setLineStartStyle(foundLine.startPointStyle);
        if (foundLine.startCustomIconUrl) setLineStartCustomIcon(foundLine.startCustomIconUrl);
        if (foundLine.startIconRotation !== undefined) setLineStartIconRotation(foundLine.startIconRotation);
        if (foundLine.startIconSize !== undefined) setLineStartIconSize(foundLine.startIconSize);
        if (foundLine.endPointStyle) setLineEndStyle(foundLine.endPointStyle);
        if (foundLine.endCustomIconUrl) setLineEndCustomIcon(foundLine.endCustomIconUrl);
        if (foundLine.endIconRotation !== undefined) setLineEndIconRotation(foundLine.endIconRotation);
        if (foundLine.endIconSize !== undefined) setLineEndIconSize(foundLine.endIconSize);
      }
    }
  };

  // Handler: Add marker on manual coordinates or click
  const handleAddMarker = (lat?: number, lng?: number) => {
    // If coordinates not supplied, center on Kryvyi Rih center slightly jittered
    const finalLat = lat !== undefined ? lat : 47.9105 + (Math.random() - 0.5) * 0.03;
    const finalLng = lng !== undefined ? lng : 33.3918 + (Math.random() - 0.5) * 0.03;

    const baseStyle = activeStyle;
    const currentIconType = baseStyle.iconType || 'pin';
    // Label/caption equals icon name when adding
    const defaultTitle = customIconTitles[currentIconType] || getDefaultIconName(currentIconType, language);

    const newId = 'marker_' + Date.now();
    const newMarker: CustomMarker = {
      id: newId,
      lat: finalLat,
      lng: finalLng,
      title: defaultTitle,
      description: '',
      color: baseStyle.color || '#ef4444',
      borderColor: baseStyle.borderColor || '#ffffff',
      size: baseStyle.size || 32,
      rotation: baseStyle.rotation || 0,
      iconType: baseStyle.iconType || 'pin',
      draggable: baseStyle.draggable !== undefined ? baseStyle.draggable : true,
      labelVisible: baseStyle.labelVisible !== undefined ? baseStyle.labelVisible : true,
      endPointStyle: baseStyle.endPointStyle || 'none',
      lineWidth: baseStyle.lineWidth !== undefined ? baseStyle.lineWidth : 3,
      customIconUrl: baseStyle.customIconUrl,
      hasZone: baseStyle.hasZone || false,
      zoneColor: baseStyle.zoneColor || baseStyle.color || '#ef4444',
      zoneRadiusKm: baseStyle.zoneRadiusKm !== undefined ? baseStyle.zoneRadiusKm : (baseStyle.zoneSize && baseStyle.zoneSize <= 200 ? baseStyle.zoneSize : 5),
      zoneSize: baseStyle.zoneSize || 5,
    };

    setMarkers((prev) => [...prev, newMarker]);
    setSelectedMarkerId(newId);

    // Explicitly update activeStyle
    setActiveStyle({
      title: newMarker.title,
      color: newMarker.color,
      borderColor: newMarker.borderColor || '#ffffff',
      size: newMarker.size,
      rotation: newMarker.rotation,
      iconType: newMarker.iconType,
      draggable: newMarker.draggable,
      labelVisible: newMarker.labelVisible,
      endPointStyle: newMarker.endPointStyle || 'none',
      lineWidth: newMarker.lineWidth !== undefined ? newMarker.lineWidth : 3,
      customIconUrl: newMarker.customIconUrl,
      hasZone: newMarker.hasZone || false,
      zoneColor: newMarker.zoneColor || newMarker.color || '#ef4444',
      zoneRadiusKm: newMarker.zoneRadiusKm,
      zoneSize: newMarker.zoneSize,
    });

    return newId;
  };

  // Listen for 'Delete' key to remove the selected marker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Del') {
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.hasAttribute('contenteditable'))
        ) {
          return;
        }

        if (selectedMarkerId) {
          handleDeleteMarker(selectedMarkerId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedMarkerId, markers]);

  // Handler: Update an individual marker
  const handleUpdateMarker = (updatedMarker: CustomMarker) => {
    setMarkers((prev) =>
      prev.map((m) => (m.id === updatedMarker.id ? updatedMarker : m))
    );
    // Also keep the activeStyle synchronized!
    setActiveStyle({
      title: updatedMarker.title,
      color: updatedMarker.color,
      borderColor: updatedMarker.borderColor || '#ffffff',
      size: updatedMarker.size,
      rotation: updatedMarker.rotation,
      iconType: updatedMarker.iconType,
      draggable: updatedMarker.draggable,
      labelVisible: updatedMarker.labelVisible,
      endPointStyle: updatedMarker.endPointStyle || 'none',
      customIconUrl: updatedMarker.customIconUrl,
      hasZone: updatedMarker.hasZone || false,
      zoneColor: updatedMarker.zoneColor || updatedMarker.color || '#ef4444',
      zoneRadiusKm: updatedMarker.zoneRadiusKm !== undefined ? updatedMarker.zoneRadiusKm : (updatedMarker.zoneSize && updatedMarker.zoneSize <= 200 ? updatedMarker.zoneSize : 5),
      zoneSize: updatedMarker.zoneSize || 5,
    });
  };

  // Handler: Update marker position (drag end)
  const handleUpdateMarkerPosition = (id: string, lat: number, lng: number) => {
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, lat, lng } : m))
    );
  };

  // Handler: Delete marker
  const handleDeleteMarker = (id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
    if (selectedMarkerId === id) {
      setSelectedMarkerId(null);
    }
  };

  // Handler: Clear all ("Очистити все" - прибирає маркери, лінії та виділені н.п./зони через пошук)
  const handleClearMarkers = () => {
    setMarkers([]);
    setSelectedMarkerId(null);
    setDrawnLines([]);
    setSelectedLineId(null);
    localStorage.removeItem('visicom_drawn_lines');
    localStorage.removeItem('visicom_searched_areas');
    setClearAllTrigger((prev) => prev + 1);
    mapRef.current?.clearSearchedAreas?.();
  };

  // Handler: Toggle App Language
  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'uk' ? 'en' : 'uk'));
  };

  // Handler: Import full list
  const handleImportMarkers = (importedList: CustomMarker[]) => {
    setMarkers(importedList);
    setSelectedMarkerId(null);
  };

  // Handler: Export all settings & data as ZIP archive (with custom icons)
  const handleExportAllSettings = async () => {
    try {
      const zip = new JSZip();

      // 1. Gather all configuration and active states
      const exportData = {
        version: 2,
        type: 'uamapper_full_backup',
        exportedAt: new Date().toISOString(),
        settings: {
          theme,
          language,
          watermarkType,
          watermarkText,
          watermarkImageUrl,
          watermarkSize,
          watermarkOpacity,
          watermarkRotation,
          legendOverlayText,
          showLegendOverlay,
          showLogoAndLegendOnMap,
          showRadarOverlay,
          blurMapOnExport,
          mapFont,
          showCityBoundary,
          cityBoundaryConfig,
          showDistrictBoundary,
          districtBoundaryConfig,
          showUkraineBoundary,
          ukraineBoundaryConfig,
          showHromadaBoundaries,
          hromadaBoundariesConfig,
          showQuickSettlements,
          showSettlementLabels,
          settlementLabelMode,
          disabledSettlementCategories,
          activeTileLayerId: activeTileLayer.id,
          autoHighlightZone,
          visicomKey,
          customIconTitles,
          iconPresets,
          customLibrary,
          mapLegendConfig,
          showAlerts,
          showAirAlertsPanel,
          showAlertPolygons,
          showAlertMarkers,
          alertsOpacity,
          alertsStrokeWidth,
          alertSoundEnabled,
          alertsCustomUrl: localStorage.getItem('uamapper_alerts_custom_url') || '',
          alertsToken: localStorage.getItem('uamapper_alerts_token') || '',
          activeStyle,
          telegramBotToken: localStorage.getItem('visicom_tg_bot_token') || '',
          telegramChannels: (() => {
            try {
              return JSON.parse(localStorage.getItem('visicom_telegram_channels') || '[]');
            } catch {
              return [];
            }
          })(),
        },
        data: {
          markers,
          drawnLines,
          customLibrary,
          customSettlements: customSettlements.filter(
            (s) => s.id.startsWith('custom_') && !(s as any).isDeleted
          ),
          customQuickZones: (() => {
            try {
              return JSON.parse(localStorage.getItem('uamapper_custom_quick_zones') || '[]');
            } catch {
              return [];
            }
          })(),
          searchedAreas: (() => {
            try {
              return JSON.parse(localStorage.getItem('visicom_searched_areas') || '[]');
            } catch {
              return [];
            }
          })(),
        },
      };

      // Add main JSON file to ZIP
      zip.file('uamapper_settings.json', JSON.stringify(exportData, null, 2));

      // 2. Add custom icons to custom_icons/ folder inside ZIP
      const iconsFolder = zip.folder('custom_icons');
      const iconsManifest: { id: string; name: string; filename: string; mimeType: string }[] = [];

      if (iconsFolder && Array.isArray(customLibrary) && customLibrary.length > 0) {
        customLibrary.forEach((icon, index) => {
          if (!icon.dataUrl) return;
          const match = icon.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const base64Data = match[2];
            let ext = 'png';
            if (mimeType.includes('svg')) ext = 'svg';
            else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
            else if (mimeType.includes('webp')) ext = 'webp';

            const cleanName = (icon.name || `icon_${icon.id}`).replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_');
            const filename = `${index + 1}_${cleanName}.${ext}`;
            iconsFolder.file(filename, base64Data, { base64: true });
            iconsManifest.push({
              id: icon.id,
              name: icon.name,
              filename,
              mimeType,
            });
          }
        });
      }

      // Add watermark image if it's a custom base64 image
      if (watermarkImageUrl && watermarkImageUrl.startsWith('data:') && iconsFolder) {
        const wmMatch = watermarkImageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (wmMatch) {
          const wmMime = wmMatch[1];
          const wmBase64 = wmMatch[2];
          let wmExt = 'png';
          if (wmMime.includes('svg')) wmExt = 'svg';
          else if (wmMime.includes('jpeg') || wmMime.includes('jpg')) wmExt = 'jpg';
          iconsFolder.file(`watermark_image.${wmExt}`, wmBase64, { base64: true });
        }
      }

      if (iconsFolder && iconsManifest.length > 0) {
        iconsFolder.file('manifest.json', JSON.stringify(iconsManifest, null, 2));
      }

      // 3. Generate and trigger download
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `uamapper_backup_${dateStr}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Error exporting settings ZIP:', err);
      alert(language === 'uk' ? 'Помилка експорту у ZIP!' : 'Error exporting settings to ZIP!');
    }
  };

  // Handler: Import all settings & data (supports .zip and .json)
  const handleImportAllSettings = async (file: File) => {
    try {
      const isZip = file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip');
      let parsed: any = null;
      let loadedCustomIcons: { id: string; name: string; dataUrl: string }[] = [];

      if (isZip) {
        const zip = await JSZip.loadAsync(file);

        // Find settings file inside ZIP
        let settingsFile = zip.file('uamapper_settings.json') || zip.file('settings.json');
        if (!settingsFile) {
          const jsonFiles = zip.filter((path) => path.endsWith('.json') && !path.includes('/'));
          if (jsonFiles.length > 0) {
            settingsFile = jsonFiles[0];
          }
        }

        if (!settingsFile) {
          alert(language === 'uk' ? 'У ZIP-архіві не знайдено файл налаштувань (uamapper_settings.json)!' : 'No settings file found in ZIP!');
          return;
        }

        const settingsJsonText = await settingsFile.async('string');
        parsed = JSON.parse(settingsJsonText);

        // Check for custom_icons/ folder
        const iconsFolder = zip.folder('custom_icons');
        if (iconsFolder) {
          const manifestFile = iconsFolder.file('manifest.json');
          if (manifestFile) {
            try {
              const manifestText = await manifestFile.async('string');
              const manifest = JSON.parse(manifestText);
              if (Array.isArray(manifest)) {
                for (const item of manifest) {
                  const iconFile = iconsFolder.file(item.filename);
                  if (iconFile) {
                    const base64 = await iconFile.async('base64');
                    const mime = item.mimeType || (item.filename.endsWith('.svg') ? 'image/svg+xml' : 'image/png');
                    loadedCustomIcons.push({
                      id: item.id,
                      name: item.name,
                      dataUrl: `data:${mime};base64,${base64}`,
                    });
                  }
                }
              }
            } catch (e) {
              console.warn('Failed to parse icons manifest, will read files directly', e);
            }
          }

          // Fallback: read all image files in custom_icons/
          if (loadedCustomIcons.length === 0) {
            const imageEntries = zip.filter((path) => {
              return path.startsWith('custom_icons/') && /\.(png|jpg|jpeg|svg|webp)$/i.test(path);
            });
            for (const imgEntry of imageEntries) {
              const filename = imgEntry.name.replace('custom_icons/', '');
              if (filename.startsWith('watermark_image')) continue;
              const ext = filename.split('.').pop()?.toLowerCase() || 'png';
              const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
              const base64 = await imgEntry.async('base64');
              const cleanName = filename.replace(/^\d+_/, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ');
              loadedCustomIcons.push({
                id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                name: cleanName,
                dataUrl: `data:${mime};base64,${base64}`,
              });
            }
          }

          // Check for watermark image
          const wmEntries = zip.filter((path) => path.startsWith('custom_icons/watermark_image'));
          if (wmEntries.length > 0) {
            const wmEntry = wmEntries[0];
            const ext = wmEntry.name.split('.').pop()?.toLowerCase() || 'png';
            const mime = ext === 'svg' ? 'image/svg+xml' : 'image/png';
            const base64 = await wmEntry.async('base64');
            const dataUrl = `data:${mime};base64,${base64}`;
            setWatermarkImageUrl(dataUrl);
            safeSetItem('visicom_watermark_image_url', dataUrl);
          }
        }
      } else {
        // Plain JSON file
        const content = await file.text();
        parsed = JSON.parse(content);
      }

      if (!parsed || (parsed.type !== 'uamapper_full_backup' && !parsed.settings && !parsed.data)) {
        alert(language === 'uk' ? 'Недійсний файл налаштувань!' : 'Invalid settings backup file!');
        return;
      }

      const { settings, data } = parsed;

      // Update custom library first
      const jsonCustomIcons = settings?.customLibrary || data?.customLibrary || [];
      const finalCustomLibrary = loadedCustomIcons.length > 0 ? loadedCustomIcons : jsonCustomIcons;
      if (Array.isArray(finalCustomLibrary) && finalCustomLibrary.length > 0) {
        handleUpdateCustomLibrary(finalCustomLibrary);
      }

      if (settings) {
        if (settings.theme) {
          setTheme(settings.theme);
          localStorage.setItem('visicom_theme', settings.theme);
        }
        if (settings.language) {
          setLanguage(settings.language);
          localStorage.setItem('visicom_ui_lang', settings.language);
        }
        if (settings.watermarkType !== undefined) {
          setWatermarkType(settings.watermarkType);
          localStorage.setItem('visicom_watermark_type', settings.watermarkType);
        }
        if (settings.watermarkText !== undefined) {
          setWatermarkText(settings.watermarkText);
          localStorage.setItem('visicom_watermark_text', settings.watermarkText);
        }
        if (settings.watermarkImageUrl !== undefined && !loadedCustomIcons.length) {
          setWatermarkImageUrl(settings.watermarkImageUrl);
          if (settings.watermarkImageUrl) {
            safeSetItem('visicom_watermark_image_url', settings.watermarkImageUrl);
          } else {
            localStorage.removeItem('visicom_watermark_image_url');
          }
        }
        if (settings.watermarkSize !== undefined) {
          setWatermarkSize(settings.watermarkSize);
          localStorage.setItem('visicom_watermark_size', String(settings.watermarkSize));
        }
        if (settings.watermarkOpacity !== undefined) {
          setWatermarkOpacity(settings.watermarkOpacity);
          localStorage.setItem('visicom_watermark_opacity', String(settings.watermarkOpacity));
        }
        if (settings.watermarkRotation !== undefined) {
          setWatermarkRotation(settings.watermarkRotation);
          localStorage.setItem('visicom_watermark_rotation', String(settings.watermarkRotation));
        }
        if (settings.legendOverlayText !== undefined) {
          setLegendOverlayText(settings.legendOverlayText);
          localStorage.setItem('visicom_legend_overlay_text', settings.legendOverlayText);
        }
        if (settings.showLegendOverlay !== undefined) {
          setShowLegendOverlay(settings.showLegendOverlay);
          localStorage.setItem('visicom_show_legend_overlay', String(settings.showLegendOverlay));
        }
        if (settings.showLogoAndLegendOnMap !== undefined) {
          setShowLogoAndLegendOnMap(settings.showLogoAndLegendOnMap);
          localStorage.setItem('uamapper_show_logo_and_legend_on_map', String(settings.showLogoAndLegendOnMap));
        }
        if (settings.showRadarOverlay !== undefined) {
          setShowRadarOverlay(settings.showRadarOverlay);
          localStorage.setItem('visicom_show_radar_overlay', String(settings.showRadarOverlay));
        }
        if (settings.blurMapOnExport !== undefined) {
          setBlurMapOnExport(settings.blurMapOnExport);
          localStorage.setItem('visicom_blur_map_on_export', settings.blurMapOnExport ? 'true' : 'false');
        }
        if (settings.mapFont) {
          setMapFont(settings.mapFont);
          localStorage.setItem('uamapper_map_font', settings.mapFont);
        }
        if (settings.showCityBoundary !== undefined) {
          setShowCityBoundary(settings.showCityBoundary);
          localStorage.setItem('uamapper_show_city_boundary', String(settings.showCityBoundary));
        }
        if (settings.cityBoundaryConfig) {
          setCityBoundaryConfig(settings.cityBoundaryConfig);
          localStorage.setItem('uamapper_city_boundary_config', JSON.stringify(settings.cityBoundaryConfig));
        }
        if (settings.showDistrictBoundary !== undefined) {
          setShowDistrictBoundary(settings.showDistrictBoundary);
          localStorage.setItem('uamapper_show_district_boundary', String(settings.showDistrictBoundary));
        }
        if (settings.districtBoundaryConfig) {
          setDistrictBoundaryConfig(settings.districtBoundaryConfig);
          localStorage.setItem('uamapper_district_boundary_config', JSON.stringify(settings.districtBoundaryConfig));
        }
        if (settings.showUkraineBoundary !== undefined) {
          setShowUkraineBoundary(settings.showUkraineBoundary);
          localStorage.setItem('uamapper_show_ukraine_boundary', String(settings.showUkraineBoundary));
        }
        if (settings.ukraineBoundaryConfig) {
          setUkraineBoundaryConfig(settings.ukraineBoundaryConfig);
          localStorage.setItem('uamapper_ukraine_boundary_config', JSON.stringify(settings.ukraineBoundaryConfig));
        }
        if (settings.showHromadaBoundaries !== undefined) {
          setShowHromadaBoundaries(settings.showHromadaBoundaries);
          localStorage.setItem('uamapper_show_hromada_boundaries', String(settings.showHromadaBoundaries));
        }
        if (settings.hromadaBoundariesConfig) {
          setHromadaBoundariesConfig(settings.hromadaBoundariesConfig);
          localStorage.setItem('uamapper_hromada_boundaries_config', JSON.stringify(settings.hromadaBoundariesConfig));
        }
        if (settings.showQuickSettlements !== undefined) {
          setShowQuickSettlements(settings.showQuickSettlements);
          localStorage.setItem('uamapper_show_quick_settlements', String(settings.showQuickSettlements));
        }
        if (settings.showSettlementLabels !== undefined) {
          setShowSettlementLabels(settings.showSettlementLabels);
          localStorage.setItem('visicom_show_settlement_labels', String(settings.showSettlementLabels));
        }
        if (settings.settlementLabelMode) {
          setSettlementLabelMode(settings.settlementLabelMode);
          localStorage.setItem('visicom_settlement_label_mode', settings.settlementLabelMode);
        }
        if (Array.isArray(settings.disabledSettlementCategories)) {
          setDisabledSettlementCategories(settings.disabledSettlementCategories);
          localStorage.setItem('visicom_disabled_settlement_categories', JSON.stringify(settings.disabledSettlementCategories));
        }
        if (settings.activeTileLayerId) {
          const matchedLayer = TILE_LAYERS.find((l) => l.id === settings.activeTileLayerId);
          if (matchedLayer) {
            setActiveTileLayer(matchedLayer);
            localStorage.setItem('visicom_active_layer', matchedLayer.id);
          }
        }
        if (settings.autoHighlightZone !== undefined) {
          setAutoHighlightZone(settings.autoHighlightZone);
          localStorage.setItem('visicom_auto_highlight_zone', settings.autoHighlightZone ? 'true' : 'false');
        }
        if (settings.customIconTitles) {
          setCustomIconTitles(settings.customIconTitles);
          localStorage.setItem('visicom_custom_icon_titles', JSON.stringify(settings.customIconTitles));
        }
        if (settings.iconPresets) {
          setIconPresets(settings.iconPresets);
          localStorage.setItem('visicom_icon_presets', JSON.stringify(settings.iconPresets));
        }
        if (settings.mapLegendConfig) {
          setMapLegendConfig(settings.mapLegendConfig);
          try {
            localStorage.setItem('tactical_map_legend_cfg', JSON.stringify(settings.mapLegendConfig));
          } catch {}
        }
        if (settings.showAlerts !== undefined) {
          setShowAlerts(settings.showAlerts);
          localStorage.setItem('uamapper_show_alerts', String(settings.showAlerts));
        }
        if (settings.showAirAlertsPanel !== undefined) {
          setShowAirAlertsPanel(settings.showAirAlertsPanel);
          localStorage.setItem('uamapper_show_alerts_panel', String(settings.showAirAlertsPanel));
        }
        if (settings.showAlertPolygons !== undefined) {
          setShowAlertPolygons(settings.showAlertPolygons);
          localStorage.setItem('uamapper_show_alert_polygons', String(settings.showAlertPolygons));
        }
        if (settings.showAlertMarkers !== undefined) {
          setShowAlertMarkers(settings.showAlertMarkers);
          localStorage.setItem('uamapper_show_alert_markers', String(settings.showAlertMarkers));
        }
        if (settings.alertsOpacity !== undefined) {
          setAlertsOpacity(settings.alertsOpacity);
          localStorage.setItem('uamapper_alerts_opacity', String(settings.alertsOpacity));
        }
        if (settings.alertsStrokeWidth !== undefined) {
          setAlertsStrokeWidth(settings.alertsStrokeWidth);
          localStorage.setItem('uamapper_alerts_stroke_width', String(settings.alertsStrokeWidth));
        }
        if (settings.alertSoundEnabled !== undefined) {
          setAlertSoundEnabled(settings.alertSoundEnabled);
          localStorage.setItem('uamapper_alert_sound', String(settings.alertSoundEnabled));
        }
        if (settings.alertsCustomUrl !== undefined) {
          localStorage.setItem('uamapper_alerts_custom_url', settings.alertsCustomUrl);
        }
        if (settings.alertsToken !== undefined) {
          localStorage.setItem('uamapper_alerts_token', settings.alertsToken);
        }
        if (settings.activeStyle) {
          setActiveStyle(settings.activeStyle);
          localStorage.setItem('visicom_active_style', JSON.stringify(settings.activeStyle));
        }
        if (settings.telegramBotToken !== undefined) {
          localStorage.setItem('visicom_tg_bot_token', settings.telegramBotToken);
        }
        if (Array.isArray(settings.telegramChannels)) {
          localStorage.setItem('visicom_telegram_channels', JSON.stringify(settings.telegramChannels));
        }
      }

      if (data) {
        if (Array.isArray(data.markers)) {
          setMarkers(data.markers);
          localStorage.setItem('visicom_custom_markers', JSON.stringify(data.markers));
        }
        if (Array.isArray(data.drawnLines)) {
          setDrawnLines(data.drawnLines);
          localStorage.setItem('visicom_drawn_lines', JSON.stringify(data.drawnLines));
        }
        if (Array.isArray(data.customSettlements)) {
          handleImportCustomSettlements(data.customSettlements);
        }
        if (Array.isArray(data.customQuickZones)) {
          localStorage.setItem('uamapper_custom_quick_zones', JSON.stringify(data.customQuickZones));
        }
        if (Array.isArray(data.searchedAreas)) {
          localStorage.setItem('visicom_searched_areas', JSON.stringify(data.searchedAreas));
        }
      }

      alert(
        language === 'uk'
          ? (isZip ? 'Усі налаштування та власні іконки успішно імпортовано з ZIP-архіву!' : 'Усі налаштування та дані успішно імпортовано!')
          : (isZip ? 'All settings and custom icons successfully imported from ZIP!' : 'All settings and data successfully imported!')
      );
    } catch (err) {
      console.error('Error importing backup:', err);
      alert(language === 'uk' ? 'Помилка зчитування файлу налаштувань!' : 'Error reading settings file!');
    }
  };

  const selectedMarker = markers.find((m) => m.id === selectedMarkerId);

  return (
    <div className={`fixed inset-0 w-full h-full overflow-hidden flex flex-col font-sans transition-colors duration-300 ${
      theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-200'
    }`}>
      
      {/* Ambient background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-blue-500/5 blur-[120px]"></div>
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-indigo-500/5 blur-[120px]"></div>
      </div>

      {/* Main Grid View (Full Screen height because header and footer are removed) */}
      <div className="flex-1 flex flex-col md:flex-row h-full min-h-0 overflow-hidden relative z-10">
        
        {/* Main Map Stage (Rendered FIRST to be on the left) */}
        <div className={`flex-1 relative flex flex-col transition-all duration-300 ${mobileView === 'map' ? 'h-full flex' : 'hidden md:flex md:h-full'}`}>
          
          {/* Map stage */}
          <MapContainer
            ref={mapRef}
            markers={markers}
            selectedMarkerId={selectedMarkerId}
            onSelectMarker={handleSelectMarker}
            onUpdateMarkerPosition={handleUpdateMarkerPosition}
            onAddMarker={handleAddMarker}
            activeTileLayer={activeTileLayer}
            visicomKey={visicomKey}
            language={language}
            interactionMode={interactionMode}
            onSelectInteractionMode={setInteractionMode}
            autoHighlightZone={autoHighlightZone}
            onToggleAutoHighlightZone={handleToggleAutoHighlightZone}
            theme={theme}
            onUpdateMarker={handleUpdateMarker}
            watermarkType={watermarkType}
            watermarkText={watermarkText}
            watermarkImageUrl={watermarkImageUrl}
            watermarkSize={watermarkSize}
            watermarkOpacity={watermarkOpacity}
            watermarkRotation={watermarkRotation}
            showLegendOverlay={showLegendOverlay}
            showLogoAndLegendOnMap={showLogoAndLegendOnMap}
            legendOverlayText={legendOverlayText}
            showRadarOverlay={showRadarOverlay}
            blurMapOnExport={blurMapOnExport}
            mapFont={mapFont}
            showCityBoundary={showCityBoundary}
            cityBoundaryConfig={cityBoundaryConfig}
            showDistrictBoundary={showDistrictBoundary}
            districtBoundaryConfig={districtBoundaryConfig}
            showUkraineBoundary={showUkraineBoundary}
            ukraineBoundaryConfig={ukraineBoundaryConfig}
            onToggleUkraineBoundary={handleToggleUkraineBoundary}
            showHromadaBoundaries={showHromadaBoundaries}
            hromadaBoundariesConfig={hromadaBoundariesConfig}
            onToggleHromadaBoundaries={setShowHromadaBoundaries}
            showQuickSettlements={showQuickSettlements}
            onToggleQuickSettlements={handleUpdateShowQuickSettlements}
            deepStateOccupiedConfig={deepStateOccupiedConfig}
            onToggleDeepStateOccupied={handleToggleDeepStateOccupied}
            deepStateGeoJson={deepStateGeoJson}
            isLoadingDeepState={isLoadingDeepState}
            showSettlementLabels={showSettlementLabels}
            settlementLabelMode={settlementLabelMode}
            disabledSettlementCategories={disabledSettlementCategories}
            onToggleSettlementLabels={handleToggleSettlementLabels}
            onSetSettlementLabelMode={handleSetSettlementLabelMode}
            customSettlements={customSettlements}
            onAddCustomSettlementPoint={handleAddCustomSettlementPoint}
            onEditSettlement={handleEditSettlement}
            onDeleteCustomSettlement={handleDeleteCustomSettlement}
            drawnLines={drawnLines}
            selectedLineId={selectedLineId}
            onSelectLine={handleSelectLine}
            onAddDrawnLine={handleAddDrawnLine}
            onUpdateDrawnLine={handleUpdateDrawnLine}
            onDeleteDrawnLine={handleDeleteDrawnLine}
            lineColor={lineColor}
            lineWeight={lineWeight}
            lineSmoothed={lineSmoothed}
            lineStartStyle={lineStartStyle}
            lineStartCustomIcon={lineStartCustomIcon}
            lineStartIconRotation={lineStartIconRotation}
            lineStartIconSize={lineStartIconSize}
            lineEndStyle={lineEndStyle}
            lineEndCustomIcon={lineEndCustomIcon}
            lineEndIconRotation={lineEndIconRotation}
            lineEndIconSize={lineEndIconSize}
            lineDashStyle={lineDashStyle}
            lineDrawMethod={lineDrawMethod}
            onChangeLineDrawMethod={handleSetLineDrawMethod}
            onChangeLineStartStyle={setLineStartStyle}
            onChangeLineEndStyle={setLineEndStyle}
            mapLegendConfig={mapLegendConfig}
            onUpdateMapLegendConfig={handleUpdateMapLegendConfig}
            activeAlerts={activeAlerts}
            showAlerts={showAlerts}
            showAlertPolygons={showAlertPolygons}
            showAlertMarkers={showAlertMarkers}
            alertsOpacity={alertsOpacity}
            alertsStrokeWidth={alertsStrokeWidth}
            onAlertClick={handleSelectAlert}
            clearAllTrigger={clearAllTrigger}
          />

          {/* Floating Air Alerts Widget Panel */}
          {showAirAlertsPanel && (
            <AirAlertsPanel
              alerts={activeAlerts}
              isLoading={isLoadingAlerts}
              lastUpdated={lastAlertsUpdated}
              showAlerts={showAlerts}
              onToggleShowAlerts={() => {
                setShowAlerts((prev) => {
                  const next = !prev;
                  localStorage.setItem('uamapper_show_alerts', String(next));
                  return next;
                });
              }}
              showAlertPolygons={showAlertPolygons}
              onToggleShowAlertPolygons={() => {
                setShowAlertPolygons((prev) => {
                  const next = !prev;
                  localStorage.setItem('uamapper_show_alert_polygons', String(next));
                  return next;
                });
              }}
              showAlertMarkers={showAlertMarkers}
              onToggleShowAlertMarkers={() => {
                setShowAlertMarkers((prev) => {
                  const next = !prev;
                  localStorage.setItem('uamapper_show_alert_markers', String(next));
                  return next;
                });
              }}
              alertsOpacity={alertsOpacity}
              onChangeAlertsOpacity={(opacity) => {
                setAlertsOpacity(opacity);
                localStorage.setItem('uamapper_alerts_opacity', String(opacity));
              }}
              alertsStrokeWidth={alertsStrokeWidth}
              onChangeAlertsStrokeWidth={(width) => {
                setAlertsStrokeWidth(width);
                localStorage.setItem('uamapper_alerts_stroke_width', String(width));
              }}
              soundEnabled={alertSoundEnabled}
              onToggleSound={() => {
                setAlertSoundEnabled((prev) => {
                  const next = !prev;
                  localStorage.setItem('uamapper_alert_sound', String(next));
                  return next;
                });
              }}
              onRefresh={refreshAlerts}
              language={language}
              onSelectAlert={handleSelectAlert}
            />
          )}

          {/* Floating Top-Right Quick Air Alerts Badge / Button on Map (Desktop & Tablet) - Shifted left to right-16 to avoid Leaflet zoom controls */}
          <div className="hidden sm:flex absolute top-3.5 right-16 z-30 items-center gap-2">
            <button
              onClick={() => {
                setShowAirAlertsPanel((prev) => {
                  const next = !prev;
                  localStorage.setItem('uamapper_show_alerts_panel', String(next));
                  return next;
                });
              }}
              className={`px-3.5 py-1.5 rounded-full border shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] backdrop-blur-2xl backdrop-saturate-150 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                showAirAlertsPanel
                  ? 'bg-red-600/90 text-white border-red-400/80 shadow-red-500/30'
                  : activeAlerts.length > 0
                  ? 'bg-slate-900/75 hover:bg-slate-900/90 border-red-500/50 text-red-300 ring-1 ring-red-500/30'
                  : theme === 'light'
                  ? 'bg-white/70 hover:bg-white/90 border-white/80 text-slate-700 ring-1 ring-black/5'
                  : 'bg-slate-900/70 hover:bg-slate-900/90 border-white/15 text-slate-200 ring-1 ring-white/10'
              }`}
              title={language === 'uk' ? 'Панель повітряних тривог' : 'Air Raid Alerts Panel'}
            >
              <span className="relative flex h-2 w-2">
                {activeAlerts.length > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${activeAlerts.length > 0 ? 'bg-red-500' : 'bg-emerald-400'}`}></span>
              </span>
              <span>{language === 'uk' ? 'Тривоги' : 'Alerts'}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                showAirAlertsPanel
                  ? 'bg-white/20 text-white'
                  : activeAlerts.length > 0
                  ? 'bg-red-500 text-white'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {activeAlerts.length}
              </span>
            </button>
          </div>


          {/* Floating Action Bar (When no marker is selected, Mobile Only) */}
          {selectedMarkerId === null && (
            <div className="md:hidden absolute bottom-14 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] max-w-sm px-3 py-2 border rounded-full shadow-2xl flex items-center justify-between gap-1 backdrop-blur-xl bg-slate-900/90 border-white/10 text-white animate-fade-in">
              {/* Interaction Mode Toggle (Cycles through all modes) */}
              <button
                onClick={handleCycleInteractionMode}
                title={getModeInfo(interactionMode).title}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                  interactionMode === 'pan'
                    ? 'bg-white/10 text-slate-200 hover:bg-white/20'
                    : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/50'
                }`}
              >
                {getModeInfo(interactionMode).icon}
              </button>

              {/* Camera copy button (Yellow) */}
              <button
                onClick={() => mapRef.current?.copyPNG()}
                title={language === 'uk' ? 'Копіювати мапу' : 'Copy map'}
                className="w-11 h-11 rounded-full bg-[#FFD700] hover:bg-[#E6C200] text-slate-900 transition-all cursor-pointer shadow-lg shadow-[#FFD700]/20 flex items-center justify-center flex-shrink-0 active:scale-95"
              >
                <Camera className="w-5 h-5 text-slate-950" />
              </button>

              {/* Page Reload / Refresh (F5) Button */}
              <button
                onClick={handleReloadPage}
                title={language === 'uk' ? 'Оновити сторінку (F5)' : 'Reload page (F5)'}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 bg-white/10 hover:bg-white/20 text-slate-200 active:scale-95"
              >
                <RotateCw className={`w-5 h-5 ${isReloading ? 'animate-spin text-blue-400' : ''}`} />
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={language === 'uk' ? 'Змінити тему' : 'Toggle theme'}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 bg-white/10 hover:bg-white/20 text-slate-200 active:scale-95"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-300" />}
              </button>

              {/* Air Alerts Quick Toggle (Mobile) */}
              <button
                onClick={() => {
                  setShowAirAlertsPanel((prev) => {
                    const next = !prev;
                    localStorage.setItem('uamapper_show_alerts_panel', String(next));
                    return next;
                  });
                }}
                title={language === 'uk' ? 'Повітряні тривоги' : 'Air Alerts'}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 relative active:scale-95 ${
                  showAirAlertsPanel
                    ? 'bg-red-600 text-white ring-2 ring-red-400'
                    : activeAlerts.length > 0
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200'
                }`}
              >
                <Radio className="w-5 h-5" />
                {activeAlerts.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 shadow-md">
                    {activeAlerts.length}
                  </span>
                )}
              </button>

              {/* Undo Button */}
              {markers.length > 0 && (
                <button
                  onClick={handleUndo}
                  title={language === 'uk' ? 'Скасувати останній' : 'Undo last'}
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-all cursor-pointer flex-shrink-0 flex items-center justify-center"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}

              {/* Open Sidebar Toggle */}
              <button
                onClick={() => setMobileView('sidebar')}
                title={language === 'uk' ? 'Параметри' : 'Settings'}
                className="w-11 h-11 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all cursor-pointer flex-shrink-0 flex items-center justify-center relative active:scale-95 md:hidden"
              >
                <Sliders className="w-5 h-5" />
                {markers.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 shadow-md">
                    {markers.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Quick Floating Editor Panel (When a marker is selected, Mobile Only) */}
          {selectedMarker && (
            <div className="md:hidden absolute bottom-14 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md px-4 py-3.5 border rounded-3xl shadow-2xl flex flex-col gap-2.5 backdrop-blur-xl bg-slate-900/95 border-blue-500/30 text-white animate-slide-up">
              {/* Header: Rename title & Controls */}
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Edit2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={selectedMarker.title}
                    onChange={(e) => handleUpdateMarker({ ...selectedMarker, title: e.target.value })}
                    placeholder={language === 'uk' ? 'Назва / підпис іконки' : 'Icon title / label'}
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDeleteMarker(selectedMarker.id)}
                    className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer"
                    title={language === 'uk' ? 'Видалити маркер' : 'Delete marker'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedMarkerId(null)}
                    className="p-1.5 bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white rounded-xl transition-all cursor-pointer"
                    title={language === 'uk' ? 'Закрити' : 'Close'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Color Presets & Toggle Label */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {language === 'uk' ? 'Колір:' : 'Color:'}
                  </span>
                  <div className="flex items-center gap-1">
                    {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'].map((hex) => (
                      <button
                        key={hex}
                        onClick={() => handleUpdateMarker({ ...selectedMarker, color: hex })}
                        className={`w-4 h-4 rounded-full border transition-all ${
                          selectedMarker.color === hex ? 'border-white scale-125 ring-2 ring-blue-500/30' : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleUpdateMarker({ ...selectedMarker, labelVisible: !selectedMarker.labelVisible })}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    selectedMarker.labelVisible ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {language === 'uk' 
                    ? (selectedMarker.labelVisible ? 'Підпис увімк' : 'Без підпису') 
                    : (selectedMarker.labelVisible ? 'Label ON' : 'Label OFF')}
                </button>
              </div>

              {/* Rotation Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>{language === 'uk' ? 'Кут обертання:' : 'Rotation Angle:'}</span>
                  <span className="font-mono text-white text-xs">{selectedMarker.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={selectedMarker.rotation}
                  onChange={(e) => handleUpdateMarker({ ...selectedMarker, rotation: parseInt(e.target.value, 10) })}
                  className="w-full accent-blue-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                />
              </div>

              {/* Action Buttons: Full edit & Save */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => setMobileView('sidebar')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 transition-all cursor-pointer md:hidden"
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>{language === 'uk' ? 'Параметри' : 'Full Settings'}</span>
                </button>
                <button
                  onClick={() => setSelectedMarkerId(null)}
                  className="flex-1 py-1.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-blue-500/25"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{language === 'uk' ? 'Готово' : 'Done'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Summon Sidebar & Quick Buffer Buttons on Map (Floating Center-Right: Visible on desktop only, hidden on mobile) */}
          <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-2.5 sm:right-3.5 z-30 flex-col items-end gap-2.5 pointer-events-auto">
            <button
              id="summon-sidebar-toggle-btn"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setMobileView(mobileView === 'sidebar' ? 'map' : 'sidebar');
                } else {
                  handleToggleSidebar();
                }
              }}
              title={
                isSidebarOpen
                  ? (language === 'uk' ? 'Сховати бічну панель' : 'Hide sidebar panel')
                  : (language === 'uk' ? 'Відкрити бічну панель' : 'Open sidebar panel')
              }
              className="px-3.5 py-2.5 rounded-2xl border backdrop-blur-2xl backdrop-saturate-200 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center gap-2 font-black text-xs transition-all duration-300 cursor-pointer active:scale-95 bg-blue-600 hover:bg-blue-700 text-white border-blue-400/80 ring-2 ring-blue-500/40 shadow-blue-500/35 hover:scale-105"
            >
              {isSidebarOpen ? (
                <>
                  <PanelRightClose className="w-4 h-4 text-white shrink-0" />
                  <span className="font-extrabold tracking-tight">{language === 'uk' ? 'Сховати' : 'Hide'}</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-4 h-4 text-white shrink-0" />
                  <span className="font-extrabold tracking-tight">{language === 'uk' ? 'Панель' : 'Sidebar'}</span>
                </>
              )}
            </button>

            {/* Quick Buffer / Copy Map to Clipboard Button */}
            <button
              id="quick-buffer-copy-btn"
              onClick={handleQuickCopyBuffer}
              title={language === 'uk' ? 'Скопіювати карту в буфер обміну (БУФЕР)' : 'Copy map to clipboard (BUFFER)'}
              className={`px-3.5 py-2.5 rounded-2xl border backdrop-blur-2xl backdrop-saturate-200 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center gap-2 font-black text-xs transition-all duration-300 cursor-pointer active:scale-95 ${
                isQuickCopied
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/40 scale-105'
                  : 'bg-[#FFD700] hover:bg-[#E6C200] text-slate-950 border-[#FFD700]/50 shadow-[#FFD700]/25 hover:scale-105'
              }`}
            >
              {isQuickCopied ? (
                <>
                  <Check className="w-4 h-4 text-white shrink-0 animate-bounce" />
                  <span className="font-extrabold tracking-tight">{language === 'uk' ? 'Скопійовано!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-950 shrink-0" />
                  <span className="font-extrabold tracking-tight">{language === 'uk' ? 'Буфер' : 'Buffer'}</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Sidebar Controls (Rendered SECOND to be on the right, wrapped for full responsiveness) */}
        <div className={`transition-all duration-300 shrink-0 ${
          mobileView === 'sidebar' 
            ? 'w-full h-full flex flex-col z-40 fixed inset-0 md:relative' 
            : isSidebarOpen 
              ? 'hidden md:flex md:w-[360px] lg:w-[380px] md:h-full flex-col' 
              : 'hidden'
        }`}>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Sidebar
              onClose={handleToggleSidebar}
              markers={markers}
              selectedMarkerId={selectedMarkerId}
              onSelectMarker={handleSelectMarker}
              onAddMarker={handleAddMarker}
              onUpdateMarker={handleUpdateMarker}
              onDeleteMarker={handleDeleteMarker}
              onClearMarkers={handleClearMarkers}
              tileLayers={TILE_LAYERS}
              activeTileLayer={activeTileLayer}
              onSelectTileLayer={handleSelectTileLayer}
              visicomKey={visicomKey}
              onUpdateVisicomKey={setVisicomKey}
              language={language}
              onToggleLanguage={handleToggleLanguage}
              onImportMarkers={handleImportMarkers}
              interactionMode={interactionMode}
              onSetInteractionMode={setInteractionMode}
              onUndo={handleUndo}
              theme={theme}
              onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              onExportPNG={() => {
                if (mobileView !== 'map') {
                  setMobileView('map');
                  setTimeout(() => {
                    mapRef.current?.exportPNG();
                  }, 450);
                } else {
                  mapRef.current?.exportPNG();
                }
              }}
              onExportTelegram={handleExportTelegram}
              onCopyPNG={() => {
                if (mobileView !== 'map') {
                  setMobileView('map');
                  setTimeout(() => {
                    mapRef.current?.copyPNG();
                  }, 450);
                } else {
                  mapRef.current?.copyPNG();
                }
              }}
              activeStyle={activeStyle}
              onUpdateActiveStyle={setActiveStyle}
              iconPresets={iconPresets}
              onUpdateIconPreset={handleUpdateIconPreset}
              onResetIconPreset={handleResetIconPreset}
              onApplyPresetToAllIcons={handleApplyPresetToAllIcons}
              watermarkType={watermarkType}
              onUpdateWatermarkType={setWatermarkType}
              watermarkText={watermarkText}
              onUpdateWatermarkText={setWatermarkText}
              watermarkImageUrl={watermarkImageUrl}
              onUpdateWatermarkImageUrl={setWatermarkImageUrl}
              watermarkSize={watermarkSize}
              onUpdateWatermarkSize={setWatermarkSize}
              watermarkOpacity={watermarkOpacity}
              onUpdateWatermarkOpacity={setWatermarkOpacity}
              watermarkRotation={watermarkRotation}
              onUpdateWatermarkRotation={setWatermarkRotation}
              showLegendOverlay={showLegendOverlay}
              onUpdateShowLegendOverlay={setShowLegendOverlay}
              showLogoAndLegendOnMap={showLogoAndLegendOnMap}
              onUpdateShowLogoAndLegendOnMap={setShowLogoAndLegendOnMap}
              legendOverlayText={legendOverlayText}
              onUpdateLegendOverlayText={setLegendOverlayText}
              showRadarOverlay={showRadarOverlay}
              onUpdateShowRadarOverlay={setShowRadarOverlay}
              blurMapOnExport={blurMapOnExport}
              onUpdateBlurMapOnExport={(val) => {
                setBlurMapOnExport(val);
                localStorage.setItem('visicom_blur_map_on_export', val ? 'true' : 'false');
              }}
              mapFont={mapFont}
              onUpdateMapFont={handleUpdateMapFont}
              showCityBoundary={showCityBoundary}
              onUpdateShowCityBoundary={setShowCityBoundary}
              cityBoundaryConfig={cityBoundaryConfig}
              onUpdateCityBoundaryConfig={handleUpdateCityBoundaryConfig}
              showDistrictBoundary={showDistrictBoundary}
              onUpdateShowDistrictBoundary={setShowDistrictBoundary}
              districtBoundaryConfig={districtBoundaryConfig}
              onUpdateDistrictBoundaryConfig={handleUpdateDistrictBoundaryConfig}
              showUkraineBoundary={showUkraineBoundary}
              onUpdateShowUkraineBoundary={handleToggleUkraineBoundary}
              ukraineBoundaryConfig={ukraineBoundaryConfig}
              onUpdateUkraineBoundaryConfig={handleUpdateUkraineBoundaryConfig}
              showHromadaBoundaries={showHromadaBoundaries}
              onUpdateShowHromadaBoundaries={setShowHromadaBoundaries}
              hromadaBoundariesConfig={hromadaBoundariesConfig}
              onUpdateHromadaBoundariesConfig={handleUpdateHromadaBoundariesConfig}
              showQuickSettlements={showQuickSettlements}
              onToggleQuickSettlements={handleUpdateShowQuickSettlements}
              deepStateOccupiedConfig={deepStateOccupiedConfig}
              onUpdateDeepStateOccupiedConfig={handleUpdateDeepStateConfig}
              isLoadingDeepState={isLoadingDeepState}
              deepStateLastSync={deepStateLastSync}
              onRefreshDeepState={fetchDeepStateData}
              showSettlementLabels={showSettlementLabels}
              onUpdateShowSettlementLabels={handleToggleSettlementLabels}
              autoHighlightZone={autoHighlightZone}
              onToggleAutoHighlightZone={handleToggleAutoHighlightZone}
              settlementLabelMode={settlementLabelMode}
              onUpdateSettlementLabelMode={handleSetSettlementLabelMode}
              disabledSettlementCategories={disabledSettlementCategories}
              onToggleSettlementCategory={handleToggleSettlementCategory}
              customSettlements={customSettlements}
              onEnableSettlementMode={() => setInteractionMode('settlement')}
              onEditSettlement={handleEditSettlement}
              onDeleteCustomSettlement={handleDeleteCustomSettlement}
              onClearAllCustomSettlements={handleClearAllCustomSettlements}
              onExportCustomSettlements={handleExportCustomSettlements}
              onImportCustomSettlements={handleImportCustomSettlements}
              onExportAllSettings={handleExportAllSettings}
              onImportAllSettings={handleImportAllSettings}
              customLibrary={customLibrary}
              onUpdateCustomLibrary={handleUpdateCustomLibrary}
              customIconTitles={customIconTitles}
              onUpdateCustomIconTitle={handleUpdateCustomIconTitle}
              drawnLines={drawnLines}
              selectedLineId={selectedLineId}
              onSelectLine={handleSelectLine}
              onUpdateLine={handleUpdateDrawnLine}
              onDeleteLine={handleDeleteDrawnLine}
              onClearDrawnLines={handleClearDrawnLines}
              lineColor={lineColor}
              onChangeLineColor={setLineColor}
              lineWeight={lineWeight}
              onChangeLineWeight={setLineWeight}
              lineSmoothed={lineSmoothed}
              onChangeLineSmoothed={setLineSmoothed}
              lineStartStyle={lineStartStyle}
              onChangeLineStartStyle={setLineStartStyle}
              lineStartCustomIcon={lineStartCustomIcon}
              onChangeLineStartCustomIcon={setLineStartCustomIcon}
              lineStartIconRotation={lineStartIconRotation}
              onChangeLineStartIconRotation={setLineStartIconRotation}
              lineStartIconSize={lineStartIconSize}
              onChangeLineStartIconSize={setLineStartIconSize}
              lineEndStyle={lineEndStyle}
              onChangeLineEndStyle={setLineEndStyle}
              lineEndCustomIcon={lineEndCustomIcon}
              onChangeLineEndCustomIcon={setLineEndCustomIcon}
              lineEndIconRotation={lineEndIconRotation}
              onChangeLineEndIconRotation={setLineEndIconRotation}
              lineEndIconSize={lineEndIconSize}
              onChangeLineEndIconSize={setLineEndIconSize}
              lineDashStyle={lineDashStyle}
              onChangeLineDashStyle={setLineDashStyle}
              lineDrawMethod={lineDrawMethod}
              onChangeLineDrawMethod={handleSetLineDrawMethod}
              mapLegendConfig={mapLegendConfig}
              onUpdateMapLegendConfig={handleUpdateMapLegendConfig}
              activeAlerts={activeAlerts}
              showAlerts={showAlerts}
              onToggleShowAlerts={() => {
                setShowAlerts((prev) => {
                  const next = !prev;
                  localStorage.setItem('uamapper_show_alerts', String(next));
                  return next;
                });
              }}
              showAirAlertsPanel={showAirAlertsPanel}
              onToggleShowAirAlertsPanel={() => {
                setShowAirAlertsPanel((prev) => {
                  const next = !prev;
                  localStorage.setItem('uamapper_show_alerts_panel', String(next));
                  return next;
                });
              }}
              showAlertPolygons={showAlertPolygons}
              onToggleShowAlertPolygons={() => {
                setShowAlertPolygons((prev) => {
                  const next = !prev;
                  localStorage.setItem('uamapper_show_alert_polygons', String(next));
                  return next;
                });
              }}
              showAlertMarkers={showAlertMarkers}
              onToggleShowAlertMarkers={() => {
                setShowAlertMarkers((prev) => {
                  const next = !prev;
                  localStorage.setItem('uamapper_show_alert_markers', String(next));
                  return next;
                });
              }}
              alertsOpacity={alertsOpacity}
              onChangeAlertsOpacity={(opacity) => {
                setAlertsOpacity(opacity);
                localStorage.setItem('uamapper_alerts_opacity', String(opacity));
              }}
              alertsStrokeWidth={alertsStrokeWidth}
              onChangeAlertsStrokeWidth={(width) => {
                setAlertsStrokeWidth(width);
                localStorage.setItem('uamapper_alerts_stroke_width', String(width));
              }}
              onRefreshAlerts={refreshAlerts}
              isLoadingAlerts={isLoadingAlerts}
            />
          </div>
          {/* Mobile Back-to-Map Sticky bottom bar */}
          <div className="p-3 border-t border-slate-200 dark:border-[#262c38] md:hidden bg-white dark:bg-[#161a22] flex gap-2 z-30 shadow-2xl">
            <button
              onClick={() => setMobileView('map')}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer"
            >
              <span>🗺️</span>
              <span>{language === 'uk' ? 'Повернутися до карти' : 'Return to Map'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Settlement Modal */}
      <AddSettlementModal
        isOpen={isAddSettlementModalOpen}
        latLng={pendingSettlementLatLng}
        editingSettlement={editingSettlement}
        onClose={() => {
          setIsAddSettlementModalOpen(false);
          setInteractionMode('draw');
        }}
        onSave={(s) => {
          handleSaveCustomSettlement(s);
          setIsAddSettlementModalOpen(false);
          setInteractionMode('draw');
        }}
        onDelete={handleDeleteCustomSettlement}
        language={language}
      />

      {/* Telegram Export & Share Modal */}
      <TelegramExportModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        imageBlob={telegramImageBlob}
        isCapturing={isCapturingTelegram}
        language={language}
        theme={theme}
        markers={markers}
        drawnLines={drawnLines}
        activeAlerts={activeAlerts}
        onRefreshCapture={captureTelegramImage}
      />
    </div>
  );
}
