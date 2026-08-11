import React, { useState, useEffect, useRef } from 'react';
import { CustomMarker, TileLayerConfig, Language, InteractionMode, DrawnLine, LineEndpointType } from './types';
import { MapContainer, MapContainerRef } from './components/MapContainer';
import { Sidebar } from './components/Sidebar';
import { AddSettlementModal } from './components/AddSettlementModal';
import { Settlement, SettlementCategory } from './data/settlements';
import { Compass, Sparkles, AlertCircle, Sliders, PenTool, Hand, RotateCcw, Trash2, Check, Camera, Sun, Moon, Spline, Ruler, ShieldAlert, Building2, Edit2, X } from 'lucide-react';
import { ICON_TYPES } from './components/IconLibrary';

const TILE_LAYERS: TileLayerConfig[] = [
  {
    id: 'carto_dark',
    nameEn: 'CartoDB Dark Matter (Clean, No Watermark)',
    nameUa: 'CartoDB Темна (Без водяних знаків)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    tms: false,
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '© CartoDB, © OpenStreetMap',
    requiresKey: false,
    isDark: true,
  },
  {
    id: 'esri_dark_gray',
    nameEn: 'Esri Dark Gray Canvas (Clean, No Watermark)',
    nameUa: 'Esri Темна сіра (Без водяних знаків)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    tms: false,
    subdomains: '',
    maxZoom: 19,
    attribution: '© Esri, HERE, NGA, USGS',
    requiresKey: false,
    isDark: true,
  },
  {
    id: 'carto_voyager',
    nameEn: 'CartoDB Voyager (Clean, No Watermark)',
    nameUa: 'CartoDB Детальна Voyager (Світла, без водяних знаків)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
    tms: false,
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '© CartoDB, © OpenStreetMap',
    requiresKey: false,
    isDark: false,
  },
  {
    id: 'carto_light',
    nameEn: 'CartoDB Positron / Light (Clean, No Watermark)',
    nameUa: 'CartoDB Світла Positron (Без водяних знаків)',
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    tms: false,
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '© CartoDB, © OpenStreetMap',
    requiresKey: false,
    isDark: false,
  },
  {
    id: 'esri_light_gray',
    nameEn: 'Esri Light Gray Canvas (Clean, No Watermark)',
    nameUa: 'Esri Світла сіра Canvas (Без водяних знаків)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    tms: false,
    subdomains: '',
    maxZoom: 19,
    attribution: '© Esri, HERE, NGA, USGS',
    requiresKey: false,
    isDark: false,
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
    nameUa: 'Супутникова карта Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    tms: false,
    subdomains: '',
    maxZoom: 19,
    attribution: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics',
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
    endPointStyle: 'line',
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
    endPointStyle: 'explosion',
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
    endPointStyle: 'line',
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

  const [markers, setMarkers] = useState<CustomMarker[]>(() => {
    const saved = localStorage.getItem('visicom_custom_markers');
    return saved ? JSON.parse(saved) : DEFAULT_MARKERS;
  });

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Drawn Lines State
  const [drawnLines, setDrawnLines] = useState<DrawnLine[]>(() => {
    try {
      const saved = localStorage.getItem('visicom_drawn_lines');
      return saved ? JSON.parse(saved) : [];
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
  const [lineEndStyle, setLineEndStyle] = useState<LineEndpointType>('arrow');
  const [lineEndCustomIcon, setLineEndCustomIcon] = useState<string>('');
  const [lineDashStyle, setLineDashStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');

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
    const matched = TILE_LAYERS.find((l) => l.id === savedId);
    return matched || TILE_LAYERS.find((l) => l.id === 'visicom') || TILE_LAYERS.find((l) => l.id === 'carto_dark') || TILE_LAYERS[0];
  });

  const [watermarkText, setWatermarkText] = useState<string>(() => {
    return localStorage.getItem('visicom_watermark_text') || 'UA Mapper';
  });

  const [showLegendOverlay, setShowLegendOverlay] = useState<boolean>(() => {
    const saved = localStorage.getItem('visicom_show_legend_overlay');
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

  const [showHromadaBoundaries, setShowHromadaBoundaries] = useState<boolean>(() => {
    const saved = localStorage.getItem('uamapper_show_hromada_boundaries');
    return saved !== null ? saved === 'true' : true;
  });

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

  const [autoHighlightZone, setAutoHighlightZone] = useState<boolean>(() => {
    return localStorage.getItem('visicom_auto_highlight_zone') === 'true';
  });

  const handleToggleAutoHighlightZone = (enabled: boolean) => {
    setAutoHighlightZone(enabled);
    localStorage.setItem('visicom_auto_highlight_zone', enabled ? 'true' : 'false');
  };

  const [isLocating, setIsLocating] = useState<boolean>(false);

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
            customIconUrl: lastMarker.customIconUrl,
            hasZone: lastMarker.hasZone || false,
            zoneColor: lastMarker.zoneColor || lastMarker.color || '#ef4444',
            zoneSize: lastMarker.zoneSize || 60,
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
      endPointStyle: 'line',
      hasZone: false,
      zoneColor: '#ef4444',
      zoneSize: 60,
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
    localStorage.setItem('visicom_watermark_text', watermarkText);
  }, [watermarkText]);

  useEffect(() => {
    localStorage.setItem('visicom_show_legend_overlay', String(showLegendOverlay));
  }, [showLegendOverlay]);

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
    localStorage.setItem('uamapper_show_hromada_boundaries', String(showHromadaBoundaries));
  }, [showHromadaBoundaries]);

  // Handler: Select base layer
  const handleSelectTileLayer = (layer: TileLayerConfig) => {
    setActiveTileLayer(layer);
  };

  // Handler: Select a marker
  const handleSelectMarker = (id: string | null) => {
    setSelectedMarkerId(id);
    
    // When a marker is selected, sync its style choices as active styles so they stay "active" per user intent!
    if (id) {
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
          customIconUrl: selectedMarker.customIconUrl,
          hasZone: selectedMarker.hasZone || false,
          zoneColor: selectedMarker.zoneColor || selectedMarker.color || '#ef4444',
          zoneSize: selectedMarker.zoneSize || 60,
        });
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
      customIconUrl: baseStyle.customIconUrl,
      hasZone: baseStyle.hasZone || false,
      zoneColor: baseStyle.zoneColor || baseStyle.color || '#ef4444',
      zoneSize: baseStyle.zoneSize || 60,
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
      customIconUrl: newMarker.customIconUrl,
      hasZone: newMarker.hasZone || false,
      zoneColor: newMarker.zoneColor || newMarker.color || '#ef4444',
      zoneSize: newMarker.zoneSize || 60,
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
      zoneSize: updatedMarker.zoneSize || 60,
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

  // Handler: Clear all
  const handleClearMarkers = () => {
    setMarkers([]);
    setSelectedMarkerId(null);
    setDrawnLines([]);
    setSelectedLineId(null);
    localStorage.removeItem('visicom_drawn_lines');
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
            watermarkText={watermarkText}
            showLegendOverlay={showLegendOverlay}
            legendOverlayText={legendOverlayText}
            showRadarOverlay={showRadarOverlay}
            blurMapOnExport={blurMapOnExport}
            showCityBoundary={showCityBoundary}
            showDistrictBoundary={showDistrictBoundary}
            showHromadaBoundaries={showHromadaBoundaries}
            onToggleHromadaBoundaries={setShowHromadaBoundaries}
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
            onSelectLine={setSelectedLineId}
            onAddDrawnLine={handleAddDrawnLine}
            onUpdateDrawnLine={handleUpdateDrawnLine}
            onDeleteDrawnLine={handleDeleteDrawnLine}
            lineColor={lineColor}
            lineWeight={lineWeight}
            lineSmoothed={lineSmoothed}
            lineStartStyle={lineStartStyle}
            lineStartCustomIcon={lineStartCustomIcon}
            lineEndStyle={lineEndStyle}
            lineEndCustomIcon={lineEndCustomIcon}
            lineDashStyle={lineDashStyle}
          />


          {/* Floating Action Bar (When no marker is selected) */}
          {selectedMarkerId === null && (
            <div className="absolute bottom-14 md:bottom-8 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] max-w-sm px-3 py-2 border rounded-full shadow-2xl flex items-center justify-between gap-1 backdrop-blur-xl bg-slate-900/90 border-white/10 text-white animate-fade-in">
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

              {/* Find Location GPS Button */}
              <button
                onClick={handleFindMyLocation}
                title={language === 'uk' ? 'Моє місцезнаходження' : 'My Location'}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 bg-white/10 hover:bg-white/20 text-slate-200 ${isLocating ? 'animate-spin text-blue-400' : ''}`}
              >
                <Compass className="w-5 h-5" />
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={language === 'uk' ? 'Змінити тему' : 'Toggle theme'}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 bg-white/10 hover:bg-white/20 text-slate-200 active:scale-95"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-300" />}
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

          {/* Quick Floating Editor Panel (When a marker is selected) */}
          {selectedMarker && (
            <div className="absolute bottom-14 md:bottom-8 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md px-4 py-3.5 border rounded-3xl shadow-2xl flex flex-col gap-2.5 backdrop-blur-xl bg-slate-900/95 border-blue-500/30 text-white animate-slide-up">
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

        </div>

        {/* Sidebar Controls (Rendered SECOND to be on the right, wrapped for full responsiveness) */}
        <div className={`transition-all duration-300 ${mobileView === 'sidebar' ? 'w-full h-full flex flex-col' : 'hidden md:flex md:w-80 md:h-full flex-col'}`}>
          <div className="flex-1 min-h-0 overflow-hidden">
            <Sidebar
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
                  }, 350);
                } else {
                  mapRef.current?.exportPNG();
                }
              }}
              onCopyPNG={() => {
                if (mobileView !== 'map') {
                  setMobileView('map');
                  setTimeout(() => {
                    mapRef.current?.copyPNG();
                  }, 350);
                } else {
                  mapRef.current?.copyPNG();
                }
              }}
              activeStyle={activeStyle}
              onUpdateActiveStyle={setActiveStyle}
              watermarkText={watermarkText}
              onUpdateWatermarkText={setWatermarkText}
              showLegendOverlay={showLegendOverlay}
              onUpdateShowLegendOverlay={setShowLegendOverlay}
              legendOverlayText={legendOverlayText}
              onUpdateLegendOverlayText={setLegendOverlayText}
              showRadarOverlay={showRadarOverlay}
              onUpdateShowRadarOverlay={setShowRadarOverlay}
              blurMapOnExport={blurMapOnExport}
              onUpdateBlurMapOnExport={(val) => {
                setBlurMapOnExport(val);
                localStorage.setItem('visicom_blur_map_on_export', val ? 'true' : 'false');
              }}
              showCityBoundary={showCityBoundary}
              onUpdateShowCityBoundary={setShowCityBoundary}
              showDistrictBoundary={showDistrictBoundary}
              onUpdateShowDistrictBoundary={setShowDistrictBoundary}
              showHromadaBoundaries={showHromadaBoundaries}
              onUpdateShowHromadaBoundaries={setShowHromadaBoundaries}
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
              customIconTitles={customIconTitles}
              onUpdateCustomIconTitle={handleUpdateCustomIconTitle}
              drawnLines={drawnLines}
              selectedLineId={selectedLineId}
              onSelectLine={setSelectedLineId}
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
              lineEndStyle={lineEndStyle}
              onChangeLineEndStyle={setLineEndStyle}
              lineEndCustomIcon={lineEndCustomIcon}
              onChangeLineEndCustomIcon={setLineEndCustomIcon}
              lineDashStyle={lineDashStyle}
              onChangeLineDashStyle={setLineDashStyle}
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
    </div>
  );
}
