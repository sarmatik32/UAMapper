export interface CustomMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  color: string;
  borderColor?: string;
  endPointStyle?: 'arrow' | 'dot' | 'line' | 'explosion' | 'none';
  size: number;
  rotation: number; // in degrees (0 - 359)
  iconType: string; // 'arrow' | 'car' | 'truck' | 'plane' | 'boat' | 'person' | 'pin' | 'circle' | 'star' | 'tank' | 'soldier' | 'drone' | 'explosion'
  draggable: boolean;
  labelVisible: boolean;
  customIconUrl?: string; // base64 PNG data url
  hasZone?: boolean;
  zoneColor?: string;
  zoneSize?: number;
  endLat?: number;
  endLng?: number;
}

export interface TileLayerConfig {
  id: string;
  nameEn: string;
  nameUa: string;
  url: string;
  overlayUrl?: string;
  tms: boolean;
  subdomains?: string;
  maxZoom: number;
  attribution: string;
  requiresKey: boolean;
  isDark?: boolean;
}

export type Language = 'uk' | 'en';

export type InteractionMode = 'draw' | 'pan' | 'redzone' | 'measure' | 'settlement' | 'line';

export type LineEndpointType = 'fade' | 'explosion' | 'custom_icon' | 'arrow' | 'dot' | 'none';

export interface DrawnLine {
  id: string;
  points: [number, number][]; // array of [lat, lng]
  color: string;
  weight: number; // thickness in px
  smoothed: boolean; // corner smoothing
  dashStyle?: 'solid' | 'dashed' | 'dotted';
  
  startPointStyle: LineEndpointType;
  startCustomIconUrl?: string;
  
  endPointStyle: LineEndpointType;
  endCustomIconUrl?: string;
  
  label?: string;
}
