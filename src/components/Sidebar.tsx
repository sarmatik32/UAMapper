import React, { useState, useEffect } from 'react';
import { CustomMarker, TileLayerConfig, Language, InteractionMode, DrawnLine, LineEndpointType } from '../types';
import { Settlement, SettlementCategory, SETTLEMENT_CATEGORY_CONFIG } from '../data/settlements';
import { ICON_TYPES, PRESET_COLORS, getIconSvgContent } from './IconLibrary';
import { safeSetItem, optimizeIconDataUrl } from '../utils/storage';
import { 
  Map, 
  Settings, 
  Layers, 
  Trash2, 
  Upload, 
  Sliders, 
  Check, 
  Globe, 
  ChevronRight,
  ChevronDown,
  MapPin,
  Send,
  RotateCcw,
  Sun,
  Moon,
  CircleDot,
  Compass,
  Move,
  Download,
  Copy,
  AlertCircle,
  Edit3,
  Ruler,
  ShieldAlert,
  PenTool,
  Hand,
  Building2,
  Spline,
  Sparkles,
  Plus,
  Image as ImageIcon
} from 'lucide-react';

interface SidebarProps {
  markers: CustomMarker[];
  selectedMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  onAddMarker: (lat?: number, lng?: number) => void;
  onUpdateMarker: (marker: CustomMarker) => void;
  onDeleteMarker: (id: string) => void;
  onClearMarkers: () => void;
  tileLayers: TileLayerConfig[];
  activeTileLayer: TileLayerConfig;
  onSelectTileLayer: (layer: TileLayerConfig) => void;
  visicomKey: string;
  onUpdateVisicomKey: (key: string) => void;
  language: Language;
  onToggleLanguage: () => void;
  onImportMarkers: (imported: CustomMarker[]) => void;
  interactionMode?: InteractionMode;
  onSetInteractionMode?: (mode: InteractionMode) => void;
  onUndo?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onExportPNG?: () => void;
  onCopyPNG?: () => void;
  activeStyle?: Partial<CustomMarker>;
  onUpdateActiveStyle?: React.Dispatch<React.SetStateAction<Partial<CustomMarker>>>;
  watermarkText?: string;
  onUpdateWatermarkText?: (text: string) => void;
  showLegendOverlay?: boolean;
  onUpdateShowLegendOverlay?: (show: boolean) => void;
  legendOverlayText?: string;
  onUpdateLegendOverlayText?: (text: string) => void;
  showRadarOverlay?: boolean;
  onUpdateShowRadarOverlay?: (show: boolean) => void;
  blurMapOnExport?: boolean;
  onUpdateBlurMapOnExport?: (blur: boolean) => void;
  showCityBoundary?: boolean;
  onUpdateShowCityBoundary?: (show: boolean) => void;
  showDistrictBoundary?: boolean;
  onUpdateShowDistrictBoundary?: (show: boolean) => void;
  showHromadaBoundaries?: boolean;
  onUpdateShowHromadaBoundaries?: (show: boolean) => void;
  showSettlementLabels?: boolean;
  onUpdateShowSettlementLabels?: (show: boolean) => void;
  settlementLabelMode?: 'all' | 'districts_cities' | 'districts_only';
  onUpdateSettlementLabelMode?: (mode: 'all' | 'districts_cities' | 'districts_only') => void;
  disabledSettlementCategories?: SettlementCategory[];
  onToggleSettlementCategory?: (category: SettlementCategory) => void;
  customSettlements?: Settlement[];
  onEnableSettlementMode?: () => void;
  onEditSettlement?: (settlement: Settlement) => void;
  onDeleteCustomSettlement?: (id: string) => void;
  onClearAllCustomSettlements?: () => void;
  onExportCustomSettlements?: () => void;
  onImportCustomSettlements?: (settlements: Settlement[]) => void;
  onExportAllSettings?: () => void;
  onImportAllSettings?: (file: File) => void;
  autoHighlightZone?: boolean;
  onToggleAutoHighlightZone?: (enabled: boolean) => void;
  customIconTitles?: Record<string, string>;
  onUpdateCustomIconTitle?: (iconType: string, title: string) => void;

  drawnLines?: DrawnLine[];
  selectedLineId?: string | null;
  onSelectLine?: (id: string | null) => void;
  onUpdateLine?: (line: DrawnLine) => void;
  onDeleteLine?: (id: string) => void;
  onClearDrawnLines?: () => void;

  lineColor?: string;
  onChangeLineColor?: (color: string) => void;
  lineWeight?: number;
  onChangeLineWeight?: (weight: number) => void;
  lineSmoothed?: boolean;
  onChangeLineSmoothed?: (smoothed: boolean) => void;
  lineStartStyle?: LineEndpointType;
  onChangeLineStartStyle?: (style: LineEndpointType) => void;
  lineStartCustomIcon?: string;
  onChangeLineStartCustomIcon?: (url: string) => void;
  lineStartIconRotation?: number;
  onChangeLineStartIconRotation?: (rot: number) => void;
  lineEndStyle?: LineEndpointType;
  onChangeLineEndStyle?: (style: LineEndpointType) => void;
  lineEndCustomIcon?: string;
  onChangeLineEndCustomIcon?: (url: string) => void;
  lineEndIconRotation?: number;
  onChangeLineEndIconRotation?: (rot: number) => void;
  lineDashStyle?: 'solid' | 'dashed' | 'dotted';
  onChangeLineDashStyle?: (dash: 'solid' | 'dashed' | 'dotted') => void;
}


export const Sidebar: React.FC<SidebarProps> = ({
  markers,
  selectedMarkerId,
  onSelectMarker,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onClearMarkers,
  tileLayers,
  activeTileLayer,
  onSelectTileLayer,
  visicomKey,
  onUpdateVisicomKey,
  language,
  onToggleLanguage,
  onImportMarkers,
  interactionMode = 'draw',
  onSetInteractionMode = (_mode) => {},
  onUndo = () => {},
  theme = 'dark',
  onToggleTheme = () => {},
  onExportPNG = () => {},
  onCopyPNG = () => {},
  activeStyle = {} as Partial<CustomMarker>,
  onUpdateActiveStyle = (() => {}) as React.Dispatch<React.SetStateAction<Partial<CustomMarker>>>,
  watermarkText = 'UA Mapper',
  onUpdateWatermarkText = (_text) => {},
  showLegendOverlay = true,
  onUpdateShowLegendOverlay = (_show) => {},
  legendOverlayText = '',
  onUpdateLegendOverlayText = (_text) => {},
  showRadarOverlay = true,
  onUpdateShowRadarOverlay = (_show) => {},
  blurMapOnExport = false,
  onUpdateBlurMapOnExport = (_blur) => {},
  showCityBoundary = true,
  onUpdateShowCityBoundary,
  showDistrictBoundary = true,
  onUpdateShowDistrictBoundary,
  showHromadaBoundaries = true,
  onUpdateShowHromadaBoundaries,
  showSettlementLabels = true,
  onUpdateShowSettlementLabels = (_show) => {},
  settlementLabelMode = 'all',
  onUpdateSettlementLabelMode = (_mode) => {},
  disabledSettlementCategories = [],
  onToggleSettlementCategory = (_category) => {},
  customSettlements = [],
  onEnableSettlementMode = () => {},
  onEditSettlement = (_s) => {},
  onDeleteCustomSettlement = (_id) => {},
  onClearAllCustomSettlements = () => {},
  onExportCustomSettlements = () => {},
  onImportCustomSettlements = (_settlements) => {},
  onExportAllSettings,
  onImportAllSettings,
  autoHighlightZone = false,
  onToggleAutoHighlightZone = (_enabled) => {},
  customIconTitles = {},
  onUpdateCustomIconTitle = (_type, _val) => {},
  drawnLines = [],
  selectedLineId = null,
  onSelectLine = (_id) => {},
  onUpdateLine = (_line) => {},
  onDeleteLine = (_id) => {},
  onClearDrawnLines = () => {},
  lineColor = '#ef4444',
  onChangeLineColor = (_color) => {},
  lineWeight = 5,
  onChangeLineWeight = (_weight) => {},
  lineSmoothed = true,
  onChangeLineSmoothed = (_smoothed) => {},
  lineStartStyle = 'none',
  onChangeLineStartStyle = (_style) => {},
  lineStartCustomIcon = '',
  onChangeLineStartCustomIcon = (_url) => {},
  lineStartIconRotation = 0,
  onChangeLineStartIconRotation = (_rot) => {},
  lineEndStyle = 'none',
  onChangeLineEndStyle = (_style) => {},
  lineEndCustomIcon = '',
  onChangeLineEndCustomIcon = (_url) => {},
  lineEndIconRotation = 0,
  onChangeLineEndIconRotation = (_rot) => {},
  lineDashStyle = 'solid',
  onChangeLineDashStyle = (_style) => {},
}) => {
  const [importError, setImportError] = useState<string | null>(null);
  const [customTileUrl, setCustomTileUrl] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [renamingMarkerId, setRenamingMarkerId] = useState<string | null>(null);

  // Custom PNG Library State
  const [customLibrary, setCustomLibrary] = useState<{ id: string; name: string; dataUrl: string }[]>(() => {
    try {
      const saved = localStorage.getItem('visicom_custom_library');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [expandedSections, setExpandedSections] = useState({
    mode: false,
    lines: false,
    styles: false,
    objects: false,
    map: false,
    overlays: false,
    settings: false,
  });

  const selectedLine = drawnLines.find((l) => l.id === selectedLineId);
  const currLineColor = selectedLine ? selectedLine.color : lineColor;
  const currLineWeight = selectedLine ? selectedLine.weight : lineWeight;
  const currLineSmoothed = selectedLine ? selectedLine.smoothed : lineSmoothed;
  const currLineStartStyle = selectedLine ? selectedLine.startPointStyle : lineStartStyle;
  const currLineStartCustomIcon = selectedLine ? (selectedLine.startCustomIconUrl || '') : lineStartCustomIcon;
  const currLineStartIconRotation = selectedLine ? (selectedLine.startIconRotation || 0) : (lineStartIconRotation || 0);
  const currLineEndStyle = selectedLine ? selectedLine.endPointStyle : lineEndStyle;
  const currLineEndCustomIcon = selectedLine ? (selectedLine.endCustomIconUrl || '') : lineEndCustomIcon;
  const currLineEndIconRotation = selectedLine ? (selectedLine.endIconRotation || 0) : (lineEndIconRotation || 0);
  const currLineDashStyle = selectedLine ? (selectedLine.dashStyle || 'solid') : lineDashStyle;

  const userCustomSettlements = customSettlements.filter(s => s.id.startsWith('custom_') && !(s as any).isDeleted);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const saveToLibrary = async (name: string, rawDataUrl: string) => {
    const optimizedDataUrl = await optimizeIconDataUrl(rawDataUrl);
    const newItem = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name,
      dataUrl: optimizedDataUrl,
    };
    setCustomLibrary((prev) => {
      const updated = [...prev, newItem];
      safeSetItem('visicom_custom_library', JSON.stringify(updated));
      return updated;
    });
    return newItem.dataUrl;
  };

  const deleteFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customLibrary.filter((item) => item.id !== id);
    setCustomLibrary(updated);
    safeSetItem('visicom_custom_library', JSON.stringify(updated));
  };

  const handleFileImportSettlements = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        let settlementsToImport: Settlement[] = [];
        if (Array.isArray(parsed)) {
          settlementsToImport = parsed;
        } else if (parsed && Array.isArray(parsed.settlements)) {
          settlementsToImport = parsed.settlements;
        } else {
          alert(isUa ? 'Невідомий формат файлу експорту.' : 'Unknown export file format.');
          return;
        }

        onImportCustomSettlements(settlementsToImport);
      } catch (err) {
        console.error('Failed to parse settlements JSON:', err);
        alert(isUa ? 'Помилка при зчитуванні JSON-файлу.' : 'Error reading JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const selectedMarker = markers.find((m) => m.id === selectedMarkerId);

  // Localization
  const isUa = language === 'uk';
  const t = {
    appName: isUa ? 'UA Mapper' : 'UA Mapper',
    author: isUa ? 'by @krrig_alerts' : 'by @krrig_alerts',
    
    secMode: isUa ? 'Режим роботи' : 'Interactions',
    btnDraw: isUa ? 'Малювання' : 'Draw',
    btnPan: isUa ? 'Переміщення' : 'Move',

    secStyles: isUa ? 'Стилі іконок' : 'Styles & Symbols',
    lblPointIcon: isUa ? 'Іконка точки' : 'Point Icon',
    lblPointColor: isUa ? 'Колір іконки' : 'Icon Color',
    lblLineColor: isUa ? 'Колір обводки' : 'Outline Color',
    btnNoColor: isUa ? 'Без кольору' : 'No Color',
    lblEndPoint: isUa ? 'Кінцевий маркер' : 'End Decorator',
    
    lblTitle: isUa ? 'Назва точки' : 'Point Title',
    lblSize: isUa ? 'Розмір іконки' : 'Icon Size',
    lblRotation: isUa ? 'Обертання' : 'Rotation',
    lblDraggable: isUa ? 'Перетягування' : 'Draggable',
    lblShowLabel: isUa ? 'Показувати підпис' : 'Show Label',
    lblCoordinates: isUa ? 'Координати' : 'Coordinates',

    secObjects: isUa ? 'Список об\'єктів' : 'Objects List',
    secMap: isUa ? 'Шар карти' : 'Map Layer',
    lblMapUrl: isUa ? 'Власний URL карти' : 'Custom Map URL',
    btnLoad: isUa ? 'Завантажити' : 'Load',
    btnResetMap: isUa ? 'Скинути карту' : 'Reset Map',

    btnSavePng: isUa ? 'Експорт PNG' : 'Export PNG',
    btnShare: isUa ? 'БУФЕР' : 'BUFFER',
    btnUndo: isUa ? 'Скасувати' : 'Undo',
    btnClearAll: isUa ? 'Очистити все' : 'Clear All',
    btnSupport: isUa ? 'ПІДТРИМКА' : 'SUPPORT',

    noObjects: isUa ? 'Ще не створено жодного об\'єкта.' : 'No objects created yet.',
    confirmClear: isUa ? 'Видалити всі маркери?' : 'Clear all markers?',
    
    // Zone strings
    lblHasZone: isUa ? 'Зона навколо іконки' : 'Zone around Icon',
    lblZoneColor: isUa ? 'Колір зони' : 'Zone Color',
    lblZoneSize: isUa ? 'Розмір зони' : 'Zone Size',
  };

  // Helper to trigger custom PNG upload
  const handlePngUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png';
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
          const base64 = readerEvent.target?.result as string;
          const defaultName = file.name.replace(/\.[^/.]+$/, "");
          const name = window.prompt(isUa ? 'Введіть назву для іконки:' : 'Enter a name for the icon:', defaultName) || defaultName;
          
          const savedUrl = await saveToLibrary(name, base64);
          
          handlePropsChange({
            customIconUrl: savedUrl,
            iconType: 'custom',
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Handle manual edits of properties (applies to selected marker or template activeStyle!)
  const handlePropChange = (key: keyof CustomMarker, value: any) => {
    if (selectedMarker) {
      onUpdateMarker({
        ...selectedMarker,
        [key]: value,
      });
    } else {
      onUpdateActiveStyle((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const getDefaultIconName = (iconType: string) => {
    const found = ICON_TYPES.find((t) => t.id === iconType);
    if (found) {
      return language === 'uk' ? found.nameUa : found.nameEn;
    }
    return language === 'uk' ? 'Маркер' : 'Marker';
  };

  const handlePropsChange = (updates: Partial<CustomMarker>) => {
    if (selectedMarker) {
      const newUpdates = { ...updates };
      if (updates.iconType && updates.iconType !== selectedMarker.iconType) {
        newUpdates.title = customIconTitles[updates.iconType] || getDefaultIconName(updates.iconType);
      }
      onUpdateMarker({
        ...selectedMarker,
        ...newUpdates,
      });
    } else {
      const newUpdates = { ...updates };
      if (updates.iconType && updates.iconType !== activeStyle.iconType) {
        newUpdates.title = customIconTitles[updates.iconType] || getDefaultIconName(updates.iconType);
      }
      onUpdateActiveStyle((prev) => ({
        ...prev,
        ...newUpdates,
      }));
    }
  };

  const handleLoadCustomTile = () => {
    if (!customTileUrl) return;
    onSelectTileLayer({
      id: 'custom_url_' + Date.now(),
      nameEn: 'Custom Layer',
      nameUa: 'Власна карта',
      url: customTileUrl,
      tms: false,
      maxZoom: 19,
      attribution: 'Custom Tile Layer',
      requiresKey: false
    });
  };

  const handleResetTile = () => {
    setCustomTileUrl('');
    onSelectTileLayer(tileLayers[0]);
  };

  // Export properties representing either the selected marker or the pre-configured template activeStyle
  const activeIconType = selectedMarker ? selectedMarker.iconType : (activeStyle.iconType || 'pin');
  const activeCustomIconUrl = selectedMarker ? selectedMarker.customIconUrl : activeStyle.customIconUrl;
  const activeColor = selectedMarker ? selectedMarker.color : (activeStyle.color || '#ef4444');
  const activeBorderColor = selectedMarker ? selectedMarker.borderColor || '#ffffff' : (activeStyle.borderColor || '#ffffff');
  const activeEndPointStyle = selectedMarker ? selectedMarker.endPointStyle || 'none' : (activeStyle.endPointStyle || 'none');
  const activeTitle = selectedMarker ? selectedMarker.title : '';
  const activeSize = selectedMarker ? selectedMarker.size : (activeStyle.size || 32);
  const activeRotation = selectedMarker ? selectedMarker.rotation : (activeStyle.rotation || 0);
  const activeDraggable = selectedMarker ? selectedMarker.draggable : (activeStyle.draggable !== undefined ? activeStyle.draggable : true);
  const activeLabelVisible = selectedMarker ? selectedMarker.labelVisible : (activeStyle.labelVisible !== undefined ? activeStyle.labelVisible : true);
  
  // Tactical zone properties
  const activeHasZone = selectedMarker ? !!selectedMarker.hasZone : !!activeStyle.hasZone;
  const activeZoneColor = selectedMarker ? selectedMarker.zoneColor || selectedMarker.color : activeStyle.zoneColor || activeStyle.color || '#ef4444';
  const activeZoneSize = selectedMarker ? selectedMarker.zoneSize || 60 : activeStyle.zoneSize || 60;

  return (
    <div className={`w-full md:w-80 flex flex-col h-full overflow-hidden z-20 font-sans border-t md:border-t-0 ${
      theme === 'light'
        ? 'bg-white border-l border-slate-200 text-slate-700 shadow-xl'
        : 'bg-[#161a22] border-l border-[#262c38] text-slate-300 shadow-2xl'
    }`}>
      
      {/* Header section with App Branding */}
      <div className={`p-2 sm:p-4 border-b flex justify-between items-center gap-1.5 sm:gap-3 ${
        theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0e1117]/50 border-[#262c38]'
      }`}>
        <div className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border flex flex-nowrap items-center gap-[1px] sm:gap-[2px] shadow-md transition-all select-none flex-shrink min-w-0 ${
          theme === 'light' 
            ? 'bg-slate-950/90 border-slate-900 text-white' 
            : 'bg-white/90 border-white text-slate-950'
        }`}>
          <span 
            className="font-sans font-bold tracking-tight text-[10.5px] sm:text-[13px] leading-none flex items-center whitespace-nowrap"
            style={{ color: theme === 'light' ? 'rgb(225, 255, 0)' : 'rgb(255, 0, 0)' }}
          >
            UA Mapper
          </span>
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 animate-pulse" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="telegram-watermark-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2AABEE" />
                <stop offset="100%" stopColor="#229ED9" />
              </linearGradient>
            </defs>
            <circle cx="14" cy="14" r="13" fill="url(#telegram-watermark-sidebar)" />
            <path d="M10.8 14.9L10.5 19.1C10.9 19.1 11.1 18.9 11.3 18.7L13.2 16.9L17.2 19.8C17.9 20.2 18.4 20.0 18.6 19.2L21.2 6.9C21.4 6.0 20.8 5.6 20.2 5.9L4.8 11.8C3.9 12.2 3.9 12.7 4.7 13.0L8.6 14.2L17.6 8.5C18.0 8.2 18.4 8.4 18.1 8.7L10.8 14.9Z" fill="white" />
          </svg>
          <span className={`inline-block w-[1px] h-2.5 self-center ${
            theme === 'light' ? 'bg-white/20' : 'bg-slate-950/20'
          }`} />
          <span className={`font-sans font-bold tracking-wider uppercase leading-none flex items-center text-[7px] sm:text-[8px] whitespace-nowrap ${
            theme === 'light' ? 'text-white' : 'text-slate-950'
          }`}>
            BY @KRRIG_ALERTS
          </span>
        </div>

        {/* Top-Right utility buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            title={isUa ? 'Перемкнути світлу/темну тему' : 'Toggle light/dark theme'}
            className={`w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] flex items-center justify-center border rounded-xl transition-all cursor-pointer ${
              theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" /> : <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />}
          </button>

          <button
            onClick={onToggleLanguage}
            title={isUa ? 'Switch to English' : 'Перемкнути на українську'}
            className={`w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] flex items-center justify-center border rounded-xl transition-all cursor-pointer ${
              theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" />
          </button>
        </div>
      </div>

      {/* Accordion List wrapper */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">

        {/* ШВИДКОДОСТУПНІ ІНСТРУМЕНТИ (QUICK ACCESS ROUND BUTTONS PANEL) */}
        <div className={`p-2 rounded-2xl border shadow-sm flex items-center justify-around transition-all ${
          theme === 'light' 
            ? 'border-slate-200 bg-white' 
            : 'border-[#262c38] bg-[#0e1117]/60'
        }`}>
          <button
            onClick={() => onUpdateShowSettlementLabels?.(!showSettlementLabels)}
            title={isUa ? `Назви населених пунктів: ${showSettlementLabels ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}` : `Settlement labels: ${showSettlementLabels ? 'ON' : 'OFF'}`}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              showSettlementLabels
                ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-blue-500 border border-slate-200 dark:border-white/10'
            }`}
          >
            <Building2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleAutoHighlightZone?.(!autoHighlightZone)}
            title={isUa ? `Авто-підсвітка громад: ${autoHighlightZone ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}` : `Auto-highlight zones: ${autoHighlightZone ? 'ON' : 'OFF'}`}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              autoHighlightZone
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-amber-500 border border-slate-200 dark:border-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSetInteractionMode(interactionMode === 'redzone' ? 'draw' : 'redzone')}
            title={isUa ? 'Червоні зони' : 'Red Zone Mode'}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              interactionMode === 'redzone'
                ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/30 ring-2 ring-red-400'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-red-500 border border-slate-200 dark:border-white/10'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSetInteractionMode(interactionMode === 'settlement' ? 'draw' : 'settlement')}
            title={isUa ? 'Додати точку населеного пункту' : 'Add Settlement Point'}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              interactionMode === 'settlement'
                ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-blue-500 border border-slate-200 dark:border-white/10'
            }`}
          >
            <MapPin className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSetInteractionMode(interactionMode === 'line' ? 'draw' : 'line')}
            title={isUa ? 'Малювання ліній зі зглажуванням' : 'Draw Smoothed Lines'}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              interactionMode === 'line'
                ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-emerald-500 border border-slate-200 dark:border-white/10'
            }`}
          >
            <Spline className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSetInteractionMode(interactionMode === 'measure' ? 'draw' : 'measure')}
            title={isUa ? 'Виміряти відстань' : 'Measure Distance'}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              interactionMode === 'measure'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-amber-500 border border-slate-200 dark:border-white/10'
            }`}
          >
            <Ruler className="w-4 h-4" />
          </button>
        </div>

        {/* 1. РЕЖИМ РОБОТИ ТА ІНСТРУМЕНТИ (MAP MODES & TOOLS) */}
        <div className={`border rounded-2xl overflow-hidden ${
          theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-[#262c38] bg-[#0e1117]/20'
        }`}>
          <button
            onClick={() => toggleSection('mode')}
            className={`w-full px-3.5 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider transition-colors ${
              theme === 'light' 
                ? 'bg-slate-100/50 hover:bg-slate-100 text-slate-800' 
                : 'bg-[#0e1117]/40 hover:bg-[#0e1117]/60 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Move className="w-3.5 h-3.5 text-blue-500" />
              <span>{isUa ? 'Інструменти та режими' : 'Map Tools & Modes'}</span>
            </div>
            {expandedSections.mode ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          </button>

          {expandedSections.mode && (
            <div className="p-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => onSetInteractionMode('draw')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  interactionMode === 'draw'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-500 dark:text-blue-400 font-extrabold shadow-sm'
                    : (theme === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-[#181d28] border-white/5 text-slate-400 hover:bg-white/5')
                }`}
              >
                <PenTool className="w-4 h-4" />
                <span className="text-[11px] font-bold">{isUa ? 'Малювання значків' : 'Draw Markers'}</span>
              </button>

              <button
                onClick={() => onSetInteractionMode('line')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  interactionMode === 'line'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-500 dark:text-emerald-400 font-extrabold shadow-sm'
                    : (theme === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-[#181d28] border-white/5 text-slate-400 hover:bg-white/5')
                }`}
              >
                <Spline className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span className="text-[11px] font-bold">{isUa ? 'Малювання ліній' : 'Draw Lines'}</span>
              </button>

              <button
                onClick={() => onSetInteractionMode('pan')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    interactionMode === 'pan'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-500 dark:text-blue-400 font-extrabold shadow-sm'
                      : (theme === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-[#181d28] border-white/5 text-slate-400 hover:bg-white/5')
                  }`}
                >
                  <Hand className="w-4 h-4" />
                  <span className="text-[11px] font-bold">{isUa ? 'Переміщення' : 'Pan Map'}</span>
                </button>

                <button
                  onClick={() => onSetInteractionMode('redzone')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    interactionMode === 'redzone'
                      ? 'bg-red-500 text-white font-extrabold shadow-md shadow-red-500/20 border-red-400'
                      : (theme === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-[#181d28] border-white/5 text-slate-400 hover:bg-white/5')
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400" />
                  <span className="text-[11px] font-bold">{isUa ? 'Червоні зони' : 'Red Zones'}</span>
                </button>

                <button
                  onClick={() => onSetInteractionMode('measure')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    interactionMode === 'measure'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20 border-amber-400'
                      : (theme === 'light' ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-[#181d28] border-white/5 text-slate-400 hover:bg-white/5')
                  }`}
                >
                  <Ruler className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span className="text-[11px] font-bold">{isUa ? 'Вимірювання' : 'Measure'}</span>
                </button>
              </div>
          )}
        </div>

        {/* 1.5 НАЛАШТУВАННЯ ЛІНІЙ (LINE DRAWING & CONFIGURATION) */}
        <div className={`border rounded-2xl overflow-hidden transition-all ${
          interactionMode === 'line' || selectedLineId !== null ? 'ring-2 ring-emerald-500/60 border-emerald-500' : (theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-[#262c38] bg-[#0e1117]/20')
        }`}>
          <button
            onClick={() => toggleSection('lines')}
            className={`w-full px-3.5 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider transition-colors ${
              interactionMode === 'line'
                ? 'bg-emerald-500/15 text-emerald-400'
                : (theme === 'light' ? 'bg-slate-100/50 hover:bg-slate-100 text-slate-800' : 'bg-[#0e1117]/40 hover:bg-[#0e1117]/60 text-white')
            }`}
          >
            <div className="flex items-center gap-2">
              <Spline className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isUa ? 'Малювання та стиль ліній' : 'Line Drawing & Styles'}</span>
            </div>
            <div className="flex items-center gap-2">
              {drawnLines.length > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                  {drawnLines.length}
                </span>
              )}
              {expandedSections.lines ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </div>
          </button>

          {(expandedSections.lines || interactionMode === 'line' || selectedLineId !== null) && (
            <div className="p-3.5 space-y-4 text-xs">
              
              {/* Target indicator */}
              <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200 dark:border-white/10">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isUa ? 'Об\'єкт лінії:' : 'Line Object:'}
                </span>
                {selectedLine ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                      {isUa ? 'Обрано лінію' : 'Selected Line'}
                    </span>
                    <button
                      onClick={() => onDeleteLine(selectedLine.id)}
                      title={isUa ? 'Видалити обрану лінію' : 'Delete Selected Line'}
                      className="p-1 rounded-md bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-extrabold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-md">
                    {isUa ? 'Шаблон нової лінії' : 'New Line Template'}
                  </span>
                )}
              </div>

              {/* Mode button shortcut */}
              {interactionMode !== 'line' && !selectedLine && (
                <button
                  onClick={() => onSetInteractionMode('line')}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <Spline className="w-4 h-4" />
                  <span>{isUa ? 'Увімкнути режим малювання лінії' : 'Activate Line Drawing Mode'}</span>
                </button>
              )}

              {/* 1. Color Picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {isUa ? 'Колір лінії' : 'Line Color'}
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => {
                        if (selectedLine) onUpdateLine({ ...selectedLine, color: c.hex });
                        else onChangeLineColor(c.hex);
                      }}
                      className={`w-6 h-6 rounded-full border border-white/20 transition-all cursor-pointer relative ${
                        currLineColor === c.hex ? 'ring-2 ring-emerald-400 scale-110 shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={isUa ? c.nameUa : c.nameEn}
                    />
                  ))}
                  <input
                    type="color"
                    value={currLineColor.startsWith('#') ? currLineColor : '#ef4444'}
                    onChange={(e) => {
                      if (selectedLine) onUpdateLine({ ...selectedLine, color: e.target.value });
                      else onChangeLineColor(e.target.value);
                    }}
                    className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer p-0"
                    title={isUa ? 'Свій колір' : 'Custom Color'}
                  />
                </div>
              </div>

              {/* 2. Weight / Thickness Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isUa ? 'Товщина лінії' : 'Line Thickness'}
                  </label>
                  <span className="text-[11px] font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    {currLineWeight} px
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={currLineWeight}
                  onChange={(e) => {
                    const w = parseInt(e.target.value, 10);
                    if (selectedLine) onUpdateLine({ ...selectedLine, weight: w });
                    else onChangeLineWeight(w);
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* 3. Corner Smoothing Toggle */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-500/5 space-y-1">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => {
                  const val = !currLineSmoothed;
                  if (selectedLine) onUpdateLine({ ...selectedLine, smoothed: val });
                  else onChangeLineSmoothed(val);
                }}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {isUa ? 'Згладжувати повороти (кути)' : 'Smooth Corners & Turns'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={currLineSmoothed}
                    onChange={(e) => {
                      const val = e.target.checked;
                      if (selectedLine) onUpdateLine({ ...selectedLine, smoothed: val });
                      else onChangeLineSmoothed(val);
                    }}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pl-6">
                  {isUa ? 'Повороти та кути сильно згладжуються плавною дугою' : 'Turn angles and corners are strongly smoothed into curves'}
                </p>
              </div>

              {/* 4. Dash Style */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {isUa ? 'Стиль лінії' : 'Line Pattern'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'solid', labelUa: 'Суцільна', labelEn: 'Solid' },
                    { id: 'dashed', labelUa: 'Штрихова', labelEn: 'Dashed' },
                    { id: 'dotted', labelUa: 'Пунктирна', labelEn: 'Dotted' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        if (selectedLine) onUpdateLine({ ...selectedLine, dashStyle: st.id as any });
                        else onChangeLineDashStyle(st.id as any);
                      }}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                        currLineDashStyle === st.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-500/5 border-slate-200 dark:border-white/5 text-slate-400 hover:bg-slate-500/10'
                      }`}
                    >
                      {isUa ? st.labelUa : st.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Start Point Style */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-500/5 space-y-2.5">
                <label className="block text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                  {isUa ? 'Початкова точка лінії' : 'Line Start Endpoint'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'fade', nameUa: 'Затухання', nameEn: 'Fade', icon: '✨' },
                    { id: 'explosion', nameUa: 'Вибух', nameEn: 'Explosion', icon: '💥' },
                    { id: 'custom_icon', nameUa: 'Іконка', nameEn: 'Custom Icon', icon: '🖼️' },
                    { id: 'arrow', nameUa: 'Стрілка', nameEn: 'Arrow', icon: '➔' },
                    { id: 'dot', nameUa: 'Точка', nameEn: 'Dot', icon: '⏺' },
                    { id: 'none', nameUa: 'Без значка', nameEn: 'None', icon: '—' },
                  ].map((ep) => (
                    <button
                      key={ep.id}
                      onClick={() => {
                        if (selectedLine) onUpdateLine({ ...selectedLine, startPointStyle: ep.id as any });
                        else onChangeLineStartStyle(ep.id as any);
                      }}
                      className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                        currLineStartStyle === ep.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold shadow-sm'
                          : 'bg-slate-900/20 border-slate-200 dark:border-white/5 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <span>{ep.icon}</span>
                      <span>{isUa ? ep.nameUa : ep.nameEn}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Icon picker for Start Point */}
                {currLineStartStyle === 'custom_icon' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{isUa ? 'Оберіть іконку з бібліотеки:' : 'Select custom icon:'}</span>
                      <label className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 font-bold">
                        <Plus className="w-3 h-3" />
                        <span>{isUa ? 'Завантажити' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/png,image/svg+xml,image/jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              if (dataUrl) {
                                saveToLibrary(file.name.replace(/\.[^/.]+$/, ""), dataUrl);
                                if (selectedLine) onUpdateLine({ ...selectedLine, startCustomIconUrl: dataUrl });
                                else onChangeLineStartCustomIcon(dataUrl);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>

                    {customLibrary.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic">
                        {isUa ? 'У бібліотеці немає власних іконок. Натисніть "Завантажити" вище.' : 'No custom icons. Click "Upload" above.'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-1 bg-black/20 rounded-xl">
                        {customLibrary.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (selectedLine) onUpdateLine({ ...selectedLine, startCustomIconUrl: item.dataUrl });
                              else onChangeLineStartCustomIcon(item.dataUrl);
                            }}
                            className={`p-1 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                              currLineStartCustomIcon === item.dataUrl ? 'border-emerald-400 bg-emerald-500/30 ring-1 ring-emerald-400' : 'border-white/10 hover:bg-white/10'
                            }`}
                            title={item.name}
                          >
                            <img src={item.dataUrl} className="w-6 h-6 object-contain" alt={item.name} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(currLineStartStyle === 'custom_icon' || currLineStartStyle === 'arrow') && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                      <span>{isUa ? 'Поворот / напрям іконки' : 'Icon Rotation'}</span>
                      <span className="font-mono text-emerald-400">{currLineStartIconRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="359"
                      value={currLineStartIconRotation}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (selectedLine) onUpdateLine({ ...selectedLine, startIconRotation: val });
                        else onChangeLineStartIconRotation(val);
                      }}
                      className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* 6. End Point Style */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-500/5 space-y-2.5">
                <label className="block text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                  {isUa ? 'Кінцева точка лінії' : 'Line End Endpoint'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'fade', nameUa: 'Затухання', nameEn: 'Fade', icon: '✨' },
                    { id: 'explosion', nameUa: 'Вибух', nameEn: 'Explosion', icon: '💥' },
                    { id: 'custom_icon', nameUa: 'Іконка', nameEn: 'Custom Icon', icon: '🖼️' },
                    { id: 'arrow', nameUa: 'Стрілка', nameEn: 'Arrow', icon: '➔' },
                    { id: 'dot', nameUa: 'Точка', nameEn: 'Dot', icon: '⏺' },
                    { id: 'none', nameUa: 'Без значка', nameEn: 'None', icon: '—' },
                  ].map((ep) => (
                    <button
                      key={ep.id}
                      onClick={() => {
                        if (selectedLine) onUpdateLine({ ...selectedLine, endPointStyle: ep.id as any });
                        else onChangeLineEndStyle(ep.id as any);
                      }}
                      className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                        currLineEndStyle === ep.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold shadow-sm'
                          : 'bg-slate-900/20 border-slate-200 dark:border-white/5 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <span>{ep.icon}</span>
                      <span>{isUa ? ep.nameUa : ep.nameEn}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Icon picker for End Point */}
                {currLineEndStyle === 'custom_icon' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{isUa ? 'Оберіть іконку з бібліотеки:' : 'Select custom icon:'}</span>
                      <label className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 font-bold">
                        <Plus className="w-3 h-3" />
                        <span>{isUa ? 'Завантажити' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/png,image/svg+xml,image/jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              if (dataUrl) {
                                saveToLibrary(file.name.replace(/\.[^/.]+$/, ""), dataUrl);
                                if (selectedLine) onUpdateLine({ ...selectedLine, endCustomIconUrl: dataUrl });
                                else onChangeLineEndCustomIcon(dataUrl);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>

                    {customLibrary.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic">
                        {isUa ? 'У бібліотеці немає власних іконок. Натисніть "Завантажити" вище.' : 'No custom icons. Click "Upload" above.'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-1 bg-black/20 rounded-xl">
                        {customLibrary.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (selectedLine) onUpdateLine({ ...selectedLine, endCustomIconUrl: item.dataUrl });
                              else onChangeLineEndCustomIcon(item.dataUrl);
                            }}
                            className={`p-1 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                              currLineEndCustomIcon === item.dataUrl ? 'border-emerald-400 bg-emerald-500/30 ring-1 ring-emerald-400' : 'border-white/10 hover:bg-white/10'
                            }`}
                            title={item.name}
                          >
                            <img src={item.dataUrl} className="w-6 h-6 object-contain" alt={item.name} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(currLineEndStyle === 'custom_icon' || currLineEndStyle === 'arrow') && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                      <span>{isUa ? 'Поворот / напрям іконки' : 'Icon Rotation'}</span>
                      <span className="font-mono text-emerald-400">{currLineEndIconRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="359"
                      value={currLineEndIconRotation}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (selectedLine) onUpdateLine({ ...selectedLine, endIconRotation: val });
                        else onChangeLineEndIconRotation(val);
                      }}
                      className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* 7. Drawn Lines List & Clear All */}
              {drawnLines.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>{isUa ? `Намальовані лінії (${drawnLines.length})` : `Drawn Lines (${drawnLines.length})`}</span>
                    <button
                      onClick={onClearDrawnLines}
                      className="text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 text-[10px] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{isUa ? 'Видалити всі' : 'Clear All'}</span>
                    </button>
                  </div>

                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {drawnLines.map((line, idx) => {
                      const isSel = selectedLineId === line.id;
                      return (
                        <div
                          key={line.id}
                          onClick={() => onSelectLine(isSel ? null : line.id)}
                          className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isSel
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold'
                              : 'bg-slate-500/5 border-slate-200 dark:border-white/5 text-slate-400 hover:bg-slate-500/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: line.color }}></span>
                            <span className="text-[11px]">
                              {isUa ? `Лінія #${idx + 1} (${line.points.length} точок)` : `Line #${idx + 1} (${line.points.length} pts)`}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLine(line.id);
                            }}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* 2. СТИЛІ (STYLES) - ALWAYS AVAILABLE FOR CONFIGURATION */}

        <div className={`border rounded-2xl overflow-hidden ${
          theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-[#262c38] bg-[#0e1117]/20'
        }`}>
          <button
            onClick={() => toggleSection('styles')}
            className={`w-full px-3.5 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider transition-colors ${
              theme === 'light' 
                ? 'bg-slate-100/50 hover:bg-slate-100 text-slate-800' 
                : 'bg-[#0e1117]/40 hover:bg-[#0e1117]/60 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-blue-500" />
              <span>{t.secStyles}</span>
            </div>
            {expandedSections.styles ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          </button>

          {expandedSections.styles && (
            <div className="p-3 space-y-3.5">
              
              {/* Editing Target Indicator */}
              <div className="flex items-center justify-between pb-1 border-b border-dashed border-slate-200 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isUa ? 'Ціль налаштування:' : 'Configuring target:'}
                </span>
                <span className="text-[10px] font-extrabold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">
                  {selectedMarker 
                    ? (isUa ? `Маркер: "${selectedMarker.title}"` : `Marker: "${selectedMarker.title}"`) 
                    : (isUa ? 'Стиль за замовчуванням' : 'Active Symbol template')}
                </span>
              </div>

              {/* Point shape selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {t.lblPointIcon}
                </label>
                <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto p-0.5 border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-500/5 mb-3.5">
                  {ICON_TYPES.map((type) => {
                    const isActive = activeIconType === type.id && !activeCustomIconUrl;
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          handlePropsChange({
                            iconType: type.id,
                            customIconUrl: undefined,
                          });
                        }}
                        title={isUa ? type.nameUa : type.nameEn}
                        className={`h-9 border rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                          isActive
                            ? 'bg-blue-600/20 border-blue-500 text-blue-500 dark:text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.35)] scale-105 z-10'
                            : (theme === 'light' 
                              ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700' 
                              : 'bg-[#181d28] border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200')
                        }`}
                      >
                        <div 
                          className="w-5 h-5 flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: getIconSvgContent(type.id, 'currentColor', theme === 'light' ? '#0f172a' : '#ffffff') }}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Custom Upload PNG button */}
                <button
                  onClick={handlePngUploadClick}
                  title={isUa ? 'Завантажити свій PNG' : 'Upload custom PNG'}
                  className={`w-full py-2 px-3 border rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs font-bold ${
                    activeCustomIconUrl
                      ? 'bg-blue-600/20 border-blue-500 text-blue-500 dark:text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.25)]'
                      : (theme === 'light' 
                        ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                        : 'bg-[#181d28] border-white/5 text-slate-400 hover:bg-white/5')
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isUa ? 'Додати власний PNG малюнок' : 'Upload custom PNG marker'}</span>
                </button>

                {/* Uploaded custom library thumbnails */}
                {customLibrary.length > 0 && (
                  <div className="mt-3.5 space-y-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {isUa ? 'Власна бібліотека' : 'Custom Library'}
                    </span>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                      {customLibrary.map((item) => {
                        const isActive = activeCustomIconUrl === item.dataUrl;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              handlePropsChange({
                                customIconUrl: item.dataUrl,
                                iconType: 'custom',
                              });
                            }}
                            className={`group p-1.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                              isActive
                                ? 'border-blue-500 bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.15)]'
                                : (theme === 'light' 
                                  ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700' 
                                  : 'border-white/5 bg-[#181d28]/40 hover:border-white/10 text-slate-300')
                            }`}
                          >
                            <div className="w-6 h-6 p-0.5 rounded-lg bg-[#1c2230] border border-white/5 flex items-center justify-center flex-shrink-0">
                              <img src={item.dataUrl} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                            <span className="text-[10px] truncate flex-1 font-semibold" title={item.name}>
                              {item.name}
                            </span>
                            <button
                              onClick={(e) => deleteFromLibrary(item.id, e)}
                              className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title={isUa ? 'Видалити іконку' : 'Delete icon'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Color selectors side-by-side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Fill color */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t.lblPointColor}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeColor === 'transparent' ? '#ef4444' : activeColor}
                      onChange={(e) => handlePropChange('color', e.target.value)}
                      disabled={activeColor === 'transparent'}
                      className="w-10 h-10 bg-transparent cursor-pointer rounded-xl border border-white/10 overflow-hidden p-0"
                    />
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">
                      {activeColor === 'transparent' ? 'None' : activeColor}
                    </span>
                  </div>
                </div>

                {/* Border/Line color */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t.lblLineColor}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeBorderColor}
                      onChange={(e) => handlePropChange('borderColor', e.target.value)}
                      className="w-10 h-10 bg-transparent cursor-pointer rounded-xl border border-white/10 overflow-hidden p-0"
                    />
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">
                      {activeBorderColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* No Color & Preset Colors Row */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handlePropChange('color', 'transparent')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      activeColor === 'transparent'
                        ? 'bg-blue-600/15 border-blue-500 text-blue-500 dark:text-blue-400'
                        : (theme === 'light' 
                          ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50' 
                          : 'bg-[#181d28] border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-300')
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.btnNoColor}</span>
                  </button>

                  {/* Quick Color Presets */}
                  <div className="flex gap-1">
                    {['#eab308', '#ef4444', '#3b82f6', '#ffffff'].map((hex) => (
                      <button
                        key={hex}
                        onClick={() => handlePropChange('color', hex)}
                        style={{ backgroundColor: hex }}
                        className={`w-5 h-5 rounded-full border border-white/10 hover:scale-110 transition-transform ${
                          activeColor === hex ? 'ring-2 ring-blue-500' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* End Point selector */}
              <div className="pt-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {t.lblEndPoint}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['line', 'explosion', 'none'].map((style) => (
                    <button
                      key={style}
                      onClick={() => handlePropChange('endPointStyle', style)}
                      className={`py-2 px-1 border rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer truncate ${
                        activeEndPointStyle === style
                          ? 'bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold shadow-[0_0_8px_rgba(59,130,246,0.1)]'
                          : (theme === 'light' 
                            ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50' 
                            : 'bg-[#181d28] border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200')
                      }`}
                      title={
                        style === 'line' ? (isUa ? 'Полоса' : 'Dashed Line') :
                        style === 'explosion' ? (isUa ? 'Вибух 💥' : 'Explosion 💥') :
                        (isUa ? 'Ні' : 'None')
                      }
                    >
                      {
                        style === 'line' ? (isUa ? 'Полоса' : 'Line') :
                        style === 'explosion' ? (isUa ? 'Вибух 💥' : 'Explosion') :
                        (isUa ? 'Ні' : 'None')
                      }
                    </button>
                  ))}
                </div>
              </div>

              {/* TACTICAL ZONE CONTROLS */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                    <input
                      type="checkbox"
                      checked={activeHasZone}
                      onChange={(e) => handlePropChange('hasZone', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500"
                    />
                    <span>{t.lblHasZone}</span>
                  </label>
                </div>

                {activeHasZone && (
                  <div className="space-y-3 pl-1.5 border-l-2 border-blue-500/30 animate-fade-in">
                    {/* Zone Color */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                        <span>{t.lblZoneColor}</span>
                        <span className="font-mono text-blue-500">{activeZoneColor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeZoneColor}
                          onChange={(e) => handlePropChange('zoneColor', e.target.value)}
                          className="w-8 h-8 bg-transparent cursor-pointer rounded-lg border border-white/10 overflow-hidden p-0"
                        />
                        <div className="flex gap-1 flex-1 justify-end">
                          {['#eab308', '#ef4444', '#3b82f6', '#22c55e'].map((hex) => (
                            <button
                              key={hex}
                              onClick={() => handlePropChange('zoneColor', hex)}
                              style={{ backgroundColor: hex }}
                              className={`w-4 h-4 rounded-full border border-white/10 hover:scale-110 transition-transform ${
                                activeZoneColor === hex ? 'ring-2 ring-blue-500' : ''
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Zone Size */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mb-1">
                        <span>{t.lblZoneSize}</span>
                        <span className="font-mono text-blue-500">{activeZoneSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="300"
                        value={activeZoneSize}
                        onChange={(e) => handlePropChange('zoneSize', Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 dark:bg-[#181d28] rounded appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Marker detail sliders */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/5">
                {/* Title (Always editable - either for the selected point or the active style/icon type template) */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {selectedMarker ? t.lblTitle : (isUa ? 'Назва для іконки' : 'Icon Name/Label')}
                  </span>
                  <input
                    type="text"
                    value={selectedMarker ? activeTitle : (activeStyle.title || customIconTitles[activeIconType] || getDefaultIconName(activeIconType))}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (selectedMarker) {
                        handlePropChange('title', val);
                      } else {
                        handlePropChange('title', val);
                        onUpdateCustomIconTitle(activeIconType, val);
                      }
                    }}
                    placeholder="..."
                    className={`w-full border px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 ${
                      theme === 'light' 
                        ? 'bg-white border-slate-200 text-slate-800' 
                        : 'bg-[#181d28] border-white/5 text-slate-200'
                    }`}
                  />
                </div>

                {/* Size slider */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mb-1">
                    <span>{t.lblSize}</span>
                    <span className="font-mono text-blue-500">{activeSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="64"
                    value={activeSize}
                    onChange={(e) => handlePropChange('size', Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-[#181d28] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Rotation slider */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mb-1">
                    <span>{t.lblRotation}</span>
                    <span className="font-mono text-blue-500">{activeRotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    value={activeRotation}
                    onChange={(e) => handlePropChange('rotation', Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-[#181d28] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-500 dark:text-slate-400 select-none">
                    <input
                      type="checkbox"
                      checked={activeDraggable}
                      onChange={(e) => handlePropChange('draggable', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500"
                    />
                    <span>{t.lblDraggable}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-500 dark:text-slate-400 select-none">
                    <input
                      type="checkbox"
                      checked={activeLabelVisible}
                      onChange={(e) => handlePropChange('labelVisible', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500"
                    />
                    <span>{t.lblShowLabel}</span>
                  </label>
                </div>

                {/* Delete Current Selected Marker button */}
                {selectedMarker && (
                  <button
                    onClick={() => onDeleteMarker(selectedMarker.id)}
                    className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-xs font-bold rounded-xl border border-red-500/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isUa ? 'Видалити точку' : 'Delete Point'}</span>
                  </button>
                )}
              </div>

            </div>
          )}
        </div>

        {/* 3. ОБ'ЄКТИ (OBJECTS) */}
        <div className={`border rounded-2xl overflow-hidden ${
          theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-[#262c38] bg-[#0e1117]/20'
        }`}>
          <button
            onClick={() => toggleSection('objects')}
            className={`w-full px-3.5 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider transition-colors ${
              theme === 'light' 
                ? 'bg-slate-100/50 hover:bg-slate-100 text-slate-800' 
                : 'bg-[#0e1117]/40 hover:bg-[#0e1117]/60 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span>{t.secObjects} ({markers.length})</span>
            </div>
            {expandedSections.objects ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          </button>

          {expandedSections.objects && (
            <div className="p-3 space-y-2">
              {markers.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">
                  {t.noObjects}
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {markers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onSelectMarker(m.id)}
                      className={`p-2 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                        selectedMarkerId === m.id
                          ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-white font-semibold'
                          : (theme === 'light'
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            : 'bg-[#181d28]/60 border-white/5 text-slate-300 hover:bg-white/5')
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          style={{ backgroundColor: m.color === 'transparent' ? '#ffffff' : m.color }}
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${m.color === 'transparent' ? 'border border-dashed border-slate-300' : ''}`}
                        ></span>
                        {renamingMarkerId === m.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={m.title}
                            onChange={(e) => onUpdateMarker({ ...m, title: e.target.value })}
                            onBlur={() => setRenamingMarkerId(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setRenamingMarkerId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/20 dark:bg-black/40 border border-blue-500 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-900 dark:text-white w-full focus:outline-none"
                          />
                        ) : (
                          <span 
                            className="font-semibold truncate"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setRenamingMarkerId(m.id);
                            }}
                          >
                            {m.title || (isUa ? 'Без назви' : 'Untitled')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingMarkerId(renamingMarkerId === m.id ? null : m.id);
                          }}
                          className="text-slate-400 hover:text-blue-500 p-1 rounded transition-colors"
                          title={isUa ? 'Перейменувати' : 'Rename'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMarker(m.id);
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                          title={isUa ? 'Видалити' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. КАРТА (MAP) */}
        <div className={`border rounded-2xl overflow-hidden ${
          theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-[#262c38] bg-[#0e1117]/20'
        }`}>
          <button
            onClick={() => toggleSection('map')}
            className={`w-full px-3.5 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider transition-colors ${
              theme === 'light' 
                ? 'bg-slate-100/50 hover:bg-slate-100 text-slate-800' 
                : 'bg-[#0e1117]/40 hover:bg-[#0e1117]/60 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Map className="w-3.5 h-3.5 text-blue-500" />
              <span>{t.secMap}</span>
            </div>
            {expandedSections.map ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          </button>

          {expandedSections.map && (
            <div className="p-3 space-y-3">
              
              {/* Tile Layer selector */}
              <div className="space-y-1.5">
                {tileLayers.map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => onSelectTileLayer(layer)}
                    className={`w-full text-left p-2 px-3 border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                      activeTileLayer.id === layer.id
                        ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold'
                        : (theme === 'light'
                          ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          : 'bg-[#181d28]/60 border-white/5 text-slate-300 hover:bg-white/5')
                    }`}
                  >
                    <span className="text-xs font-bold">
                      {isUa ? layer.nameUa : layer.nameEn}
                    </span>
                    {activeTileLayer.id === layer.id && <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
                  </button>
                ))}
              </div>

              {/* Visicom Watermark Notice */}
              {activeTileLayer.id === 'visicom' && !visicomKey && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
                  <p className="font-bold flex items-center gap-1 mb-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                    <span>{isUa ? 'Водяний знак Visicom' : 'Visicom Watermark'}</span>
                  </p>
                  <span>
                    {isUa 
                      ? 'Сервер Visicom автоматично додає на тайли текст про обмеження використання. Введіть API-ключ з developer.visicom.ua в налаштуваннях нижче, або оберіть шар CartoDB чи Esri для чистої карти без водяного знаку.'
                      : 'Visicom tiles include a usage watermark unless an API key from developer.visicom.ua is provided. Enter your API key below or select CartoDB/Esri layer for a clean map.'}
                  </span>
                </div>
              )}

              {/* Load Custom URL Map */}
              <div className="space-y-1.5 pt-2.5 border-t border-slate-200 dark:border-white/5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {t.lblMapUrl}
                </label>
                <input
                  type="text"
                  value={customTileUrl}
                  onChange={(e) => setCustomTileUrl(e.target.value)}
                  placeholder="Вставте URL.."
                  className={`w-full border px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 ${
                    theme === 'light' 
                      ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-400' 
                      : 'bg-[#181d28] border-white/5 text-slate-200 placeholder-slate-600'
                  }`}
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleLoadCustomTile}
                    className={`flex-1 py-1.5 px-3 border text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        : 'bg-[#1c2230] hover:bg-[#232a3c] border-white/5 text-slate-300'
                    }`}
                  >
                    {t.btnLoad}
                  </button>
                  <button
                    onClick={handleResetTile}
                    className={`py-1.5 px-3 border text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500'
                        : 'bg-[#1c2230] hover:bg-[#232a3c] border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MAP OVERLAYS SECTION */}
        <div className={`border rounded-2xl overflow-hidden ${
          theme === 'light' 
            ? 'bg-white border-slate-200' 
            : 'bg-[#181d28]/60 border-white/5'
        }`}>
          <button
            onClick={() => toggleSection('overlays')}
            className={`w-full px-4 py-3.5 flex items-center justify-between text-xs font-bold transition-all ${
              expandedSections.overlays
                ? (theme === 'light' ? 'bg-slate-50 text-slate-900 border-b border-slate-100' : 'bg-white/5 text-white border-b border-white/5')
                : (theme === 'light' ? 'bg-slate-100/50 hover:bg-slate-100 text-slate-800' : 'bg-[#0e1117]/40 hover:bg-[#0e1117]/60 text-white')
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-blue-500" />
              <span>{isUa ? 'НАЛАШТУВАННЯ' : 'SETTINGS'}</span>
            </div>
            {expandedSections.overlays ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          </button>

          {expandedSections.overlays && (
            <div className="p-3 space-y-3.5">
              {/* Full Settings & Data Export / Import Block */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                    {isUa ? 'Експорт усіх налаштувань' : 'Export All Settings'}
                  </span>
                  <span className="text-[9px] text-slate-400 leading-normal">
                    {isUa ? 'Перенести всі позначки, лінії та опції на інший пристрій' : 'Transfer all markers, lines & config to another device'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onExportAllSettings}
                    className="py-2 px-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    title={isUa ? 'Експортувати всі налаштування та дані у файл JSON' : 'Export all settings and data to JSON file'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isUa ? 'Експорт усіх' : 'Export All'}</span>
                  </button>

                  <label
                    className="py-2 px-2 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/20 font-bold text-xs text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title={isUa ? 'Імпортувати всі налаштування з файлу JSON' : 'Import all settings from JSON file'}
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isUa ? 'Імпорт' : 'Import'}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onImportAllSettings) {
                          onImportAllSettings(file);
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {/* Watermark Input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {isUa ? 'Текст водяного знаку' : 'Watermark Text'}
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => onUpdateWatermarkText(e.target.value)}
                  placeholder={isUa ? 'Наприклад, UA Mapper...' : 'E.g., UA Mapper...'}
                  className={`w-full border px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 ${
                    theme === 'light' 
                      ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-400' 
                      : 'bg-[#181d28] border-white/5 text-slate-200 placeholder-slate-600'
                  }`}
                />
              </div>

              {/* Show Legend toggle */}
              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-white/5 pt-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isUa ? 'Показувати легенду' : 'Show Map Legend'}
                  </span>
                  <span className="text-[9px] text-slate-400 leading-normal">
                    {isUa ? 'Картка-роз\'яснення збоку' : 'Map explanation card'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={showLegendOverlay} 
                    onChange={(e) => onUpdateShowLegendOverlay(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {/* Blur Map on Export Toggle */}
              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-white/5 pt-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isUa ? 'Розмиття карти при експорті' : 'Blur map on export'}
                  </span>
                  <span className="text-[9px] text-slate-400 leading-normal">
                    {isUa ? 'Робить фон карти м\'яким' : 'Softens background map on export'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={blurMapOnExport} 
                    onChange={(e) => onUpdateBlurMapOnExport(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {/* Boundary Outlines Sub-Group */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {isUa ? 'Обводки та межі території' : 'Territory Boundary Outlines'}
                </label>

                {/* 1. City Boundary Toggle */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span>
                      {isUa ? 'Обводка міста' : 'City Boundary'}
                    </span>
                    <span className="text-[9px] text-slate-400 leading-normal">
                      {isUa ? 'Блакитна пунктирна лінія межі міста (Кривий Ріг)' : 'Sky blue dashed city boundary line'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showCityBoundary} 
                      onChange={(e) => onUpdateShowCityBoundary?.(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {/* 2. District Boundary Toggle */}
                <div className="flex items-center justify-between py-1 border-t border-slate-100/60 dark:border-white/5 pt-1.5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      {isUa ? 'Обводка району' : 'District Boundary'}
                    </span>
                    <span className="text-[9px] text-slate-400 leading-normal">
                      {isUa ? 'Зелена лінія Криворізького району' : 'Green district boundary line'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showDistrictBoundary} 
                      onChange={(e) => onUpdateShowDistrictBoundary?.(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 3. Settlements & Hromadas Boundary Toggle */}
                <div className="flex items-center justify-between py-1 border-t border-slate-100/60 dark:border-white/5 pt-1.5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                      {isUa ? 'Обводка н/п та громад' : 'Settlement & Hromada Boundaries'}
                    </span>
                    <span className="text-[9px] text-slate-400 leading-normal">
                      {isUa ? 'Темно-сірі межі об\'єднаних громад та населених пунктів' : 'Dark gray community boundary lines'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showHromadaBoundaries} 
                      onChange={(e) => onUpdateShowHromadaBoundaries?.(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>

              {/* Show Settlement & District Labels Toggle */}
              <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-white/5 pt-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isUa ? 'Назви районів та міст' : 'District & Settlement Labels'}
                  </span>
                  <span className="text-[9px] text-slate-400 leading-normal">
                    {isUa ? 'Плашки з назвами пунктів та районів' : 'Show label badges on map'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={showSettlementLabels} 
                    onChange={(e) => onUpdateShowSettlementLabels(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {/* Settlement Label Density / Category Filter */}
              {showSettlementLabels && (
                <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {isUa ? 'Фільтр відображення назв' : 'Label Category Filter'}
                    </label>
                    {disabledSettlementCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onUpdateSettlementLabelMode('all')}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        {isUa ? 'Увімкнути всі' : 'Enable all'}
                      </button>
                    )}
                  </div>

                  {/* Quick Preset Modes */}
                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => onUpdateSettlementLabelMode('all')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        settlementLabelMode === 'all' && disabledSettlementCategories.length === 0
                          ? 'bg-blue-500 text-white shadow'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      {isUa ? 'Всі' : 'All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSettlementLabelMode('districts_cities')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        settlementLabelMode === 'districts_cities'
                          ? 'bg-blue-500 text-white shadow'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      {isUa ? 'Міста+Райони' : 'Cities+Districts'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSettlementLabelMode('districts_only')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        settlementLabelMode === 'districts_only'
                          ? 'bg-blue-500 text-white shadow'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      {isUa ? 'Райони' : 'Districts'}
                    </button>
                  </div>

                  {/* Individual Category Toggles */}
                  <div className="space-y-1 pt-1">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {isUa ? 'Категорії населених пунктів:' : 'Settlement categories:'}
                    </div>
                    {SETTLEMENT_CATEGORY_CONFIG.map((cat) => {
                      const isEnabled = !disabledSettlementCategories.includes(cat.id);
                      return (
                        <label
                          key={cat.id}
                          className={`flex items-center justify-between p-1.5 px-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isEnabled
                              ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                              : 'bg-slate-200/40 dark:bg-white/[0.02] border-transparent text-slate-400 dark:text-slate-500 opacity-50 line-through'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cat.dotClass}`} />
                            <span className="text-[11px] font-bold truncate">
                              {isUa ? cat.nameUa : cat.nameEn}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => onToggleSettlementCategory(cat.id)}
                            className="w-4 h-4 rounded border-slate-400 text-blue-500 focus:ring-blue-500/20 cursor-pointer accent-blue-500 shrink-0"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Settlement Dots Control */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isUa ? 'Власні точки НП' : 'Custom Settlement Dots'} ({userCustomSettlements.length})
                  </label>
                  {userCustomSettlements.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearAllCustomSettlements}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      {isUa ? 'Видалити всі' : 'Clear all'}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onEnableSettlementMode}
                  className="w-full py-2 px-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{isUa ? '＋ Встановити точку на карті' : '＋ Place Dot on Map'}</span>
                </button>

                {/* Export / Import Custom Settlement Points */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={onExportCustomSettlements}
                    disabled={userCustomSettlements.length === 0}
                    className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[11px] text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title={isUa ? 'Експортувати власні точки у файл JSON' : 'Export custom points to JSON file'}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isUa ? 'Експорт' : 'Export'}</span>
                  </button>

                  <label
                    className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 font-bold text-[11px] text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title={isUa ? 'Імпортувати власні точки з файлу JSON' : 'Import custom points from JSON file'}
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isUa ? 'Імпорт' : 'Import'}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImportSettlements}
                      className="hidden"
                    />
                  </label>
                </div>

                {userCustomSettlements.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {userCustomSettlements.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              s.type === 'district'
                                ? 'bg-amber-400 ring-1 ring-amber-500'
                                : s.priority === 1
                                ? 'bg-cyan-400'
                                : s.priority === 2
                                ? 'bg-emerald-400'
                                : 'bg-sky-300'
                            }`}
                          />
                          <span className="font-bold truncate text-slate-800 dark:text-slate-100">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditSettlement(s)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer shrink-0"
                            title={isUa ? 'Редагувати точку' : 'Edit point'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCustomSettlement(s.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                            title={isUa ? 'Видалити точку' : 'Delete point'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legend Warning Textarea (only if legend enabled) */}
              {showLegendOverlay && (
                <div className="space-y-1.5 pt-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isUa ? 'Текст роз\'яснення легенди' : 'Legend Warning Text'}
                  </label>
                  <textarea
                    rows={2}
                    value={legendOverlayText}
                    onChange={(e) => onUpdateLegendOverlayText(e.target.value)}
                    placeholder={isUa ? 'Напишіть кастомне попередження...' : 'Write custom warning...'}
                    className={`w-full border px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 resize-none leading-relaxed ${
                      theme === 'light' 
                        ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-400' 
                        : 'bg-[#181d28] border-white/5 text-slate-200 placeholder-slate-600'
                    }`}
                  />
                  <button
                    onClick={() => onUpdateLegendOverlayText('')}
                    className="text-[9px] font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-wider block"
                  >
                    {isUa ? 'Скинути до стандартного' : 'Reset to default'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>



      </div>

      {/* Action panel at the bottom (Interface actions matching the screenshot) */}
      <div className={`p-4 border-t space-y-3 ${
        theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0e1117]/80 border-[#262c38] backdrop-blur-md'
      }`}>
        <div className="grid grid-cols-2 gap-2">
          {/* Save as PNG */}
          <button
            onClick={onExportPNG}
            className={`w-full h-[52px] px-2 font-extrabold text-xs rounded-xl active:scale-[0.97] hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-1.5 border shadow-md ${
              theme === 'light'
                ? 'bg-[#0057B7] hover:bg-[#004494] text-white border-[#0057B7]/20 shadow-[#0057B7]/10'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/20 shadow-blue-600/10'
            }`}
          >
            <Download className="w-4 h-4 flex-shrink-0 text-white" />
            <span className="leading-tight text-center">{t.btnSavePng}</span>
          </button>

          {/* Share / Buffer Copy */}
          <button
            onClick={onCopyPNG}
            className="w-full h-[52px] px-2 font-extrabold text-xs rounded-xl active:scale-[0.97] hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-[#FFD700]/30 bg-[#FFD700] hover:bg-[#E6C200] text-slate-950 shadow-lg shadow-[#FFD700]/20"
          >
            <Copy className="w-4 h-4 flex-shrink-0 text-slate-950" />
            <span className="leading-tight text-center">{t.btnShare}</span>
          </button>

          {/* Undo */}
          <button
            onClick={onUndo}
            className={`w-full h-[52px] px-2 font-bold text-xs rounded-xl active:scale-[0.97] hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-[#181d28] border-white/5 hover:bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4 flex-shrink-0" />
            <span className="leading-tight text-center">{t.btnUndo}</span>
          </button>

          {/* Clear All */}
          <button
            onClick={onClearMarkers}
            className="w-full h-[52px] px-2 bg-red-600 hover:bg-red-500 active:scale-[0.97] hover:scale-[1.01] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-red-500/10"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span className="leading-tight text-center">{t.btnClearAll}</span>
          </button>
        </div>

        {/* Support Banner & Footer */}
        <div className="flex items-center justify-center gap-3 pt-1.5 text-[11px] text-slate-500 font-mono">
          <a
            href="https://t.me/krrig_alerts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 bg-[#24A1DE]/10 hover:bg-[#24A1DE]/20 text-[#24A1DE] font-bold rounded-lg border border-[#24A1DE]/10 transition-all text-xs"
          >
            <Send className="w-3 h-3 fill-current" />
            <span>{t.btnSupport}</span>
          </a>
          <span className="font-bold">v3.0</span>
        </div>
      </div>

    </div>
  );
};
