export interface IconPreset {
  title?: string;
  color?: string;
  borderColor?: string;
  size?: number;
  rotation?: number;
  draggable?: boolean;
  labelVisible?: boolean;
  endPointStyle?: 'arrow' | 'dot' | 'line' | 'explosion' | 'none';
  lineWidth?: number;
  hasZone?: boolean;
  zoneColor?: string;
  zoneRadiusKm?: number;
  zoneSize?: number;
  customIconUrl?: string;
}

export interface CustomMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  color: string;
  borderColor?: string;
  endPointStyle?: 'arrow' | 'dot' | 'line' | 'explosion' | 'none';
  lineWidth?: number; // thickness of the dividing/direction line in px (e.g. 1 - 15)
  size: number;
  rotation: number; // in degrees (0 - 359)
  iconType: string; // 'arrow' | 'car' | 'truck' | 'plane' | 'boat' | 'person' | 'pin' | 'circle' | 'star' | 'tank' | 'soldier' | 'drone' | 'explosion'
  draggable: boolean;
  labelVisible: boolean;
  customIconUrl?: string; // base64 PNG data url
  hasZone?: boolean;
  zoneColor?: string;
  zoneRadiusKm?: number;
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

export type WatermarkType = 'text' | 'image';

export type InteractionMode = 'draw' | 'pan' | 'redzone' | 'measure' | 'settlement' | 'line';

export type LineEndpointType = 'none' | 'arrow' | 'dot' | 'fade' | 'explosion' | 'custom_icon';

export type AlertType =
  | 'air_raid'
  | 'artillery_shelling'
  | 'urban_fights'
  | 'chemical'
  | 'nuclear'
  | 'nuclear_threat'
  | 'drones'
  | string;

export interface ThreatItem {
  threat_type?: string;
  level?: 'yellow' | 'red' | string;
  started_at?: string;
  source_message?: string;
}

export interface AirAlert {
  id: number | string;
  location_title: string;
  location_type: 'oblast' | 'raion' | 'hromada' | 'city' | string;
  started_at: string;
  finished_at?: string | null;
  updated_at?: string;
  alert_type: AlertType;
  alert_level?: 'red' | 'yellow' | string;
  threats?: ThreatItem[];
  location_oblast?: string;
  location_raion?: string;
  location_uid?: string | number;
  notes?: string | null;
  country?: string | null;
  location_title_en?: string;
  location_oblast_uid?: number;
  calculated_duration?: string;
}

export interface AirAlertsResponse {
  alerts: AirAlert[];
  last_updated_at?: string;
  last_synced_at?: string;
  cached?: boolean;
  disclaimer?: string;
}

export interface DrawnLine {
  id: string;
  points: [number, number][]; // array of [lat, lng]
  color: string;
  weight: number; // thickness in px
  smoothed: boolean; // corner smoothing
  dashStyle?: 'solid' | 'dashed' | 'dotted';
  
  startPointStyle: LineEndpointType;
  startCustomIconUrl?: string;
  startIconRotation?: number;
  
  endPointStyle: LineEndpointType;
  endCustomIconUrl?: string;
  endIconRotation?: number;
  
  label?: string;
}

export type MapFontFamily = 'inter' | 'plus-jakarta' | 'montserrat' | 'ubuntu' | 'jetbrains-mono' | 'system';

export interface MapFontConfig {
  id: MapFontFamily;
  name: string;
  fontFamily: string;
  previewText: string;
  descriptionUa: string;
  descriptionEn: string;
}

export interface TelegramChannelConfig {
  id: string;
  name: string;
  usernameOrId: string; // e.g. '@krrig_alerts' or '-100...'
  description?: string;
  isDefault?: boolean;
}
