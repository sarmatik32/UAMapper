import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import L from 'leaflet';
import { toPng, toBlob } from 'html-to-image';
import { Check, Loader2, Search, X, MapPin, Ruler, ShieldAlert, PenTool, Hand, Trash2, Layers, Building2, Plus, Spline, Sparkles, Star, RotateCcw } from 'lucide-react';
import { CustomMarker, TileLayerConfig, Language, InteractionMode, DrawnLine, LineEndpointType } from '../types';
import { createMarkerHtml } from './IconLibrary';
import { SETTLEMENTS, Settlement, SettlementCategory, getSettlementCategory } from '../data/settlements';
import { smoothPolylinePoints, generateFadingPolylineSegments } from '../utils/smoothing';
import { createExplosionIcon, createCustomImageIcon, createFadeGlowIcon, createArrowIcon, createDotIcon, calculateBearing } from '../utils/lineIcons';

export interface MapContainerRef {
  exportPNG: () => void;
  copyPNG: () => void;
  centerOnLocation: (lat: number, lng: number, zoom?: number) => void;
  highlightZoneAt: (lat: number, lng: number, markerId?: string) => void;
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
  watermarkText?: string;
  showLegendOverlay?: boolean;
  legendOverlayText?: string;
  showRadarOverlay?: boolean;
  blurMapOnExport?: boolean;
  showSettlementLabels?: boolean;
  settlementLabelMode?: 'all' | 'districts_cities' | 'districts_only';
  disabledSettlementCategories?: SettlementCategory[];
  onToggleSettlementLabels?: (show: boolean) => void;
  onSetSettlementLabelMode?: (mode: 'all' | 'districts_cities' | 'districts_only') => void;
  showCityBoundary?: boolean;
  showDistrictBoundary?: boolean;
  showHromadaBoundaries?: boolean;
  onToggleHromadaBoundaries?: (show: boolean) => void;
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
  lineEndStyle?: LineEndpointType;
  lineEndCustomIcon?: string;
  lineEndIconRotation?: number;
  lineDashStyle?: 'solid' | 'dashed' | 'dotted';
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
  watermarkText = 'UA Mapper',
  showLegendOverlay = true,
  legendOverlayText = '',
  showRadarOverlay = true,
  blurMapOnExport = false,
  showSettlementLabels = true,
  settlementLabelMode = 'all',
  disabledSettlementCategories = [],
  onToggleSettlementLabels,
  onSetSettlementLabelMode,
  showCityBoundary = true,
  showDistrictBoundary = true,
  showHromadaBoundaries = true,
  onToggleHromadaBoundaries,
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
  lineEndStyle = 'none' as LineEndpointType,
  lineEndCustomIcon = '',
  lineEndIconRotation = 0,
  lineDashStyle = 'solid' as 'solid' | 'dashed' | 'dotted',
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
  
  // Measurement Tool State & Refs
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const measurePolylineRef = useRef<L.Polyline | null>(null);
  const measureMarkersRef = useRef<L.Marker[]>([]);
  const measureSegmentTooltipsRef = useRef<L.Marker[]>([]);

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
      endPointStyle: lineEndStyle,
      endCustomIconUrl: lineEndCustomIcon,
      endIconRotation: lineEndIconRotation,
    };
    onAddDrawnLine(newLine);
    setDraftLinePoints([]);
  }, [draftLinePoints, lineColor, lineWeight, lineSmoothed, lineDashStyle, lineStartStyle, lineStartCustomIcon, lineStartIconRotation, lineEndStyle, lineEndCustomIcon, lineEndIconRotation, onAddDrawnLine]);

  const handleFinishDraftLineRef = useRef(handleFinishDraftLine);
  useEffect(() => {
    handleFinishDraftLineRef.current = handleFinishDraftLine;
  }, [handleFinishDraftLine]);

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

      if (mapInstanceRef.current && itemGeojson) {
        try {
          const tempLayer = L.geoJSON(itemGeojson);
          const bounds = tempLayer.getBounds();
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { maxZoom: 14, animate: true, padding: [20, 20] });
          }
        } catch (e) {}
      }
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

        if (mapInstanceRef.current && settlementGeojson) {
          try {
            const tempLayer = L.geoJSON(settlementGeojson);
            const bounds = tempLayer.getBounds();
            if (bounds.isValid()) {
              mapInstanceRef.current.fitBounds(bounds, { maxZoom: 14, animate: true, padding: [20, 20] });
            }
          } catch (e) {}
        }
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

        if (mapInstanceRef.current && hromadaGeojson) {
          try {
            const tempLayer = L.geoJSON(hromadaGeojson);
            const bounds = tempLayer.getBounds();
            if (bounds.isValid()) {
              mapInstanceRef.current.fitBounds(bounds, { maxZoom: 13, animate: true, padding: [20, 20] });
            }
          } catch (e) {}
        }
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

  const handleClearAllAreas = () => {
    setSearchedAreas([]);
  };

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
          <div class="bg-slate-950/95 text-amber-300 border border-amber-500/80 px-2 py-0.5 rounded-md text-[12px] font-black tracking-wider uppercase whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            ${item.name}
          </div>
        `;
      } else if (item.priority === 1) {
        dotHtml = `<span class="w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-blue-500/80 shadow-[0_0_10px_rgba(34,211,238,0.9)] shrink-0"></span>`;
        labelHtml = `
          <div class="bg-slate-950/95 text-cyan-300 border border-cyan-400/80 px-2 py-0.5 rounded-md text-[11.5px] font-extrabold tracking-wide whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            ${item.name}
          </div>
        `;
      } else if (item.priority === 2) {
        dotHtml = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1.5 ring-emerald-500/70 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0"></span>`;
        labelHtml = `
          <div class="bg-slate-950/90 text-emerald-300 border border-emerald-400/70 px-1.5 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            ${item.name}
          </div>
        `;
      } else if (item.priority === 3) {
        dotHtml = `<span class="w-2 h-2 rounded-full bg-sky-300 ring-1 ring-sky-400/60 shadow-[0_0_5px_rgba(186,230,253,0.7)] shrink-0"></span>`;
        labelHtml = `
          <div class="bg-slate-950/90 text-sky-200 border border-sky-400/60 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold whitespace-nowrap shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            ${item.name}
          </div>
        `;
      } else {
        dotHtml = `<span class="w-1.5 h-1.5 rounded-full bg-slate-200 ring-1 ring-slate-400/50 shadow-[0_0_4px_rgba(255,255,255,0.5)] shrink-0"></span>`;
        labelHtml = `
          <div class="bg-slate-950/85 text-slate-100 border border-slate-700/80 px-1.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-[0_2px_5px_rgba(0,0,0,0.8)]">
            ${item.name}
          </div>
        `;
      }

      const htmlContent = `
        <div class="relative flex items-center cursor-pointer select-none group pointer-events-auto">
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
  }, [showSettlementLabels, settlementLabelMode, disabledSettlementCategories, customSettlements, isMapReady]);

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
        zoomSnap: 0.25,
        zoomDelta: 0.25,
        wheelPxPerZoomLevel: 120,
      });

      // Add a styled zoom control at top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Create custom Leaflet panes to control z-index layer ordering:
      // Red zones (320) < Settlement points & labels (350) < Drawn lines (450) < User markers/tactical icons (600)
      if (!map.getPane('redZonePane')) {
        const p = map.createPane('redZonePane');
        p.style.zIndex = '320';
      }
      if (!map.getPane('settlementPane')) {
        const p = map.createPane('settlementPane');
        p.style.zIndex = '350';
      }
      if (!map.getPane('drawnLinesPane')) {
        const p = map.createPane('drawnLinesPane');
        p.style.zIndex = '450';
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
        while (target && target !== mapContainerRef.current) {
          if (
            target.classList.contains('leaflet-marker-icon') ||
            target.classList.contains('measure-node-icon')
          ) {
            clickedMarker = true;
            break;
          }
          target = target.parentElement as HTMLElement;
        }

        if (!clickedMarker) {
          const mode = interactionModeRef.current;
          if (mode === 'line') {
            setDraftLinePoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
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
            style: {
              className: 'clean-district-outline',
              color: '#10b981',      // Clean green stroke
              weight: 1.5,           // Clean visible district line
              opacity: 0.9,          // High visibility above hromada lines
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
            style: {
              className: 'clean-district-outline',
              color: '#38bdf8',      // Sky blue thin outline for Kryvyi Rih City
              weight: 1.8,           // Slightly thicker crisp line
              dashArray: '4, 4',     // Dotted/dashed border
              opacity: 0.95,
              fill: true,
              fillColor: '#38bdf8',
              fillOpacity: 0.05,     // Subtle light fill for city bounds
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

  // Synchronize Measurement Tool Graphics on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old graphics
    if (measurePolylineRef.current) {
      measurePolylineRef.current.remove();
      measurePolylineRef.current = null;
    }
    measureMarkersRef.current.forEach((m) => m.remove());
    measureMarkersRef.current = [];
    measureSegmentTooltipsRef.current.forEach((m) => m.remove());
    measureSegmentTooltipsRef.current = [];

    if (measurePoints.length === 0) return;

    const latLngs = measurePoints.map((p) => [p.lat, p.lng] as [number, number]);

    // Draw connecting polyline
    if (latLngs.length >= 2) {
      measurePolylineRef.current = L.polyline(latLngs, {
        color: '#facc15', // Bright yellow ruler line
        weight: 3.5,
        dashArray: '6, 6',
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Render segment distance badges
      for (let i = 0; i < measurePoints.length - 1; i++) {
        const p1 = measurePoints[i];
        const p2 = measurePoints[i + 1];
        const dist = calculateDistanceMeters(p1, p2);
        const midLat = (p1.lat + p2.lat) / 2;
        const midLng = (p1.lng + p2.lng) / 2;

        const badgeHtml = `<div class="bg-slate-900/95 text-yellow-400 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/50 shadow-md whitespace-nowrap">${formatDistance(dist)}</div>`;

        const badgeIcon = L.divIcon({
          className: 'measure-badge-icon',
          html: badgeHtml,
          iconSize: [60, 20],
          iconAnchor: [30, 10],
        });

        const badgeMarker = L.marker([midLat, midLng], {
          icon: badgeIcon,
          interactive: false,
          zIndexOffset: 1200,
        }).addTo(map);

        measureSegmentTooltipsRef.current.push(badgeMarker);
      }
    }

    // Render node markers
    measurePoints.forEach((pt, index) => {
      const isLast = index === measurePoints.length - 1;
      const nodeHtml = `
        <div class="w-6 h-6 rounded-full ${isLast ? 'bg-amber-500 ring-4 ring-amber-500/30' : 'bg-slate-900'} border-2 border-yellow-400 text-yellow-400 font-mono font-bold text-[11px] flex items-center justify-center shadow-lg">
          ${index + 1}
        </div>
      `;

      const nodeIcon = L.divIcon({
        className: 'measure-node-icon',
        html: nodeHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([pt.lat, pt.lng], {
        icon: nodeIcon,
        interactive: false,
        zIndexOffset: 1500,
      }).addTo(map);

      measureMarkersRef.current.push(marker);
    });
  }, [measurePoints, isMapReady]);


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

    // Format tile URL
    let url = activeTileLayer.url;
    if (activeTileLayer.requiresKey) {
      url = url.replace('{key}', visicomKey || '');
    }

    // Create Leaflet TileLayer with high-resolution / retina support
    const tileLayer = L.tileLayer(url, {
      tms: activeTileLayer.tms,
      maxZoom: activeTileLayer.maxZoom,
      maxNativeZoom: activeTileLayer.maxZoom || 19,
      attribution: activeTileLayer.attribution,
      subdomains: activeTileLayer.subdomains || 'abc',
      crossOrigin: 'anonymous',
      detectRetina: false,
    });

    tileLayer.addTo(map);
    tileLayerInstanceRef.current = tileLayer;

    // Optional reference overlay layer (e.g. Esri Dark Gray Reference for oblasts/hromadas/settlements)
    if (activeTileLayer.overlayUrl) {
      const overlayLayer = L.tileLayer(activeTileLayer.overlayUrl, {
        maxZoom: activeTileLayer.maxZoom,
        maxNativeZoom: activeTileLayer.maxZoom || 19,
        subdomains: activeTileLayer.subdomains || 'abc',
        crossOrigin: 'anonymous',
        detectRetina: false,
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
        endLat, endLng
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
        zoneSize
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
      const hasEndHandle = (endPointStyle === 'explosion') || 
                           (endPointStyle === 'line' && isSelected);
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
          weight: 3,
          dashArray: '10, 5, 2, 5', // Dash-dotted style ("штрих пунктир")
          opacity: isSelected ? 0.95 : 0.6,
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
        } else if (endPointStyle === 'line') {
          // Arrowhead pointing in the direction of the line
          const arrowRotation = rotation % 360;
          const arrowHtml = `
            <div class="flex items-center justify-center" style="
              width: 32px;
              height: 32px;
              cursor: ${isSelected ? 'move' : 'default'};
              filter: drop-shadow(0 2px 5px rgba(0,0,0,0.6));
            ">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="transform: rotate(${arrowRotation}deg); overflow: visible;">
                <path d="M12 2L3 21L12 16.5L21 21L12 2Z" fill="${polylineColor}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
                ${isSelected ? `
                  <circle cx="12" cy="14" r="3" fill="#ffffff" />
                ` : ''}
              </svg>
            </div>
          `;
          endMarkerIcon = L.divIcon({
            className: 'custom-end-arrow',
            html: arrowHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
        } else {
          // endPointStyle === 'none', only show white handle when selected
          endMarkerIcon = L.divIcon({
            className: 'custom-end-handle',
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
        (marker.endPointStyle === 'explosion') ||
        (marker.endPointStyle === 'line' && isSelected)
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

        if (style === 'explosion') {
          return createExplosionIcon(line.color, line.weight);
        }
        if (style === 'custom_icon') {
          return createCustomImageIcon(customIconUrl || '', line.color, line.weight, bearing);
        }
        if (style === 'arrow') {
          return createArrowIcon(line.color, bearing, line.weight);
        }
        if (style === 'dot') {
          return createDotIcon(line.color, line.weight);
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
        if (lineStartStyle === 'explosion') startIcon = createExplosionIcon(lineColor, lineWeight);
        if (lineStartStyle === 'custom_icon') startIcon = createCustomImageIcon(lineStartCustomIcon, lineColor, lineWeight, startBearing);
        if (lineStartStyle === 'arrow') startIcon = createArrowIcon(lineColor, startBearing, lineWeight);
        if (lineStartStyle === 'dot') startIcon = createDotIcon(lineColor, lineWeight);

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
        if (lineEndStyle === 'explosion') endIcon = createExplosionIcon(lineColor, lineWeight);
        if (lineEndStyle === 'custom_icon') endIcon = createCustomImageIcon(lineEndCustomIcon, lineColor, lineWeight, endBearing);
        if (lineEndStyle === 'arrow') endIcon = createArrowIcon(lineColor, endBearing, lineWeight);
        if (lineEndStyle === 'dot') endIcon = createDotIcon(lineColor, lineWeight);

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

  // Keyboard shortcut listener for line drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (interactionModeRef.current === 'line' && draftLinePoints.length >= 2) {
        if (e.key === 'Enter') {
          handleFinishDraftLine();
        } else if (e.key === 'Escape') {
          setDraftLinePoints([]);
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

  const getFragmentUrl = useCallback((center: L.LatLng, width: number, height: number) => {
    const base = getVisicomFragmentBaseUrl();
    if (!base) return null;
    const lang = language === 'uk' ? '?lang=uk' : '?lang=en';
    const separator = lang.includes('?') ? '&' : '?';
    return `${base}/${mapInstanceRef.current?.getZoom() ?? 13}/${center.lng},${center.lat}/${Math.round(width)}/${Math.round(height)}.svg${lang}${separator}key=${encodeURIComponent(visicomKey)}`;
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

  const installVisicomHQBackground = async (mapElement: HTMLElement) => {
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

    try {
      for (let top = 0; top < height; top += VISICOM_FRAGMENT_MAX) {
        for (let left = 0; left < width; left += VISICOM_FRAGMENT_MAX) {
          const fragmentWidth = Math.min(VISICOM_FRAGMENT_MAX, width - left);
          const fragmentHeight = Math.min(VISICOM_FRAGMENT_MAX, height - top);

          // Fragment centre in Leaflet's global pixel coordinate system.
          const globalX = mapPixelOrigin.x + left - width / 2 + fragmentWidth / 2;
          const globalY = mapPixelOrigin.y + top - height / 2 + fragmentHeight / 2;
          const fragmentCenter = map.unproject(L.point(globalX, globalY), zoom);
          const url = getFragmentUrl(fragmentCenter, fragmentWidth, fragmentHeight);
          if (!url) throw new Error('Visicom fragment URL unavailable');
          urls.push(url);

          // Fetch + inline as a Blob URL. This avoids asking html-to-image to
          // dereference a remote SVG during its own clone/render pass.
          const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
          if (!response.ok) {
            throw new Error(`Visicom fragment HTTP ${response.status}`);
          }
          const svgBlob = await response.blob();
          if (!svgBlob.size) throw new Error('Empty Visicom SVG fragment');
          const objectUrl = URL.createObjectURL(svgBlob);
          objectUrls.push(objectUrl);

          const img = document.createElement('img');
          img.alt = '';
          img.draggable = false;
          img.decoding = 'async';
          img.style.position = 'absolute';
          img.style.left = `${left}px`;
          img.style.top = `${top}px`;
          img.style.width = `${fragmentWidth}px`;
          img.style.height = `${fragmentHeight}px`;
          img.style.display = 'block';
          img.style.maxWidth = 'none';
          img.style.maxHeight = 'none';
          img.src = objectUrl;

          background.appendChild(img);
          await waitForImageDecode(img);
        }
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
  const captureMapBlob = async (): Promise<Blob> => {
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
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

      // Prefer the native Visicom fragment background. If the API key, CORS,
      // network, or account restrictions prevent it, fall back to the normal
      // Leaflet capture instead of breaking export altogether.
      if (getVisicomFragmentBaseUrl()) {
        try {
          hqBackground = await installVisicomHQBackground(mapElement);
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

      const width = mapElement.clientWidth;
      const height = mapElement.clientHeight;
      const maxOutputDimension = 4096;
      const requestedRatio = 2.5;
      const browserPixelRatio = window.devicePixelRatio || 1;
      const sizeCapRatio = maxOutputDimension / Math.max(width, height, 1);
      const capturePixelRatio = Math.max(
        1.5,
        Math.min(requestedRatio, Math.max(2, browserPixelRatio), sizeCapRatio)
      );

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

      const captureOptions = {
        cacheBust: false,
        backgroundColor: theme === 'light' ? '#f8fafc' : '#020617',
        pixelRatio: capturePixelRatio,
        quality: 1,
        skipFonts: false,
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
    setScreenshotStatus(language === 'uk' ? 'Підготовка карти (Visicom HQ)...' : 'Preparing map (Visicom HQ)...');
    try {
      const blob = await captureMapBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `tactical_map_${Date.now()}.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  const handleCopyPNG = async () => {
    const mapElement = prepareExportState();
    if (!mapElement) return;
    setIsCopying(true);
    setScreenshotStatus(language === 'uk' ? 'Копіювання в буфер...' : 'Copying to clipboard...');
    let blob: Blob | null = null;
    try {
      blob = await captureMapBlob();
      if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') {
        throw new Error('Clipboard image API is unavailable');
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setScreenshotStatus(language === 'uk' ? 'Зображення скопійовано!' : 'Map copied to clipboard!');
      setTimeout(() => setScreenshotStatus(null), 2500);
    } catch (err) {
      console.warn('Clipboard write failed, using the same rendered PNG as fallback:', err);
      try {
        if (!blob) throw new Error('PNG blob was not created');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `tactical_map_${Date.now()}.png`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setScreenshotStatus(language === 'uk' ? 'Збережено як файл (буфер заблоковано)' : 'Downloaded as file (clipboard restricted)');
        setTimeout(() => setScreenshotStatus(null), 2500);
      } catch (fallbackErr) {
        console.error('Clipboard fallback failed:', fallbackErr);
        setScreenshotStatus(language === 'uk' ? 'Помилка копіювання' : 'Copy failed');
        setTimeout(() => setScreenshotStatus(null), 2500);
      }
    } finally {
      cleanupExportState(mapElement);
      setIsCopying(false);
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    exportPNG: handleExportPNG,
    copyPNG: handleCopyPNG,
    centerOnLocation: (lat: number, lng: number, zoom?: number) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], zoom || 13, { animate: true });
      }
    },
    highlightZoneAt: (lat: number, lng: number, markerId?: string) => {
      handleAutoHighlightZoneAt(lat, lng, markerId);
    }
  }));

  // Setup dynamic watermark tiling background
  const watermarkTextFill = theme === 'light' ? '#000000' : '#ffffff';
  const displayWatermarkText = watermarkText || 'UA Mapper';
  const watermarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="150"><text x="20" y="90" fill="${watermarkTextFill}" font-size="14" font-family="system-ui, sans-serif" font-weight="900" transform="rotate(-30 20 90)" opacity="0.10">${displayWatermarkText}</text></svg>`;
  const watermarkUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(watermarkSvg)}")`;

  return (
    <div className="relative w-full h-full">
      <div id="map-stage-wrapper" className={`relative w-full h-full overflow-hidden ${theme === 'light' ? 'bg-slate-50' : 'bg-slate-950'}`}>
        {/* Actual Map Container */}
        <div 
          id="visicom-leaflet-map"
          ref={mapContainerRef} 
          className={`w-full h-full z-10 ${theme === 'dark' && !activeTileLayer.isDark ? 'dark-map' : ''}`}
        />

        {/* Floating Search Panel */}
        {!(isExporting || isCopying) && (
          <div ref={searchContainerRef} className="absolute top-4 left-4 z-20 w-72 sm:w-88 flex flex-col gap-2">
            
            {/* Search Input Bar */}
            <form onSubmit={handleFormSubmitSearch} className={`relative flex items-center border rounded-2xl shadow-xl transition-all ${
              theme === 'light' 
                ? 'bg-white/95 border-slate-200 text-slate-800' 
                : 'bg-slate-950/90 border-white/10 text-slate-200'
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
              {/* Urban Districts of Kryvyi Rih (Circular Buttons with Initial Letter) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-0.5">
                  <span>{language === 'uk' ? 'Райони м. Кривий Ріг' : 'Kryvyi Rih Districts'}</span>
                  <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">
                    {language === 'uk' ? '(натисніть для виділення)' : '(click to highlight)'}
                  </span>
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
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center relative shadow-sm ${
                          isHighlighted
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-md ring-2 ring-red-400/80 scale-105'
                            : theme === 'light'
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80 hover:border-slate-400'
                              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-white/10 hover:border-white/20'
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
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {/* Toggle for Dark Gray Hromada Demarcation Lines */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleHromadaBoundaries?.(!showHromadaBoundaries);
                  }}
                  title={language === 'uk' ? 'Відображення темно-сірих ліній розмежування по громадам' : 'Toggle dark gray hromada boundaries'}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                    showHromadaBoundaries
                      ? 'bg-slate-700 hover:bg-slate-800 border-slate-600 text-white shadow-sm ring-1 ring-slate-500/50 font-extrabold'
                      : theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                        : 'bg-slate-900 hover:bg-slate-800 border-white/5 text-slate-400'
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
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                          isHighlighted
                            ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white shadow-sm ring-1 ring-red-400/50'
                            : dist.id === 'kryvorizkyi_raion' || dist.id === 'kryvyi_rih_city'
                              ? 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30 text-blue-600 dark:text-blue-300 font-extrabold'
                              : theme === 'light'
                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                                : 'bg-slate-900 hover:bg-slate-800 border-white/5 text-slate-300'
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
            </div>


            {/* Suggestions Dropdown */}
            {showDropdown && (searchQuery.trim().length >= 2 || isSearching || searchResults.length > 0) && (
              <div className={`border rounded-2xl shadow-2xl max-h-64 overflow-y-auto z-30 transition-all ${
                theme === 'light' 
                  ? 'bg-white/95 border-slate-200 text-slate-800' 
                  : 'bg-slate-950/95 border-white/10 text-slate-200'
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
                              <Plus className="w-3 h-3" />
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

            {/* List of active highlighted areas */}
            {searchedAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto py-1">
                {searchedAreas.map((area) => {
                  const isSavedInCustom = customQuickZones.some(
                    (q) => q.label.toLowerCase() === area.name.trim().toLowerCase() || q.fullName.toLowerCase() === area.name.trim().toLowerCase()
                  );
                  return (
                    <div
                      key={area.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border bg-red-500/10 border-red-500/30 text-red-400 shadow-sm"
                    >
                      <span>{area.name}</span>
                      
                      {/* Button to add active zone to favorites */}
                      <button
                        type="button"
                        onClick={() => addZoneToQuickButtons(area.name, area.geojson, area.lat, area.lon)}
                        disabled={isSavedInCustom}
                        title={isSavedInCustom ? (language === 'uk' ? 'Уже в обраному' : 'Already in favorites') : (language === 'uk' ? 'Додати в обране' : 'Add to favorites')}
                        className={`p-0.5 rounded transition-colors ${
                          isSavedInCustom ? 'text-amber-400 cursor-default' : 'text-slate-400 hover:text-amber-400 cursor-pointer'
                        }`}
                      >
                        <Star className={`w-2.5 h-2.5 ${isSavedInCustom ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleRemoveArea(area.id)}
                        className="hover:text-red-200 transition-colors cursor-pointer"
                        title={language === 'uk' ? 'Прибрати виділення' : 'Remove highlight'}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
                
                {/* Clear All pill */}
                {searchedAreas.length > 1 && (
                  <button
                    onClick={handleClearAllAreas}
                    className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                    }`}
                  >
                    {language === 'uk' ? 'Очистити все' : 'Clear all'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tiled watermark */}
        <div 
          className="absolute inset-0 pointer-events-none z-[12]" 
          style={{ 
            backgroundImage: watermarkUrl,
            backgroundRepeat: 'repeat',
            backgroundSize: '220px 150px'
          }} 
        />

        {/* Tactical Legend Box - captured in PNG */}
        {showLegendOverlay && (
          <div className={`tactical-legend-container absolute left-0 right-0 z-20 select-none pointer-events-none transition-all duration-300 flex justify-center ${
            (selectedMarkerId && !(isExporting || isCopying)) ? 'bottom-[250px] md:bottom-6' : 'bottom-6'
          }`}>
            <div className={`tactical-legend-wrapper px-4 py-2 md:px-6 md:py-1.5 border rounded-2xl md:rounded-full shadow-2xl transition-all flex items-center justify-center max-w-[92vw] sm:max-w-[85vw] pointer-events-auto ${
              theme === 'light' 
                ? 'bg-slate-950/50 border-slate-900/30 text-slate-100' 
                : 'bg-white/50 border-white/20 text-slate-950'
            }`}>
              <p 
                className="tactical-legend-text font-aptos text-[7.5px] sm:text-[8px] md:text-[9px] font-bold opacity-95 text-center whitespace-normal md:whitespace-nowrap leading-relaxed"
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
          <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto flex flex-col items-center gap-2 max-w-[95vw] animate-fade-in">
            <div className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-center gap-2 sm:gap-3.5 ${
              theme === 'light'
                ? 'bg-slate-900/90 border-slate-700/80 text-white'
                : 'bg-slate-950/90 border-white/20 text-white'
            }`}>
              {/* Line Status Info */}
              <div className="flex items-center gap-2 border-r border-white/20 pr-2.5 sm:pr-3.5">
                <PenTool className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                    {language === 'uk' ? 'Нанесення лінії' : 'Line Drawing'}
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
                          <span className="ml-1.5 text-amber-300 font-bold">
                            ({(calculateDraftLineDistance() >= 1000 
                              ? `${(calculateDraftLineDistance() / 1000).toFixed(2)} км` 
                              : `${Math.round(calculateDraftLineDistance())} м`)})
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Control Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Undo last vertex point */}
                <button
                  onClick={() => setDraftLinePoints((prev) => prev.slice(0, -1))}
                  disabled={draftLinePoints.length === 0}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 text-xs font-bold border border-amber-500/30 cursor-pointer active:scale-95"
                  title={language === 'uk' ? 'Скасувати останню точку' : 'Undo last vertex'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{language === 'uk' ? 'Скасувати точку' : 'Undo Point'}</span>
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
            </div>
          </div>
        )}

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
          <div className={`tactical-logo-container px-4 py-1.5 rounded-full border flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2 shadow-2xl transition-all max-w-[95vw] ${
            theme === 'light' 
              ? 'bg-slate-950/50 border-slate-900/30' 
              : 'bg-white/50 border-white/20'
          }`}>
            <span 
              className="tactical-logo-title font-sans font-bold tracking-tight text-[15.5px] sm:text-[18.5px] leading-none flex items-center"
              style={{ color: theme === 'light' ? 'rgb(225, 255, 0)' : 'rgb(255, 0, 0)' }}
            >
              UA Mapper
            </span>
            <span className={`inline-block w-[1px] h-3.5 mx-0.5 sm:mx-1 self-center ${
              theme === 'light' ? 'bg-white/20' : 'bg-slate-950/20'
            }`} />
            <span className={`tactical-logo-author font-sans font-bold tracking-wider uppercase leading-none flex items-center text-[8.5px] sm:text-[9.5px] ${
              theme === 'light' ? 'text-white' : 'text-slate-950'
            }`}>
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
          .leaflet-container {
            font-family: inherit;
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
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: high-quality !important;
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
            font-size: 18.5px !important;
          }
          .exporting-map .tactical-logo-author {
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
            .exporting-map .tactical-legend-container {
              display: flex !important;
            }
          }
        `}</style>
      </div>

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