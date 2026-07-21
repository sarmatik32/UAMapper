import React, { useState, useEffect, useRef } from 'react';
import { CustomMarker, TileLayerConfig, Language } from './types';
import { MapContainer, MapContainerRef } from './components/MapContainer';
import { Sidebar } from './components/Sidebar';
import { Compass, Sparkles, AlertCircle, Sliders, PenTool, Hand, RotateCcw, Trash2, Check, Camera, Sun, Moon } from 'lucide-react';
import { ICON_TYPES } from './components/IconLibrary';

const TILE_LAYERS: TileLayerConfig[] = [
  {
    id: 'visicom_ua',
    nameEn: 'Visicom Ukraine (UA)',
    nameUa: 'Візіком Україна (Укр)',
    url: 'https://tms.visicom.ua/2.0.0/world_uk/base/{z}/{x}/{y}.png?key={key}',
    tms: true,
    maxZoom: 19,
    attribution: 'Map data © Visicom',
    requiresKey: true,
  },
  {
    id: 'visicom_en',
    nameEn: 'Visicom World (EN)',
    nameUa: 'Візіком Світ (Англ)',
    url: 'https://tms.visicom.ua/2.0.0/world_en/base/{z}/{x}/{y}.png?key={key}',
    tms: true,
    maxZoom: 19,
    attribution: 'Map data © Visicom',
    requiresKey: true,
  },
  {
    id: 'osm',
    nameEn: 'OpenStreetMap',
    nameUa: 'OpenStreetMap (Без ключа)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tms: false,
    subdomains: 'abc',
    maxZoom: 19,
    attribution: 'Map data © OpenStreetMap contributors',
    requiresKey: false,
  },
  {
    id: 'carto_light',
    nameEn: 'CartoDB Light (Minimalist)',
    nameUa: 'CartoDB Світла (Без ключа)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    tms: false,
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '© CartoDB, © OpenStreetMap',
    requiresKey: false,
  },
  {
    id: 'carto_dark',
    nameEn: 'CartoDB Dark (Night mode)',
    nameUa: 'CartoDB Темна (Без ключа)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    tms: false,
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '© CartoDB, © OpenStreetMap',
    requiresKey: false,
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

  const [activeTileLayer, setActiveTileLayer] = useState<TileLayerConfig>(() => {
    const savedId = localStorage.getItem('visicom_active_layer');
    const matched = TILE_LAYERS.find((l) => l.id === savedId);
    return matched || TILE_LAYERS.find((l) => l.id === 'carto_dark') || TILE_LAYERS.find((l) => l.id === 'carto_light') || TILE_LAYERS[0];
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

  const [visicomKey, setVisicomKey] = useState<string>(() => {
    return localStorage.getItem('visicom_api_key') || '';
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('visicom_ui_lang') as Language) || 'uk';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('visicom_theme') as 'dark' | 'light') || 'dark';
  });

  const [showAlert, setShowAlert] = useState<boolean>(true);
  const [interactionMode, setInteractionMode] = useState<'draw' | 'pan'>('draw');
  const [mobileView, setMobileView] = useState<'map' | 'sidebar'>('map');
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

    // Explicitly update activeStyle to the newly created marker's style so it immediately propagates to any subsequent markers
    setActiveStyle({
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
    // If the title is customized, save it!
    if (updatedMarker.title && updatedMarker.iconType) {
      handleUpdateCustomIconTitle(updatedMarker.iconType, updatedMarker.title);
    }
    // Also keep the activeStyle synchronized!
    setActiveStyle({
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
    <div className={`flex flex-col h-screen h-[100dvh] w-screen overflow-hidden relative font-sans transition-colors duration-300 ${
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
          
          {/* Floating Header Banner for Keys status */}
          {showAlert && activeTileLayer.requiresKey && !visicomKey && (
            <div className={`absolute top-4 left-4 right-16 z-20 mx-auto max-w-lg border text-xs px-4 py-3.5 rounded-2xl shadow-2xl flex items-start gap-3 backdrop-blur-xl ${
              theme === 'light' 
                ? 'bg-white/95 border-slate-200 text-slate-800' 
                : 'bg-slate-950/85 border-white/10 text-slate-200'
            }`}>
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
              <div className="text-xs">
                <p className={`font-bold mb-1 ${theme === 'light' ? 'text-slate-950' : 'text-slate-100'}`}>
                  {language === 'uk' ? 'Використовується демо-ключ Visicom' : 'Using Demo Visicom Key'}
                </p>
                <p className={`leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                  {language === 'uk' 
                    ? 'Для роботи карти використовується стандартний демо-ключ. За бажанням ви можете вставити власний API-ключ у вкладці "Параметри" або тимчасово перемкнутися на карти OpenStreetMap у вкладці "Шари" без ключа.'
                    : 'A default demo API key is active. If the map fails to load or tiles appear empty, configure your custom Visicom API key in the "Settings" tab, or choose OpenStreetMap in the "Layers" tab.'}
                </p>
              </div>
              <button
                onClick={() => setShowAlert(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 font-bold ml-auto text-sm transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

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
            theme={theme}
            onUpdateMarker={handleUpdateMarker}
            watermarkText={watermarkText}
            showLegendOverlay={showLegendOverlay}
            legendOverlayText={legendOverlayText}
            showRadarOverlay={showRadarOverlay}
            blurMapOnExport={blurMapOnExport}
          />

          {/* Mobile Bottom Floating Action Bar (When no marker is selected) */}
          {selectedMarkerId === null && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] max-w-sm px-3 py-2 border rounded-full shadow-2xl flex items-center justify-between gap-1 backdrop-blur-xl bg-slate-900/90 border-white/10 text-white md:hidden animate-fade-in">
              {/* Interaction Mode Toggle (No label) */}
              <button
                onClick={() => setInteractionMode(interactionMode === 'draw' ? 'pan' : 'draw')}
                title={interactionMode === 'draw' ? (language === 'uk' ? 'Режим: Малювання' : 'Mode: Draw') : (language === 'uk' ? 'Режим: Рух' : 'Mode: Move')}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                  interactionMode === 'draw'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {interactionMode === 'draw' ? <PenTool className="w-5 h-5" /> : <Hand className="w-5 h-5" />}
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

              {/* Open Sidebar Toggle (No label, just count badge) */}
              <button
                onClick={() => setMobileView('sidebar')}
                title={language === 'uk' ? 'Параметри' : 'Settings'}
                className="w-11 h-11 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all cursor-pointer flex-shrink-0 flex items-center justify-center relative active:scale-95"
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

          {/* Quick Mobile Editor Panel (When a marker is selected) */}
          {selectedMarker && mobileView === 'map' && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-sm px-4 py-4 border rounded-3xl shadow-2xl flex flex-col gap-3 backdrop-blur-xl bg-slate-900/95 border-white/10 text-white md:hidden animate-slide-up">
              {/* Header: Title edit & Delete */}
              <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                <input
                  type="text"
                  value={selectedMarker.title}
                  onChange={(e) => handleUpdateMarker({ ...selectedMarker, title: e.target.value })}
                  placeholder={language === 'uk' ? 'Назва маркеру' : 'Marker name'}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleDeleteMarker(selectedMarker.id)}
                  className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer"
                  title={language === 'uk' ? 'Видалити маркер' : 'Delete marker'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 transition-all cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>{language === 'uk' ? 'Параметри' : 'Full Settings'}</span>
                </button>
                <button
                  onClick={() => setSelectedMarkerId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-blue-500/25"
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
              customIconTitles={customIconTitles}
              onUpdateCustomIconTitle={handleUpdateCustomIconTitle}
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

    </div>
  );
}
