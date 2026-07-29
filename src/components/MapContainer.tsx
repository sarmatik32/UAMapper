import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import { toPng, toBlob } from 'html-to-image';
import { Check, Loader2, Search, X, MapPin, Ruler, ShieldAlert, PenTool, Hand, Trash2, Layers } from 'lucide-react';
import { CustomMarker, TileLayerConfig, Language, InteractionMode } from '../types';
import { createMarkerHtml } from './IconLibrary';

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

const QUICK_DISTRICTS = [
  { id: 'kryvorizkyi_raion', label: 'Криворізький район', query: 'Криворізький район, Дніпропетровська область' },
  { id: 'kryvyi_rih_city', label: 'м. Кривий Ріг', query: 'Кривий Ріг, Дніпропетровська область' },
  { id: 'saksahanskyi', label: 'Саксаганський р-н', query: 'Саксаганський район, Кривий Ріг' },
  { id: 'ternivskyi', label: 'Тернівський р-н', query: 'Тернівський район, Кривий Ріг' },
  { id: 'metalurhiinyi', label: 'Металургійний р-н', query: 'Металургійний район, Кривий Ріг' },
  { id: 'inhuletskyi', label: 'Інгулецький р-н', query: 'Інгулецький район, Кривий Ріг' },
  { id: 'pokrovskyi', label: 'Покровський р-н', query: 'Покровський район, Кривий Ріг' },
  { id: 'dolhintsevskyi', label: 'Довгинцівський р-н', query: 'Довгинцівський район, Кривий Ріг' },
  { id: 'tsentralno_miskyi', label: 'Центрально-Міський р-н', query: 'Центрально-Міський район, Кривий Ріг' },
  { id: 'radushne', label: 'смт Радушне', query: 'Радушне, Дніпропетровська область' },
  { id: 'apostolove', label: 'м. Апостолове', query: 'Апостолове, Дніпропетровська область' },
  { id: 'shyroke', label: 'смт Широке', query: 'Широке, Дніпропетровська область' },
  { id: 'sofiivka', label: 'смт Софіївка', query: 'Софіївка, Криворізький район' },
  { id: 'zelenodolsk', label: 'м. Зеленодольськ', query: 'Зеленодольськ, Дніпропетровська область' },
  { id: 'lozuravatka', label: 'с. Лозуватка', query: 'Лозуватка, Криворізький район' },
  { id: 'heikivka', label: 'смт Гейківка', query: 'Гейківка, Криворізький район' },
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
}, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerInstanceRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const linesRef = useRef<{ [id: string]: L.Polyline }>({});
  const endMarkersRef = useRef<{ [id: string]: L.Marker }>({});
  
  // Measurement Tool State & Refs
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const measurePolylineRef = useRef<L.Polyline | null>(null);
  const measureMarkersRef = useRef<L.Marker[]>([]);
  const measureSegmentTooltipsRef = useRef<L.Marker[]>([]);

  // Red Zone Loading state
  const [isAddingRedZone, setIsAddingRedZone] = useState<boolean>(false);

  // Auto-highlight Zone Toast notification state
  const [lastAutoZoneName, setLastAutoZoneName] = useState<string | null>(null);

  const autoHighlightZoneRef = useRef(autoHighlightZone);
  useEffect(() => {
    autoHighlightZoneRef.current = autoHighlightZone;
  }, [autoHighlightZone]);

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

  // Handle Auto-highlight Zone creation at coordinates (supports Kryvyi Rih districts, city districts, hromadas)
  const handleAutoHighlightZoneAt = async (lat: number, lng: number, markerId?: string) => {
    try {
      // 1. Try zoom=14 for city district / suburb / borough level (e.g. Саксаганський, Металургійний, Покровський)
      let url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&polygon_geojson=1&zoom=14&accept-language=uk`;
      let response = await fetch(url);
      let data = response.ok ? await response.json() : null;

      // Check if data has a valid boundary Polygon/MultiPolygon
      if (!data?.geojson || (data.geojson.type !== 'Polygon' && data.geojson.type !== 'MultiPolygon')) {
        // 2. Fallback to zoom=12 (city / hromada level)
        url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&polygon_geojson=1&zoom=12&accept-language=uk`;
        response = await fetch(url);
        data = response.ok ? await response.json() : null;
      }

      if (!data?.geojson || (data.geojson.type !== 'Polygon' && data.geojson.type !== 'MultiPolygon')) {
        // 3. Fallback to default (zoom=18)
        url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&polygon_geojson=1&accept-language=uk`;
        response = await fetch(url);
        data = response.ok ? await response.json() : null;
      }

      if (data && data.geojson && (data.geojson.type === 'Polygon' || data.geojson.type === 'MultiPolygon')) {
        const address = data.address || {};
        const districtOrSuburb = data.name || address.borough || address.suburb || address.city_district;
        const cityName = formatCityName(address);

        let placeName = districtOrSuburb || cityName || data.display_name?.split(',')[0] || 'Зона';
        if (districtOrSuburb && cityName && districtOrSuburb !== cityName && !districtOrSuburb.includes(cityName)) {
          placeName = `${districtOrSuburb} (${cityName})`;
        }

        const geojson = data.geojson;
        const zoneId = markerId ? `autozone_marker_${markerId}` : `autozone_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        const newArea: SearchedArea = {
          id: zoneId,
          markerId: markerId,
          name: placeName,
          lat: lat.toString(),
          lon: lng.toString(),
          geojson: geojson
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
        // If no boundary polygon is returned by Nominatim, clean up any previous zone for this marker
        if (markerId) {
          setSearchedAreas((prev) =>
            prev.filter((a) => a.markerId !== markerId && a.id !== `autozone_marker_${markerId}` && a.id !== `autozone_${markerId}`)
          );
        }
      }
    } catch (e) {
      console.error('Error auto-highlighting zone:', e);
    }
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

  // Handle Red Zone creation by clicking on map coordinates
  const handleCreateRedZoneAt = async (lat: number, lng: number) => {
    setIsAddingRedZone(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&polygon_geojson=1&accept-language=uk`
      );
      if (response.ok) {
        const data = await response.json();
        const placeName = data.address?.village || data.address?.town || data.address?.city || data.address?.suburb || data.display_name?.split(',')[0] || 'Червона зона';
        const geojson = data.geojson;

        if (geojson && (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon')) {
          const newArea: SearchedArea = {
            id: `redzone_${Date.now()}`,
            name: `${placeName} (Червона зона)`,
            lat: lat.toString(),
            lon: lng.toString(),
            geojson: geojson
          };
          setSearchedAreas((prev) => [...prev, newArea]);
        } else {
          // Fallback to circular 2.5km danger zone polygon
          const circleGeojson = createCircleGeoJson(lat, lng, 2500);
          const newArea: SearchedArea = {
            id: `redzone_circle_${Date.now()}`,
            name: `${placeName} (Зона 2.5 км)`,
            lat: lat.toString(),
            lon: lng.toString(),
            geojson: circleGeojson
          };
          setSearchedAreas((prev) => [...prev, newArea]);
        }
      }
    } catch (e) {
      console.error('Error reverse geocoding red zone:', e);
    } finally {
      setIsAddingRedZone(false);
    }
  };

  // Search handler
  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    setShowDropdown(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          queryText
        )}&format=json&polygon_geojson=1&countrycodes=ua&accept-language=uk&limit=8`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter out places with valid polygon geometries first, fallback to all if empty
        const filtered = data.filter(
          (item: any) =>
            item.geojson &&
            (item.geojson.type === 'Polygon' ||
              item.geojson.type === 'MultiPolygon')
        );
        setSearchResults(filtered.length > 0 ? filtered : data);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error('Error searching:', e);
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

  const handleToggleDistrict = async (district: typeof QUICK_DISTRICTS[0]) => {
    // Check if it's already highlighted
    const existing = searchedAreas.find((area) => area.districtId === district.id);
    if (existing) {
      handleRemoveArea(existing.id);
      return;
    }

    setLoadingDistrict(district.id);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          district.query
        )}&format=json&polygon_geojson=1&countrycodes=ua&accept-language=uk&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          // Find the first result with a polygon geometry that is in Dnipropetrovsk oblast or Kryvyi Rih
          const item = data.find(
            (it: any) =>
              it.geojson &&
              (it.geojson.type === 'Polygon' || it.geojson.type === 'MultiPolygon') &&
              (it.display_name.includes('Крив') || it.display_name.includes('Дніпро'))
          ) || data.find(
            (it: any) =>
              it.geojson &&
              (it.geojson.type === 'Polygon' || it.geojson.type === 'MultiPolygon')
          ) || data[0];

          const map = mapInstanceRef.current;
          if (map) {
            const newArea: SearchedArea = {
              id: item.osm_id ? `${item.osm_type}_${item.osm_id}` : `search_${Date.now()}`,
              name: district.label,
              lat: item.lat,
              lon: item.lon,
              geojson: item.geojson,
              districtId: district.id
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
      const newArea: SearchedArea = {
        id: item.osm_id ? `${item.osm_type}_${item.osm_id}` : `search_${Date.now()}`,
        name: item.display_name.split(',')[0] || item.display_name,
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
        const geojsonLayer = L.geoJSON(area.geojson, {
          style: {
            color: '#ef4444',      // Red contour
            fillColor: '#ef4444',  // Red fill
            fillOpacity: 0.15,     // 85% transparency (15% opacity)
            weight: 2,             // Stroke width
            opacity: 1,            // Stroke opacity
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
  }, [searchedAreas, language]);

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
  
  const interactionModeRef = useRef(interactionMode);
  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  const onAddMarkerRef = useRef(onAddMarker);
  const onSelectMarkerRef = useRef(onSelectMarker);

  useEffect(() => {
    onAddMarkerRef.current = onAddMarker;
  }, [onAddMarker]);

  useEffect(() => {
    onSelectMarkerRef.current = onSelectMarker;
  }, [onSelectMarker]);
  
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
      });

      // Add a styled zoom control at top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

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
          if (mode === 'measure') {
            setMeasurePoints((prev) => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
          } else if (mode === 'redzone') {
            handleCreateRedZoneAt(e.latlng.lat, e.latlng.lng);
          } else if (mode === 'draw') {
            onSelectMarkerRef.current(null);
            const newMarkerId = onAddMarkerRef.current(e.latlng.lat, e.latlng.lng);
            if (autoHighlightZoneRef.current) {
              handleAutoHighlightZoneAt(e.latlng.lat, e.latlng.lng, typeof newMarkerId === 'string' ? newMarkerId : undefined);
            }
          } else {
            onSelectMarkerRef.current(null);
          }
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Component unmount clean-up
    };
  }, []);

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
  }, [measurePoints]);


  // Handle Tile Layer changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layer if any
    if (tileLayerInstanceRef.current) {
      map.removeLayer(tileLayerInstanceRef.current);
    }

    // Format tile URL
    let url = activeTileLayer.url;
    if (activeTileLayer.requiresKey) {
      url = url.replace('{key}', visicomKey || '');
    }

    // Replace {r} with @2x on high-DPI screens, or empty string on standard screens
    const isRetina = L.Browser.retina;
    url = url.replace('{r}', isRetina ? '@2x' : '');

    // Create Leaflet TileLayer with appropriate settings
    const tileLayer = L.tileLayer(url, {
      tms: activeTileLayer.tms,
      maxZoom: activeTileLayer.maxZoom,
      maxNativeZoom: activeTileLayer.maxZoom || 19,
      attribution: activeTileLayer.attribution,
      subdomains: activeTileLayer.subdomains || 'abc',
      crossOrigin: 'anonymous', // Enable CORS for screenshots
      detectRetina: false, // Prevent double-zoom on non-retina-supported tiles like OSM (fixes slow load & 404s)
    });

    tileLayer.addTo(map);
    tileLayerInstanceRef.current = tileLayer;
  }, [activeTileLayer, visicomKey]);

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
      const hasOrphaned = prev.some((a) => a.markerId && !validMarkerIds.has(a.markerId));
      if (!hasOrphaned) return prev;
      return prev.filter((a) => !a.markerId || validMarkerIds.has(a.markerId));
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
        existingMarker.setLatLng([lat, lng]);
        existingMarker.setIcon(customIcon);
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
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(map);

        newMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectMarker(id);
        });

        markersRef.current[id] = newMarker;
        markerInstance = newMarker;
      }

      // Re-bind drag events dynamically to capture correct markerData variables
      markerInstance.off('dragstart drag dragend');

      const hasEndPoint = endPointStyle && endPointStyle !== 'none';
      const hasEndHandle = (endPointStyle === 'explosion') || 
                           (endPointStyle === 'line') || 
                           (endPointStyle === 'none' && isSelected);
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
            const angleRad = ((rotation - 9) * Math.PI) / 180;
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
            const angleRad = ((rotation - 9) * Math.PI) / 180;
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
              const angleRad = ((rotation - 9) * Math.PI) / 180;
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
          const angleRad = ((rotation - 9) * Math.PI) / 180;
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
          const angleRad = ((rotation - 9) * Math.PI) / 180;
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
          const angleRad = ((rotation - 9) * Math.PI) / 180;
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
          // Arrowhead pointing in the direction of the line (rotation - 9)
          const arrowRotation = (rotation - 9) % 360;
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
          endMarkerInstance.setLatLng([finalEndLat, finalEndLng]);
          endMarkerInstance.setIcon(endMarkerIcon);
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

          // Update rotation real-time inside DOM (with 9 degrees shift)
          const mainMarkerEl = markersRef.current[id]?.getElement();
          if (mainMarkerEl) {
            const rotatingDiv = mainMarkerEl.querySelector('div[style*="transform: rotate"]');
            if (rotatingDiv) {
              (rotatingDiv as HTMLElement).style.transform = `rotate(${(angleDeg + 9) % 360}deg)`;
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
              rotation: Math.round((angleDeg + 9) % 360),
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
        (marker.endPointStyle === 'line' && isSelected) ||
        (marker.endPointStyle === 'none' && isSelected)
      );
      if (!hasEndHandle) {
        if (endMarkersRef.current[id]) {
          endMarkersRef.current[id].remove();
          delete endMarkersRef.current[id];
        }
      }
    });
  }, [markers, selectedMarkerId, onSelectMarker, onUpdateMarkerPosition, onUpdateMarker]);

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
  }, [selectedMarkerId, markers]);

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

  const handleExportPNG = async () => {
    const mapElement = document.getElementById('map-stage-wrapper');
    if (!mapElement) return;
    mapElement.classList.add('exporting-map');
    if (theme === 'dark') {
      mapElement.classList.add('exporting-dark-map');
    }
    if (blurMapOnExport) {
      mapElement.classList.add('exporting-map-blur');
    }
    setIsExporting(true);
    setScreenshotStatus(language === 'uk' ? 'Підготовка карти (4x Ultra HQ)...' : 'Preparing map (4x Ultra HQ)...');
    
    try {
      // Hide standard Leaflet UI controls briefly
      const elementsToHide = mapElement.querySelectorAll('.leaflet-control-container, .screenshot-exclude, .custom-end-handle');
      elementsToHide.forEach((el) => {
        (el as HTMLElement).style.opacity = '0';
      });

      // Convert translate3d to 2D translate for proper SVG serialization in html-to-image while preserving rotates/scales
      const elementsWithTransform = mapElement.querySelectorAll('.leaflet-pane, .leaflet-layer, .leaflet-tile-pane img, .leaflet-marker-pane img, .leaflet-marker-pane div, .leaflet-shadow-pane img, .leaflet-overlay-pane svg, .leaflet-zoom-animated');
      elementsWithTransform.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const transform = htmlEl.style.transform;
        if (transform && transform.includes('translate3d')) {
          const newTransform = transform.replace(/translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)/g, 'translate($1, $2)');
          htmlEl.setAttribute('data-original-transform', transform);
          htmlEl.style.transform = newTransform;
        }
      });

      // Wait 600ms for browser layout repaint, tile rendering stability, and CSS class application
      await new Promise((resolve) => setTimeout(resolve, 600));

      setScreenshotStatus(language === 'uk' ? 'Генерація зображення...' : 'Generating image...');

      const sourceWidth = mapElement.clientWidth || mapElement.offsetWidth;
      const sourceHeight = mapElement.clientHeight || mapElement.offsetHeight;

      // Scale factor for true ultra-HD vector/font rasterization (2x or device ratio)
      const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
      const scaledWidth = Math.round(sourceWidth * scale);
      const scaledHeight = Math.round(sourceHeight * scale);

      const captureOptions = {
        cacheBust: true,
        backgroundColor: theme === 'light' ? '#f8fafc' : '#020617',
        width: scaledWidth,
        height: scaledHeight,
        canvasWidth: scaledWidth,
        canvasHeight: scaledHeight,
        style: {
          width: `${sourceWidth}px`,
          height: `${sourceHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          margin: '0',
          padding: '0',
        },
        skipFonts: true, // Prevent loading errors blocking rendering
        fontEmbedCSS: '', // Standardize safe local font usage
        imagePlaceholder: undefined,
        filter: () => true,
      };

      // Workaround: render twice to force html-to-image cache warm-up (guarantees tiles/icons render on first export)
      await toPng(mapElement, captureOptions);
      
      setScreenshotStatus(language === 'uk' ? 'Формування PNG...' : 'Assembling PNG...');
      const dataUrl = await toPng(mapElement, captureOptions);

      // Restore elements
      elementsToHide.forEach((el) => {
        (el as HTMLElement).style.opacity = '1';
      });

      const link = document.createElement('a');
      link.download = `tactical_map_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      setScreenshotStatus(language === 'uk' ? 'Зображення завантажено!' : 'Map downloaded successfully!');
      setTimeout(() => setScreenshotStatus(null), 3000);
    } catch (err) {
      console.error('Export error', err);
      setScreenshotStatus(language === 'uk' ? 'Помилка експорту' : 'Export failed');
      setTimeout(() => setScreenshotStatus(null), 3000);
    } finally {
      // Restore CSS transforms
      const elementsWithTransform = mapElement.querySelectorAll('[data-original-transform]');
      elementsWithTransform.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const origTransform = htmlEl.getAttribute('data-original-transform');
        if (origTransform) {
          htmlEl.style.transform = origTransform;
          htmlEl.removeAttribute('data-original-transform');
        }
      });

      mapElement.classList.remove('exporting-map');
      mapElement.classList.remove('exporting-dark-map');
      mapElement.classList.remove('exporting-map-blur');
      setIsExporting(false);
    }
  };

  const handleCopyPNG = async () => {
    const mapElement = document.getElementById('map-stage-wrapper');
    if (!mapElement) return;
    mapElement.classList.add('exporting-map');
    if (theme === 'dark') {
      mapElement.classList.add('exporting-dark-map');
    }
    if (blurMapOnExport) {
      mapElement.classList.add('exporting-map-blur');
    }
    setIsCopying(true);
    setScreenshotStatus(language === 'uk' ? 'Підготовка карти до копіювання (4x Ultra HQ)...' : 'Preparing map for copy (4x Ultra HQ)...');
    
    try {
      // Hide standard UI controls
      const elementsToHide = mapElement.querySelectorAll('.leaflet-control-container, .screenshot-exclude, .custom-end-handle');
      elementsToHide.forEach((el) => {
        (el as HTMLElement).style.opacity = '0';
      });

      // Convert translate3d to 2D translate for proper SVG serialization in html-to-image while preserving rotates/scales
      const elementsWithTransform = mapElement.querySelectorAll('.leaflet-pane, .leaflet-layer, .leaflet-tile-pane img, .leaflet-marker-pane img, .leaflet-marker-pane div, .leaflet-shadow-pane img, .leaflet-overlay-pane svg, .leaflet-zoom-animated');
      elementsWithTransform.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const transform = htmlEl.style.transform;
        if (transform && transform.includes('translate3d')) {
          const newTransform = transform.replace(/translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)/g, 'translate($1, $2)');
          htmlEl.setAttribute('data-original-transform', transform);
          htmlEl.style.transform = newTransform;
        }
      });

      // Wait 600ms for browser layout repaint, tile rendering stability, and CSS class application
      await new Promise((resolve) => setTimeout(resolve, 600));

      setScreenshotStatus(language === 'uk' ? 'Рендеринг високої якості...' : 'High quality rendering...');

      const sourceWidth = mapElement.clientWidth || mapElement.offsetWidth;
      const sourceHeight = mapElement.clientHeight || mapElement.offsetHeight;

      const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
      const scaledWidth = Math.round(sourceWidth * scale);
      const scaledHeight = Math.round(sourceHeight * scale);

      const captureOptions = {
        cacheBust: true,
        backgroundColor: theme === 'light' ? '#f8fafc' : '#020617',
        width: scaledWidth,
        height: scaledHeight,
        canvasWidth: scaledWidth,
        canvasHeight: scaledHeight,
        style: {
          width: `${sourceWidth}px`,
          height: `${sourceHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          margin: '0',
          padding: '0',
        },
        skipFonts: true,
        fontEmbedCSS: '',
        imagePlaceholder: undefined,
        filter: () => true,
      };

      // Workaround: render twice to force html-to-image cache warm-up (guarantees tiles/icons render on first export)
      await toPng(mapElement, captureOptions);
      
      setScreenshotStatus(language === 'uk' ? 'Копіювання в буфер...' : 'Copying to clipboard...');
      const dataUrl = await toPng(mapElement, captureOptions);

      // Restore elements
      elementsToHide.forEach((el) => {
        (el as HTMLElement).style.opacity = '1';
      });

      if (!dataUrl) {
        throw new Error('PNG generation returned empty data');
      }

      // Manual base64 to Blob conversion (extremely robust)
      const parts = dataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });

      if (blob) {
        if (navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            setScreenshotStatus(language === 'uk' ? 'Зображення скопійовано!' : 'Map copied to clipboard!');
          } catch (clipErr) {
            console.warn('Clipboard write blocked, using fallback download:', clipErr);
            // Automatic fallback to download
            const link = document.createElement('a');
            link.download = `tactical_map_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            setScreenshotStatus(language === 'uk' ? 'Збережено як файл (буфер заблоковано)' : 'Downloaded as file (clipboard restricted)');
          }
        } else {
          // Fallback: trigger download when ClipboardItem is not supported
          const link = document.createElement('a');
          link.download = `tactical_map_${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
          setScreenshotStatus(language === 'uk' ? 'Завантажено (копіювання недоступне)' : 'Downloaded (copy unavailable)');
        }
      } else {
        throw new Error('Blob creation failed');
      }
      setTimeout(() => setScreenshotStatus(null), 3000);
    } catch (err) {
      console.error('Clipboard copy error', err);
      setScreenshotStatus(language === 'uk' ? 'Помилка копіювання' : 'Copy failed');
      setTimeout(() => setScreenshotStatus(null), 3000);
    } finally {
      // Restore CSS transforms
      const elementsWithTransform = mapElement.querySelectorAll('[data-original-transform]');
      elementsWithTransform.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const origTransform = htmlEl.getAttribute('data-original-transform');
        if (origTransform) {
          htmlEl.style.transform = origTransform;
          htmlEl.removeAttribute('data-original-transform');
        }
      });

      mapElement.classList.remove('exporting-map');
      mapElement.classList.remove('exporting-dark-map');
      mapElement.classList.remove('exporting-map-blur');
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
          className={`w-full h-full z-10 ${theme === 'dark' ? 'dark-map' : ''}`}
        />

        {/* Floating Search Panel & Mode Selector */}
        {!(isExporting || isCopying) && (
          <div ref={searchContainerRef} className="absolute top-4 left-4 z-20 w-72 sm:w-88 flex flex-col gap-2">
            <div className={`relative flex items-center border rounded-2xl shadow-xl transition-all ${
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
                placeholder={language === 'uk' ? 'Пошук населених пунктів...' : 'Search populated areas...'}
                className="w-full pl-10 pr-24 py-2.5 text-xs bg-transparent focus:outline-none placeholder-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-20 p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Quick Mode Toggle Shortcuts next to Search Input */}
              <div className="absolute right-2 flex items-center gap-1 border-l pl-2 border-slate-200 dark:border-white/10">
                <button
                  onClick={() => onToggleAutoHighlightZone?.(!autoHighlightZone)}
                  title={language === 'uk' 
                    ? `Авто-підсвітка громад: ${autoHighlightZone ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}` 
                    : `Auto-highlight zones: ${autoHighlightZone ? 'ON' : 'OFF'}`
                  }
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    autoHighlightZone
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
                      : 'hover:bg-white/10 text-slate-400 hover:text-amber-400'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onSelectInteractionMode?.(interactionMode === 'redzone' ? 'draw' : 'redzone')}
                  title={language === 'uk' ? 'Червоні зони' : 'Red Zones'}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    interactionMode === 'redzone'
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                      : 'hover:bg-white/10 text-slate-400 hover:text-red-400'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onSelectInteractionMode?.(interactionMode === 'measure' ? 'draw' : 'measure')}
                  title={language === 'uk' ? 'Виміряти відстань' : 'Measure Distance'}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    interactionMode === 'measure'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                      : 'hover:bg-white/10 text-slate-400 hover:text-amber-400'
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick District & Settlement Buttons */}
            <div className="flex flex-wrap gap-1.5 py-0.5 max-h-24 overflow-y-auto pr-1">
              {QUICK_DISTRICTS.map((dist) => {
                const isHighlighted = searchedAreas.some(
                  (area) => area.districtId === dist.id || area.name === dist.label
                );
                const isLoading = loadingDistrict === dist.id;
                
                return (
                  <button
                    key={dist.id}
                    onClick={() => !isLoading && handleToggleDistrict(dist)}
                    disabled={isLoading}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                      isHighlighted
                        ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white shadow-sm ring-1 ring-red-400/50'
                        : dist.id === 'kryvorizkyi_raion'
                          ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-400 dark:text-red-300 font-extrabold'
                          : theme === 'light'
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                            : 'bg-slate-900 hover:bg-slate-800 border-white/5 text-slate-300'
                    }`}
                  >
                    {isLoading && <Loader2 className="w-2.5 h-2.5 animate-spin text-current" />}
                    <span>{dist.label}</span>
                  </button>
                );
              })}
            </div>


            {/* Suggestions Dropdown */}
            {showDropdown && (searchQuery || isSearching || searchResults.length > 0) && (
              <div className={`border rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-30 transition-all ${
                theme === 'light' 
                  ? 'bg-white/95 border-slate-200 text-slate-800' 
                  : 'bg-slate-950/95 border-white/10 text-slate-200'
              }`}>
                {isSearching ? (
                  <div className="flex items-center gap-2 p-4 text-xs font-medium text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span>{language === 'uk' ? 'Пошук...' : 'Searching...'}</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  searchQuery.length >= 3 && (
                    <div className="p-4 text-xs font-medium text-slate-400 text-center">
                      {language === 'uk' ? 'Нічого не знайдено' : 'No results found'}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col py-1">
                    {searchResults.map((item, idx) => (
                      <button
                        key={item.place_id || idx}
                        onClick={() => handleSelectArea(item)}
                        className={`w-full text-left px-4 py-2.5 text-xs flex items-start gap-2.5 transition-colors border-b last:border-0 cursor-pointer ${
                          theme === 'light' 
                            ? 'hover:bg-slate-100 border-slate-100 text-slate-900' 
                            : 'hover:bg-white/5 border-white/5 text-slate-100'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-red-500 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-bold">{item.display_name.split(',')[0]}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{formatDisplayName(item.display_name)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* List of active highlighted areas */}
            {searchedAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto py-1">
                {searchedAreas.map((area) => (
                  <div
                    key={area.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border bg-red-500/10 border-red-500/30 text-red-400 shadow-sm"
                  >
                    <span>{area.name}</span>
                    <button
                      onClick={() => handleRemoveArea(area.id)}
                      className="hover:text-red-200 transition-colors cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                
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

        {/* Active Mode Floating Banners (Distance Measurement / Red Zone) */}
        {!(isExporting || isCopying) && interactionMode === 'measure' && (
          <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-yellow-400/50 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-white backdrop-blur-md animate-fade-in max-w-[92vw]">
            <Ruler className="w-4 h-4 text-yellow-400 flex-shrink-0 animate-pulse" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                {language === 'uk' ? 'Вимірювання відстані' : 'Distance Measurement'}
              </span>
              <span className="text-xs font-mono font-extrabold truncate">
                {language === 'uk' ? 'Загальна:' : 'Total:'} <span className="text-yellow-300">{formatDistance(totalMeasureDistance)}</span> ({measurePoints.length} {language === 'uk' ? 'точок' : 'pts'})
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {measurePoints.length > 0 && (
                <button
                  onClick={() => setMeasurePoints((prev) => prev.slice(0, -1))}
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  {language === 'uk' ? 'Скасувати' : 'Undo'}
                </button>
              )}
              {measurePoints.length > 0 && (
                <button
                  onClick={() => setMeasurePoints([])}
                  className="px-2 py-1 bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  {language === 'uk' ? 'Очистити' : 'Clear'}
                </button>
              )}
              <button
                onClick={() => onSelectInteractionMode?.('draw')}
                title={language === 'uk' ? 'Закрити лінійку' : 'Close ruler'}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!(isExporting || isCopying) && interactionMode === 'redzone' && (
          <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-red-500/50 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-white backdrop-blur-md animate-fade-in max-w-[92vw]">
            {isAddingRedZone ? (
              <Loader2 className="w-4 h-4 text-red-500 animate-spin flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 animate-bounce" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                {language === 'uk' ? 'Режим червоних зон' : 'Red Zone Mode'}
              </span>
              <span className="text-xs font-medium truncate">
                {isAddingRedZone
                  ? (language === 'uk' ? 'Завантаження населеного пункту...' : 'Loading settlement boundary...')
                  : (language === 'uk' ? 'Клікніть на карті, щоб виділити населений пункт червоним' : 'Click anywhere on the map to mark red zone')}
              </span>
            </div>
            <button
              onClick={() => onSelectInteractionMode?.('draw')}
              title={language === 'uk' ? 'Вийти з режиму' : 'Exit mode'}
              className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 cursor-pointer flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
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
          /* Prevent blur of map tiles during export by using high contrast sharpness */
          .exporting-map .leaflet-tile-pane img {
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: auto !important;
          }
          .exporting-map img, .exporting-map svg, .exporting-map canvas {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
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
            font-size: 10px !important;
            line-height: 1.4 !important;
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
