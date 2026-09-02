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
  tms: boolean;
  subdomains?: string;
  maxZoom: number;
  attribution: string;
  requiresKey: boolean;
}

export type Language = 'uk' | 'en';
