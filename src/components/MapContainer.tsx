import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import L from '../leaflet-fix';
import { toBlob } from 'html-to-image';
import { Check, Loader2, Search, X, MapPin, Ruler, ShieldAlert, PenTool, Hand, Trash2, Layers, Building2, Plus, Spline, Sparkles, Star, RotateCcw, Undo2, Compass, ArrowRightLeft, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { CustomMarker, TileLayerConfig, Language, InteractionMode, DrawnLine, LineEndpointType, LineDrawMethod, WatermarkType, AirAlert, MapFontFamily, MapLegendConfig, MeasureTrack } from '../types';
import { createMarkerHtml } from './IconLibrary';
import { SETTLEMENTS, Settlement, SettlementCategory, getSettlementCategory } from '../data/settlements';
import { CityRulerPreset, MAJOR_CITIES_RULER, MEASURE_TRACK_COLORS, INTER_CITY_MEASURE_PRESETS } from '../data/cityRulerPresets';
import { CityRulerModal } from './CityRulerModal';
import {
  smoothPolylinePoints,
  generateFadingPolylineSegments,
  smoothFreehandStrokeOnMap,
  extractControlPointsFromFreehand,
  simplifyExistingLinePoints,
} from '../utils/smoothing';
import { createExplosionIcon, createCustomImageIcon, createFadeGlowIcon, createArrowIcon, createDotIcon, calculateBearing } from '../utils/lineIcons';
import { AirAlertsLayer } from './AirAlertsLayer';
import { getMapFontFamilyCss, getFontEmbedCSS } from '../utils/mapFonts';
import { MapLegendWidget } from './MapLegendWidget';

export interface MapContainerRef {
  exportPNG: () => void;
  copyPNG: () => Promise<boolean>;
  getMapBlob: (mode?: 'export' | 'clipboard') => Promise<Blob>;
  centerOnLocation: (lat: number, lng: number, zoom?: number) => void;
  highlightZoneAt: (lat: number, lng: number, markerId?: string) => void;
  clearSearchedAreas: () => void;
}

interface SearchedArea {
  id: string;
  name: string;
  lat: string;
  lon: string;
  geojson: any;
  districtId?: string;
  markerId?: string;
}

interface QuickDistrict {
  id: string;
  label: string;
  fullName: string;
  query: string;
  shortLabel?: string;
  osmId?: string;
  category?: 'urban_district' | 'city' | 'raion' | 'settlement' | 'custom';
  geojson?: any;
  lat?: string;
  lon?: string;
}

const QUICK_DISTRICTS: QuickDistrict[] = [
  // 7 urban districts of Kryvyi Rih (Circular buttons with initial letters)
  { id: 'saksahanskyi', shortLabel: 'С', label: 'Саксаганський р-н', fullName: 'Саксаганський район', query: 'Саксаганський район', osmId: '1827711', category: 'urban_district' },
  { id: 'metalurhiinyi', shortLabel: 'М', label: 'Металургійний р-н', fullName: 'Металургійний район', query: 'Металургійний район', osmId: '1827708', category: 'urban_district' },
  { id: 'dolhintsevskyi', shortLabel: 'Д', label: 'Довгинцівський р-н', fullName: 'Довгинцівський район', query: 'Довгинцівський район', osmId: '1827709', category: 'urban_district' },
  { id: 'pokrovskyi', shortLabel: 'П', label: 'Покровський р-н', fullName: 'Покровський район', query: 'Покровський район', osmId: '1827710', category: 'urban_district' },
  { id: 'inhuletskyi', shortLabel: 'І', label: 'Інгулецький р-н', fullName: 'Інгулецький район', query: 'Інгулецький район', osmId: '1827568', category: 'urban_district' },
  { id: 'ternivskyi', shortLabel: 'Т', label: 'Тернівський р-н', fullName: 'Тернівський район', query: 'Тернівський район', osmId: '1827712', category: 'urban_district' },
  { id: 'tsentralno_miskyi', shortLabel: 'Ц', label: 'Центрально-Міський р-н', fullName: 'Центрально-Міський район', query: 'Центрально-Міський район', osmId: '1827713', category: 'urban_district' },
  
  // Entire City & District Boundaries
  { id: 'kryvyi_rih_city', label: 'м. Кривий Ріг', fullName: 'місто Кривий Ріг', query: 'місто Кривий Ріг', osmId: '1821193', category: 'city' },
  { id: 'kryvorizkyi_raion', label: 'Криворізький район', fullName: 'Криворізький район', query: 'Криворізький район', osmId: '1738028', category: 'raion' },

  // Surrounding Settlements
  { id: 'radushne', label: 'смт Радушне', fullName: 'смт Радушне', query: 'Радушне', osmId: '3200923', category: 'settlement' },
  { id: 'apostolove', label: 'м. Апостолове', fullName: 'м. Апостолове', query: 'Апостолове', osmId: '3193498', category: 'settlement' },
  { id: 'shyroke', label: 'смт Широке', fullName: 'смт Широке', query: 'Широке', osmId: '3200924', category: 'settlement' },
  { id: 'sofiivka', label: 'смт Софіївка', fullName: 'смт Софіївка', query: 'Софіївка', osmId: '3193502', category: 'settlement' },
  { id: 'zelenodolsk', label: 'м. Зеленодольськ', fullName: 'м. Зеленодольськ', query: 'Зеленодольськ', osmId: '3193501', category: 'settlement' },
  { id: 'lozuravatka', label: 'с. Лозуватка', fullName: 'с. Лозуватка', query: 'Лозуватка, Криворізький район', category: 'settlement' },
  { id: 'heikivka', label: 'смт Гейківка', fullName: 'смт Гейківка', query: 'Гейківка', category: 'settlement' },
];

function calculateDistanceMeters(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  return L.latLng(p1.lat, p1.lng).distanceTo(L.latLng(p2.lat, p2.lng));
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} км`;
  }
  return `${Math.round(meters)} м`;
}

function createCircleGeoJson(centerLat: number, centerLng: number, radiusMeters: number, numPoints = 36) {
  const coords: [number, number][] = [];
  const earthRadius = 6371000;

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i * 360) / numPoints;
    const rad = (angle * Math.PI) / 180;
    const dx = radiusMeters * Math.cos(rad);
    const dy = radiusMeters * Math.sin(rad);

    const lat = centerLat + (dy / earthRadius) * (180 / Math.PI);
    const lng = centerLng + (dx / (earthRadius * Math.cos((centerLat * Math.PI) / 180))) * (180 / Math.PI);

    coords.push([lng, lat]);
  }

  return {
    type: 'Polygon',
    coordinates: [coords]
  };
}

interface MapContainerProps {
  markers: CustomMarker[];
  selectedMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  onUpdateMarkerPosition: (id: string, lat: number, lng: number) => void;
  onAddMarker: (lat: number, lng: number) => string | void;
  activeTileLayer: TileLayerConfig;
  visicomKey: string;
  language: Language;
  interactionMode?: InteractionMode;
  onSelectInteractionMode?: (mode: InteractionMode) => void;
  autoHighlightZone?: boolean;
  onToggleAutoHighlightZone?: (enabled: boolean) => void;
  theme?: 'dark' | 'light';
  onUpdateMarker?: (marker: CustomMarker) => void;
  watermarkType?: WatermarkType;
  watermarkText?: string;
  watermarkImageUrl?: string;
  watermarkSize?: number;
  watermarkOpacity?: number;
  watermarkRotation?: number;
  showLegendOverlay?: boolean;
  showLogoAndLegendOnMap?: boolean;
  legendOverlayText?: string;
  showRadarOverlay?: boolean;
  blurMapOnExport?: boolean;
  mapFont?: MapFontFamily;
  showSettlementLabels?: boolean;
  settlementLabelMode?: 'all' | 'districts_cities' | 'districts_only';
  disabledSettlementCategories?: SettlementCategory[];
  onToggleSettlementLabels?: (show: boolean) => void;
  onSetSettlementLabelMode?: (mode: 'all' | 'districts_cities' | 'districts_only') => void;
  showCityBoundary?: boolean;
  showDistrictBoundary?: boolean;
  showHromadaBoundaries?: boolean;
  onToggleHromadaBoundaries?: (show: boolean) => void;
  showQuickSettlements?: boolean;
  onToggleQuickSettlements?: (show: boolean) => void;
  customSettlements?: Settlement[];
  onAddCustomSettlementPoint?: (lat: number, lng: number) => void;
  onEditSettlement?: (settlement: Settlement) => void;
  onDeleteCustomSettlement?: (id: string) => void;

  drawnLines?: DrawnLine[];
  selectedLineId?: string | null;
  onSelectLine?: (id: string | null) => void;
  onAddDrawnLine?: (line: DrawnLine) => void;
  onUpdateDrawnLine?: (line: DrawnLine) => void;
  onDeleteDrawnLine?: (id: string) => void;
  lineColor?: string;
  lineWeight?: number;
  lineSmoothed?: boolean;
  lineStartStyle?: LineEndpointType;
  lineStartCustomIcon?: string;
  lineStartIconRotation?: number;
  lineStartIconSize?: number;
  lineEndStyle?: LineEndpointType;
  lineEndCustomIcon?: string;
  lineEndIconRotation?: number;
  lineEndIconSize?: number;
  lineDashStyle?: 'solid' | 'dashed' | 'dotted';
  lineDrawMethod?: LineDrawMethod;
  onChangeLineDrawMethod?: (method: LineDrawMethod) => void;
  onChangeLineStartStyle?: (style: LineEndpointType) => void;
  onChangeLineEndStyle?: (style: LineEndpointType) => void;

  // Map Legend
  mapLegendConfig?: MapLegendConfig;
  onUpdateMapLegendConfig?: (config: MapLegendConfig) => void;

  // Air Alerts Props
  activeAlerts?: AirAlert[];
  showAlerts?: boolean;
  showAlertPolygons?: boolean;
  showAlertMarkers?: boolean;
  alertsOpacity?: number;
  alertsStrokeWidth?: number;
  onAlertClick?: (alert: AirAlert, lat?: number, lng?: number) => void;
  clearAllTrigger?: number;
}

export const MapContainer = forwardRef<MapContainerRef, MapContainerProps>(({
  markers,
  selectedMarkerId,
  onSelectMarker,
  onUpdateMarkerPosition,
  onAddMarker,
  activeTileLayer,
  visicomKey,
  language,
  interactionMode = 'draw',
  onSelectInteractionMode,
  autoHighlightZone = false,
  onToggleAutoHighlightZone,
  theme = 'dark',
  onUpdateMarker,
  watermarkType = 'text',
  watermarkText = 'UA Mapper',
  watermarkImageUrl = '',
  watermarkSize,
  watermarkOpacity,
  watermarkRotation,
  showLegendOverlay = true,
  showLogoAndLegendOnMap = true,
  legendOverlayText = '',
  showRadarOverlay = true,
  blurMapOnExport = false,
  mapFont = 'inter',
  showSettlementLabels = true,
  settlementLabelMode = 'all',
  disabledSettlementCategories = [],
  onToggleSettlementLabels,
  onSetSettlementLabelMode,
  showCityBoundary = true,
  showDistrictBoundary = true,
  showHromadaBoundaries = true,
  onToggleHromadaBoundaries,
  showQuickSettlements: propShowQuickSettlements,
  onToggleQuickSettlements,
  customSettlements = [],
  onAddCustomSettlementPoint,
  onEditSettlement,
  onDeleteCustomSettlement,
  drawnLines = [],
  selectedLineId = null,
  onSelectLine = (_id) => {},
  onAddDrawnLine = (_line) => {},
  onUpdateDrawnLine = (_line) => {},
  onDeleteDrawnLine = (_id) => {},
  lineColor = '#ef4444',
  lineWeight = 5,
  lineSmoothed = true,
  lineStartStyle = 'none' as LineEndpointType,
  lineStartCustomIcon = '',
  lineStartIconRotation = 0,
  lineStartIconSize = 32,
  lineEndStyle = 'none' as LineEndpointType,
  lineEndCustomIcon = '',
  lineEndIconRotation = 0,
  lineEndIconSize = 32,
  lineDashStyle = 'solid' as 'solid' | 'dashed' | 'dotted',
  lineDrawMethod = 'freehand' as LineDrawMethod,
  onChangeLineDrawMethod,
  onChangeLineStartStyle,
  onChangeLineEndStyle,

  // Map Legend
  mapLegendConfig,
  onUpdateMapLegendConfig,

  // Air Alerts
  activeAlerts = [],
  showAlerts = false,
  showAlertPolygons = true,
  showAlertMarkers = true,
  alertsOpacity = 0.30,
  alertsStrokeWidth = 2.5,
  onAlertClick,
  clearAllTrigger,
}, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerInstanceRef = useRef<L.TileLayer | null>(null);
  const tileOverlayInstanceRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const linesRef = useRef<{ [id: string]: L.Polyline }>({});
  const endMarkersRef = useRef<{ [id: string]: L.Marker }>({});
  const settlementLayerRef = useRef<L.LayerGroup | null>(null);
  const kryvyiRihRaionLayerRef = useRef<L.GeoJSON | null>(null);
  const kryvyiRihCityLayerRef = useRef<L.GeoJSON | null>(null);
  const hromadasLayerGroupRef = useRef<L.LayerGroup | null>(null);
  
  // Measurement Tool State & Refs (Multi-Track & Multi-City Support)
  const [measureTracks, setMeasureTracks] = useState<MeasureTrack[]>([
    { id: 'track_1', name: 'Вимір 1', color: '#facc15', points: [] },
  ]);
  const [activeTrackId, setActiveTrackId] = useState<string>('track_1');
  const [isCityRulerModalOpen, setIsCityRulerModalOpen] = useState<boolean>(false);

  const measureTracksRef = useRef(measureTracks);
  useEffect(() => {
    measureTracksRef.current = measureTracks;
  }, [measureTracks]);

  const activeTrackIdRef = useRef(activeTrackId);
  useEffect(() => {
    activeTrackIdRef.current = activeTrackId;
  }, [activeTrackId]);

  const activeTrack = React.useMemo(() => {
    return (
      measureTracks.find((t) => t.id === activeTrackId) ||
      measureTracks[0] || { id: 'track_1', name: 'Вимір 1', color: '#facc15', points: [] }
    );
  }, [measureTracks, activeTrackId]);

  const measurePoints = activeTrack.points;
  const measurePointsRef = useRef(measurePoints);
  useEffect(() => {
    measurePointsRef.current = measurePoints;
  }, [measurePoints]);

  const setMeasurePoints = useCallback(
    (
      updater:
        | { lat: number; lng: number }[]
        | ((prev: { lat: number; lng: number }[]) => { lat: number; lng: number }[])
    ) => {
      setMeasureTracks((prevTracks) => {
        const curActiveId = activeTrackIdRef.current;
        return prevTracks.map((t) => {
          if (t.id === curActiveId) {
            const nextPoints = typeof updater === 'function' ? updater(t.points) : updater;
            return { ...t, points: nextPoints };
          }
          return t;
        });
      });
    },
    []
  );

  const measureTrackLayersRef = useRef<{
    [trackId: string]: {
      polyline?: L.Polyline;
      markers: L.Marker[];
      segmentTooltips: L.Marker[];
    };
  }>({});

  const handleAddTrack = useCallback(
    (initialName?: string, initialCityCenter?: { lat: number; lng: number }) => {
      const nextNum = measureTracksRef.current.length + 1;
      const newId = `track_${Date.now()}`;
      const nextColor =
        MEASURE_TRACK_COLORS[measureTracksRef.current.length % MEASURE_TRACK_COLORS.length].hex;
      const newTrack: MeasureTrack = {
        id: newId,
        name: initialName || `${language === 'uk' ? 'Вимір' : 'Measure'} ${nextNum}`,
        color: nextColor,
        points: initialCityCenter ? [initialCityCenter] : [],
      };
      setMeasureTracks((prev) => [...prev, newTrack]);
      setActiveTrackId(newId);
    },
    [language]
  );

  const handleDeleteTrack = useCallback((trackId: string) => {
    setMeasureTracks((prev) => {
      if (prev.length <= 1) {
        // Keep 1 empty track
        return [{ id: 'track_1', name: 'Вимір 1', color: '#facc15', points: [] }];
      }
      const filtered = prev.filter((t) => t.id !== trackId);
      if (activeTrackIdRef.current === trackId) {
        setActiveTrackId(filtered[0].id);
      }
      return filtered;
    });
  }, []);

  const handleApplyInterCityPreset = useCallback(
    (city1: CityRulerPreset, city2: CityRulerPreset) => {
      const trackName = `${city1.nameUa} — ${city2.nameUa}`;
      const points = [
        { lat: city1.lat, lng: city1.lng },
        { lat: city2.lat, lng: city2.lng },
      ];

      setMeasureTracks((prev) => {
        const active = prev.find((t) => t.id === activeTrackIdRef.current);
        if (active && active.points.length === 0) {
          return prev.map((t) =>
            t.id === activeTrackIdRef.current ? { ...t, name: trackName, points } : t
          );
        } else {
          const nextColor =
            MEASURE_TRACK_COLORS[prev.length % MEASURE_TRACK_COLORS.length].hex;
          const newTrack: MeasureTrack = {
            id: `track_${Date.now()}`,
            name: trackName,
            color: nextColor,
            points,
          };
          setActiveTrackId(newTrack.id);
          return [...prev, newTrack];
        }
      });

      const map = mapInstanceRef.current;
      if (map) {
        const bounds = L.latLngBounds([
          [city1.lat, city1.lng],
          [city2.lat, city2.lng],
        ]);
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 12 });
      }
    },
    []
  );

  const handleJumpToCity = useCallback(
    (city: CityRulerPreset, createNewTrack = false) => {
      const map = mapInstanceRef.current;
      if (map) {
        map.flyTo([city.lat, city.lng], 13, { duration: 1.2 });
      }
      if (createNewTrack) {
        handleAddTrack(city.nameUa, { lat: city.lat, lng: city.lng });
      }
    },
    [handleAddTrack]
  );

  const handleAddCityPointToActive = useCallback((city: CityRulerPreset) => {
    setMeasurePoints((prev) => [...prev, { lat: city.lat, lng: city.lng }]);
    const map = mapInstanceRef.current;
    if (map) {
      map.panTo([city.lat, city.lng]);
    }
  }, [setMeasurePoints]);

  // Line Drawing Mode State & Refs
  const [draftLinePoints, setDraftLinePoints] = useState<[number, number][]>([]);
  const drawnLineLayersRef = useRef<{
    [id: string]: {
      polyline?: L.Polyline;
      halo?: L.Polyline;
      startMarker?: L.Marker;
      endMarker?: L.Marker;
      fadingPolylines?: L.Polyline[];
      vertexMarkers?: L.Marker[];
    };
  }>({});
  const draftLinePointsRef = useRef(draftLinePoints);
  useEffect(() => {
    draftLinePointsRef.current = draftLinePoints;
  }, [draftLinePoints]);

  const draftLineLayerRef = useRef<{
    polyline?: L.Polyline;
    fadingPolylines?: L.Polyline[];
    startMarker?: L.Marker;
    endMarker?: L.Marker;
    nodeMarkers: L.Marker[];
  }>({ nodeMarkers: [] });

  const calculateDraftLineDistance = useCallback(() => {
    if (draftLinePoints.length < 2) return 0;
    let totalMeters = 0;
    for (let i = 0; i < draftLinePoints.length - 1; i++) {
      const pt1 = L.latLng(draftLinePoints[i][0], draftLinePoints[i][1]);
      const pt2 = L.latLng(draftLinePoints[i + 1][0], draftLinePoints[i + 1][1]);
      totalMeters += pt1.distanceTo(pt2);
    }
    return totalMeters;
  }, [draftLinePoints]);

  const handleFinishDraftLine = useCallback(() => {
    if (draftLinePoints.length < 2) return;
    const newLine: DrawnLine = {
      id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      points: draftLinePoints,
      color: lineColor,
      weight: lineWeight,
      smoothed: lineSmoothed,
      dashStyle: lineDashStyle,
      startPointStyle: lineStartStyle,
      startCustomIconUrl: lineStartCustomIcon,
      startIconRotation: lineStartIconRotation,
      startIconSize: lineStartIconSize,
      endPointStyle: lineEndStyle,
      endCustomIconUrl: lineEndCustomIcon,
      endIconRotation: lineEndIconRotation,
      endIconSize: lineEndIconSize,
    };
    onAddDrawnLine(newLine);
    setDraftLinePoints([]);
  }, [
    draftLinePoints,
    lineColor,
    lineWeight,
    lineSmoothed,
    lineDashStyle,
    lineStartStyle,
    lineStartCustomIcon,
    lineStartIconRotation,
    lineStartIconSize,
    lineEndStyle,
    lineEndCustomIcon,
    lineEndIconRotation,
    lineEndIconSize,
    onAddDrawnLine,
  ]);

  const handleFinishDraftLineRef = useRef(handleFinishDraftLine);
  useEffect(() => {
    handleFinishDraftLineRef.current = handleFinishDraftLine;
  }, [handleFinishDraftLine]);

  // Freehand (Paint-style) drawing states and refs
  const [justSmoothedNotice, setJustSmoothedNotice] = useState(false);
  const justSmoothedNoticeTimerRef = useRef<number | null>(null);
  const isDrawingFreehandRef = useRef(false);
  const freehandRawPointsRef = useRef<[number, number][]>([]);
  const freehandPointerIdRef = useRef<number | null>(null);
  const freehandStartClientRef = useRef<{ x: number; y: number } | null>(null);
  const isSpacePressedRef = useRef(false);

  // Live Freehand Drawing Layer Refs
  const liveFreehandPolylineRef = useRef<L.Polyline | null>(null);
  const liveFreehandStartMarkerRef = useRef<L.Marker | null>(null);
  const liveFreehandEndMarkerRef = useRef<L.Marker | null>(null);

  // Synchronized prop refs for pointer events and callbacks
  const lineDrawMethodRef = useRef(lineDrawMethod);
  useEffect(() => { lineDrawMethodRef.current = lineDrawMethod; }, [lineDrawMethod]);

  const lineColorRef = useRef(lineColor);
  useEffect(() => { lineColorRef.current = lineColor; }, [lineColor]);

  const lineWeightRef = useRef(lineWeight);
  useEffect(() => { lineWeightRef.current = lineWeight; }, [lineWeight]);

  const lineDashStyleRef = useRef(lineDashStyle);
  useEffect(() => { lineDashStyleRef.current = lineDashStyle; }, [lineDashStyle]);

  const lineStartStyleRef = useRef(lineStartStyle);
  useEffect(() => { lineStartStyleRef.current = lineStartStyle; }, [lineStartStyle]);

  const lineStartCustomIconRef = useRef(lineStartCustomIcon);
  useEffect(() => { lineStartCustomIconRef.current = lineStartCustomIcon; }, [lineStartCustomIcon]);

  const lineStartIconRotationRef = useRef(lineStartIconRotation);
  useEffect(() => { lineStartIconRotationRef.current = lineStartIconRotation; }, [lineStartIconRotation]);

  const lineStartIconSizeRef = useRef(lineStartIconSize);
  useEffect(() => { lineStartIconSizeRef.current = lineStartIconSize; }, [lineStartIconSize]);

  const lineEndStyleRef = useRef(lineEndStyle);
  useEffect(() => { lineEndStyleRef.current = lineEndStyle; }, [lineEndStyle]);

  const lineEndCustomIconRef = useRef(lineEndCustomIcon);
  useEffect(() => { lineEndCustomIconRef.current = lineEndCustomIcon; }, [lineEndCustomIcon]);

  const lineEndIconRotationRef = useRef(lineEndIconRotation);
  useEffect(() => { lineEndIconRotationRef.current = lineEndIconRotation; }, [lineEndIconRotation]);

  const lineEndIconSizeRef = useRef(lineEndIconSize);
  useEffect(() => { lineEndIconSizeRef.current = lineEndIconSize; }, [lineEndIconSize]);

  const onAddDrawnLineRef = useRef(onAddDrawnLine);
  useEffect(() => { onAddDrawnLineRef.current = onAddDrawnLine; }, [onAddDrawnLine]);

  // Currently selected drawn line and optimization helper
  const selectedDrawnLine = drawnLines.find((l) => l.id === selectedLineId) || null;

  const handleOptimizeLinePoints = useCallback(
    (targetCount = 16) => {
      if (!selectedDrawnLine) return;
      const map = mapInstanceRef.current;
      const optimized = simplifyExistingLinePoints(map, selectedDrawnLine.points, targetCount);
      onUpdateDrawnLine({
        ...selectedDrawnLine,
        points: optimized,
        smoothed: true,
      });
      setJustSmoothedNotice(true);
      if (justSmoothedNoticeTimerRef.current) clearTimeout(justSmoothedNoticeTimerRef.current);
      justSmoothedNoticeTimerRef.current = window.setTimeout(() => {
        setJustSmoothedNotice(false);
      }, 2400);
    },
    [selectedDrawnLine, onUpdateDrawnLine]
  );

  // Helper to cleanly remove live freehand preview layers
  const cleanLiveFreehandLayers = useCallback(() => {
    if (liveFreehandPolylineRef.current) {
      liveFreehandPolylineRef.current.remove();
      liveFreehandPolylineRef.current = null;
    }
    if (liveFreehandStartMarkerRef.current) {
      liveFreehandStartMarkerRef.current.remove();
      liveFreehandStartMarkerRef.current = null;
    }
    if (liveFreehandEndMarkerRef.current) {
      liveFreehandEndMarkerRef.current.remove();
      liveFreehandEndMarkerRef.current = null;
    }
  }, []);

  // Update or render live freehand preview while user moves mouse or finger
  const renderLiveFreehandPreview = useCallback((pts: [number, number][]) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (pts.length < 1) {
      cleanLiveFreehandLayers();
      return;
    }

    let dashArray: string | undefined = undefined;
    if (lineDashStyleRef.current === 'dashed') dashArray = '12, 8';
    if (lineDashStyleRef.current === 'dotted') dashArray = '3, 6';

    const color = lineColorRef.current;
    const weight = lineWeightRef.current;

    if (!liveFreehandPolylineRef.current) {
      liveFreehandPolylineRef.current = L.polyline(pts, {
        color,
        weight,
        dashArray,
        opacity: 0.92,
        lineCap: 'round',
        lineJoin: 'round',
        pane: 'drawnLinesPane',
      }).addTo(map);
    } else {
      liveFreehandPolylineRef.current.setLatLngs(pts);
      liveFreehandPolylineRef.current.setStyle({
        color,
        weight,
        dashArray,
      });
    }

    // Dynamic endpoint previews while drawing
    if (pts.length >= 2) {
      const startCoord = pts[0];
      const secondCoord = pts[1] || startCoord;
      const endCoord = pts[pts.length - 1];
      const prevEndCoord = pts[pts.length - 2] || endCoord;

      const startStyle = lineStartStyleRef.current;
      const startCustomIcon = lineStartCustomIconRef.current;
      const startRotation = lineStartIconRotationRef.current;
      const startIconSize = lineStartIconSizeRef.current;

      const endStyle = lineEndStyleRef.current;
      const endCustomIcon = lineEndCustomIconRef.current;
      const endRotation = lineEndIconRotationRef.current;
      const endIconSize = lineEndIconSizeRef.current;

      // Start Marker
      if (startStyle !== 'none' && startStyle !== 'fade') {
        const startBearing = calculateBearing(startCoord, secondCoord) + (startRotation || 0);
        let startIcon: L.DivIcon | null = null;
        if (startStyle === 'explosion') startIcon = createExplosionIcon(color, weight, startIconSize);
        if (startStyle === 'custom_icon') startIcon = createCustomImageIcon(startCustomIcon, color, weight, startBearing, startIconSize);
        if (startStyle === 'arrow') startIcon = createArrowIcon(color, startBearing, weight, startIconSize);
        if (startStyle === 'dot') startIcon = createDotIcon(color, weight, startIconSize);

        if (startIcon) {
          if (!liveFreehandStartMarkerRef.current) {
            liveFreehandStartMarkerRef.current = L.marker(startCoord, {
              icon: startIcon,
              interactive: false,
              pane: 'drawnLinesPane',
            }).addTo(map);
          } else {
            liveFreehandStartMarkerRef.current.setLatLng(startCoord);
            liveFreehandStartMarkerRef.current.setIcon(startIcon);
          }
        }
      } else if (liveFreehandStartMarkerRef.current) {
        liveFreehandStartMarkerRef.current.remove();
        liveFreehandStartMarkerRef.current = null;
      }

      // End Marker (moves dynamically with cursor or finger)
      if (endStyle !== 'none' && endStyle !== 'fade') {
        const endBearing = calculateBearing(prevEndCoord, endCoord) + (endRotation || 0);
        let endIcon: L.DivIcon | null = null;
        if (endStyle === 'explosion') endIcon = createExplosionIcon(color, weight, endIconSize);
        if (endStyle === 'custom_icon') endIcon = createCustomImageIcon(endCustomIcon, color, weight, endBearing, endIconSize);
        if (endStyle === 'arrow') endIcon = createArrowIcon(color, endBearing, weight, endIconSize);
        if (endStyle === 'dot') endIcon = createDotIcon(color, weight, endIconSize);

        if (endIcon) {
          if (!liveFreehandEndMarkerRef.current) {
            liveFreehandEndMarkerRef.current = L.marker(endCoord, {
              icon: endIcon,
              interactive: false,
              pane: 'drawnLinesPane',
            }).addTo(map);
          } else {
            liveFreehandEndMarkerRef.current.setLatLng(endCoord);
            liveFreehandEndMarkerRef.current.setIcon(endIcon);
          }
        }
      } else if (liveFreehandEndMarkerRef.current) {
        liveFreehandEndMarkerRef.current.remove();
        liveFreehandEndMarkerRef.current = null;
      }
    }
  }, [cleanLiveFreehandLayers]);

  // Map Readiness State
  const [isMapReady, setIsMapReady] = useState(false);

  // Red Zone Loading state
  const [isAddingRedZone, setIsAddingRedZone] = useState<boolean>(false);

  // Auto-highlight Zone Toast notification state
  const [lastAutoZoneName, setLastAutoZoneName] = useState<string | null>(null);

  const autoHighlightZoneRef = useRef(autoHighlightZone);
  const nominatimQueueRef = useRef<Promise<void>>(Promise.resolve());
  const nominatimCacheRef = useRef<Map<string, { placeName: string; geojson: any } | null>>(new Map());
  const pendingKeysRef = useRef<Set<string>>(new Set());

  // Load persistent nominatim cache from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('uamapper_nominatim_cache_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([k, v]) => {
          if (v && (v as any).geojson) {
            nominatimCacheRef.current.set(k, v as any);
          }
        });
      }
    } catch (e) {}
  }, []);

  const saveToNominatimCache = (key: string, data: { placeName: string; geojson: any } | null) => {
    nominatimCacheRef.current.set(key, data);
    if (data && data.geojson) {
      try {
        const obj: Record<string, any> = {};
        Array.from(nominatimCacheRef.current.entries())
          .filter(([_, v]) => v && (v as any).geojson)
          .slice(-150)
          .forEach(([k, v]) => { obj[k] = v; });
        localStorage.setItem('uamapper_nominatim_cache_v1', JSON.stringify(obj));
      } catch (e) {}
    }
  };

  // Safe fetch helper for Nominatim to prevent console CORS/429 spam
  const safeFetchNominatim = async (url: string) => {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        return { ok: false, status: 429, data: null };
      }
      if (!response.ok) {
        return { ok: false, status: response.status, data: null };
      }
      const data = await response.json();
      return { ok: true, status: 200, data };
    } catch (err) {
      return { ok: false, status: 0, data: null };
    }
  };

  useEffect(() => {
    autoHighlightZoneRef.current = autoHighlightZone;
    if (autoHighlightZone) {
      // Automatically highlight zones for all existing markers and their direction handles
      markers.forEach((m) => {
        handleAutoHighlightZoneAt(m.lat, m.lng, m.id);

        let endLat = m.endLat;
        let endLng = m.endLng;
        if (endLat === undefined || endLng === undefined) {
          const angleRad = ((m.rotation || 0) * Math.PI) / 180;
          endLat = m.lat + Math.cos(angleRad) * 0.003;
          endLng = m.lng + Math.sin(angleRad) * 0.005;
        }
        handleAutoHighlightZoneAt(endLat, endLng, `${m.id}_end`);
      });
    } else {
      // Clean up auto-generated zones when feature is disabled
      setSearchedAreas((prev) => prev.filter((a) => !a.id.startsWith('autozone_') && !a.markerId));
    }
  }, [autoHighlightZone, isMapReady]);

  // Format city/municipality name cleanly for display
  const formatCityName = (address: any) => {
    if (address.city) return address.city;
    if (address.town) return address.town;
    if (address.village) return address.village;
    if (address.municipality) {
      if (address.municipality.includes('Криворізька')) return 'Кривий Ріг';
      if (address.municipality.includes('Київська')) return 'Київ';
      if (address.municipality.includes('Дніпровська')) return 'Дніпро';
      return address.municipality.replace(' міська громада', '').replace(' сільська громада', '').replace(' селищна громада', '');
    }
    return '';
  };

  // Handle Auto-highlight Zone creation at coordinates (highlights the hromada/district polygon where the point is located)
  const handleAutoHighlightZoneAt = (lat: number, lng: number, markerId?: string) => {
    if (!autoHighlightZoneRef.current) return;

    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;

    // 1. Check if cached result exists
    if (nominatimCacheRef.current.has(cacheKey)) {
      const cached = nominatimCacheRef.current.get(cacheKey);
      if (cached && cached.geojson) {
        const zoneId = markerId ? `autozone_marker_${markerId}` : `autozone_${Date.now()}`;
        const newArea: SearchedArea = {
          id: zoneId,
          markerId: markerId,
          name: cached.placeName,
          lat: lat.toString(),
          lon: lng.toString(),
          geojson: cached.geojson
        };

        setSearchedAreas((prev) => {
          const filtered = prev.filter((a) => {
            if (markerId && (a.markerId === markerId || a.id === `autozone_marker_${markerId}` || a.id === `autozone_${markerId}`)) {
              return false;
            }
            if (a.id === zoneId) return false;
            return true;
          });
          return [...filtered, newArea];
        });
      } else {
        if (markerId) {
          setSearchedAreas((prev) =>
            prev.filter((a) => a.markerId !== markerId && a.id !== `autozone_marker_${markerId}` && a.id !== `autozone_${markerId}`)
          );
        }
      }
      return;
    }

    // 2. Prevent duplicate pending requests
    if (pendingKeysRef.current.has(cacheKey)) {
      return;
    }
    pendingKeysRef.current.add(cacheKey);

    // 3. Queue network request with safe throttling
    nominatimQueueRef.current = nominatimQueueRef.current.then(async () => {
      if (!autoHighlightZoneRef.current) {
        pendingKeysRef.current.delete(cacheKey);
        return;
      }

      // Double check cache
      if (nominatimCacheRef.current.has(cacheKey)) {
        pendingKeysRef.current.delete(cacheKey);
        const cached = nominatimCacheRef.current.get(cacheKey);
        if (cached && cached.geojson) {
          const zoneId = markerId ? `autozone_marker_${markerId}` : `autozone_${Date.now()}`;
          const newArea: SearchedArea = {
            id: zoneId,
            markerId: markerId,
            name: cached.placeName,
            lat: lat.toString(),
            lon: lng.toString(),
            geojson: cached.geojson
          };
          setSearchedAreas((prev) => {
            const filtered = prev.filter((a) => {
              if (markerId && (a.markerId === markerId || a.id === `autozone_marker_${markerId}` || a.id === `autozone_${markerId}`)) {
                return false;
              }
              if (a.id === zoneId) return false;
              return true;
            });
            return [...filtered, newArea];
          });
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 400));

      try {
        const zoomLevels = [14, 12, 10, 8];
        let resData: any = null;

        for (const zoom of zoomLevels) {
          if (!autoHighlightZoneRef.current) break;

          const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&polygon_geojson=1&zoom=${zoom}&accept-language=uk`;
          const fetchRes = await safeFetchNominatim(url);

          if (fetchRes.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            break;
          }

          if (fetchRes.ok && fetchRes.data?.geojson && (fetchRes.data.geojson.type === 'Polygon' || fetchRes.data.geojson.type === 'MultiPolygon')) {
            resData = fetchRes.data;
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        if (resData && resData.geojson && (resData.geojson.type === 'Polygon' || resData.geojson.type === 'MultiPolygon')) {
          const address = resData.address || {};
          const districtOrSuburb = resData.name || address.borough || address.suburb || address.city_district || address.village || address.town;
          const cityName = formatCityName(address);

          let placeName = districtOrSuburb || cityName || resData.display_name?.split(',')[0] || 'Громада';
          if (districtOrSuburb && cityName && districtOrSuburb !== cityName && !districtOrSuburb.includes(cityName)) {
            placeName = `${districtOrSuburb} (${cityName})`;
          }

          const geojson = resData.geojson;
          saveToNominatimCache(cacheKey, { placeName, geojson });

          const zoneId = markerId ? `autozone_marker_${markerId}` : `autozone_${Date.now()}`;

          const newArea: SearchedArea = {
            id: zoneId,
            markerId: markerId,
            name: placeName,
            lat: lat.toString(),
            lon: lng.toString(),
            geojson: geojson,
          };

          setSearchedAreas((prev) => {
            const filtered = prev.filter((a) => {
              if (markerId && (a.markerId === markerId || a.id === `autozone_marker_${markerId}` || a.id === `autozone_${markerId}`)) {
                return false;
              }
              if (a.id === zoneId) return false;
              return true;
            });
            return [...filtered, newArea];
          });

          setLastAutoZoneName(placeName);
          setTimeout(() => setLastAutoZoneName(null), 3500);
        } else {
          saveToNominatimCache(cacheKey, null);
          if (markerId) {
            setSearchedAreas((prev) =>
              prev.filter((a) => a.markerId !== markerId && a.id !== `autozone_marker_${markerId}` && a.id !== `autozone_${markerId}`)
            );
          }
        }
      } catch (e) {
        // Suppress
      } finally {
        pendingKeysRef.current.delete(cacheKey);
      }
    });
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Highlighted areas state (with localStorage persistence)
  const [searchedAreas, setSearchedAreas] = useState<SearchedArea[]>(() => {
    try {
      const saved = localStorage.getItem('visicom_searched_areas');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const searchedAreasRef = useRef<SearchedArea[]>(searchedAreas);
  useEffect(() => {
    searchedAreasRef.current = searchedAreas;
  }, [searchedAreas]);

  const geojsonLayersRef = useRef<{ [id: string]: { layer: L.GeoJSON; geojson: any } }>({});

  // Total distance calculation for measurement tool
  const totalMeasureDistance = React.useMemo(() => {
    if (measurePoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < measurePoints.length - 1; i++) {
      total += calculateDistanceMeters(measurePoints[i], measurePoints[i + 1]);
    }
    return total;
  }, [measurePoints]);

  // Custom quick zones saved by user
  const [customQuickZones, setCustomQuickZones] = useState<QuickDistrict[]>(() => {
    try {
      const saved = localStorage.getItem('uamapper_custom_quick_zones');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Toggle to show/hide quick settlement buttons (leaving only search & district buttons)
  const [localShowQuickSettlements, setLocalShowQuickSettlements] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('uamapper_show_quick_settlements');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const showQuickSettlements = propShowQuickSettlements !== undefined ? propShowQuickSettlements : localShowQuickSettlements;

  const handleToggleQuickSettlements = (val: boolean) => {
    setLocalShowQuickSettlements(val);
    onToggleQuickSettlements?.(val);
    try {
      localStorage.setItem('uamapper_show_quick_settlements', String(val));
    } catch (e) {
      console.warn('Failed to save showQuickSettlements state:', e);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('uamapper_custom_quick_zones', JSON.stringify(customQuickZones));
    } catch (e) {
      console.warn('Failed to save custom quick zones:', e);
    }
  }, [customQuickZones]);

  const addZoneToQuickButtons = useCallback((name: string, geojson?: any, lat?: string, lon?: string, osmId?: string) => {
    if (!name || !name.trim()) return;
    const cleanName = name.trim();

    setCustomQuickZones((prev) => {
      const existsInDefault = QUICK_DISTRICTS.some(
        (d) => d.label.toLowerCase() === cleanName.toLowerCase() || d.fullName.toLowerCase() === cleanName.toLowerCase()
      );
      const existsInCustom = prev.some(
        (q) => q.label.toLowerCase() === cleanName.toLowerCase() || q.fullName.toLowerCase() === cleanName.toLowerCase()
      );
      if (existsInDefault || existsInCustom) return prev;

      const newZone: QuickDistrict = {
        id: osmId ? `custom_osm_${osmId}` : `custom_zone_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        label: cleanName,
        fullName: cleanName,
        query: cleanName,
        category: 'settlement',
        geojson,
        lat,
        lon,
        osmId
      };
      return [...prev, newZone];
    });
  }, []);

  const handleRemoveCustomQuickZone = (id: string) => {
    setCustomQuickZones((prev) => prev.filter((q) => q.id !== id));
  };

  // Combine default preset non-urban boundaries with saved custom quick zones
  const allQuickZones = React.useMemo(() => {
    return [
      ...QUICK_DISTRICTS.filter((d) => d.category !== 'urban_district'),
      ...customQuickZones
    ];
  }, [customQuickZones]);

  // Highlight settlement by name (for settlement label marker click)
  const handleHighlightSettlementByName = async (name: string, lat: number, lng: number) => {
    try {
      const existing = searchedAreas.find((a) => {
        const aLat = parseFloat(a.lat);
        const aLon = parseFloat(a.lon);
        if (!isNaN(aLat) && !isNaN(aLon)) {
          return L.latLng(aLat, aLon).distanceTo(L.latLng(lat, lng)) < 8000;
        }
        return a.name.toLowerCase() === name.toLowerCase();
      });
      if (existing) {
        setSearchedAreas((prev) => prev.filter((a) => a.id !== existing.id));
        return;
      }

      // 1) Try reverse geocoding directly at the clicked coordinates first (most accurate)
      let itemGeojson = null;
      let title = name;
      let osmId = undefined;

      const reverseRes = await safeFetchNominatim(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&polygon_geojson=1&accept-language=uk`
      );

      if (reverseRes.ok && reverseRes.data) {
        const rData = reverseRes.data;
        if (rData.geojson && (rData.geojson.type === 'Polygon' || rData.geojson.type === 'MultiPolygon')) {
          itemGeojson = rData.geojson;
          title = rData.name || rData.display_name?.split(',')[0] || name;
          osmId = rData.osm_id?.toString();
        }
      }

      // 2) If reverse geocoding didn't yield a polygon, search with location viewbox and pick closest candidate
      if (!itemGeojson) {
        const bbox = `viewbox=${lng - 0.25},${lat + 0.25},${lng + 0.25},${lat - 0.25}&bounded=0`;
        const res = await safeFetchNominatim(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            name
          )}&format=json&polygon_geojson=1&accept-language=uk&${bbox}&limit=10`
        );

        if (res.ok && res.data && res.data.length > 0) {
          const candidates = res.data
            .filter((it: any) => it.geojson && (it.geojson.type === 'Polygon' || it.geojson.type === 'MultiPolygon'))
            .map((it: any) => {
              const cLat = parseFloat(it.lat);
              const cLon = parseFloat(it.lon);
              const dist = !isNaN(cLat) && !isNaN(cLon) ? L.latLng(cLat, cLon).distanceTo(L.latLng(lat, lng)) : Infinity;
              return { ...it, dist };
            })
            .sort((a: any, b: any) => a.dist - b.dist);

          const best = candidates[0];
          if (best && best.dist < 35000) {
            itemGeojson = best.geojson;
            title = best.display_name.split(',')[0] || name;
            osmId = best.osm_id?.toString();
          }
        }
      }

      if (!itemGeojson) {
        itemGeojson = createCircleGeoJson(lat, lng, 2000);
      }

      const newArea: SearchedArea = {
        id: `settlement_zone_${Date.now()}`,
        name: title,
        lat: lat.toString(),
        lon: lng.toString(),
        geojson: itemGeojson
      };

      setSearchedAreas((prev) => [...prev, newArea]);
    } catch (e) {
      // Suppress
    }
  };

  // Handle Red Zone creation by clicking on map coordinates:
  // - Clicking on a city/village -> highlights boundary of city/village
  // - Clicking NOT on a settlement name (fields/countryside) -> highlights boundary of HROMADA ( громада )
  const handleCreateRedZoneAt = async (lat: number, lng: number) => {
    setIsAddingRedZone(true);
    try {
      const res = await safeFetchNominatim(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&polygon_geojson=1&accept-language=uk`
      );
      if (!res.ok || !res.data) return;
      const data = res.data;
      const address = data.address || {};

      // Check if click is directly on/inside a settlement
      const settlementName = address.village || address.town || address.city || address.suburb || address.hamlet;

      if (settlementName) {
        // 1. CLICKED ON A SETTLEMENT (місто/село)! Highlight boundary of city/village
        let settlementGeojson = null;
        let placeTitle = data.name || settlementName;
        let osmId = data.osm_id?.toString();

        // 1a. If reverse geocode at (lat, lng) ALREADY has a Polygon/MultiPolygon, use it directly!
        if (data.geojson && (data.geojson.type === 'Polygon' || data.geojson.type === 'MultiPolygon')) {
          settlementGeojson = data.geojson;
        }

        // 1b. Otherwise, search bounded near (lat, lng) and pick the closest candidate
        if (!settlementGeojson) {
          const regionContext = address.county || address.state || address.district || '';
          const query = regionContext ? `${settlementName}, ${regionContext}` : settlementName;
          const bbox = `viewbox=${lng - 0.25},${lat + 0.25},${lng + 0.25},${lat - 0.25}&bounded=0`;

          const searchRes = await safeFetchNominatim(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&accept-language=uk&${bbox}&limit=10`
          );

          if (searchRes.ok && searchRes.data) {
            const candidates = searchRes.data
              .filter((it: any) => it.geojson && (it.geojson.type === 'Polygon' || it.geojson.type === 'MultiPolygon'))
              .map((it: any) => {
                const cLat = parseFloat(it.lat);
                const cLon = parseFloat(it.lon);
                const dist = !isNaN(cLat) && !isNaN(cLon) ? L.latLng(cLat, cLon).distanceTo(L.latLng(lat, lng)) : Infinity;
                return { ...it, dist };
              })
              .sort((a: any, b: any) => a.dist - b.dist);

            const best = candidates[0];
            if (best && best.dist < 35000) {
              settlementGeojson = best.geojson;
              placeTitle = best.display_name.split(',')[0] || settlementName;
              osmId = best.osm_id?.toString();
            }
          }
        }

        if (!settlementGeojson) {
          settlementGeojson = createCircleGeoJson(lat, lng, 2000);
        }

        const newArea: SearchedArea = {
          id: `redzone_settlement_${Date.now()}`,
          name: placeTitle,
          lat: lat.toString(),
          lon: lng.toString(),
          geojson: settlementGeojson
        };

        setSearchedAreas((prev) => [...prev, newArea]);
      } else {
        // 2. CLICKED NOT ON A SETTLEMENT (fields / countryside) -> Highlight HROMADA (громада)!
        const hromadaRes = await safeFetchNominatim(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&polygon_geojson=1&zoom=10&accept-language=uk`
        );
        let hromadaGeojson = null;
        let hromadaName = address.municipality || address.district || 'Громада';
        let osmId = undefined;

        if (hromadaRes.ok && hromadaRes.data) {
          const hromadaData = hromadaRes.data;
          if (hromadaData.name || hromadaData.address?.municipality) {
            hromadaName = hromadaData.name || hromadaData.address?.municipality || hromadaName;
          }
          if (hromadaData.geojson && (hromadaData.geojson.type === 'Polygon' || hromadaData.geojson.type === 'MultiPolygon')) {
            hromadaGeojson = hromadaData.geojson;
            osmId = hromadaData.osm_id?.toString();
          }
        }

        if (!hromadaGeojson && address.municipality) {
          const bbox = `viewbox=${lng - 0.5},${lat + 0.5},${lng + 0.5},${lat - 0.5}&bounded=0`;
          const searchHromada = await safeFetchNominatim(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address.municipality)}&format=json&polygon_geojson=1&accept-language=uk&${bbox}&limit=10`
          );
          if (searchHromada.ok && searchHromada.data) {
            const candidates = searchHromada.data
              .filter((it: any) => it.geojson && (it.geojson.type === 'Polygon' || it.geojson.type === 'MultiPolygon'))
              .map((it: any) => {
                const cLat = parseFloat(it.lat);
                const cLon = parseFloat(it.lon);
                const dist = !isNaN(cLat) && !isNaN(cLon) ? L.latLng(cLat, cLon).distanceTo(L.latLng(lat, lng)) : Infinity;
                return { ...it, dist };
              })
              .sort((a: any, b: any) => a.dist - b.dist);

            const best = candidates[0];
            if (best && best.dist < 50000) {
              hromadaGeojson = best.geojson;
              osmId = best.osm_id?.toString();
            }
          }
        }

        if (!hromadaGeojson) {
          hromadaGeojson = createCircleGeoJson(lat, lng, 3000);
        }

        const newArea: SearchedArea = {
          id: `redzone_hromada_${Date.now()}`,
          name: hromadaName,
          lat: lat.toString(),
          lon: lng.toString(),
          geojson: hromadaGeojson
        };

        setSearchedAreas((prev) => [...prev, newArea]);
      }
    } catch (e) {
      // Suppress
    } finally {
      setIsAddingRedZone(false);
    }
  };

  // Search handler with Kryvyi Rih district biasing & ranking
  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    setShowDropdown(true);
    try {
      // Viewbox bounding Kryvyi Rih district & nearby surroundings (lon_min, lat_max, lon_max, lat_min)
      const viewboxStr = '32.5,48.6,34.5,47.2';
      const res = await safeFetchNominatim(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          queryText
        )}&format=json&polygon_geojson=1&countrycodes=ua&viewbox=${viewboxStr}&bounded=0&accept-language=uk&limit=14`
      );
      if (res.ok && res.data) {
        const data = res.data;
        
        // Kryvyi Rih district scoring helper
        const getKryvyiRihScore = (item: any) => {
          let score = 0;
          const nameLower = (item.display_name || '').toLowerCase();
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);

          // Geofence check for Kryvyi Rih district & surrounding region
          if (!isNaN(lat) && !isNaN(lon) && lat >= 47.1 && lat <= 48.5 && lon >= 32.5 && lon <= 34.5) {
            score += 150;
          }

          // Textual relevance for Kryvyi Rih district / Dnipropetrovsk oblast
          if (nameLower.includes('криворізьк') || nameLower.includes('кривий ріг')) {
            score += 250;
          } else if (nameLower.includes('дніпропетровськ') || nameLower.includes('дніпро')) {
            score += 80;
          }

          return score;
        };

        const sortedData = [...data].sort((a, b) => getKryvyiRihScore(b) - getKryvyiRihScore(a));

        // Filter out places with valid polygon geometries first, fallback to sorted all if empty
        const filtered = sortedData.filter(
          (item: any) =>
            item.geojson &&
            (item.geojson.type === 'Polygon' ||
              item.geojson.type === 'MultiPolygon')
        );
        setSearchResults(filtered.length > 0 ? filtered : sortedData);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 3) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Handle outside clicks to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [loadingDistrict, setLoadingDistrict] = useState<string | null>(null);

  const handleToggleDistrict = async (district: QuickDistrict) => {
    // Check if it's already highlighted
    const existing = searchedAreas.find(
      (area) => area.districtId === district.id || area.name === district.label || area.name === district.fullName
    );
    if (existing) {
      handleRemoveArea(existing.id);
      return;
    }

    setLoadingDistrict(district.id);
    try {
      let item: any = null;

      // Strategy 0: Direct cached GeoJSON if saved with quick district
      if (district.geojson) {
        item = {
          lat: district.lat || '0',
          lon: district.lon || '0',
          geojson: district.geojson,
          osm_id: district.osmId,
          osm_type: 'custom'
        };
      }

      // Strategy 1: Fast direct lookup by OSM Relation ID if provided
      if (!item && district.osmId) {
        try {
          const lookupRes = await safeFetchNominatim(
            `https://nominatim.openstreetmap.org/lookup?osm_ids=R${district.osmId}&format=json&polygon_geojson=1&accept-language=uk`
          );
          if (lookupRes.ok && lookupRes.data) {
            const lookupData = lookupRes.data;
            if (lookupData && lookupData.length > 0 && lookupData[0].geojson) {
              item = lookupData[0];
            }
          }
        } catch (e) {
          // Suppress
        }
      }

      // Strategy 2: Fallback search query if lookup didn't return polygon
      if (!item) {
        const res = await safeFetchNominatim(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            district.query
          )}&format=json&polygon_geojson=1&countrycodes=ua&accept-language=uk&limit=10`
        );
        if (res.ok && res.data) {
          const data = res.data;
          if (data && data.length > 0) {
            item = data.find(
              (it: any) =>
                it.geojson &&
                (it.geojson.type === 'Polygon' || it.geojson.type === 'MultiPolygon') &&
                (it.display_name.includes('Крив') || it.display_name.includes('Дніпро'))
            ) || data.find(
              (it: any) =>
                it.geojson &&
                (it.geojson.type === 'Polygon' || it.geojson.type === 'MultiPolygon')
            ) || data[0];
          }
        }
      }

      if (item && item.geojson) {
        const map = mapInstanceRef.current;
        if (map) {
          const newArea: SearchedArea = {
            id: item.osm_id ? `${item.osm_type}_${item.osm_id}` : `district_${district.id}`,
            name: district.fullName || district.label,
            lat: item.lat,
            lon: item.lon,
            geojson: item.geojson,
            districtId: district.id
          };

          setSearchedAreas((prev) => {
            if (prev.some((a) => a.id === newArea.id || a.districtId === district.id)) return prev;
            return [...prev, newArea];
          });
        }
      }
    } catch (e) {
      console.error('Error fetching district:', e);
    } finally {
      setLoadingDistrict(null);
    }
  };

  const handleSelectArea = async (item: any) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon')) {
      const name = item.display_name.split(',')[0] || item.display_name;
      const newArea: SearchedArea = {
        id: item.osm_id ? `${item.osm_type}_${item.osm_id}` : `search_${Date.now()}`,
        name: name,
        lat: item.lat,
        lon: item.lon,
        geojson: item.geojson
      };

      setSearchedAreas((prev) => {
        if (prev.some((a) => a.id === newArea.id)) return prev;
        return [...prev, newArea];
      });

      try {
        const tempLayer = L.geoJSON(item.geojson);
        const bounds = tempLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { maxZoom: 14, animate: true, padding: [20, 20] });
        } else {
          map.setView([parseFloat(item.lat), parseFloat(item.lon)], 12);
        }
      } catch (e) {
        map.setView([parseFloat(item.lat), parseFloat(item.lon)], 12);
      }
    } else {
      await handleAutoHighlightZoneAt(parseFloat(item.lat), parseFloat(item.lon));
      map.setView([parseFloat(item.lat), parseFloat(item.lon)], 13, { animate: true });
    }

    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleDirectAddZoneByQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearching(true);
    try {
      const res = await safeFetchNominatim(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          queryText
        )}&format=json&polygon_geojson=1&countrycodes=ua&accept-language=uk&limit=5`
      );
      if (res.ok && res.data) {
        const data = res.data;
        if (data && data.length > 0) {
          const item = data.find(
            (it: any) => it.geojson && (it.geojson.type === 'Polygon' || it.geojson.type === 'MultiPolygon')
          ) || data[0];
          await handleSelectArea(item);
          return;
        }
      }
      alert(
        language === 'uk'
          ? `Не вдалося знайти межі зони для "${queryText}".`
          : `Could not find zone boundary for "${queryText}".`
      );
    } catch (e) {
      console.error('Error adding zone by query:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (searchResults.length > 0) {
      handleSelectArea(searchResults[0]);
    } else {
      handleDirectAddZoneByQuery(searchQuery);
    }
  };

  const handleRemoveArea = (id: string) => {
    setSearchedAreas((prev) => prev.filter((area) => area.id !== id));
  };

  const handleClearAllAreas = useCallback(() => {
    // 1. Immediately remove all Leaflet geojson polygon layers
    Object.keys(geojsonLayersRef.current).forEach((id) => {
      try {
        geojsonLayersRef.current[id]?.layer?.remove();
      } catch (err) {
        console.error('Error removing geojson layer:', err);
      }
      delete geojsonLayersRef.current[id];
    });

    // 2. Clear state for searched & highlighted areas
    setSearchedAreas([]);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setMeasurePoints([]);
    setDraftLinePoints([]);

    // 3. Remove from persistence
    try {
      localStorage.removeItem('visicom_searched_areas');
    } catch (err) {
      console.error(err);
    }

    // 4. Close any open leaflet popups
    if (mapInstanceRef.current) {
      mapInstanceRef.current.closePopup();
    }
  }, []);

  // Listen to clearAllTrigger from App.tsx ("Очистити все")
  useEffect(() => {
    if (clearAllTrigger && clearAllTrigger > 0) {
      handleClearAllAreas();
    }
  }, [clearAllTrigger, handleClearAllAreas]);

  const formatDisplayName = (fullName: string) => {
    const parts = fullName.split(',');
    if (parts.length <= 2) return fullName;
    return parts.slice(0, 3).join(',');
  };

  // Synchronize Searched/Highlighted Polygons to Leaflet
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentAreasMap = new Map<string, SearchedArea>(searchedAreas.map((area) => [area.id, area]));

    // Remove old layers or layers whose GeoJSON data changed
    Object.keys(geojsonLayersRef.current).forEach((id) => {
      const area = currentAreasMap.get(id);
      const existing = geojsonLayersRef.current[id];
      if (!area || existing.geojson !== area.geojson) {
        existing.layer.remove();
        delete geojsonLayersRef.current[id];
      }
    });

    // Add new layers
    searchedAreas.forEach((area) => {
      if (!geojsonLayersRef.current[area.id] && area.geojson) {
        const nameLower = (area.name || '').toLowerCase();
        const isHromada = area.id.includes('hromada') || nameLower.includes('громада') || nameLower.includes('отг');

        const geojsonLayer = L.geoJSON(area.geojson, {
          style: {
            stroke: false,
            weight: 0,
            color: 'transparent',
            fillColor: '#ef4444',            // Red fill
            fillOpacity: 0.25,               // 25% opacity
            opacity: 0,                      // No stroke
          }
        });

        // Custom Popup Content
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1.5 font-sans text-xs flex flex-col gap-1 text-slate-800';
        
        const title = document.createElement('p');
        title.className = 'font-bold text-slate-900 border-b border-slate-100 pb-1';
        title.innerText = area.name;
        popupContent.appendChild(title);

        const coords = document.createElement('p');
        coords.className = 'text-[10px] text-slate-500 font-mono';
        coords.innerText = `lat: ${parseFloat(area.lat).toFixed(4)}, lng: ${parseFloat(area.lon).toFixed(4)}`;
        popupContent.appendChild(coords);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mt-1 w-full px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer transition-colors';
        deleteBtn.innerText = language === 'uk' ? 'Видалити виділення' : 'Remove highlight';
        deleteBtn.onclick = () => {
          handleRemoveArea(area.id);
          map.closePopup();
        };
        popupContent.appendChild(deleteBtn);

        geojsonLayer.bindPopup(popupContent, {
          closeButton: true,
          className: 'custom-polygon-popup'
        });

        geojsonLayer.addTo(map);
        geojsonLayersRef.current[area.id] = { layer: geojsonLayer, geojson: area.geojson };
      }
    });

    try {
      localStorage.setItem('visicom_searched_areas', JSON.stringify(searchedAreas));
    } catch (e) {
      console.error(e);
    }
  }, [searchedAreas, language, isMapReady]);

  // Clean up geojson layers on unmount
  useEffect(() => {
    return () => {
      Object.keys(geojsonLayersRef.current).forEach((id) => {
        if (geojsonLayersRef.current[id]) {
          geojsonLayersRef.current[id].layer.remove();
        }
      });
      geojsonLayersRef.current = {};
    };
  }, []);

  // Render settlement and district label badges on the map
  const renderSettlementLabels = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!settlementLayerRef.current) {
      settlementLayerRef.current = L.layerGroup().addTo(map);
    } else {
      settlementLayerRef.current.clearLayers();
    }

    if (!showSettlementLabels) return;

    const currentZoom = map.getZoom();

    const allSettlements = customSettlements.filter(s => !(s as any).isDeleted);

    allSettlements.forEach((item) => {
      const category = getSettlementCategory(item);
      if (disabledSettlementCategories.includes(category)) {
        return;
      }

      const isUserCustomPoint = item.id.startsWith('custom_');

      if (!isUserCustomPoint) {
        if (settlementLabelMode === 'districts_only' && item.type !== 'district') {
          return;
        }
        if (settlementLabelMode === 'districts_cities' && item.type !== 'district' && item.type !== 'city') {
          return;
        }
      }

      let minZoom = 1;
      if (isUserCustomPoint) {
        minZoom = 1; // Always visible if custom point created by user
      } else if (item.type === 'district') {
        minZoom = 1; // Visible at all zoom levels
      } else if (item.priority === 1) {
        minZoom = 1; // Major regional capitals & cities visible at all zoom levels
      } else if (item.priority === 2) {
        minZoom = 3.0; // Regional cities & district centers
      } else if (item.priority === 3) {
        minZoom = 5.0; // Towns & hromada centers
      } else if (item.priority === 4) {
        minZoom = 6.0; // Local settlements & villages
      } else {
        minZoom = 7.0; // Small hamlets & rural villages
      }

      if (currentZoom < minZoom) return;

      let dotHtml = '';
      let labelHtml = '';

      if (item.type === 'district') {
        dotHtml = `<span class="w-3.5 h-3.5 rounded-full bg-amber-400 ring-2 ring-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.9)] animate-pulse shrink-0"></span>`;
        labelHtml = `
          <div class="bg-slate-950/95 text-amber-300 border border-amber-500/80 px-2 py-0.5 rounded-md text-[12px] font-black tracking-wider uppercase whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.85)] font-sans antialiased" style="font-family: inherit;">
            ${item.name}
          </div>
        `;
      } else if (item.priority === 1) {
        dotHtml = `<span class="w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-blue-500/80 shadow-[0_0_10px_rgba(34,211,238,0.9)] shrink-0"></span>`;
        labelHtml = `
          <div class="bg-slate-950/95 text-cyan-300 border border-cyan-400/80 px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-wide whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.85)] font-sans antialiased" style="font-family: inherit;">
            ${item.name}
          </div>
        `;
      } else if (item.priority === 2) {
        dotHtml = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1.5 ring-emerald-500/70 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0"></span>`;
        labelHtml = `
          <div class="bg-slate-950/90 text-emerald-300 border border-emerald-400/70 px-1.5 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap shadow-[0_2px_6px_rgba(0,0,0,0.8)] font-sans antialiased" style="font-family: inherit;">
            ${item.name}
          </div>
        `;
      } else if (item.priority === 3) {
        dotHtml = `<span class="w-2 h-2 rounded-full bg-sky-300 ring-1 ring-sky-400/60 shadow-[0_0_5px_rgba(186,230,253,0.7)] shrink-0"></span>`;
        labelHtml = `
          <div class="bg-slate-950/90 text-sky-200 border border-sky-400/60 px-1.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-[0_2px_6px_rgba(0,0,0,0.8)] font-sans antialiased" style="font-family: inherit;">
            ${item.name}
          </div>
        `;
      } else {
        dotHtml = `<span class="w-1.5 h-1.5 rounded-full bg-slate-200 ring-1 ring-slate-400/50 shadow-[0_0_4px_rgba(255,255,255,0.5)] shrink-0"></span>`;
        labelHtml = `
          <div class="bg-slate-950/85 text-slate-100 border border-slate-700/80 px-1.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-[0_2px_5px_rgba(0,0,0,0.8)] font-sans antialiased" style="font-family: inherit;">
            ${item.name}
          </div>
        `;
      }

      const htmlContent = `
        <div class="relative flex items-center cursor-pointer select-none group pointer-events-auto" style="font-family: inherit;">
          <div class="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            ${dotHtml}
            <div class="absolute left-full ml-1.5 top-1/2 -translate-y-1/2">
              ${labelHtml}
            </div>
          </div>
        </div>
      `;

      const customDivIcon = L.divIcon({
        className: 'settlement-label-marker',
        html: htmlContent,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([item.lat, item.lng], {
        icon: customDivIcon,
        interactive: true,
        pane: 'settlementPane',
        zIndexOffset: item.type === 'district' ? 1000 : (item.priority === 1 ? 800 : 400),
      });

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        if (interactionModeRef.current === 'settlement' && onEditSettlementRef.current) {
          onEditSettlementRef.current(item);
        } else {
          handleHighlightSettlementByName(item.name, item.lat, item.lng);
        }
      });

      if (settlementLayerRef.current) {
        marker.addTo(settlementLayerRef.current);
      }
    });
  }, [showSettlementLabels, settlementLabelMode, disabledSettlementCategories, customSettlements, isMapReady, mapFont]);

  useEffect(() => {
    renderSettlementLabels();

    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapMove = () => {
      renderSettlementLabels();
    };

    map.on('zoomend', handleMapMove);
    map.on('moveend', handleMapMove);

    return () => {
      map.off('zoomend', handleMapMove);
      map.off('moveend', handleMapMove);
    };
  }, [renderSettlementLabels, isMapReady]);
  
  const interactionModeRef = useRef(interactionMode);
  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  const onAddMarkerRef = useRef(onAddMarker);
  const onSelectMarkerRef = useRef(onSelectMarker);
  const onSelectLineRef = useRef(onSelectLine);
  const onAddCustomSettlementPointRef = useRef(onAddCustomSettlementPoint);
  const onEditSettlementRef = useRef(onEditSettlement);

  useEffect(() => {
    onAddMarkerRef.current = onAddMarker;
  }, [onAddMarker]);

  useEffect(() => {
    onSelectMarkerRef.current = onSelectMarker;
  }, [onSelectMarker]);

  useEffect(() => {
    onSelectLineRef.current = onSelectLine;
  }, [onSelectLine]);

  useEffect(() => {
    onAddCustomSettlementPointRef.current = onAddCustomSettlementPoint;
  }, [onAddCustomSettlementPoint]);

  useEffect(() => {
    onEditSettlementRef.current = onEditSettlement;
  }, [onEditSettlement]);
  
  // Create or update map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      // Always load in Kryvyi Rih
      const defaultCenter: [number, number] = [47.9105, 33.3918];
      const defaultZoom = 11;

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: false, // We'll add our own styled zoom control or position it beautifully
        zoomSnap: 1, // Integer zoom levels guarantee 1:1 crisp raster tiles without CSS scale blur
        zoomDelta: 1,
        wheelPxPerZoomLevel: 60,
      });

      // Add a styled zoom control at top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Create custom Leaflet panes to control z-index layer ordering:
      // Air alerts background (230) < Air alert ambient markers (240) < Red danger zones (320) < Boundaries & raions (340) < Settlements (380) < Drawn lines (480) < User markers/tactical icons (600)
      if (!map.getPane('airAlertsPolygonsPane')) {
        const p = map.createPane('airAlertsPolygonsPane');
        p.style.zIndex = '230';
        p.style.pointerEvents = 'none';
      }
      if (!map.getPane('airAlertsMarkersPane')) {
        const p = map.createPane('airAlertsMarkersPane');
        p.style.zIndex = '240';
      }
      if (!map.getPane('redZonePane')) {
        const p = map.createPane('redZonePane');
        p.style.zIndex = '320';
      }
      if (!map.getPane('boundariesPane')) {
        const p = map.createPane('boundariesPane');
        p.style.zIndex = '340';
      }
      if (!map.getPane('settlementPane')) {
        const p = map.createPane('settlementPane');
        p.style.zIndex = '380';
      }
      if (!map.getPane('drawnLinesPane')) {
        const p = map.createPane('drawnLinesPane');
        p.style.zIndex = '480';
      }
      if (!map.getPane('userMarkersPane')) {
        const p = map.createPane('userMarkersPane');
        p.style.zIndex = '600';
      }

      // Handle map clicks based on active interaction mode
      map.on('click', (e: L.LeafletMouseEvent) => {
        const originalEvent = e.originalEvent;
        let target = originalEvent.target as HTMLElement;
        let clickedMarker = false;

        if (
          target.classList.contains('leaflet-marker-icon') ||
          target.classList.contains('measure-node-icon') ||
          target.classList.contains('measure-badge-icon') ||
          Boolean(target.closest?.('.leaflet-popup')) ||
          Boolean(target.closest?.('.leaflet-popup-content')) ||
          Boolean(target.closest?.('.measure-node-icon')) ||
          Boolean(target.closest?.('.measure-badge-icon')) ||
          Boolean(target.closest?.('.measure-point-popup'))
        ) {
          clickedMarker = true;
        } else {
          while (target && target !== mapContainerRef.current) {
            if (
              target.classList.contains('leaflet-marker-icon') ||
              target.classList.contains('measure-node-icon') ||
              target.classList.contains('measure-badge-icon')
            ) {
              clickedMarker = true;
              break;
            }
            target = target.parentElement as HTMLElement;
          }
        }

        if (!clickedMarker) {
          const mode = interactionModeRef.current;
          if (mode === 'line') {
            if (lineDrawMethodRef.current === 'points') {
              setDraftLinePoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
            }
          } else if (mode === 'measure') {
            setMeasurePoints((prev) => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
          } else if (mode === 'redzone') {
            handleCreateRedZoneAt(e.latlng.lat, e.latlng.lng);
          } else if (mode === 'settlement') {
            onAddCustomSettlementPointRef.current?.(e.latlng.lat, e.latlng.lng);
          } else if (mode === 'draw') {
            onSelectMarkerRef.current(null);
            onSelectLineRef.current(null);
            const newMarkerId = onAddMarkerRef.current(e.latlng.lat, e.latlng.lng);
            if (autoHighlightZoneRef.current && typeof newMarkerId === 'string') {
              handleAutoHighlightZoneAt(e.latlng.lat, e.latlng.lng, newMarkerId);

              // Auto-highlight direction end point for the new marker
              const angleRad = 0; // default initial rotation is 0deg
              const endLat = e.latlng.lat + Math.cos(angleRad) * 0.003;
              const endLng = e.latlng.lng + Math.sin(angleRad) * 0.005;
              handleAutoHighlightZoneAt(endLat, endLng, `${newMarkerId}_end`);
            }
          } else {
            onSelectMarkerRef.current(null);
            onSelectLineRef.current(null);
          }
        }
      });

      // Finish line on map double click
      map.on('dblclick', (e: L.LeafletMouseEvent) => {
        if (interactionModeRef.current === 'line') {
          L.DomEvent.stopPropagation(e);
          if (draftLinePointsRef.current.length >= 2) {
            handleFinishDraftLineRef.current();
          }
        }
      });

      mapInstanceRef.current = map;
      setIsMapReady(true);

      // Force initial size invalidation
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }

    // Attach ResizeObserver to map container element to automatically handle sidebar/theme layout changes
    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Helper to keep Kryvyi Rih Raion & City outlines always on top of Hromada boundaries
  const bringDistrictAndCityToFront = () => {
    if (kryvyiRihRaionLayerRef.current) {
      kryvyiRihRaionLayerRef.current.bringToFront();
    }
    if (kryvyiRihCityLayerRef.current) {
      kryvyiRihCityLayerRef.current.bringToFront();
    }
  };

  // Permanent boundary layers for Kryvyi Rih Raion (thin line, no neon) & Kryvyi Rih City
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    let isMounted = true;

    // Load Kryvyi Rih Raion boundary (thin line without neon effect)
    const loadKryvyiRihRaionBoundary = async () => {
      if (!showDistrictBoundary) {
        if (kryvyiRihRaionLayerRef.current) {
          kryvyiRihRaionLayerRef.current.remove();
          kryvyiRihRaionLayerRef.current = null;
        }
        return;
      }
      try {
        let geojson = null;
        const cached = localStorage.getItem('uamapper_kryvorizkyi_raion_boundary');
        if (cached) {
          try {
            geojson = JSON.parse(cached);
          } catch (e) {}
        }

        if (!geojson) {
          const res = await safeFetchNominatim(
            'https://nominatim.openstreetmap.org/lookup?osm_ids=R1738028&format=json&polygon_geojson=1&accept-language=uk'
          );
          if (res.ok && res.data) {
            const data = res.data;
            if (data && data[0] && data[0].geojson) {
              geojson = data[0].geojson;
              localStorage.setItem('uamapper_kryvorizkyi_raion_boundary', JSON.stringify(geojson));
            }
          }
        }

        if (geojson && isMounted && mapInstanceRef.current && showDistrictBoundary) {
          if (kryvyiRihRaionLayerRef.current) {
            kryvyiRihRaionLayerRef.current.remove();
          }

          kryvyiRihRaionLayerRef.current = L.geoJSON(geojson, {
            pane: 'boundariesPane',
            style: {
              className: 'clean-district-outline',
              color: '#10b981',      // Clean green stroke
              weight: 2.2,           // Clean visible district line
              opacity: 0.95,         // High visibility above alert highlights
              fill: false,           // No fill
              fillOpacity: 0,        // Completely transparent inside
              interactive: false,    // Clicks pass through to map
            } as L.PathOptions
          }).addTo(mapInstanceRef.current);

          bringDistrictAndCityToFront();
        }
      } catch (err) {
        console.error('Error loading Kryvyi Rih district boundary:', err);
      }
    };

    // Load Kryvyi Rih City (місто Кривий Ріг) boundary
    const loadKryvyiRihCityBoundary = async () => {
      if (!showCityBoundary) {
        if (kryvyiRihCityLayerRef.current) {
          kryvyiRihCityLayerRef.current.remove();
          kryvyiRihCityLayerRef.current = null;
        }
        return;
      }
      try {
        let geojson = null;
        const cached = localStorage.getItem('uamapper_kryvyi_rih_city_boundary');
        if (cached) {
          try {
            geojson = JSON.parse(cached);
          } catch (e) {}
        }

        if (!geojson) {
          const res = await safeFetchNominatim(
            'https://nominatim.openstreetmap.org/lookup?osm_ids=R1821193&format=json&polygon_geojson=1&accept-language=uk'
          );
          if (res.ok && res.data) {
            const data = res.data;
            if (data && data[0] && data[0].geojson) {
              geojson = data[0].geojson;
              localStorage.setItem('uamapper_kryvyi_rih_city_boundary', JSON.stringify(geojson));
            }
          }
        }

        if (geojson && isMounted && mapInstanceRef.current && showCityBoundary) {
          if (kryvyiRihCityLayerRef.current) {
            kryvyiRihCityLayerRef.current.remove();
          }

          kryvyiRihCityLayerRef.current = L.geoJSON(geojson, {
            pane: 'boundariesPane',
            style: {
              className: 'clean-district-outline',
              color: '#38bdf8',      // Sky blue thin outline for Kryvyi Rih City
              weight: 2.0,           // Slightly thicker crisp line
              dashArray: '4, 4',     // Dotted/dashed border
              opacity: 0.95,
              fill: true,
              fillColor: '#38bdf8',
              fillOpacity: 0.06,     // Subtle light fill for city bounds
              interactive: false,    // Clicks pass through to map
            } as L.PathOptions
          }).addTo(mapInstanceRef.current);

          bringDistrictAndCityToFront();
        }
      } catch (err) {
        console.error('Error loading Kryvyi Rih city boundary:', err);
      }
    };

    loadKryvyiRihRaionBoundary();
    loadKryvyiRihCityBoundary();

    return () => {
      isMounted = false;
      if (kryvyiRihRaionLayerRef.current) {
        kryvyiRihRaionLayerRef.current.remove();
        kryvyiRihRaionLayerRef.current = null;
      }
      if (kryvyiRihCityLayerRef.current) {
        kryvyiRihCityLayerRef.current.remove();
        kryvyiRihCityLayerRef.current = null;
      }
    };
  }, [isMapReady, showCityBoundary, showDistrictBoundary]);

  // Permanent & Toggleable Dark Gray Boundary Lines for Hromadas (Межі громад - темно-сірі)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    if (!hromadasLayerGroupRef.current) {
      hromadasLayerGroupRef.current = L.layerGroup().addTo(map);
    } else {
      hromadasLayerGroupRef.current.clearLayers();
    }

    if (!showHromadaBoundaries) return;

    let isMounted = true;

    const HROMADAS_LIST = [
      { id: 'hromada_lozuwatka', name: 'Лозуватська ОТГ', query: 'Лозуватська сільська громада, Дніпропетровська область' },
      { id: 'hromada_hleiuvatska', name: 'Глеюватська ОТГ', query: 'Глеюватська сільська громада, Дніпропетровська область' },
      { id: 'hromada_grechanopody', name: 'Гречаноподівська ОТГ', query: 'Гречаноподівська сільська громада, Дніпропетровська область' },
      { id: 'hromada_novopillia', name: 'Новопільська ОТГ', query: 'Новопільська сільська громада, Дніпропетровська область' },
      { id: 'hromada_sofiivka', name: 'Софіївська ОТГ', query: 'Софіївська селищна громада, Дніпропетровська область' },
      { id: 'hromada_shyroke', name: 'Широківська ОТГ', query: 'Широківська селищна громада, Дніпропетровська область' },
      { id: 'hromada_apostolove', name: 'Апостолівська ОТГ', query: 'Апостолівська міська громада, Дніпропетровська область' },
      { id: 'hromada_zelenodolsk', name: 'Зеленодольська ОТГ', query: 'Зеленодольська міська громада, Дніпропетровська область' },
      { id: 'hromada_devladove', name: 'Девладівська ОТГ', query: 'Девладівська селищна громада, Дніпропетровська область' },
      { id: 'hromada_vakulove', name: 'Вакулівська ОТГ', query: 'Вакулівська сільська громада, Дніпропетровська область' },
      { id: 'hromada_karpivka', name: 'Карпівська ОТГ', query: 'Карпівська сільська громада, Дніпропетровська область' },
      { id: 'hromada_nyvatrudivska', name: 'Нива Трудівська ОТГ', query: 'Нива Трудівська сільська громада, Дніпропетровська область' },
    ];

    const loadHromadaBoundaries = async () => {
      for (const item of HROMADAS_LIST) {
        if (!isMounted) break;
        try {
          let geojson = null;
          const cacheKey = `uamapper_boundary_${item.id}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try { geojson = JSON.parse(cached); } catch (e) {}
          }

          if (!geojson) {
            const res = await safeFetchNominatim(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(item.query)}&format=json&polygon_geojson=1&accept-language=uk&limit=1`
            );
            if (res.ok && res.data && res.data[0] && res.data[0].geojson) {
              geojson = res.data[0].geojson;
              localStorage.setItem(cacheKey, JSON.stringify(geojson));
            }
          }

          if (geojson && isMounted && hromadasLayerGroupRef.current) {
            const layer = L.geoJSON(geojson, {
              pane: 'boundariesPane',
              style: {
                className: 'clean-hromada-outline',
                color: '#374151',        // Dark gray demarcation line (Slate 700)
                weight: 1.4,             // Crisp thin boundary stroke
                dashArray: '4, 4',       // Dashed border line for communities
                opacity: 0.85,           // Clear dark gray visibility
                fill: true,
                fillColor: '#4b5563',    // Dark gray tint
                fillOpacity: 0.02,       // Very faint transparent fill
                interactive: false,      // Clicks pass through to map
              } as L.PathOptions
            });
            layer.addTo(hromadasLayerGroupRef.current);
            // Ensure District & City outlines stay on top of hromada lines
            bringDistrictAndCityToFront();
          }
        } catch (err) {
          console.error('Error loading hromada boundary:', item.id, err);
        }
      }
      if (isMounted) {
        bringDistrictAndCityToFront();
      }
    };

    loadHromadaBoundaries();

    return () => {
      isMounted = false;
      if (hromadasLayerGroupRef.current) {
        hromadasLayerGroupRef.current.clearLayers();
      }
    };
  }, [showHromadaBoundaries, isMapReady]);

  // Synchronize Measurement Tool Graphics on Map (Multi-Track & Multi-City Support)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove layers for deleted tracks
    const existingTrackIds = new Set(measureTracks.map((t) => t.id));
    Object.keys(measureTrackLayersRef.current).forEach((trackId) => {
      if (!existingTrackIds.has(trackId)) {
        const layers = measureTrackLayersRef.current[trackId];
        if (layers) {
          if (layers.polyline) layers.polyline.remove();
          layers.markers.forEach((m) => m.remove());
          layers.segmentTooltips.forEach((m) => m.remove());
        }
        delete measureTrackLayersRef.current[trackId];
      }
    });

    // Render or update each track
    measureTracks.forEach((track) => {
      const isActive = track.id === activeTrackId;
      const trackId = track.id;

      // Clear previous layers for this track
      if (measureTrackLayersRef.current[trackId]) {
        const old = measureTrackLayersRef.current[trackId];
        if (old.polyline) old.polyline.remove();
        old.markers.forEach((m) => m.remove());
        old.segmentTooltips.forEach((m) => m.remove());
      }

      measureTrackLayersRef.current[trackId] = {
        markers: [],
        segmentTooltips: [],
      };

      const points = track.points;
      if (points.length === 0) return;

      const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);

      // Draw connecting polyline
      if (latLngs.length >= 2) {
        const polyline = L.polyline(latLngs, {
          color: track.color || '#facc15',
          weight: isActive ? 4 : 3,
          dashArray: isActive ? '6, 6' : '4, 4',
          opacity: isActive ? 0.95 : 0.7,
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'drawnLinesPane',
        }).addTo(map);

        polyline.on('click', (e: any) => {
          if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
          setActiveTrackId(trackId);
        });

        measureTrackLayersRef.current[trackId].polyline = polyline;

        // Render segment distance badges
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const dist = calculateDistanceMeters(p1, p2);
          const midLat = (p1.lat + p2.lat) / 2;
          const midLng = (p1.lng + p2.lng) / 2;

          const badgeHtml = `<div class="bg-slate-900/95 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full border shadow-md whitespace-nowrap" style="color: ${track.color}; border-color: ${track.color}80">${formatDistance(dist)}</div>`;

          const badgeIcon = L.divIcon({
            className: 'measure-badge-icon',
            html: badgeHtml,
            iconSize: [60, 20],
            iconAnchor: [30, 10],
          });

          const badgeMarker = L.marker([midLat, midLng], {
            icon: badgeIcon,
            interactive: false,
            pane: 'userMarkersPane',
            zIndexOffset: isActive ? 1200 : 1000,
          }).addTo(map);

          measureTrackLayersRef.current[trackId].segmentTooltips.push(badgeMarker);
        }
      }

      // Render node markers
      points.forEach((pt, index) => {
        const isLast = index === points.length - 1;
        const nodeHtml = `
          <div class="measure-node-inner w-6 h-6 rounded-full bg-slate-900 border-2 font-mono font-bold text-[11px] flex items-center justify-center shadow-lg hover:scale-110 transition-transform ${isActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} select-none" style="color: ${track.color}; border-color: ${track.color}; ${isLast && isActive ? `box-shadow: 0 0 0 4px ${track.color}40;` : ''}" title="${track.name} - ${language === 'uk' ? `Точка ${index + 1}` : `Point ${index + 1}`}">
            ${index + 1}
          </div>
        `;

        const nodeIcon = L.divIcon({
          className: 'measure-node-icon cursor-grab',
          html: nodeHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([pt.lat, pt.lng], {
          icon: nodeIcon,
          interactive: true,
          draggable: isActive,
          zIndexOffset: (isActive ? 1500 : 1300) + index,
        }).addTo(map);

        // Stop clicks from bubbling to map
        marker.on('click', (e: any) => {
          if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
          if (!isActive) {
            setActiveTrackId(trackId);
          }
        });
        marker.on('mousedown', (e: any) => {
          if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
          if (!isActive) {
            setActiveTrackId(trackId);
          }
        });

        if (isActive) {
          marker.on('dragstart', (e: any) => {
            if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
            marker.closePopup();
          });

          marker.on('drag', () => {
            const trackLayers = measureTrackLayersRef.current[trackId];
            if (!trackLayers) return;
            const curLatLngs = trackLayers.markers.map((m) => m.getLatLng());
            if (trackLayers.polyline) {
              trackLayers.polyline.setLatLngs(curLatLngs);
            }

            // Live update segment badge before (index - 1)
            if (index > 0 && trackLayers.segmentTooltips[index - 1]) {
              const prevPos = trackLayers.markers[index - 1].getLatLng();
              const curPos = marker.getLatLng();
              const dist = calculateDistanceMeters(
                { lat: prevPos.lat, lng: prevPos.lng },
                { lat: curPos.lat, lng: curPos.lng }
              );
              const mid = L.latLng((prevPos.lat + curPos.lat) / 2, (prevPos.lng + curPos.lng) / 2);
              trackLayers.segmentTooltips[index - 1].setLatLng(mid);
              const el = trackLayers.segmentTooltips[index - 1].getElement();
              if (el) {
                const inner = el.querySelector('div');
                if (inner) inner.textContent = formatDistance(dist);
              }
            }

            // Live update segment badge after (index)
            if (index < trackLayers.markers.length - 1 && trackLayers.segmentTooltips[index]) {
              const nextPos = trackLayers.markers[index + 1].getLatLng();
              const curPos = marker.getLatLng();
              const dist = calculateDistanceMeters(
                { lat: curPos.lat, lng: curPos.lng },
                { lat: nextPos.lat, lng: nextPos.lng }
              );
              const mid = L.latLng((curPos.lat + nextPos.lat) / 2, (curPos.lng + nextPos.lng) / 2);
              trackLayers.segmentTooltips[index].setLatLng(mid);
              const el = trackLayers.segmentTooltips[index].getElement();
              if (el) {
                const inner = el.querySelector('div');
                if (inner) inner.textContent = formatDistance(dist);
              }
            }
          });

          marker.on('dragend', () => {
            const newPos = marker.getLatLng();
            setMeasureTracks((prev) =>
              prev.map((t) => {
                if (t.id === trackId) {
                  const nextPts = [...t.points];
                  if (nextPts[index]) {
                    nextPts[index] = { lat: newPos.lat, lng: newPos.lng };
                  }
                  return { ...t, points: nextPts };
                }
                return t;
              })
            );
          });

          // Right-click to instantly delete this point
          marker.on('contextmenu', (e: any) => {
            if (e.originalEvent) {
              L.DomEvent.stopPropagation(e.originalEvent);
              L.DomEvent.preventDefault(e.originalEvent);
            }
            setMeasureTracks((prev) =>
              prev.map((t) => (t.id === trackId ? { ...t, points: t.points.filter((_, i) => i !== index) } : t))
            );
          });

          // Double-click to delete point
          marker.on('dblclick', (e: any) => {
            if (e.originalEvent) {
              L.DomEvent.stopPropagation(e.originalEvent);
              L.DomEvent.preventDefault(e.originalEvent);
            }
            setMeasureTracks((prev) =>
              prev.map((t) => (t.id === trackId ? { ...t, points: t.points.filter((_, i) => i !== index) } : t))
            );
          });

          // Interactive popup with coordinate info and delete button
          const popupEl = document.createElement('div');
          popupEl.className = 'p-1 text-center select-none font-sans min-w-[140px]';
          popupEl.innerHTML = `
            <div class="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-200">
              <span class="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span class="w-4 h-4 rounded-full text-slate-950 text-[10px] font-mono font-black flex items-center justify-center" style="background: ${track.color};">${index + 1}</span>
                <span>${track.name} (${language === 'uk' ? `Точка №${index + 1}` : `Point #${index + 1}`})</span>
              </span>
            </div>
            <div class="text-[10px] text-slate-500 font-mono mb-1">
              ${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}
            </div>
            <div class="text-[10px] text-amber-600 font-medium mb-2">
              ${language === 'uk' ? '✋ Перетягуйте для зміни' : '✋ Drag to move'}
            </div>
            <button type="button" class="del-ruler-pt-btn w-full py-1.5 px-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95">
              <span>🗑️</span>
              <span>${language === 'uk' ? 'Видалити точку' : 'Delete Point'}</span>
            </button>
          `;

          const delBtn = popupEl.querySelector('.del-ruler-pt-btn');
          if (delBtn) {
            delBtn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              map.closePopup();
              setMeasureTracks((prev) =>
                prev.map((t) => (t.id === trackId ? { ...t, points: t.points.filter((_, i) => i !== index) } : t))
              );
            });
          }

          marker.bindPopup(popupEl, {
            offset: [0, -12],
            closeButton: true,
            className: 'measure-point-popup',
          });
        }

        measureTrackLayersRef.current[trackId].markers.push(marker);
      });
    });
  }, [measureTracks, activeTrackId, isMapReady, language]);


  // Handle Tile Layer changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    // Remove existing tile layer if any
    if (tileLayerInstanceRef.current) {
      map.removeLayer(tileLayerInstanceRef.current);
      tileLayerInstanceRef.current = null;
    }
    if (tileOverlayInstanceRef.current) {
      map.removeLayer(tileOverlayInstanceRef.current);
      tileOverlayInstanceRef.current = null;
    }

    // Format tile URL and retina parameters
    let url = activeTileLayer.url;
    if (activeTileLayer.requiresKey) {
      url = url.replace('{key}', visicomKey || '');
    }
    if (url.includes('{r}')) {
      url = url.replace('{r}', L.Browser.retina ? '@2x' : '');
    }

    // Create Leaflet TileLayer with crisp 1:1 pixel rendering
    const tileLayer = L.tileLayer(url, {
      tms: activeTileLayer.tms,
      maxZoom: activeTileLayer.maxZoom,
      maxNativeZoom: activeTileLayer.maxZoom || 19,
      attribution: activeTileLayer.attribution,
      subdomains: activeTileLayer.subdomains || 'abc',
      crossOrigin: 'anonymous',
      detectRetina: false, // Prevent artificial 200% scale stretching that blurs non-retina raster tiles
      tileSize: 256,
      keepBuffer: 6,
      updateWhenIdle: false,
      updateWhenZooming: false,
    });

    tileLayer.addTo(map);
    tileLayerInstanceRef.current = tileLayer;

    // Optional reference overlay layer (e.g. Ukrainian settlement names and roads overlay)
    if (activeTileLayer.overlayUrl) {
      let overlayUrl = activeTileLayer.overlayUrl;
      if (overlayUrl.includes('{r}')) {
        overlayUrl = overlayUrl.replace('{r}', L.Browser.retina ? '@2x' : '');
      }
      const overlayLayer = L.tileLayer(overlayUrl, {
        maxZoom: activeTileLayer.maxZoom,
        maxNativeZoom: activeTileLayer.maxZoom || 19,
        subdomains: activeTileLayer.subdomains || 'abc',
        crossOrigin: 'anonymous',
        detectRetina: false,
        tileSize: 256,
        keepBuffer: 6,
        zIndex: 250, // Render on top of base tiles
      });
      overlayLayer.addTo(map);
      tileOverlayInstanceRef.current = overlayLayer;
    }

    // Force tile layer redraw and map size update immediately
    map.invalidateSize();
    tileLayer.redraw();
  }, [activeTileLayer, visicomKey, isMapReady]);

  // Handle Theme changes & recalculate map layout
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    const timer = setTimeout(() => {
      map.invalidateSize();
      if (tileLayerInstanceRef.current) {
        tileLayerInstanceRef.current.redraw();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [theme, isMapReady]);

  // Synchronize Markers (Add, Update, Remove)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Identify and remove deleted markers, lines, and handles
    const currentMarkerIds = new Set(markers.map((m) => m.id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentMarkerIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];

        if (linesRef.current[id]) {
          linesRef.current[id].remove();
          delete linesRef.current[id];
        }
        if (endMarkersRef.current[id]) {
          endMarkersRef.current[id].remove();
          delete endMarkersRef.current[id];
        }
      }
    });

    // Clean up auto-highlighted zones for markers that were deleted
    const validMarkerIds = new Set<string>();
    markers.forEach((m) => {
      validMarkerIds.add(m.id);
      validMarkerIds.add(`${m.id}_end`);
    });

    setSearchedAreas((prev) => {
      const filtered = prev.filter((a) => {
        if (a.markerId) {
          return validMarkerIds.has(a.markerId);
        }
        if (a.id.startsWith('autozone_marker_')) {
          const mId = a.id.replace('autozone_marker_', '');
          return validMarkerIds.has(mId);
        }
        return true;
      });
      if (filtered.length === prev.length) return prev;
      return filtered;
    });

    // 2. Add or update current markers
    markers.forEach((markerData) => {
      const { 
        id, lat, lng, title, color, borderColor, endPointStyle, size, rotation, 
        iconType, draggable, labelVisible, customIconUrl, hasZone, zoneColor, zoneSize,
        endLat, endLng, labelFontSize, labelOrientation
      } = markerData;
      const isSelected = id === selectedMarkerId;

      // Generate the custom HTML/SVG string
      const htmlContent = createMarkerHtml(
        title,
        color,
        size,
        rotation,
        iconType,
        labelVisible,
        isSelected,
        customIconUrl,
        borderColor || '#ffffff',
        endPointStyle || 'none',
        hasZone,
        zoneColor,
        zoneSize,
        labelFontSize,
        labelOrientation
      );

      // Create a Leaflet custom DivIcon
      const customIcon = L.divIcon({
        className: 'custom-leaflet-div-icon', // remove default white box
        html: htmlContent,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2], // center of the icon
      });

      const existingMarker = markersRef.current[id];
      let markerInstance: L.Marker;

      if (existingMarker) {
        const isDragging = (existingMarker as any)._isDragging || (existingMarker.dragging as any)?._draggable?._moving;
        if (!isDragging) {
          existingMarker.setLatLng([lat, lng]);
          existingMarker.setIcon(customIcon);
        }
        if (draggable) {
          existingMarker.dragging?.enable();
        } else {
          existingMarker.dragging?.disable();
        }
        if (isSelected) {
          existingMarker.setZIndexOffset(1000);
        } else {
          existingMarker.setZIndexOffset(0);
        }
        markerInstance = existingMarker;
      } else {
        const newMarker = L.marker([lat, lng], {
          icon: customIcon,
          draggable: draggable,
          pane: 'userMarkersPane',
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(map);

        newMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectMarker(id);
        });

        markersRef.current[id] = newMarker;
        markerInstance = newMarker;

        if (autoHighlightZoneRef.current) {
          handleAutoHighlightZoneAt(lat, lng, id);

          let effectiveTargetEndLat = endLat;
          let effectiveTargetEndLng = endLng;
          if (effectiveTargetEndLat === undefined || effectiveTargetEndLng === undefined) {
            const angleRad = (((rotation || 0)) * Math.PI) / 180;
            effectiveTargetEndLat = lat + Math.cos(angleRad) * 0.003;
            effectiveTargetEndLng = lng + Math.sin(angleRad) * 0.005;
          }
          handleAutoHighlightZoneAt(effectiveTargetEndLat, effectiveTargetEndLng, `${id}_end`);
        }
      }

      // Re-bind drag events dynamically to capture correct markerData variables
      markerInstance.off('dragstart drag dragend');

      const hasEndPoint = endPointStyle && endPointStyle !== 'none';
      const hasEndHandle = isSelected || endPointStyle === 'explosion' || !!markerData.hasZone;
      let dragStartLatLng: L.LatLng | null = null;
      let originalEndLat = endLat;
      let originalEndLng = endLng;

      markerInstance.on('dragstart', (e) => {
        dragStartLatLng = e.target.getLatLng();
        originalEndLat = markerData.endLat;
        originalEndLng = markerData.endLng;
      });

      markerInstance.on('drag', (e) => {
        const currentLatLng = e.target.getLatLng();
        if (hasEndPoint || hasEndHandle) {
          let finalEndLat = originalEndLat;
          let finalEndLng = originalEndLng;
          if (finalEndLat === undefined || finalEndLng === undefined) {
            const angleRad = (rotation * Math.PI) / 180;
            finalEndLat = lat + Math.cos(angleRad) * 0.003;
            finalEndLng = lng + Math.sin(angleRad) * 0.005;
          }
          if (dragStartLatLng) {
            const dLat = currentLatLng.lat - dragStartLatLng.lat;
            const dLng = currentLatLng.lng - dragStartLatLng.lng;
            const tempEndLat = finalEndLat + dLat;
            const tempEndLng = finalEndLng + dLng;
            if (hasEndPoint && linesRef.current[id]) {
              linesRef.current[id].setLatLngs([[currentLatLng.lat, currentLatLng.lng], [tempEndLat, tempEndLng]]);
            }
            if (endMarkersRef.current[id]) {
              endMarkersRef.current[id].setLatLng([tempEndLat, tempEndLng]);
            }
          }
        }
      });

      markerInstance.on('dragend', (e) => {
        const position = e.target.getLatLng();
        let updatedEndLat: number | undefined;
        let updatedEndLng: number | undefined;

        if ((hasEndPoint || hasEndHandle) && dragStartLatLng) {
          let finalEndLat = originalEndLat;
          let finalEndLng = originalEndLng;
          if (finalEndLat === undefined || finalEndLng === undefined) {
            const angleRad = (rotation * Math.PI) / 180;
            finalEndLat = lat + Math.cos(angleRad) * 0.003;
            finalEndLng = lng + Math.sin(angleRad) * 0.005;
          }
          const dLat = position.lat - dragStartLatLng.lat;
          const dLng = position.lng - dragStartLatLng.lng;
          updatedEndLat = finalEndLat + dLat;
          updatedEndLng = finalEndLng + dLng;

          if (onUpdateMarker) {
            onUpdateMarker({
              ...markerData,
              lat: position.lat,
              lng: position.lng,
              endLat: updatedEndLat,
              endLng: updatedEndLng,
            });
          } else {
            onUpdateMarkerPosition(id, position.lat, position.lng);
          }
        } else {
          // Even if the endpoint line is currently disabled ('none'), keep endLat and endLng updated
          // so that if the user toggles the line back on, it points correctly relative to the new position!
          if (onUpdateMarker) {
            updatedEndLat = originalEndLat;
            updatedEndLng = originalEndLng;
            if (updatedEndLat !== undefined && updatedEndLng !== undefined && dragStartLatLng) {
              const dLat = position.lat - dragStartLatLng.lat;
              const dLng = position.lng - dragStartLatLng.lng;
              updatedEndLat = updatedEndLat + dLat;
              updatedEndLng = updatedEndLng + dLng;
            } else {
              // Calculate default offset end position if none exists
              const angleRad = (rotation * Math.PI) / 180;
              updatedEndLat = position.lat + Math.cos(angleRad) * 0.003;
              updatedEndLng = position.lng + Math.sin(angleRad) * 0.005;
            }
            onUpdateMarker({
              ...markerData,
              lat: position.lat,
              lng: position.lng,
              endLat: updatedEndLat,
              endLng: updatedEndLng,
            });
          } else {
            onUpdateMarkerPosition(id, position.lat, position.lng);
          }
        }

        let effectiveTargetEndLat = updatedEndLat;
        let effectiveTargetEndLng = updatedEndLng;
        if (effectiveTargetEndLat === undefined || effectiveTargetEndLng === undefined) {
          const angleRad = (rotation * Math.PI) / 180;
          effectiveTargetEndLat = position.lat + Math.cos(angleRad) * 0.003;
          effectiveTargetEndLng = position.lng + Math.sin(angleRad) * 0.005;
        }

        if (autoHighlightZoneRef.current) {
          handleAutoHighlightZoneAt(position.lat, position.lng, id);
          if (hasEndPoint || hasEndHandle) {
            handleAutoHighlightZoneAt(effectiveTargetEndLat, effectiveTargetEndLng, `${id}_end`);
          }
        } else {
          const hasExistingZone = searchedAreasRef.current.some((a) => a.markerId === id || a.id === `autozone_marker_${id}`);
          if (hasExistingZone) {
            handleAutoHighlightZoneAt(position.lat, position.lng, id);
          }
          const hasExistingEndZone = searchedAreasRef.current.some((a) => a.markerId === `${id}_end` || a.id === `autozone_marker_${id}_end`);
          if (hasExistingEndZone && (hasEndPoint || hasEndHandle)) {
            handleAutoHighlightZoneAt(effectiveTargetEndLat, effectiveTargetEndLng, `${id}_end`);
          }
        }
      });

      // Render line if should draw line
      if (hasEndPoint) {
        let finalEndLat = endLat;
        let finalEndLng = endLng;

        if (finalEndLat === undefined || finalEndLng === undefined) {
          const angleRad = (rotation * Math.PI) / 180;
          finalEndLat = lat + Math.cos(angleRad) * 0.003;
          finalEndLng = lng + Math.sin(angleRad) * 0.005;
        }

        const lineCoords: [number, number][] = [[lat, lng], [finalEndLat, finalEndLng]];
        const polylineColor = color === 'transparent' || color === 'none' ? '#ef4444' : color;
        const lineStyle = {
          color: polylineColor,
          weight: markerData.lineWidth !== undefined ? markerData.lineWidth : 3,
          dashArray: '10, 5, 2, 5', // Dash-dotted style ("штрих пунктир")
          opacity: isSelected ? 0.95 : 0.6,
          pane: 'drawnLinesPane',
        };

        if (linesRef.current[id]) {
          linesRef.current[id].setLatLngs(lineCoords);
          linesRef.current[id].setStyle(lineStyle);
        } else {
          linesRef.current[id] = L.polyline(lineCoords, lineStyle).addTo(map);
        }
      } else {
        if (linesRef.current[id]) {
          linesRef.current[id].remove();
          delete linesRef.current[id];
        }
      }

      // Render direction control point / handle if hasEndHandle is true
      if (hasEndHandle) {
        let finalEndLat = endLat;
        let finalEndLng = endLng;

        if (finalEndLat === undefined || finalEndLng === undefined) {
          const angleRad = (rotation * Math.PI) / 180;
          finalEndLat = lat + Math.cos(angleRad) * 0.003;
          finalEndLng = lng + Math.sin(angleRad) * 0.005;
        }

        const polylineColor = color === 'transparent' || color === 'none' ? '#ef4444' : color;
        let endMarkerIcon: L.DivIcon;

        if (endPointStyle === 'explosion') {
          const explosionHtml = `
            <div class="flex items-center justify-center" style="
              width: ${size}px;
              height: ${size}px;
              font-size: ${size * 0.95}px;
              line-height: 1;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
              cursor: ${isSelected ? 'move' : 'default'};
            ">
              💥
            </div>
          `;
          endMarkerIcon = L.divIcon({
            className: 'custom-end-explosion',
            html: explosionHtml,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        } else {
          // 'line', 'none', or active zone handle - show clean control dot when selected/active for adjusting direction & zones (excluded from export/screenshots)
          endMarkerIcon = L.divIcon({
            className: 'custom-end-handle screenshot-exclude',
            html: `
              <div class="flex items-center justify-center" style="
                width: 14px;
                height: 14px;
                background: #ffffff;
                border: 3px solid ${polylineColor};
                border-radius: 50%;
                box-shadow: 0 1px 4px rgba(0,0,0,0.5);
                cursor: move;
              "></div>
            `,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
        }

        let endMarkerInstance = endMarkersRef.current[id];

        if (endMarkerInstance) {
          const isEndDragging = (endMarkerInstance as any)._isDragging || (endMarkerInstance.dragging as any)?._draggable?._moving;
          if (!isEndDragging) {
            endMarkerInstance.setLatLng([finalEndLat, finalEndLng]);
            endMarkerInstance.setIcon(endMarkerIcon);
          }
          if (isSelected) {
            endMarkerInstance.dragging?.enable();
          } else {
            endMarkerInstance.dragging?.disable();
          }
          if (!map.hasLayer(endMarkerInstance)) {
            endMarkerInstance.addTo(map);
          }
        } else {
          endMarkerInstance = L.marker([finalEndLat, finalEndLng], {
            icon: endMarkerIcon,
            draggable: isSelected,
            pane: 'userMarkersPane',
            zIndexOffset: 1100,
          }).addTo(map);
          endMarkersRef.current[id] = endMarkerInstance;
        }

        // Re-bind end marker drag events dynamically on every render
        endMarkerInstance.off('drag dragend');

        endMarkerInstance.on('drag', (e) => {
          const endPosition = e.target.getLatLng();
          const dy = endPosition.lat - lat;
          const dx = endPosition.lng - lng;
          let angleDeg = Math.atan2(dx, dy) * (180 / Math.PI);
          if (angleDeg < 0) angleDeg += 360;

          if (linesRef.current[id]) {
            linesRef.current[id].setLatLngs([[lat, lng], [endPosition.lat, endPosition.lng]]);
          }

          // Update rotation real-time inside DOM
          const mainMarkerEl = markersRef.current[id]?.getElement();
          if (mainMarkerEl) {
            const rotatingDiv = mainMarkerEl.querySelector('div[style*="transform: rotate"]');
            if (rotatingDiv) {
              (rotatingDiv as HTMLElement).style.transform = `rotate(${angleDeg % 360}deg)`;
            }
          }
        });

        endMarkerInstance.on('dragend', (e) => {
          const endPosition = e.target.getLatLng();
          const dy = endPosition.lat - lat;
          const dx = endPosition.lng - lng;
          let angleDeg = Math.atan2(dx, dy) * (180 / Math.PI);
          if (angleDeg < 0) angleDeg += 360;
          angleDeg = Math.round(angleDeg);

          if (onUpdateMarker) {
            onUpdateMarker({
              ...markerData,
              endLat: endPosition.lat,
              endLng: endPosition.lng,
              rotation: Math.round(angleDeg % 360),
            });
          }

          if (autoHighlightZoneRef.current) {
            handleAutoHighlightZoneAt(endPosition.lat, endPosition.lng, `${id}_end`);
          } else {
            const hasExistingEndZone = searchedAreasRef.current.some((a) => a.markerId === `${id}_end` || a.id === `autozone_marker_${id}_end`);
            if (hasExistingEndZone) {
              handleAutoHighlightZoneAt(endPosition.lat, endPosition.lng, `${id}_end`);
            }
          }
        });
      } else {
        // Remove the end marker from map if it shouldn't be shown
        if (endMarkersRef.current[id]) {
          endMarkersRef.current[id].remove();
          delete endMarkersRef.current[id];
        }
      }
    });

    // Clean up unused lines and end markers
    Object.keys(linesRef.current).forEach((id) => {
      const marker = markers.find((m) => m.id === id);
      const hasEndPoint = marker && marker.endPointStyle && marker.endPointStyle !== 'none';
      if (!hasEndPoint) {
        if (linesRef.current[id]) {
          linesRef.current[id].remove();
          delete linesRef.current[id];
        }
      }
    });

    Object.keys(endMarkersRef.current).forEach((id) => {
      const marker = markers.find((m) => m.id === id);
      const isSelected = id === selectedMarkerId;
      const hasEndHandle = marker && (
        isSelected ||
        (marker.endPointStyle && marker.endPointStyle !== 'none') ||
        !!marker.hasZone
      );
      if (!hasEndHandle) {
        if (endMarkersRef.current[id]) {
          endMarkersRef.current[id].remove();
          delete endMarkersRef.current[id];
        }
      }
    });
  }, [markers, selectedMarkerId, onSelectMarker, onUpdateMarkerPosition, onUpdateMarker, isMapReady]);

  // Render drawn lines on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    // Remove existing line layers that are no longer in drawnLines
    const activeLineIds = new Set(drawnLines.map((l) => l.id));
    Object.keys(drawnLineLayersRef.current).forEach((id) => {
      if (!activeLineIds.has(id)) {
        const layers = drawnLineLayersRef.current[id];
        if (layers.polyline) layers.polyline.remove();
        if (layers.halo) layers.halo.remove();
        if (layers.startMarker) layers.startMarker.remove();
        if (layers.endMarker) layers.endMarker.remove();
        if (layers.fadingPolylines) layers.fadingPolylines.forEach((p) => p.remove());
        if (layers.vertexMarkers) layers.vertexMarkers.forEach((m) => m.remove());
        delete drawnLineLayersRef.current[id];
      }
    });

    // Render each line
    drawnLines.forEach((line) => {
      if (!line.points || line.points.length < 2) return;

      const isSelected = selectedLineId === line.id;

      // Smooth points if line.smoothed is true
      const displayPoints: [number, number][] = line.smoothed
        ? smoothPolylinePoints(line.points, 4)
        : line.points;

      // Dash style
      let dashArray: string | undefined = undefined;
      if (line.dashStyle === 'dashed') dashArray = '12, 8';
      if (line.dashStyle === 'dotted') dashArray = '3, 6';

      let existing = drawnLineLayersRef.current[line.id];
      if (!existing) {
        existing = {};
        drawnLineLayersRef.current[line.id] = existing;
      }

      // 1. Selection Halo
      if (isSelected) {
        if (!existing.halo) {
          existing.halo = L.polyline(displayPoints, {
            color: '#3b82f6',
            weight: line.weight + 8,
            opacity: 0.5,
            lineCap: 'round',
            lineJoin: 'round',
            pane: 'drawnLinesPane',
          }).addTo(map);
        } else {
          existing.halo.setLatLngs(displayPoints);
          existing.halo.setStyle({ weight: line.weight + 8 });
        }
      } else if (existing.halo) {
        existing.halo.remove();
        existing.halo = undefined;
      }

      // 2. Main polyline / Fading segments
      const isFadeStart = line.startPointStyle === 'fade';
      const isFadeEnd = line.endPointStyle === 'fade';

      if (isFadeStart || isFadeEnd) {
        if (existing.polyline) {
          existing.polyline.remove();
          existing.polyline = undefined;
        }

        if (existing.fadingPolylines) {
          existing.fadingPolylines.forEach((p) => p.remove());
        }

        const fadingSegments = generateFadingPolylineSegments(
          displayPoints,
          isFadeStart,
          isFadeEnd,
          0.9,
          30
        );

        existing.fadingPolylines = fadingSegments.map((seg) => {
          const poly = L.polyline(seg.points, {
            color: line.color,
            weight: line.weight,
            opacity: seg.opacity,
            dashArray: dashArray,
            lineCap: 'butt',
            lineJoin: 'round',
            pane: 'drawnLinesPane',
          }).addTo(map);

          poly.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            onSelectLine(line.id);
          });

          return poly;
        });
      } else {
        if (existing.fadingPolylines) {
          existing.fadingPolylines.forEach((p) => p.remove());
          existing.fadingPolylines = undefined;
        }

        if (!existing.polyline) {
          existing.polyline = L.polyline(displayPoints, {
            color: line.color,
            weight: line.weight,
            opacity: 0.9,
            dashArray: dashArray,
            lineCap: 'round',
            lineJoin: 'round',
            pane: 'drawnLinesPane',
          }).addTo(map);

          existing.polyline.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            onSelectLine(line.id);
          });
        } else {
          existing.polyline.setLatLngs(displayPoints);
          existing.polyline.setStyle({
            color: line.color,
            weight: line.weight,
            opacity: 0.9,
            dashArray: dashArray,
          });
        }
      }

      // 3. Endpoint markers
      const createEndpointIcon = (
        style: LineEndpointType,
        customIconUrl: string,
        p1: [number, number],
        p2: [number, number],
        isEnd: boolean
      ): L.DivIcon | null => {
        if (style === 'none' || style === 'fade') return null;
        const rotOffset = isEnd ? (line.endIconRotation || 0) : (line.startIconRotation || 0);
        const bearing = calculateBearing(p1, p2) + rotOffset;
        const explicitSize = isEnd ? line.endIconSize : line.startIconSize;

        if (style === 'explosion') {
          return createExplosionIcon(line.color, line.weight, explicitSize);
        }
        if (style === 'custom_icon') {
          return createCustomImageIcon(customIconUrl || '', line.color, line.weight, bearing, explicitSize);
        }
        if (style === 'arrow') {
          return createArrowIcon(line.color, bearing, line.weight, explicitSize);
        }
        if (style === 'dot') {
          return createDotIcon(line.color, line.weight, explicitSize);
        }
        return null;
      };

      const startCoord = displayPoints[0];
      const secondCoord = displayPoints[1] || startCoord;

      const endCoord = displayPoints[displayPoints.length - 1];
      const prevEndCoord = displayPoints[displayPoints.length - 2] || endCoord;

      // Start Marker
      const startIcon = createEndpointIcon(
        line.startPointStyle,
        line.startCustomIconUrl || '',
        startCoord,
        secondCoord,
        false
      );

      if (startIcon) {
        if (!existing.startMarker) {
          existing.startMarker = L.marker(startCoord, {
            icon: startIcon,
            interactive: true,
            pane: 'drawnLinesPane',
            zIndexOffset: 500,
          }).addTo(map);
          existing.startMarker.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            onSelectLine(line.id);
          });
        } else {
          existing.startMarker.setLatLng(startCoord);
          existing.startMarker.setIcon(startIcon);
        }
      } else if (existing.startMarker) {
        existing.startMarker.remove();
        existing.startMarker = undefined;
      }

      // End Marker
      const endIcon = createEndpointIcon(
        line.endPointStyle,
        line.endCustomIconUrl || '',
        prevEndCoord,
        endCoord,
        true
      );

      if (endIcon) {
        if (!existing.endMarker) {
          existing.endMarker = L.marker(endCoord, {
            icon: endIcon,
            interactive: true,
            pane: 'drawnLinesPane',
            zIndexOffset: 500,
          }).addTo(map);
          existing.endMarker.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            onSelectLine(line.id);
          });
        } else {
          existing.endMarker.setLatLng(endCoord);
          existing.endMarker.setIcon(endIcon);
        }
      } else if (existing.endMarker) {
        existing.endMarker.remove();
        existing.endMarker = undefined;
      }

      // 4. Vertex Editing Handles (shown ONLY when line is selected AND line drawing mode is active)
      if (isSelected && interactionMode === 'line') {
        if (existing.vertexMarkers) {
          existing.vertexMarkers.forEach((m) => m.remove());
        }
        existing.vertexMarkers = [];

        line.points.forEach((pt, idx) => {
          const isStartNode = idx === 0;
          const isEndNode = idx === line.points.length - 1;
          const ringColor = isStartNode ? '#10b981' : isEndNode ? '#f59e0b' : '#3b82f6';

          const handleIcon = L.divIcon({
            className: 'line-vertex-edit-handle screenshot-exclude',
            html: `
              <div class="relative flex items-center justify-center cursor-grab active:cursor-grabbing group">
                <div class="w-4 h-4 rounded-full bg-white border-2 shadow-lg transition-transform group-hover:scale-125 flex items-center justify-center" style="border-color: ${ringColor};">
                  <div class="w-1.5 h-1.5 rounded-full" style="background-color: ${ringColor};"></div>
                </div>
              </div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

          const marker = L.marker(pt, {
            icon: handleIcon,
            draggable: true,
            pane: 'drawnLinesPane',
            zIndexOffset: 1200,
          }).addTo(map);

          marker.on('drag', (e: L.LeafletEvent) => {
            const dragged = e.target as L.Marker;
            const newPos = dragged.getLatLng();
            const tempPoints = [...line.points];
            tempPoints[idx] = [newPos.lat, newPos.lng];

            const tempDisplay = line.smoothed
              ? smoothPolylinePoints(tempPoints, 4)
              : tempPoints;

            if (existing.halo) {
              existing.halo.setLatLngs(tempDisplay);
            }
            if (existing.polyline) {
              existing.polyline.setLatLngs(tempDisplay);
            }
            if (existing.fadingPolylines) {
              const tempFading = generateFadingPolylineSegments(
                tempDisplay,
                line.startPointStyle === 'fade',
                line.endPointStyle === 'fade',
                0.9
              );
              existing.fadingPolylines.forEach((p, pIdx) => {
                if (tempFading[pIdx]) {
                  p.setLatLngs(tempFading[pIdx].points);
                }
              });
            }
          });

          marker.on('dragend', (e: L.LeafletEvent) => {
            const dragged = e.target as L.Marker;
            const newPos = dragged.getLatLng();
            const updatedPoints = [...line.points];
            updatedPoints[idx] = [newPos.lat, newPos.lng];
            onUpdateDrawnLine({ ...line, points: updatedPoints });
          });

          marker.on('contextmenu', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            if (line.points.length > 2) {
              const updatedPoints = line.points.filter((_, i) => i !== idx);
              onUpdateDrawnLine({ ...line, points: updatedPoints });
            }
          });

          existing.vertexMarkers.push(marker);
        });
      } else if (existing.vertexMarkers) {
        existing.vertexMarkers.forEach((m) => m.remove());
        existing.vertexMarkers = undefined;
      }
    });
  }, [drawnLines, selectedLineId, interactionMode, onSelectLine, onUpdateDrawnLine, isMapReady]);

  // Render current draft line being drawn
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    const layers = draftLineLayerRef.current;

    // Clear node markers
    layers.nodeMarkers.forEach((m) => m.remove());
    layers.nodeMarkers = [];

    if (draftLinePoints.length === 0 || interactionMode !== 'line') {
      if (layers.polyline) {
        layers.polyline.remove();
        layers.polyline = undefined;
      }
      if (layers.fadingPolylines) {
        layers.fadingPolylines.forEach((p) => p.remove());
        layers.fadingPolylines = undefined;
      }
      if (layers.startMarker) {
        layers.startMarker.remove();
        layers.startMarker = undefined;
      }
      if (layers.endMarker) {
        layers.endMarker.remove();
        layers.endMarker = undefined;
      }
      return;
    }

    const displayPoints: [number, number][] =
      lineSmoothed && draftLinePoints.length >= 3
        ? smoothPolylinePoints(draftLinePoints, 4)
        : draftLinePoints;

    // Dash style
    let dashArray: string | undefined = undefined;
    if (lineDashStyle === 'dashed') dashArray = '12, 8';
    if (lineDashStyle === 'dotted') dashArray = '3, 6';

    const isFadeStart = lineStartStyle === 'fade';
    const isFadeEnd = lineEndStyle === 'fade';

    if (isFadeStart || isFadeEnd) {
      if (layers.polyline) {
        layers.polyline.remove();
        layers.polyline = undefined;
      }
      if (layers.fadingPolylines) {
        layers.fadingPolylines.forEach((p) => p.remove());
      }

      const fadingSegments = generateFadingPolylineSegments(
        displayPoints,
        isFadeStart,
        isFadeEnd,
        0.85,
        30
      );

      layers.fadingPolylines = fadingSegments.map((seg) =>
        L.polyline(seg.points, {
          color: lineColor,
          weight: lineWeight,
          opacity: seg.opacity,
          dashArray: dashArray,
          lineCap: 'butt',
          lineJoin: 'round',
          pane: 'drawnLinesPane',
        }).addTo(map)
      );
    } else {
      if (layers.fadingPolylines) {
        layers.fadingPolylines.forEach((p) => p.remove());
        layers.fadingPolylines = undefined;
      }

      if (!layers.polyline) {
        layers.polyline = L.polyline(displayPoints, {
          color: lineColor,
          weight: lineWeight,
          dashArray: dashArray,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'drawnLinesPane',
        }).addTo(map);
      } else {
        layers.polyline.setLatLngs(displayPoints);
        layers.polyline.setStyle({
          color: lineColor,
          weight: lineWeight,
          dashArray: dashArray,
        });
      }
    }

    // Render node markers at raw points (draggable and editable during draft drawing)
    draftLinePoints.forEach((pt, idx) => {
      const isStartNode = idx === 0;
      const isEndNode = idx === draftLinePoints.length - 1;

      const ringColor = isStartNode ? '#10b981' : isEndNode ? '#f59e0b' : '#3b82f6';

      const nodeIcon = L.divIcon({
        className: 'draft-line-node screenshot-exclude',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; margin-left: -18px; margin-top: -18px; cursor: grab; touch-action: none;" title="${language === 'uk' ? 'Перетягніть для зсуву точки, ПКМ — видалити' : 'Drag to move vertex, Right click to remove'}">
            <div style="background-color: #ffffff; border: 3px solid ${ringColor}; width: 16px; height: 16px; border-radius: 9999px; box-shadow: 0 2px 8px rgba(0,0,0,0.5); transition: transform 0.15s ease;"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(pt, {
        icon: nodeIcon,
        draggable: true,
        interactive: true,
        pane: 'drawnLinesPane',
        zIndexOffset: 1500,
      }).addTo(map);

      marker.on('drag', (e: L.LeafletEvent) => {
        const dragged = e.target as L.Marker;
        const newPos = dragged.getLatLng();
        if (layers.polyline) {
          const latLngs = layers.polyline.getLatLngs() as L.LatLng[];
          if (latLngs[idx]) {
            latLngs[idx] = newPos;
            layers.polyline.setLatLngs(latLngs);
          }
        }
      });

      marker.on('dragend', (e: L.LeafletEvent) => {
        const dragged = e.target as L.Marker;
        const newPos = dragged.getLatLng();
        setDraftLinePoints((prev) => {
          const next = [...prev];
          if (next[idx]) next[idx] = [newPos.lat, newPos.lng];
          return next;
        });
      });

      marker.on('contextmenu', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        setDraftLinePoints((prev) => prev.filter((_, i) => i !== idx));
      });

      layers.nodeMarkers.push(marker);
    });

    // Start & End Endpoint Markers on draft line
    if (displayPoints.length >= 2) {
      const startCoord = displayPoints[0];
      const secondCoord = displayPoints[1] || startCoord;
      const endCoord = displayPoints[displayPoints.length - 1];
      const prevEndCoord = displayPoints[displayPoints.length - 2] || endCoord;

      if (lineStartStyle !== 'none' && lineStartStyle !== 'fade') {
        let startIcon: L.DivIcon | null = null;
        const startBearing = calculateBearing(startCoord, secondCoord) + (lineStartIconRotation || 0);
        if (lineStartStyle === 'explosion') startIcon = createExplosionIcon(lineColor, lineWeight, lineStartIconSize);
        if (lineStartStyle === 'custom_icon') startIcon = createCustomImageIcon(lineStartCustomIcon, lineColor, lineWeight, startBearing, lineStartIconSize);
        if (lineStartStyle === 'arrow') startIcon = createArrowIcon(lineColor, startBearing, lineWeight, lineStartIconSize);
        if (lineStartStyle === 'dot') startIcon = createDotIcon(lineColor, lineWeight, lineStartIconSize);

        if (startIcon) {
          if (!layers.startMarker) {
            layers.startMarker = L.marker(startCoord, { icon: startIcon, interactive: false, pane: 'drawnLinesPane' }).addTo(map);
          } else {
            layers.startMarker.setLatLng(startCoord);
            layers.startMarker.setIcon(startIcon);
          }
        }
      } else if (layers.startMarker) {
        layers.startMarker.remove();
        layers.startMarker = undefined;
      }

      if (lineEndStyle !== 'none' && lineEndStyle !== 'fade') {
        let endIcon: L.DivIcon | null = null;
        const endBearing = calculateBearing(prevEndCoord, endCoord) + (lineEndIconRotation || 0);
        if (lineEndStyle === 'explosion') endIcon = createExplosionIcon(lineColor, lineWeight, lineEndIconSize);
        if (lineEndStyle === 'custom_icon') endIcon = createCustomImageIcon(lineEndCustomIcon, lineColor, lineWeight, endBearing, lineEndIconSize);
        if (lineEndStyle === 'arrow') endIcon = createArrowIcon(lineColor, endBearing, lineWeight, lineEndIconSize);
        if (lineEndStyle === 'dot') endIcon = createDotIcon(lineColor, lineWeight, lineEndIconSize);

        if (endIcon) {
          if (!layers.endMarker) {
            layers.endMarker = L.marker(endCoord, { icon: endIcon, interactive: false, pane: 'drawnLinesPane' }).addTo(map);
          } else {
            layers.endMarker.setLatLng(endCoord);
            layers.endMarker.setIcon(endIcon);
          }
        }
      } else if (layers.endMarker) {
        layers.endMarker.remove();
        layers.endMarker = undefined;
      }
    }
  }, [
    draftLinePoints,
    lineColor,
    lineWeight,
    lineSmoothed,
    lineDashStyle,
    lineStartStyle,
    lineStartCustomIcon,
    lineStartIconRotation,
    lineEndStyle,
    lineEndCustomIcon,
    lineEndIconRotation,
    interactionMode,
    isMapReady,
  ]);

  // Clear draft line points when leaving line drawing mode
  useEffect(() => {
    if (interactionMode !== 'line' && draftLinePoints.length > 0) {
      setDraftLinePoints([]);
    }
  }, [interactionMode, draftLinePoints.length]);

  // Keyboard shortcut listener for line drawing & ruler measuring
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (interactionModeRef.current === 'line' && draftLinePoints.length >= 2) {
        if (e.key === 'Enter') {
          handleFinishDraftLine();
        } else if (e.key === 'Escape') {
          setDraftLinePoints([]);
        }
      }

      if (interactionModeRef.current === 'measure' && measurePointsRef.current.length > 0) {
        if (e.key === 'Escape') {
          setMeasurePoints([]);
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          setMeasurePoints((prev) => prev.slice(0, -1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draftLinePoints, handleFinishDraftLine]);

  // Disable doubleClickZoom during line drawing mode to allow double-click line finishing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;
    if (interactionMode === 'line') {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }
  }, [interactionMode, isMapReady]);

  // Keyboard spacebar listener to toggle panning while in freehand line mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        isSpacePressedRef.current = true;
        const map = mapInstanceRef.current;
        if (map && interactionModeRef.current === 'line' && lineDrawMethodRef.current === 'freehand') {
          map.dragging.enable();
          if (mapContainerRef.current) {
            mapContainerRef.current.style.cursor = 'grab';
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        const map = mapInstanceRef.current;
        if (map && interactionModeRef.current === 'line' && lineDrawMethodRef.current === 'freehand') {
          map.dragging.disable();
          if (mapContainerRef.current) {
            mapContainerRef.current.style.cursor = 'crosshair';
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Manage map dragging and touch zooming based on interactionMode and lineDrawMethod
  useEffect(() => {
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    if (!map || !isMapReady) return;

    if (interactionMode === 'line' && lineDrawMethod === 'freehand') {
      map.dragging.disable();
      map.touchZoom.disable();
      if (container) {
        container.style.cursor = 'crosshair';
        container.style.touchAction = 'none';
      }
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      if (container) {
        container.style.cursor = '';
        container.style.touchAction = '';
      }
    }
  }, [interactionMode, lineDrawMethod, isMapReady]);

  // Freehand pointer event listeners on map container
  useEffect(() => {
    const container = mapContainerRef.current;
    const map = mapInstanceRef.current;
    if (!container || !map || !isMapReady) return;

    if (interactionMode !== 'line' || lineDrawMethod !== 'freehand') {
      cleanLiveFreehandLayers();
      return;
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (isSpacePressedRef.current) return;

      const target = e.target as HTMLElement;
      if (
        target.closest('.leaflet-control') ||
        target.closest('.pointer-events-auto') ||
        target.closest('.tactical-logo-container-outer') ||
        target.closest('.leaflet-popup') ||
        target.closest('.leaflet-marker-icon') ||
        target.closest('.measure-node-icon') ||
        target.closest('.draft-line-node') ||
        target.closest('.line-vertex-marker') ||
        target.closest('button') ||
        target.closest('input')
      ) {
        return;
      }

      e.preventDefault();
      isDrawingFreehandRef.current = true;
      freehandPointerIdRef.current = e.pointerId;

      try {
        container.setPointerCapture(e.pointerId);
      } catch {}

      const latlng = map.mouseEventToLatLng(e);
      const startPt: [number, number] = [latlng.lat, latlng.lng];
      freehandRawPointsRef.current = [startPt];
      freehandStartClientRef.current = { x: e.clientX, y: e.clientY };

      renderLiveFreehandPreview([startPt]);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingFreehandRef.current) return;
      if (freehandPointerIdRef.current !== null && e.pointerId !== freehandPointerIdRef.current) return;

      e.preventDefault();
      const latlng = map.mouseEventToLatLng(e);
      const rawPoints = freehandRawPointsRef.current;
      const lastPt = rawPoints[rawPoints.length - 1];

      if (lastPt) {
        const lastPointPix = map.latLngToContainerPoint(L.latLng(lastPt[0], lastPt[1]));
        const currPointPix = map.latLngToContainerPoint(latlng);
        const distSq = (currPointPix.x - lastPointPix.x) ** 2 + (currPointPix.y - lastPointPix.y) ** 2;
        // Jitter filter: 2.5px threshold
        if (distSq < 6.25) {
          return;
        }
      }

      rawPoints.push([latlng.lat, latlng.lng]);
      renderLiveFreehandPreview(rawPoints);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDrawingFreehandRef.current) return;
      if (freehandPointerIdRef.current !== null && e.pointerId !== freehandPointerIdRef.current) return;

      isDrawingFreehandRef.current = false;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}

      const rawPoints = [...freehandRawPointsRef.current];
      freehandRawPointsRef.current = [];
      cleanLiveFreehandLayers();

      const startClient = freehandStartClientRef.current;
      const totalDistPx = startClient ? Math.hypot(e.clientX - startClient.x, e.clientY - startClient.y) : 0;

      if (rawPoints.length >= 2 && totalDistPx >= 8) {
        // Extract clean, compact key control points (6-18 points) instead of saving hundreds of dense raw points!
        // When rendered with smoothed: true, it draws a silky-smooth spline while giving the user only 6-18 comfortable drag handles.
        const controlPoints = extractControlPointsFromFreehand(map, rawPoints, 36, 18);

        const newLine: DrawnLine = {
          id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          points: controlPoints,
          color: lineColorRef.current,
          weight: lineWeightRef.current,
          smoothed: true, // Auto smoothed!
          dashStyle: lineDashStyleRef.current,
          startPointStyle: lineStartStyleRef.current,
          startCustomIconUrl: lineStartCustomIconRef.current,
          startIconRotation: lineStartIconRotationRef.current,
          startIconSize: lineStartIconSizeRef.current,
          endPointStyle: lineEndStyleRef.current,
          endCustomIconUrl: lineEndCustomIconRef.current,
          endIconRotation: lineEndIconRotationRef.current,
          endIconSize: lineEndIconSizeRef.current,
        };

        onAddDrawnLineRef.current(newLine);
        onSelectLineRef.current(newLine.id);

        setJustSmoothedNotice(true);
        if (justSmoothedNoticeTimerRef.current) clearTimeout(justSmoothedNoticeTimerRef.current);
        justSmoothedNoticeTimerRef.current = window.setTimeout(() => {
          setJustSmoothedNotice(false);
        }, 2400);
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (!isDrawingFreehandRef.current) return;
      isDrawingFreehandRef.current = false;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}
      freehandRawPointsRef.current = [];
      cleanLiveFreehandLayers();
    };

    container.addEventListener('pointerdown', onPointerDown, { passive: false });
    container.addEventListener('pointermove', onPointerMove, { passive: false });
    container.addEventListener('pointerup', onPointerUp, { passive: false });
    container.addEventListener('pointercancel', onPointerCancel, { passive: false });

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerCancel);
      cleanLiveFreehandLayers();
    };
  }, [interactionMode, lineDrawMethod, isMapReady, renderLiveFreehandPreview, cleanLiveFreehandLayers]);

  // Center map on selected marker when it changes (or coordinates manual edits)
  const lastSelectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedMarkerId) {
      lastSelectedIdRef.current = selectedMarkerId;
      return;
    }

    // Only auto-pan to marker if the selectedMarkerId actually changed
    if (selectedMarkerId !== lastSelectedIdRef.current) {
      const selectedMarker = markers.find((m) => m.id === selectedMarkerId);
      if (selectedMarker) {
        map.panTo([selectedMarker.lat, selectedMarker.lng], { animate: true });
      }
      lastSelectedIdRef.current = selectedMarkerId;
    }
  }, [selectedMarkerId, markers, isMapReady]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Screenshot / Copy Logic
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [screenshotStatus, setScreenshotStatus] = useState<string | null>(null);

  /**
   * Visicom high-resolution export background.
   *
   * Leaflet displays Visicom as 256x256 raster tiles. Enlarging those tiles
   * cannot recover detail. For export we therefore request Visicom fragments
   * directly. A fragment is a native map image/vector document centred on a
   * coordinate; SVG is used here because it stays sharp when html-to-image
   * rasterizes the final composition at 2-3x.
   *
   * The viewport is split into <=2048px chunks so 4K/ultrawide maps are also
   * supported without stretching a single low-resolution fragment.
   */
  const VISICOM_FRAGMENT_MAX = 2048;

  const getVisicomFragmentBaseUrl = useCallback(() => {
    if (activeTileLayer.id !== 'visicom' || !visicomKey) return null;
    return 'https://tms.visicom.ua/2.0.0/planet3/base';
  }, [activeTileLayer.id, visicomKey]);

  const getFragmentUrl = useCallback((center: L.LatLng, width: number, height: number, dpr = 1) => {
    const base = getVisicomFragmentBaseUrl();
    if (!base) return null;
    const lang = language === 'uk' ? '?lang=uk' : '?lang=en';
    const separator = lang.includes('?') ? '&' : '?';
    const reqWidth = Math.round(width * dpr);
    const reqHeight = Math.round(height * dpr);
    return `${base}/${mapInstanceRef.current?.getZoom() ?? 13}/${center.lng},${center.lat}/${reqWidth}/${reqHeight}.svg${lang}${separator}key=${encodeURIComponent(visicomKey)}`;
  }, [getVisicomFragmentBaseUrl, language, visicomKey]);

  const waitForImageDecode = async (img: HTMLImageElement) => {
    if (!img.complete) {
      await new Promise<void>((resolve) => {
        const done = () => {
          img.removeEventListener('load', done);
          img.removeEventListener('error', done);
          resolve();
        };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    }
    if (typeof img.decode === 'function' && img.complete) {
      await img.decode().catch(() => undefined);
    }
  };

  const installVisicomHQBackground = async (mapElement: HTMLElement, exportScale = 2) => {
    const map = mapInstanceRef.current;
    if (!map || !getVisicomFragmentBaseUrl()) return null;

    const width = Math.max(1, Math.round(mapElement.clientWidth));
    const height = Math.max(1, Math.round(mapElement.clientHeight));
    const zoom = map.getZoom();
    const mapPixelOrigin = map.project(map.getCenter(), zoom);

    const background = document.createElement('div');
    background.className = 'visicom-hq-export-background';
    background.style.position = 'absolute';
    background.style.inset = '0';
    background.style.width = `${width}px`;
    background.style.height = `${height}px`;
    background.style.overflow = 'hidden';
    background.style.pointerEvents = 'none';
    background.style.zIndex = '0';
    background.style.imageRendering = 'auto';
    background.style.transform = 'translateZ(0)';
    background.style.willChange = 'transform';
    if (blurMapOnExport) {
      background.style.filter = 'blur(2px) brightness(0.95) contrast(1.05)';
      background.style.transform = 'scale(1.004)';
    }
    background.setAttribute('aria-hidden', 'true');

    // Keep the original Leaflet map above the temporary background, but hide
    // only its raster tile images. Vector overlays/markers remain available
    // for the final html-to-image capture.
    const tilePane = mapElement.querySelector('.leaflet-tile-pane') as HTMLElement | null;
    const previousTilePaneOpacity = tilePane?.style.opacity ?? '';
    if (tilePane) tilePane.style.opacity = '0';

    const urls: string[] = [];
    const objectUrls: string[] = [];

    // Visicom's fragment endpoint has an official 2048x2048 maximum.
    // Keep the fragment itself at 1:1 CSS pixels and let html-to-image
    // rasterize the SVG at the final export pixel ratio. Requesting
    // 3.5x/4x fragments exceeds the API limit and silently caused the code
    // to fall back to Leaflet's 256px raster tiles — the source of the blur.
    const fragmentDpr = 1;

    try {
      // Build all fragments first, then fetch them concurrently.
      const jobs: Array<{ left: number; top: number; width: number; height: number; url: string }> = [];
      for (let top = 0; top < height; top += VISICOM_FRAGMENT_MAX) {
        for (let left = 0; left < width; left += VISICOM_FRAGMENT_MAX) {
          const fragmentWidth = Math.min(VISICOM_FRAGMENT_MAX, width - left);
          const fragmentHeight = Math.min(VISICOM_FRAGMENT_MAX, height - top);
          const globalX = mapPixelOrigin.x + left - width / 2 + fragmentWidth / 2;
          const globalY = mapPixelOrigin.y + top - height / 2 + fragmentHeight / 2;
          const fragmentCenter = map.unproject(L.point(globalX, globalY), zoom);
          const url = getFragmentUrl(fragmentCenter, fragmentWidth, fragmentHeight, fragmentDpr);
          if (!url) throw new Error('Visicom fragment URL unavailable');
          urls.push(url);
          jobs.push({ left, top, width: fragmentWidth, height: fragmentHeight, url });
        }
      }

      const results = await Promise.all(jobs.map(async (job) => {
        const response = await fetch(job.url, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) throw new Error(`Visicom fragment HTTP ${response.status}`);
        const svgText = await response.text();
        if (!svgText || !svgText.includes('<svg')) throw new Error('Invalid Visicom SVG fragment response');
        return { ...job, svgText };
      }));

      for (const { left, top, width: fragmentWidth, height: fragmentHeight, svgText } of results) {
        const fragmentDiv = document.createElement('div');
        fragmentDiv.className = 'visicom-svg-fragment';
        fragmentDiv.style.position = 'absolute';
        fragmentDiv.style.left = `${left}px`;
        fragmentDiv.style.top = `${top}px`;
        fragmentDiv.style.width = `${fragmentWidth}px`;
        fragmentDiv.style.height = `${fragmentHeight}px`;
        fragmentDiv.style.overflow = 'hidden';
        fragmentDiv.style.pointerEvents = 'none';
        fragmentDiv.innerHTML = svgText;

        const innerSvg = fragmentDiv.querySelector('svg');
        if (innerSvg) {
          innerSvg.style.width = '100%';
          innerSvg.style.height = '100%';
          innerSvg.style.display = 'block';
          innerSvg.style.pointerEvents = 'none';
          innerSvg.setAttribute('shape-rendering', 'geometricPrecision');
          innerSvg.setAttribute('text-rendering', 'geometricPrecision');
          innerSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
        background.appendChild(fragmentDiv);
      }

      mapElement.insertBefore(background, mapElement.firstChild);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

      return {
        background,
        restore: () => {
          if (tilePane) tilePane.style.opacity = previousTilePaneOpacity;
          background.remove();
          objectUrls.forEach((url) => URL.revokeObjectURL(url));
        },
      };
    } catch (error) {
      if (tilePane) tilePane.style.opacity = previousTilePaneOpacity;
      background.remove();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      console.warn('Visicom HQ fragment export unavailable; using normal Leaflet capture.', error);
      throw error;
    }
  };

  /**
   * Captures the map exactly once and returns a PNG Blob.
   * Export and clipboard use the same Blob, so there is never a second render.
   */
  const captureMapBlob = async (mode: 'export' | 'clipboard' = 'export'): Promise<Blob> => {
    const mapElement = document.getElementById('map-stage-wrapper');
    if (!mapElement) throw new Error('Map element not found');

    const hiddenElements = Array.from(
      mapElement.querySelectorAll(
        '.leaflet-control-container, .screenshot-exclude, .custom-end-handle, .draft-line-node, .line-vertex-edit-handle, .measure-node-icon'
      )
    ) as HTMLElement[];

    const originalOpacity = new Map<HTMLElement, string>();
    hiddenElements.forEach((el) => {
      originalOpacity.set(el, el.style.opacity);
      el.style.opacity = '0';
    });

    const transformedElements = Array.from(
      mapElement.querySelectorAll(
        '.leaflet-pane, .leaflet-layer, .leaflet-tile-pane img, .leaflet-marker-pane img, .leaflet-marker-pane div, .leaflet-shadow-pane img, .leaflet-overlay-pane svg, .leaflet-zoom-animated'
      )
    ) as HTMLElement[];

    const originalTransforms = new Map<HTMLElement, string>();
    transformedElements.forEach((el) => {
      const transform = el.style.transform;
      if (transform && transform.includes('translate3d')) {
        originalTransforms.set(el, transform);
        el.style.transform = transform.replace(
          /translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)/g,
          'translate($1, $2)'
        );
      }
    });

    let hqBackground: Awaited<ReturnType<typeof installVisicomHQBackground>> = null;

    try {
      mapInstanceRef.current?.invalidateSize({ animate: false });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      // Prefer the native Visicom fragment background. If the API key, CORS,
      // network, or account restrictions prevent it, fall back to the normal
      // Leaflet capture instead of breaking export altogether.
      const width = mapElement.clientWidth;
      const height = mapElement.clientHeight;
      const maxOutputDimension = 8000;

      const browserPixelRatio = window.devicePixelRatio || 1;

      // Clipboard capture should look like a native browser screenshot (Lightshot):
      // keep the map at its native rendered pixel size instead of enlarging the
      // 256px Leaflet tiles or replacing them with a different export background.
      // PNG download remains HD and can use the dedicated Visicom SVG background.
      const capturePixelRatio = mode === 'clipboard'
        ? Math.max(1, Math.min(browserPixelRatio, 2))
        : (() => {
            const minTargetWidth = 3600;
            const mobileWidthRatio = minTargetWidth / Math.max(width, 1);
            const desiredRatio = Math.max(3.5, browserPixelRatio * 2, mobileWidthRatio);
            const sizeCapRatio = maxOutputDimension / Math.max(width, height, 1);
            return Math.max(2, Math.min(desiredRatio, sizeCapRatio));
          })();

      if (mode === 'export' && getVisicomFragmentBaseUrl()) {
        try {
          hqBackground = await installVisicomHQBackground(mapElement, capturePixelRatio);
        } catch {
          hqBackground = null;
        }
      }

      if (!hqBackground) {
        const tileImages = Array.from(
          mapElement.querySelectorAll('.leaflet-tile-pane img.leaflet-tile')
        ) as HTMLImageElement[];
        await Promise.all(tileImages.map((img) => waitForImageDecode(img).catch(() => undefined)));
      }

      const filterNode = (node: HTMLElement) => {
        if (!node?.classList) return true;
        return !(
          node.classList.contains('leaflet-control-container') ||
          node.classList.contains('screenshot-exclude') ||
          node.classList.contains('draft-line-node') ||
          node.classList.contains('line-vertex-edit-handle') ||
          node.classList.contains('custom-end-handle') ||
          node.classList.contains('measure-node-icon')
        );
      };

      // Prepare embedded font CSS with base64 web fonts for 100% accurate text rendering in buffer/PNG
      const fontEmbedCSS = await getFontEmbedCSS(mapFont);

      // Ensure browser document fonts have settled
      if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
        try {
          await (document as any).fonts.ready;
        } catch (_) {}
      }

      const captureOptions = {
        cacheBust: false,
        backgroundColor: theme === 'light' ? '#f8fafc' : '#020617',
        pixelRatio: capturePixelRatio,
        quality: 1,
        fontEmbedCSS: fontEmbedCSS,
        filter: filterNode as any,
      };

      const blob = await toBlob(mapElement, captureOptions);
      if (!blob || blob.size === 0) throw new Error('PNG blob creation failed');
      return blob;
    } finally {
      hqBackground?.restore();
      hiddenElements.forEach((el) => {
        el.style.opacity = originalOpacity.get(el) ?? '';
      });
      originalTransforms.forEach((transform, el) => {
        el.style.transform = transform;
      });
    }
  };

  const prepareExportState = () => {
    const mapElement = document.getElementById('map-stage-wrapper');
    if (!mapElement) return null;
    mapElement.classList.add('exporting-map');
    if (theme === 'dark' && !activeTileLayer.isDark) mapElement.classList.add('exporting-dark-map');
    if (blurMapOnExport) mapElement.classList.add('exporting-map-blur');
    return mapElement;
  };

  const cleanupExportState = (mapElement: HTMLElement | null) => {
    if (!mapElement) return;
    mapElement.classList.remove('exporting-map', 'exporting-dark-map', 'exporting-map-blur');
  };

  const handleExportPNG = async () => {
    const mapElement = prepareExportState();
    if (!mapElement) return;
    setIsExporting(true);
    setScreenshotStatus(language === 'uk' ? 'Підготовка HD карти...' : 'Preparing HD map...');
    try {
      const blob = await captureMapBlob();
      const filename = `tactical_map_${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: language === 'uk' ? 'Тактична карта (UA Mapper)' : 'Tactical Map (UA Mapper)',
          });
          setScreenshotStatus(language === 'uk' ? 'Зображення збережено / поширено!' : 'Map saved / shared!');
          setTimeout(() => setScreenshotStatus(null), 2500);
          return;
        } catch (shareErr) {
          if ((shareErr as Error).name === 'AbortError') {
            setScreenshotStatus(null);
            return;
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setScreenshotStatus(language === 'uk' ? 'Зображення завантажено!' : 'Map downloaded successfully!');
      setTimeout(() => setScreenshotStatus(null), 2500);
    } catch (err) {
      console.error('Export error', err);
      setScreenshotStatus(language === 'uk' ? 'Помилка експорту' : 'Export failed');
      setTimeout(() => setScreenshotStatus(null), 2500);
    } finally {
      cleanupExportState(mapElement);
      setIsExporting(false);
    }
  };

  const handleCopyPNG = async (): Promise<boolean> => {
    const mapElement = prepareExportState();
    if (!mapElement) return false;
    setIsCopying(true);
    setScreenshotStatus(language === 'uk' ? 'Створення знімка...' : 'Capturing map...');
    let blob: Blob | null = null;
    try {
      blob = await captureMapBlob('clipboard');
    } catch (captureErr) {
      console.warn('Clipboard mode capture failed, falling back to standard capture:', captureErr);
      try {
        blob = await captureMapBlob('export');
      } catch (retryErr) {
        console.error('All capture attempts failed:', retryErr);
      }
    }

    if (!blob) {
      cleanupExportState(mapElement);
      setIsCopying(false);
      setScreenshotStatus(language === 'uk' ? 'Помилка знімка карти' : 'Map capture failed');
      setTimeout(() => setScreenshotStatus(null), 2500);
      return false;
    }

    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      const filename = `tactical_map_${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      // 1. On desktop devices, try standard clipboard API first
      if (!isMobile && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setScreenshotStatus(language === 'uk' ? 'Зображення скопійовано в буфер!' : 'Map copied to clipboard!');
          setTimeout(() => setScreenshotStatus(null), 2500);
          return true;
        } catch (clipErr) {
          console.warn('Desktop clipboard write failed:', clipErr);
        }
      }

      // 2. On mobile devices, attempt Web Share API if supported
      if (isMobile && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: language === 'uk' ? 'Тактична карта (UA Mapper)' : 'Tactical Map (UA Mapper)',
          });
          setScreenshotStatus(language === 'uk' ? 'Зображення збережено / поширено!' : 'Map saved / shared!');
          setTimeout(() => setScreenshotStatus(null), 2500);
          return true;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            // User voluntarily dismissed the share dialog
            setScreenshotStatus(null);
            return true;
          }
          console.warn('Web Share failed (transient activation or permission), falling back to download:', shareErr);
        }
      }

      // 3. Try mobile clipboard if browser supports it
      if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setScreenshotStatus(language === 'uk' ? 'Зображення скопійовано в буфер!' : 'Map copied to clipboard!');
          setTimeout(() => setScreenshotStatus(null), 2500);
          return true;
        } catch (_) {}
      }

      // 4. Universal 100% reliable fallback for all devices: direct file download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setScreenshotStatus(
        language === 'uk'
          ? (isMobile ? 'Карту завантажено на телефон!' : 'Карту завантажено як файл!')
          : 'Map downloaded!'
      );
      setTimeout(() => setScreenshotStatus(null), 3000);
      return true;
    } catch (fallbackErr) {
      console.error('Clipboard / download fallback failed:', fallbackErr);
      setScreenshotStatus(language === 'uk' ? 'Помилка копіювання' : 'Copy failed');
      setTimeout(() => setScreenshotStatus(null), 2500);
      return false;
    } finally {
      cleanupExportState(mapElement);
      setIsCopying(false);
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    exportPNG: handleExportPNG,
    copyPNG: handleCopyPNG,
    getMapBlob: async (mode: 'export' | 'clipboard' = 'export'): Promise<Blob> => {
      const mapElement = prepareExportState();
      if (!mapElement) throw new Error('Map element not found');
      setIsExporting(true);
      try {
        return await captureMapBlob(mode);
      } finally {
        cleanupExportState(mapElement);
        setIsExporting(false);
      }
    },
    centerOnLocation: (lat: number, lng: number, zoom?: number) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], zoom || 13, { animate: true });
      }
    },
    highlightZoneAt: (lat: number, lng: number, markerId?: string) => {
      handleAutoHighlightZoneAt(lat, lng, markerId);
    },
    clearSearchedAreas: () => {
      handleClearAllAreas();
    }
  }));

  // Setup dynamic watermark tiling background
  const watermarkTextFill = theme === 'light' ? '#000000' : '#ffffff';
  const displayWatermarkText = watermarkText || 'UA Mapper';

  let watermarkSvg = '';
  let bgTileWidth = 220;
  let bgTileHeight = 150;

  if (watermarkType === 'image' && watermarkImageUrl) {
    const imgSize = watermarkSize || 48;
    bgTileWidth = Math.round(Math.max(60, imgSize * 2.2));
    bgTileHeight = Math.round(Math.max(50, imgSize * 1.8));
    const cx = bgTileWidth / 2;
    const cy = bgTileHeight / 2;
    const ix = (bgTileWidth - imgSize) / 2;
    const iy = (bgTileHeight - imgSize) / 2;
    const rot = watermarkRotation !== undefined ? watermarkRotation : -25;
    const op = watermarkOpacity !== undefined ? watermarkOpacity : 0.20;

    watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${bgTileWidth}" height="${bgTileHeight}"><g transform="rotate(${rot} ${cx} ${cy})" opacity="${op}"><image href="${watermarkImageUrl}" xlink:href="${watermarkImageUrl}" width="${imgSize}" height="${imgSize}" x="${ix}" y="${iy}" preserveAspectRatio="xMidYMid meet" /></g></svg>`;
  } else if (watermarkType === 'image' && !watermarkImageUrl) {
    watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="150"></svg>`;
  } else {
    const txtSize = watermarkSize || 14;
    bgTileWidth = Math.round(Math.max(140, (displayWatermarkText.length * txtSize * 0.9) + 40));
    bgTileHeight = Math.round(Math.max(90, txtSize * 8));
    const rot = watermarkRotation !== undefined ? watermarkRotation : -30;
    const op = watermarkOpacity !== undefined ? watermarkOpacity : 0.10;
    const tx = Math.round(bgTileWidth * 0.1);
    const ty = Math.round(bgTileHeight * 0.6);

    watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bgTileWidth}" height="${bgTileHeight}"><text x="${tx}" y="${ty}" fill="${watermarkTextFill}" font-size="${txtSize}" font-family="system-ui, sans-serif" font-weight="900" transform="rotate(${rot} ${tx} ${ty})" opacity="${op}">${displayWatermarkText}</text></svg>`;
  }

  const watermarkUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(watermarkSvg)}")`;

  const fontCssValue = getMapFontFamilyCss(mapFont);

  return (
    <div className="relative w-full h-full" style={{ '--map-font-family': fontCssValue } as React.CSSProperties}>
      <div 
        id="map-stage-wrapper" 
        className={`relative w-full h-full overflow-hidden ${theme === 'light' ? 'bg-slate-50' : 'bg-slate-950'} ${!showLogoAndLegendOnMap ? 'hide-map-branding' : ''}`} 
        style={{ fontFamily: fontCssValue }}
      >
        {/* Actual Map Container */}
        <div 
          id="visicom-leaflet-map"
          ref={mapContainerRef} 
          className={`w-full h-full z-10 ${theme === 'dark' && !activeTileLayer.isDark ? 'dark-map' : ''}`}
          style={{ fontFamily: fontCssValue }}
        />

        {/* Floating Search Panel */}
        {!(isExporting || isCopying) && (
          <div ref={searchContainerRef} className="absolute top-4 left-4 z-20 w-72 sm:w-88 flex flex-col gap-2">
            
            {/* Search Input Bar */}
            <form onSubmit={handleFormSubmitSearch} className={`relative flex items-center border rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.28)] backdrop-blur-2xl backdrop-saturate-150 transition-all ${
              theme === 'light' 
                ? 'bg-white/70 border-white/80 text-slate-800 ring-1 ring-black/5' 
                : 'bg-slate-900/65 border-white/15 text-slate-100 ring-1 ring-white/10'
            }`}>
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={language === 'uk' ? 'Пошук та виділення зон (н/п, район, місто)...' : 'Search & highlight zone (city, district)...'}
                className="w-full pl-10 pr-10 py-2.5 text-xs bg-transparent focus:outline-none placeholder-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-3 p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </form>

            {/* Quick District & Settlement Buttons */}
            <div className="space-y-2 py-1 max-h-36 overflow-y-auto pr-1">
              {/* Urban Districts of Kryvyi Rih & Settlement Toggle */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-0.5 min-h-[24px]">
                  {/* Toggle quick settlement buttons */}
                  <button
                    type="button"
                    onClick={() => handleToggleQuickSettlements(!showQuickSettlements)}
                    className={`h-6 px-2.5 rounded-full text-[10px] flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer border whitespace-nowrap ${
                      showQuickSettlements
                        ? theme === 'light'
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 font-extrabold'
                          : 'bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border-blue-500/40 font-extrabold'
                        : theme === 'light'
                          ? 'bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border-slate-300/90 font-bold'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border-white/15 font-bold'
                    }`}
                    title={showQuickSettlements ? (language === 'uk' ? 'Приховати кнопки населених пунктів' : 'Hide settlement buttons') : (language === 'uk' ? 'Показати кнопки населених пунктів' : 'Show settlement buttons')}
                  >
                    {showQuickSettlements ? (
                      <>
                        <ChevronUp className="w-3 h-3 text-blue-500" />
                        <span>{language === 'uk' ? 'Населені пункти' : 'Settlements'}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                        <span>{language === 'uk' ? 'Населені пункти' : 'Settlements'}</span>
                      </>
                    )}
                  </button>

                  {searchedAreas.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllAreas}
                      className="h-6 px-2.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                      title={language === 'uk' ? 'Прибрати всі виділені зони та населені пункти' : 'Clear all highlighted zones & settlements'}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>{language === 'uk' ? `Очистити (${searchedAreas.length})` : `Clear (${searchedAreas.length})`}</span>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_DISTRICTS.filter((d) => d.category === 'urban_district').map((dist) => {
                    const isHighlighted = searchedAreas.some(
                      (area) => area.districtId === dist.id || area.name === dist.label || area.name === dist.fullName
                    );
                    const isLoading = loadingDistrict === dist.id;

                    return (
                      <button
                        key={dist.id}
                        type="button"
                        onClick={() => !isLoading && handleToggleDistrict(dist)}
                        disabled={isLoading}
                        title={dist.fullName || dist.label}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-black text-xs sm:text-sm backdrop-blur-xl transition-all duration-200 cursor-pointer flex items-center justify-center relative shadow-md active:scale-95 ${
                          isHighlighted
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/40 ring-2 ring-red-400 font-black scale-105'
                            : theme === 'light'
                              ? 'bg-white hover:bg-slate-100 text-slate-950 border border-slate-300/90 font-black shadow-sm'
                              : 'bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 font-black shadow-sm'
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                        ) : (
                          <span>{dist.shortLabel}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Other Boundaries, Settlements & Custom Saved Quick Zones */}
              {showQuickSettlements && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {/* Toggle for Dark Gray Hromada Demarcation Lines */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleHromadaBoundaries?.(!showHromadaBoundaries);
                    }}
                    title={language === 'uk' ? 'Відображення темно-сірих ліній розмежування по громадам' : 'Toggle dark gray hromada boundaries'}
                    className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border backdrop-blur-xl transition-all duration-200 cursor-pointer flex items-center gap-1 shadow-md active:scale-95 ${
                      showHromadaBoundaries
                        ? 'bg-slate-800 hover:bg-slate-900 border-slate-500 text-white shadow-md ring-1 ring-slate-400 font-black'
                        : theme === 'light'
                          ? 'bg-white/90 hover:bg-white border-slate-300 text-slate-900 font-bold shadow-xs'
                          : 'bg-slate-900/90 hover:bg-slate-800 border-white/20 text-slate-100 font-bold shadow-xs'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full border ${showHromadaBoundaries ? 'bg-emerald-400 border-white' : 'bg-slate-400 border-transparent'}`}></span>
                    <span>{language === 'uk' ? 'Межі громад (темно-сірі)' : 'Hromada Boundaries (Dark Gray)'}</span>
                  </button>

                  {allQuickZones.map((dist) => {
                    const isHighlighted = searchedAreas.some(
                      (area) => area.districtId === dist.id || area.name === dist.label || area.name === dist.fullName
                    );
                    const isLoading = loadingDistrict === dist.id;
                    const isCustom = dist.id.startsWith('custom_') || dist.category === 'custom';

                    return (
                      <div key={dist.id} className="relative group inline-flex items-center">
                        <button
                          type="button"
                          onClick={() => !isLoading && handleToggleDistrict(dist)}
                          disabled={isLoading}
                          title={dist.fullName || dist.label}
                          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border backdrop-blur-xl transition-all duration-200 cursor-pointer flex items-center gap-1 shadow-md active:scale-95 ${
                            isHighlighted
                              ? 'bg-red-600 hover:bg-red-700 border-red-400 text-white shadow-lg ring-2 ring-red-400/60 font-black'
                              : dist.id === 'kryvorizkyi_raion' || dist.id === 'kryvyi_rih_city'
                                ? 'bg-blue-600 hover:bg-blue-700 border-blue-400 text-white font-black shadow-md'
                                : theme === 'light'
                                  ? 'bg-white/90 hover:bg-white border-slate-300 text-slate-900 font-bold shadow-xs'
                                  : 'bg-slate-900/90 hover:bg-slate-800 border-white/20 text-slate-100 font-bold shadow-xs'
                          }`}
                        >
                          {isLoading && <Loader2 className="w-2.5 h-2.5 animate-spin text-current" />}
                          <span>{dist.label}</span>
                        </button>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomQuickZone(dist.id);
                            }}
                            title={language === 'uk' ? 'Видалити зі швидких зон' : 'Remove from quick zones'}
                            className="ml-0.5 p-0.5 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


            {/* Suggestions Dropdown */}
            {showDropdown && (searchQuery.trim().length >= 2 || isSearching || searchResults.length > 0) && (
              <div className={`border rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150 max-h-64 overflow-y-auto z-30 transition-all ${
                theme === 'light' 
                  ? 'bg-white/80 border-white/80 text-slate-800 ring-1 ring-black/5' 
                  : 'bg-slate-950/80 border-white/15 text-slate-200 ring-1 ring-white/10'
              }`}>
                {/* Quick direct zone action */}
                {searchQuery.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => handleDirectAddZoneByQuery(searchQuery)}
                    className="w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold border-b border-red-500/20 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'uk' ? `Виділити зону: "${searchQuery}"` : `Highlight zone for "${searchQuery}"`}</span>
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-red-500/20 font-black">
                      Enter
                    </span>
                  </button>
                )}

                {isSearching ? (
                  <div className="flex items-center gap-2 p-4 text-xs font-medium text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span>{language === 'uk' ? 'Пошук межі зони...' : 'Searching zone boundary...'}</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  searchQuery.length >= 3 && (
                    <div className="p-4 text-xs font-medium text-slate-400 text-center">
                      {language === 'uk' ? 'Нічого не знайдено' : 'No results found'}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col py-1">
                    {searchResults.map((item, idx) => {
                      const name = item.display_name.split(',')[0] || item.display_name;
                      const isSavedInCustom = customQuickZones.some(
                        (q) => q.label.toLowerCase() === name.trim().toLowerCase() || q.fullName.toLowerCase() === name.trim().toLowerCase()
                      );

                      return (
                        <div
                          key={item.place_id ? `search_${item.place_id}_${idx}` : `search_idx_${idx}`}
                          className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors border-b last:border-0 ${
                            theme === 'light' 
                              ? 'hover:bg-slate-100 border-slate-100 text-slate-900' 
                              : 'hover:bg-white/5 border-white/5 text-slate-100'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectArea(item)}
                            className="flex items-start gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                          >
                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-red-500 flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold truncate group-hover:text-blue-400 transition-colors">{name}</span>
                              <span className="text-[10px] text-slate-400 mt-0.5 truncate">{formatDisplayName(item.display_name)}</span>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Just highlight on map */}
                            <button
                              type="button"
                              onClick={() => handleSelectArea(item)}
                              className="px-2 py-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              title={language === 'uk' ? 'Виділити зону на карті' : 'Highlight zone on map'}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{language === 'uk' ? 'Виділити' : 'Highlight'}</span>
                            </button>

                            {/* Add to favorites / custom quick zones */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addZoneToQuickButtons(name, item.geojson, item.lat, item.lon, item.osm_id?.toString());
                                handleSelectArea(item);
                              }}
                              disabled={isSavedInCustom}
                              className={`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                                isSavedInCustom
                                  ? 'bg-amber-500/20 text-amber-400 opacity-80 cursor-default'
                                  : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white'
                              }`}
                              title={isSavedInCustom ? (language === 'uk' ? 'Уже в обраному' : 'Already in favorites') : (language === 'uk' ? 'Додати в обране' : 'Add to favorites')}
                            >
                              <Star className={`w-3 h-3 ${isSavedInCustom ? 'fill-amber-400 text-amber-400' : ''}`} />
                              <span>{isSavedInCustom ? (language === 'uk' ? 'В обраному' : 'Saved') : (language === 'uk' ? 'В обране' : 'Bookmark')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* List of active highlighted areas removed as per user request */}
          </div>
        )}

        {/* Tiled watermark */}
        <div 
          className="absolute inset-0 pointer-events-none z-[12]" 
          style={{ 
            backgroundImage: watermarkUrl,
            backgroundRepeat: 'repeat',
            backgroundSize: `${bgTileWidth}px ${bgTileHeight}px`
          }} 
        />

        {/* Tactical Conventional Signs Legend ("УМОВНІ ПОЗНАЧЕННЯ:") */}
        {mapLegendConfig && mapLegendConfig.enabled && (
          <MapLegendWidget
            config={mapLegendConfig}
            onUpdateConfig={(cfg) => onUpdateMapLegendConfig?.(cfg)}
            language={language}
            theme={theme || 'dark'}
            fontFamily={fontCssValue}
          />
        )}

        {/* Tactical Legend Box - captured in PNG */}
        {(showLegendOverlay || isExporting || isCopying) && (
          <div 
            className={`tactical-legend-container absolute left-0 right-0 z-20 select-none pointer-events-none transition-all duration-300 flex justify-center ${
              (selectedMarkerId && !(isExporting || isCopying)) ? 'bottom-[250px] md:bottom-6' : 'bottom-6'
            }`}
            style={{ fontFamily: fontCssValue }}
          >
            <div 
              className={`tactical-legend-wrapper px-4 py-2 md:px-6 md:py-1.5 border rounded-2xl md:rounded-full shadow-2xl transition-all flex items-center justify-center max-w-[92vw] sm:max-w-[85vw] pointer-events-auto ${
                theme === 'light' 
                  ? 'bg-slate-950/50 border-slate-900/30 text-slate-100' 
                  : 'bg-white/50 border-white/20 text-slate-950'
              }`}
              style={{ fontFamily: fontCssValue }}
            >
              <p 
                className="tactical-legend-text text-[7.5px] sm:text-[8px] md:text-[9px] font-bold opacity-95 text-center whitespace-normal md:whitespace-nowrap leading-relaxed"
                style={{ fontFamily: fontCssValue }}
              >
                {legendOverlayText !== undefined && legendOverlayText !== '' 
                  ? legendOverlayText 
                  : (language === 'uk' 
                    ? 'Ця карта має інформаційний характер, не є офіційним джерелом. Дані які відображені на карті сформовані виключно на основі інформації з каналу @krrig_alerts' 
                    : 'This map is for informational purposes only and is not an official source. The data displayed on the map is formed solely on the basis of information from the @krrig_alerts channel')}
              </p>
            </div>
          </div>
        )}

        {/* Floating Line Drawing Mobile/Desktop Control Toolbar */}
        {!(isExporting || isCopying) && interactionMode === 'line' && (
          <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto flex flex-col items-center gap-2 max-w-[96vw] animate-fade-in">
            {/* Warning banner if selected line has excessive editing points */}
            {selectedDrawnLine && selectedDrawnLine.points.length > 20 && (
              <div className="px-3.5 py-1.5 rounded-2xl bg-amber-500 text-slate-950 font-extrabold text-xs shadow-2xl flex items-center gap-2.5 border-2 border-amber-300 animate-pulse">
                <span>⚠️ {language === 'uk' ? `У вибраній лінії ${selectedDrawnLine.points.length} точок (забагато для зручного редагування).` : `Line has ${selectedDrawnLine.points.length} points (too many for easy editing).`}</span>
                <button
                  type="button"
                  onClick={() => handleOptimizeLinePoints(16)}
                  className="px-2.5 py-1 bg-slate-950 text-amber-300 hover:bg-slate-900 rounded-xl text-xs font-black shadow transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  {language === 'uk' ? '✨ Зменшити до ~16 точок' : '✨ Reduce to ~16 pts'}
                </button>
              </div>
            )}

            <div className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-center gap-2 sm:gap-3 ${
              theme === 'light'
                ? 'bg-slate-900/90 border-slate-700/80 text-white'
                : 'bg-slate-950/90 border-white/20 text-white'
            }`}>
              {/* Technique Switcher: Freehand (Paint) vs Point-by-point */}
              <div className="flex items-center p-0.5 rounded-xl bg-black/40 border border-white/10">
                <button
                  type="button"
                  onClick={() => onChangeLineDrawMethod?.('freehand')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    lineDrawMethod === 'freehand'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                  title={language === 'uk' ? 'Малювання лінії мишкою або пальцем як в Paint з авто-згладжуванням' : 'Freehand draw with mouse/touch like Paint with auto-smoothing'}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'uk' ? 'Від руки (Paint)' : 'Freehand (Paint)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLineDrawMethod?.('points')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    lineDrawMethod === 'points'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                  title={language === 'uk' ? 'Покрокове нанесення лінії по окремих точках на карті' : 'Point-by-point click line vertices'}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{language === 'uk' ? 'По точках' : 'Point-by-point'}</span>
                </button>
              </div>

              {/* Endpoints Selectors (Початок / Кінець) */}
              <div className="flex items-center gap-1.5 px-2 border-l border-r border-white/15">
                {/* Start endpoint */}
                <button
                  type="button"
                  onClick={() => {
                    const order: LineEndpointType[] = ['none', 'arrow', 'dot', 'explosion', 'fade'];
                    const idx = order.indexOf(lineStartStyle);
                    const next = order[(idx + 1) % order.length];
                    onChangeLineStartStyle?.(next);
                  }}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold flex items-center gap-1 border border-white/10 transition-colors cursor-pointer"
                  title={language === 'uk' ? 'Натисніть щоб змінити початкову точку лінії' : 'Click to change start endpoint'}
                >
                  <span className="text-slate-400 text-[10px]">{language === 'uk' ? 'Початок:' : 'Start:'}</span>
                  <span className="text-emerald-400 font-extrabold">
                    {lineStartStyle === 'arrow' && '➔'}
                    {lineStartStyle === 'dot' && '⏺'}
                    {lineStartStyle === 'explosion' && '💥'}
                    {lineStartStyle === 'fade' && '✨'}
                    {lineStartStyle === 'custom_icon' && '🖼️'}
                    {lineStartStyle === 'none' && '—'}
                  </span>
                </button>

                {/* End endpoint */}
                <button
                  type="button"
                  onClick={() => {
                    const order: LineEndpointType[] = ['none', 'arrow', 'dot', 'explosion', 'fade'];
                    const idx = order.indexOf(lineEndStyle);
                    const next = order[(idx + 1) % order.length];
                    onChangeLineEndStyle?.(next);
                  }}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold flex items-center gap-1 border border-white/10 transition-colors cursor-pointer"
                  title={language === 'uk' ? 'Натисніть щоб змінити кінцеву точку лінії' : 'Click to change end endpoint'}
                >
                  <span className="text-slate-400 text-[10px]">{language === 'uk' ? 'Кінець:' : 'End:'}</span>
                  <span className="text-emerald-400 font-extrabold">
                    {lineEndStyle === 'arrow' && '➔'}
                    {lineEndStyle === 'dot' && '⏺'}
                    {lineEndStyle === 'explosion' && '💥'}
                    {lineEndStyle === 'fade' && '✨'}
                    {lineEndStyle === 'custom_icon' && '🖼️'}
                    {lineEndStyle === 'none' && '—'}
                  </span>
                </button>
              </div>

              {/* Specific Mode Controls */}
              {lineDrawMethod === 'freehand' ? (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      <span>{language === 'uk' ? 'Режим Paint' : 'Paint Mode'}</span>
                    </span>
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {justSmoothedNotice ? (
                        <span className="text-emerald-400 font-extrabold animate-bounce inline-block">
                          {language === 'uk' ? '✨ Лінію авто-згладжено!' : '✨ Line auto-smoothed!'}
                        </span>
                      ) : (
                        <span className="text-slate-300">
                          {language === 'uk' ? 'Проведіть лінію по карті' : 'Draw line on map'}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Undo last drawn line in freehand mode */}
                  {drawnLines.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const last = drawnLines[drawnLines.length - 1];
                        if (last) onDeleteDrawnLine(last.id);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-all flex items-center gap-1.5 text-xs font-bold border border-amber-500/30 cursor-pointer active:scale-95"
                      title={language === 'uk' ? 'Видалити останню намальовану лінію' : 'Undo last drawn line'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{language === 'uk' ? 'Скасувати лінію' : 'Undo Line'}</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Point-by-point controls */
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex flex-col text-left pr-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                      {language === 'uk' ? 'По точках' : 'Points'}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
                      {draftLinePoints.length === 0 ? (
                        <span className="text-slate-400 italic">
                          {language === 'uk' ? 'Торкніться карти...' : 'Tap on map...'}
                        </span>
                      ) : (
                        <>
                          <strong>{draftLinePoints.length}</strong> {language === 'uk' ? 'точок' : 'pts'}
                          {draftLinePoints.length >= 2 && (
                            <span className="ml-1 text-amber-300 font-bold">
                              ({(calculateDraftLineDistance() >= 1000 
                                ? `${(calculateDraftLineDistance() / 1000).toFixed(2)} км` 
                                : `${Math.round(calculateDraftLineDistance())} м`)})
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </div>

                  {/* Undo point */}
                  <button
                    onClick={() => setDraftLinePoints((prev) => prev.slice(0, -1))}
                    disabled={draftLinePoints.length === 0}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 text-xs font-bold border border-amber-500/30 cursor-pointer active:scale-95"
                    title={language === 'uk' ? 'Скасувати останню точку' : 'Undo last vertex'}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{language === 'uk' ? 'Скасувати точку' : 'Undo'}</span>
                  </button>

                  {/* Finish Line */}
                  <button
                    onClick={handleFinishDraftLine}
                    disabled={draftLinePoints.length < 2}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 text-xs font-extrabold border border-emerald-400/50 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{language === 'uk' ? 'Завершити' : 'Finish'}</span>
                  </button>

                  {/* Clear / Cancel */}
                  {draftLinePoints.length > 0 && (
                    <button
                      onClick={() => setDraftLinePoints([])}
                      className="p-1.5 sm:p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all border border-red-500/30 cursor-pointer active:scale-95"
                      title={language === 'uk' ? 'Очистити чернетку' : 'Clear draft'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Selected line points & quick optimization */}
              {selectedDrawnLine && (
                <div className="flex items-center gap-2 pl-2 border-l border-white/15">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {language === 'uk' ? 'Точки:' : 'Points:'}
                    </span>
                    <span className={`text-xs font-black ${selectedDrawnLine.points.length > 22 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {selectedDrawnLine.points.length} {language === 'uk' ? 'вузлів' : 'pts'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOptimizeLinePoints(16)}
                    className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                    title={language === 'uk' ? 'Зменшити кількість точок для зручного перетягування' : 'Reduce edit points to optimal ~16'}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{language === 'uk' ? 'Зменшити точки' : 'Reduce Points'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Ruler / Measure Tool Toolbar with Multi-City & Multi-Track support */}
        {!(isExporting || isCopying) && interactionMode === 'measure' && (
          <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto flex flex-col items-center gap-2 max-w-[96vw] animate-fade-in">
            {/* Track Switcher if multiple tracks exist */}
            {measureTracks.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full px-2 py-1 rounded-full bg-slate-950/80 border border-white/10 backdrop-blur-md">
                {measureTracks.map((tr) => {
                  const isCur = tr.id === activeTrackId;
                  const dist = tr.points.length >= 2 ? formatDistance(calculateDistanceMeters(tr.points[0], tr.points[tr.points.length - 1])) : null;
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => setActiveTrackId(tr.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCur
                          ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: tr.color }}
                      />
                      <span className="truncate max-w-[120px]">{tr.name}</span>
                      {dist && <span className="opacity-75 font-mono text-[10px]">({dist})</span>}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleAddTrack()}
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                  title={language === 'uk' ? 'Додати новий вимір (інший колір/маршрут)' : 'Add new measurement track'}
                >
                  <Plus className="w-3 h-3" />
                  <span>{language === 'uk' ? 'Новий вимір' : 'New track'}</span>
                </button>
              </div>
            )}

            {/* Main Ruler Control Bar */}
            <div
              className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 ${
                theme === 'light'
                  ? 'bg-slate-900/90 border-slate-700/80 text-white'
                  : 'bg-slate-950/90 border-white/20 text-white'
              }`}
            >
              <div className="flex items-center gap-2 pr-2.5 border-r border-white/15">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-xs"
                  style={{ backgroundColor: activeTrack.color }}
                >
                  <Ruler className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[100px]">
                      {activeTrack.name}
                    </span>
                  </div>
                  <span
                    className="text-xs font-black truncate"
                    style={{ color: activeTrack.color }}
                  >
                    {measurePoints.length >= 2
                      ? formatDistance(totalMeasureDistance)
                      : language === 'uk'
                      ? 'Клікніть на карту'
                      : 'Click on map'}
                  </span>
                </div>
              </div>

              {/* Point counter */}
              <div className="flex items-center gap-1 text-xs text-slate-300 font-medium px-0.5">
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-black text-[11px]">
                  {measurePoints.length}{' '}
                  {language === 'uk'
                    ? measurePoints.length === 1
                      ? 'точка'
                      : measurePoints.length >= 2 && measurePoints.length <= 4
                      ? 'точки'
                      : 'точок'
                    : measurePoints.length === 1
                    ? 'point'
                    : 'points'}
                </span>
              </div>

              {/* Button: City Ruler Measurements Modal */}
              <button
                type="button"
                onClick={() => setIsCityRulerModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                title={
                  language === 'uk'
                    ? 'Виміри між містами та швидкий перехід до міст'
                    : 'City ruler measurements & quick jump'
                }
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{language === 'uk' ? 'Виміри в містах' : 'City Presets'}</span>
              </button>

              {/* Quick Jump Chips (Popular cities) */}
              <div className="hidden lg:flex items-center gap-1 pl-1 border-l border-white/15">
                <span className="text-[10px] text-slate-400 font-medium mr-0.5">
                  {language === 'uk' ? 'Міста:' : 'Cities:'}
                </span>
                {MAJOR_CITIES_RULER.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleJumpToCity(c, false)}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] font-bold border border-white/10 transition-colors cursor-pointer"
                    title={
                      language === 'uk'
                        ? `Перейти до м. ${c.nameUa}`
                        : `Jump to ${c.nameEn}`
                    }
                  >
                    {c.nameUa.split(' ')[0]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 border-l border-white/15 pl-2">
                {/* Undo last point button */}
                <button
                  type="button"
                  onClick={() => setMeasurePoints((prev) => prev.slice(0, -1))}
                  disabled={measurePoints.length === 0}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    measurePoints.length > 0
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95'
                      : 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-800/40'
                  }`}
                  title={
                    language === 'uk'
                      ? 'Видалити останню точку (Backspace / Del)'
                      : 'Undo last point (Backspace / Del)'
                  }
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {language === 'uk' ? 'Скасувати' : 'Undo'}
                  </span>
                </button>

                {/* Clear all measure points button */}
                <button
                  type="button"
                  onClick={() => setMeasurePoints([])}
                  disabled={measurePoints.length === 0}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    measurePoints.length > 0
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 active:scale-95'
                      : 'opacity-40 cursor-not-allowed text-slate-500 bg-rose-500/5'
                  }`}
                  title={
                    language === 'uk'
                      ? 'Очистити точки цього виміру (Esc)'
                      : 'Clear current track points (Esc)'
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'uk' ? 'Очистити' : 'Clear'}</span>
                </button>

                {/* Delete track if multiple tracks */}
                {measureTracks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTrack(activeTrackId)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                    title={language === 'uk' ? 'Видалити цей вимір' : 'Delete this measurement track'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {measurePoints.length > 0 && (
              <div className="text-[10px] text-amber-200/90 bg-slate-950/85 px-3 py-1 rounded-full border border-amber-400/30 backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                <span>
                  💡{' '}
                  {language === 'uk'
                    ? 'Перетягуйте точки для зміни позиції. Клік або ПКМ по точці для видалення.'
                    : 'Drag points to move. Click or right-click a point to delete.'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* City Ruler Modal */}
        <CityRulerModal
          isOpen={isCityRulerModalOpen}
          onClose={() => setIsCityRulerModalOpen(false)}
          language={language}
          theme={theme}
          onApplyInterCityPreset={handleApplyInterCityPreset}
          onJumpToCity={handleJumpToCity}
          onAddCityPointToActive={handleAddCityPointToActive}
        />

        {!(isExporting || isCopying) && lastAutoZoneName && (
          <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-amber-500/50 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-white backdrop-blur-md animate-fade-in max-w-[92vw]">
            <Layers className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                {language === 'uk' ? 'Підсвітка зон' : 'Zone Highlight'}
              </span>
              <span className="text-xs font-medium truncate">
                {language === 'uk' ? 'Підсвічено зону:' : 'Highlighted zone:'} <strong className="text-amber-300">{lastAutoZoneName}</strong>
              </span>
            </div>
            <button
              onClick={() => setLastAutoZoneName(null)}
              className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 cursor-pointer flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Watermark branding overlay for Кривий Ріг Alerts and @krrig_alerts - NOT blurred, background/border 50% transparent */}

        <div className="tactical-logo-container-outer absolute top-4 left-0 right-0 z-20 pointer-events-none select-none flex justify-center">
          <div 
            className={`tactical-logo-container px-4 py-1.5 rounded-full border flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2 shadow-2xl transition-all max-w-[95vw] ${
              theme === 'light' 
                ? 'bg-slate-950/50 border-slate-900/30' 
                : 'bg-white/50 border-white/20'
            }`}
            style={{ fontFamily: fontCssValue }}
          >
            <span 
              className="tactical-logo-title font-bold tracking-tight text-[15.5px] sm:text-[18.5px] leading-none flex items-center"
              style={{ color: theme === 'light' ? 'rgb(225, 255, 0)' : 'rgb(255, 0, 0)', fontFamily: fontCssValue }}
            >
              UA Mapper
            </span>
            <span className={`inline-block w-[1px] h-3.5 mx-0.5 sm:mx-1 self-center ${
              theme === 'light' ? 'bg-white/20' : 'bg-slate-950/20'
            }`} />
            <span 
              className={`tactical-logo-author font-bold tracking-wider uppercase leading-none flex items-center text-[8.5px] sm:text-[9.5px] ${
                theme === 'light' ? 'text-white' : 'text-slate-950'
              }`}
              style={{ fontFamily: fontCssValue }}
            >
              BY @KRRIG_ALERTS
            </span>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 flex-shrink-0" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="telegram-watermark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2AABEE" />
                  <stop offset="100%" stopColor="#229ED9" />
                </linearGradient>
              </defs>
              <circle cx="14" cy="14" r="13" fill="url(#telegram-watermark-gradient)" />
              <path d="M10.8 14.9L10.5 19.1C10.9 19.1 11.1 18.9 11.3 18.7L13.2 16.9L17.2 19.8C17.9 20.2 18.4 20.0 18.6 19.2L21.2 6.9C21.4 6.0 20.8 5.6 20.2 5.9L4.8 11.8C3.9 12.2 3.9 12.7 4.7 13.0L8.6 14.2L17.6 8.5C18.0 8.2 18.4 8.4 18.1 8.7L10.8 14.9Z" fill="white" />
            </svg>
          </div>
        </div>

        {/* Embedded style tag to override default Leaflet white box and borders around DivIcon */}
        <style>{`
          .custom-leaflet-div-icon {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: visible !important;
          }
          #map-stage-wrapper,
          #map-stage-wrapper *,
          .tactical-logo-container,
          .tactical-logo-container *,
          .tactical-logo-title,
          .tactical-logo-author,
          .tactical-legend-container,
          .tactical-legend-container *,
          .tactical-legend-wrapper,
          .tactical-legend-text,
          #map-legend-widget-container,
          #map-legend-widget-container *,
          .leaflet-container,
          .leaflet-container *,
          .settlement-label-marker,
          .settlement-label-marker *,
          .custom-leaflet-div-icon,
          .custom-leaflet-div-icon *,
          .leaflet-marker-icon,
          .leaflet-popup,
          .leaflet-popup *,
          .leaflet-tooltip,
          .map-measurement-badge,
          .exporting-map,
          .exporting-map * {
            font-family: ${fontCssValue} !important;
          }
          /* Theme map filter */
          .dark-map .leaflet-tile-pane {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
          }
          /* Keep map colors identical to the screen during export to prevent color shifting and quality degradation */
          .exporting-map .leaflet-tile-pane {
            filter: none !important;
          }
          .exporting-dark-map .leaflet-tile-pane {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) !important;
          }
          /* Ensure maximum sharpness and contrast during export */
          .exporting-map .leaflet-tile-pane img,
          .exporting-map img,
          .exporting-map canvas {
            image-rendering: auto !important;
            image-rendering: -webkit-optimize-contrast !important;
          }
          .exporting-map img, .exporting-map svg, .exporting-map canvas, .exporting-map div {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: geometricPrecision !important;
          }
          .exporting-map svg path,
          .exporting-map svg line,
          .exporting-map svg polygon,
          .exporting-map svg polyline,
          .exporting-map svg circle,
          .exporting-map svg text {
            shape-rendering: geometricPrecision !important;
            text-rendering: geometricPrecision !important;
          }
          /* Style standard Leaflet popups beautifully */
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(226, 232, 240, 0.8);
            padding: 4px;
          }
          .leaflet-popup-tip-container {
            margin-top: -1px;
          }
          /* Measure node drag cursors and popup styles */
          .measure-node-icon {
            cursor: grab !important;
          }
          .measure-node-icon:active,
          .leaflet-dragging .measure-node-icon {
            cursor: grabbing !important;
          }
          .measure-point-popup .leaflet-popup-content-wrapper {
            background: #0f172a;
            border: 1px solid rgba(250, 204, 21, 0.4);
            color: #f8fafc;
            border-radius: 16px;
            padding: 6px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          }
          .measure-point-popup .leaflet-popup-tip {
            background: #0f172a;
          }
          /* Hide selected marker outline and box-shadow during image export/copy */
          .exporting-map .selected-marker-highlight {
            outline: none !important;
            box-shadow: none !important;
          }
          /* Hide all helper nodes, vertex drag points, handles during export/copy */
          .exporting-map .draft-line-node,
          .exporting-map .line-vertex-edit-handle,
          .exporting-map .screenshot-exclude,
          .exporting-map .custom-end-handle,
          .exporting-map .measure-node-icon {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
          /* Perfect baseline/vertical centering for the tactical watermark badge elements */
          .tactical-logo-container {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            vertical-align: middle !important;
          }
          .tactical-logo-container span {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            line-height: 1 !important;
          }
          /* Live map font rules for logo, legend, and conventional signs widget */
          .tactical-logo-title,
          .tactical-logo-author,
          .tactical-legend-text,
          .tactical-legend-wrapper,
          #map-legend-widget-container,
          #map-legend-widget-container * {
            font-family: ${fontCssValue} !important;
          }

          /* Hide logo and legend on live map when toggle is switched off */
          .hide-map-branding .tactical-logo-container-outer,
          .hide-map-branding .tactical-legend-container {
            display: none !important;
          }

          /* In export / clipboard copy, ALWAYS show logo and legend */
          .exporting-map .tactical-logo-container-outer,
          .exporting-map .tactical-legend-container,
          .exporting-map #map-legend-widget-container {
            display: flex !important;
          }

          /* Custom overrides during image export on all screen sizes to keep layout pristine */
          .exporting-map .tactical-logo-container-outer {
            top: 20px !important;
            left: 0 !important;
            right: 0 !important;
            transform: none !important;
            width: auto !important;
            display: flex !important;
            justify-content: center !important;
          }
          .exporting-map .tactical-logo-container {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 8px 18px !important;
            gap: 10px !important;
            white-space: nowrap !important;
            max-width: 90% !important;
          }
          .exporting-map .tactical-logo-title {
            font-family: ${fontCssValue} !important;
            font-size: 18.5px !important;
          }
          .exporting-map .tactical-logo-author {
            font-family: ${fontCssValue} !important;
            font-size: 9.5px !important;
          }
          .exporting-map .tactical-logo-container svg {
            width: 15px !important;
            height: 15px !important;
          }
          .exporting-map .tactical-legend-container {
            bottom: 24px !important;
            left: 0 !important;
            right: 0 !important;
            transform: none !important;
            width: auto !important;
            display: flex !important;
            justify-content: center !important;
          }
          .exporting-map .tactical-legend-wrapper {
            padding: 10px 20px !important;
            border-radius: 9999px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            max-width: 88% !important;
          }
          .exporting-map .tactical-legend-text {
            font-family: ${fontCssValue} !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            line-height: 1.45 !important;
            white-space: normal !important;
            text-align: center !important;
            max-width: 100% !important;
          }
          /* On extremely narrow exports, scale text down slightly so it fits on 1-2 lines gracefully */
          @media (max-width: 480px) {
            .exporting-map .tactical-legend-text {
              font-size: 9px !important;
              line-height: 1.35 !important;
            }
            .exporting-map .tactical-logo-container {
              padding: 6px 14px !important;
              gap: 8px !important;
            }
            .exporting-map .tactical-logo-title {
              font-size: 15px !important;
            }
            .exporting-map .tactical-logo-author {
              font-size: 8px !important;
            }
          }
          /* Hide logo and legend on mobile screens, but show them when exporting/copying */
          @media (max-width: 767px) {
            .tactical-logo-container-outer,
            .tactical-legend-container {
              display: none !important;
            }
            .exporting-map .tactical-logo-container-outer,
            .exporting-map .tactical-legend-container,
            .exporting-map #map-legend-widget-container {
              display: flex !important;
            }
          }
        `}</style>
      </div>

      {/* Real-time Air Alerts Layer */}
      <AirAlertsLayer
        map={mapInstanceRef.current}
        alerts={activeAlerts}
        showAlerts={showAlerts}
        showAlertPolygons={showAlertPolygons}
        showAlertMarkers={showAlertMarkers}
        alertsOpacity={alertsOpacity}
        alertsStrokeWidth={alertsStrokeWidth}
        language={language}
        onAlertClick={onAlertClick}
      />

      {/* Floating Screenshot Feedback Banner (Rendered OUTSIDE of map-stage-wrapper) */}
      {screenshotStatus && (
        <div className="absolute top-4 left-4 z-40 bg-slate-900/95 border border-white/15 px-3.5 py-2 rounded-xl text-[11px] text-slate-200 shadow-xl flex items-center gap-2 animate-pulse font-semibold tracking-wider uppercase font-mono transition-all">
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
          <span>{screenshotStatus}</span>
        </div>
      )}
    </div>
  );
});

MapContainer.displayName = 'MapContainer';