import { CustomMarker, DrawnLine, TileLayerConfig, WatermarkType, AirAlert, Language } from '../types';
import { Settlement, getSettlementCategory, SettlementCategory, SETTLEMENTS } from '../data/settlements';
import { smoothPolylinePoints } from './smoothing';
import { getIconSvgContent } from '../components/IconLibrary';
import { matchAlertToFeature, getAlertVisuals, normalizeLocationName } from './alertsService';

export type ExportResolutionPreset = 'native' | '2k' | '4k' | '8k' | '16k';

export function getResolutionPixels(preset: ExportResolutionPreset, screenWidth = 1920): number {
  switch (preset) {
    case '2k':
      return 2048;
    case '4k':
      return 4096;
    case '8k':
      return 8192;
    case '16k':
      return 16384;
    case 'native':
    default:
      return Math.max(1920, Math.round(screenWidth * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)));
  }
}

export interface ExportProgress {
  phase: 'init' | 'tiles' | 'vector_base' | 'settlements' | 'overlays' | 'encode';
  percent: number;
  message: string;
}

export interface HighResExportOptions {
  map: any; // Leaflet Map instance
  mapContainer: HTMLElement;
  activeTileLayer: TileLayerConfig;
  targetWidth: number; // e.g. 4096 for 4K, 8192 for 8K, 16384 for 16K
  theme: 'dark' | 'light';
  visicomKey?: string;
  blurMapOnExport?: boolean;
  
  // Layers & Overlays
  markers: CustomMarker[];
  drawnLines: DrawnLine[];
  searchedAreas: Array<{
    id: string;
    name: string;
    lat: string;
    lon: string;
    geojson: any;
    color?: string;
    borderColor?: string;
  }>;
  kryvyiRihRaionGeojson?: any;
  kryvyiRihCityGeojson?: any;
  hromadasGeojsonList?: Array<{ id: string; name: string; geojson: any }>;
  showDistrictBoundary?: boolean;
  showCityBoundary?: boolean;
  showHromadaBoundaries?: boolean;

  // Settlements
  showSettlementLabels?: boolean;
  settlementLabelMode?: string;
  customSettlements?: Settlement[];
  disabledSettlementCategories?: SettlementCategory[];

  // Watermark & Legend
  watermarkType?: WatermarkType;
  watermarkText?: string;
  watermarkImageUrl?: string;
  watermarkSize?: number;
  watermarkOpacity?: number;
  watermarkRotation?: number;
  showLegendOverlay?: boolean;
  legendOverlayText?: string;
  showRadarOverlay?: boolean;
  language?: Language;

  // Air Alerts
  activeAlerts?: AirAlert[];
  showAlerts?: boolean;
  showAlertPolygons?: boolean;

  onProgress?: (progress: ExportProgress) => void;
}

/**
 * Converts geographic coordinate [lat, lng] to canvas pixel [x, y] in Web Mercator projection (EPSG:3857).
 */
export function projectLatLngToCanvas(
  lat: number,
  lng: number,
  nw: { lat: number; lng: number },
  se: { lat: number; lng: number },
  width: number,
  height: number
): { x: number; y: number } {
  // Normalize longitude to [0, 1]
  const nwX = (nw.lng + 180) / 360;
  const seX = (se.lng + 180) / 360;
  const curX = (lng + 180) / 360;

  let dx = seX - nwX;
  if (dx <= 0) dx += 1;

  const x = ((curX - nwX) / dx) * width;

  // Latitude to Mercator projection
  const toMercY = (latitude: number) => {
    // Clamp to valid Web Mercator latitude range (-85.0511 to 85.0511)
    const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, latitude));
    const rad = (clampedLat * Math.PI) / 180;
    return Math.log(Math.tan(Math.PI / 4 + rad / 2));
  };

  const nwY = toMercY(nw.lat);
  const seY = toMercY(se.lat);
  const curY = toMercY(lat);

  let dy = nwY - seY;
  if (Math.abs(dy) < 1e-7) dy = 1e-7;

  const y = ((nwY - curY) / dy) * height;

  return { x, y };
}

/**
 * Builds tile URL for a given XYZ tile coordinate.
 */
export function buildTileUrl(
  layer: TileLayerConfig,
  z: number,
  x: number,
  y: number,
  visicomKey?: string
): string {
  let url = layer.url;

  // Subdomain selection
  if (layer.subdomains && layer.subdomains.length > 0) {
    const subIdx = Math.abs(x + y) % layer.subdomains.length;
    url = url.replace('{s}', layer.subdomains[subIdx]);
  } else {
    url = url.replace('{s}.', '').replace('{s}', '');
  }

  // TMS inverted Y
  const effectiveY = layer.tms ? Math.pow(2, z) - 1 - y : y;

  url = url
    .replace('{z}', z.toString())
    .replace('{x}', x.toString())
    .replace('{y}', effectiveY.toString())
    .replace('{r}', ''); // Retina suffix removed for standard 256px tile endpoints

  if (url.includes('{key}')) {
    url = url.replace('{key}', encodeURIComponent(visicomKey || ''));
  }

  return url;
}

/**
 * Loads an image from URL with CORS enabled.
 */
function loadTileImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load tile: ${url}`));
    img.src = url;
  });
}

/**
 * Executes async tasks with a concurrency limit.
 */
async function asyncPool<T, R>(
  poolLimit: number,
  array: T[],
  iteratorFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const ret: Promise<R>[] = [];
  const executing: Promise<any>[] = [];

  for (let i = 0; i < array.length; i++) {
    const p = Promise.resolve().then(() => iteratorFn(array[i], i));
    ret.push(p);

    if (poolLimit <= array.length) {
      const e: Promise<any> = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(ret);
}

/**
 * Draws rounded rectangle path in 2D context.
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Loads SVG string or URL into an HTMLImageElement for canvas drawing.
 */
function loadSvgImage(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Loads a bitmap or remote/data-URL image for canvas drawing.
 */
function loadBitmapImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * Converts 6-digit hex color to rgba string.
 */
function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(239, 68, 68, ${alpha})`;
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

let cachedOblastsGeojson: any = null;
let cachedRaionsGeojson: any = null;

async function getAlertGeojsonBoundaries() {
  if (!cachedOblastsGeojson || !cachedRaionsGeojson) {
    try {
      const [oRes, rRes] = await Promise.all([
        fetch('/data/ukraine_oblasts.geojson'),
        fetch('/data/ukraine_raions.geojson'),
      ]);
      if (oRes.ok) cachedOblastsGeojson = await oRes.json();
      if (rRes.ok) cachedRaionsGeojson = await rRes.json();
    } catch (e) {
      console.warn('Failed to load alert boundaries for export', e);
    }
  }
  return { oblasts: cachedOblastsGeojson, raions: cachedRaionsGeojson };
}

/**
 * Main High-Resolution Direct Tile Map Renderer.
 * 
 * Instead of taking a screenshot of low-resolution 256px screen tiles, this renderer:
 * 1. Computes the exact geographic bounding box of the user's viewport.
 * 2. Directly fetches base map tiles at an elevated zoom level matching target pixel resolution (e.g. 4K, 8K, 16K).
 * 3. Renders native thin roads, highway networks, borders, and water bodies at pristine vector clarity.
 * 4. Natively renders settlement labels afresh onto the canvas at scale with crisp typography and badges.
 * 5. Accurately overlays red danger zones, hromadas, tactical markers, drawn lines, and watermarks.
 */
export async function renderHighResMapToBlob(options: HighResExportOptions): Promise<Blob> {
  const {
    map,
    mapContainer,
    activeTileLayer,
    targetWidth,
    theme,
    visicomKey,
    blurMapOnExport,
    markers,
    drawnLines,
    searchedAreas,
    kryvyiRihRaionGeojson,
    kryvyiRihCityGeojson,
    hromadasGeojsonList,
    showDistrictBoundary = true,
    showCityBoundary = true,
    showHromadaBoundaries = true,
    showSettlementLabels = true,
    settlementLabelMode = 'all',
    customSettlements = [],
    disabledSettlementCategories = [],
    watermarkType = 'text',
    watermarkText = 'UA Mapper',
    watermarkImageUrl = '',
    watermarkSize = 14,
    watermarkOpacity = 0.10,
    watermarkRotation = -25,
    showLegendOverlay = true,
    legendOverlayText = '',
    showRadarOverlay = true,
    language = 'uk',
    activeAlerts = [],
    showAlerts = false,
    showAlertPolygons = true,
    onProgress,
  } = options;

  onProgress?.({ phase: 'init', percent: 5, message: 'Ініціалізація високої роздільності...' });

  // 1. Calculate Viewport & Canvas Dimensions
  const screenWidth = Math.max(mapContainer.clientWidth, 320);
  const screenHeight = Math.max(mapContainer.clientHeight, 240);
  const aspect = screenHeight / screenWidth;
  const targetHeight = Math.round(targetWidth * aspect);

  // Geographic bounds
  const bounds = map.getBounds();
  const nw = bounds.getNorthWest();
  const se = bounds.getSouthEast();
  const screenZoom = map.getZoom();

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Failed to create high-resolution 2D canvas context');

  // Fill default background
  ctx.fillStyle = theme === 'light' ? '#f8fafc' : '#020617';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Global scale factor relative to a baseline ~1920px screen
  const scale = targetWidth / Math.max(screenWidth, 1);
  const visualScale = Math.max(1, targetWidth / 1920);

  // 2. Determine Tile Zoom Level for High Resolution
  // Moderate zoom boost: max +1 level so road networks are sharp, but raster labels for towns & cities remain large and easy to read!
  const zoomBoost = scale >= 3.0 ? 1 : 0;
  const targetTileZoom = Math.min(activeTileLayer.maxZoom, screenZoom + zoomBoost);

  onProgress?.({
    phase: 'tiles',
    percent: 15,
    message: `Розрахунок тайлів базової карти (Zoom ${targetTileZoom}, ${targetWidth}px)...`,
  });

  // Helper projection
  const proj = (lat: number, lng: number) =>
    projectLatLngToCanvas(lat, lng, nw, se, targetWidth, targetHeight);

  // 3. Tile Calculation & Fetching
  const n = Math.pow(2, targetTileZoom);
  const toTileX = (lng: number) => Math.floor(((lng + 180) / 360) * n);
  const toTileY = (lat: number) => {
    const rad = (lat * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / Math.PI) / 2) * n);
  };

  const minTileX = Math.max(0, toTileX(nw.lng));
  const maxTileX = Math.min(n - 1, toTileX(se.lng));
  const minTileY = Math.max(0, toTileY(nw.lat));
  const maxTileY = Math.min(n - 1, toTileY(se.lat));

  interface TileJob {
    tx: number;
    ty: number;
    url: string;
    rect: { x: number; y: number; w: number; h: number };
  }

  const tileJobs: TileJob[] = [];

  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const tileLngLeft = (tx / n) * 360 - 180;
      const tileLngRight = ((tx + 1) / n) * 360 - 180;

      const tileLatTop =
        (180 / Math.PI) * (2 * Math.atan(Math.exp(Math.PI * (1 - (2 * ty) / n))) - Math.PI / 2);
      const tileLatBottom =
        (180 / Math.PI) *
        (2 * Math.atan(Math.exp(Math.PI * (1 - (2 * (ty + 1)) / n))) - Math.PI / 2);

      const pTopLeft = proj(tileLatTop, tileLngLeft);
      const pBottomRight = proj(tileLatBottom, tileLngRight);

      const rect = {
        x: pTopLeft.x,
        y: pTopLeft.y,
        w: pBottomRight.x - pTopLeft.x,
        h: pBottomRight.y - pTopLeft.y,
      };

      const url = buildTileUrl(activeTileLayer, targetTileZoom, tx, ty, visicomKey);
      tileJobs.push({ tx, ty, url, rect });
    }
  }

  // Fetch and draw tiles with concurrency limit
  let loadedTiles = 0;
  const totalTiles = tileJobs.length;

  // Filter if theme is dark but tile layer is light
  const needsDarkInversion = theme === 'dark' && !activeTileLayer.isDark;

  ctx.save();
  if (needsDarkInversion) {
    ctx.filter = 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
  }

  await asyncPool(12, tileJobs, async (job) => {
    try {
      const tileImg = await loadTileImage(job.url);
      // Slight 0.5px subpixel overlap prevents seam artifacts between adjacent tiles
      ctx.drawImage(
        tileImg,
        Math.floor(job.rect.x),
        Math.floor(job.rect.y),
        Math.ceil(job.rect.w) + 0.5,
        Math.ceil(job.rect.h) + 0.5
      );
    } catch {
      // Gracefully ignore missing tiles (tile 404s/network drops)
    } finally {
      loadedTiles++;
      const pct = Math.round(15 + (loadedTiles / Math.max(1, totalTiles)) * 45);
      onProgress?.({
        phase: 'tiles',
        percent: pct,
        message: `Завантаження тайлів базової карти (${loadedTiles}/${totalTiles})...`,
      });
    }
  });

  ctx.restore();

  // If blur on export is enabled
  if (blurMapOnExport) {
    ctx.save();
    ctx.filter = 'blur(3px) brightness(0.95)';
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  }

  onProgress?.({
    phase: 'vector_base',
    percent: 65,
    message: 'Рендеринг зон безпеки, меж районів та громад...',
  });

  // 4. Render GeoJSON Boundaries & Danger Zones
  const drawGeoJsonGeometry = (geometry: any, fillColor?: string, strokeColor?: string, lineWidth = 2, dashArray?: number[]) => {
    if (!geometry) return;

    ctx.save();
    if (fillColor) ctx.fillStyle = fillColor;
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      if (dashArray) ctx.setLineDash(dashArray);
    }

    const drawRing = (coordinates: [number, number][]) => {
      ctx.beginPath();
      coordinates.forEach((coord, idx) => {
        const pt = proj(coord[1], coord[0]);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      if (fillColor) ctx.fill('evenodd');
      if (strokeColor) ctx.stroke();
    };

    if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach((ring: [number, number][]) => drawRing(ring));
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach((poly: [number, number][][]) => {
        poly.forEach((ring: [number, number][]) => drawRing(ring));
      });
    }

    ctx.restore();
  };

  // 4a. Hromada Boundaries (Dark Gray Lines)
  if (showHromadaBoundaries && hromadasGeojsonList) {
    hromadasGeojsonList.forEach((hromada) => {
      if (hromada.geojson) {
        drawGeoJsonGeometry(
          hromada.geojson.geometry || hromada.geojson,
          undefined,
          '#64748b',
          Math.max(1.5, 1.8 * visualScale),
          [4 * visualScale, 4 * visualScale]
        );
      }
    });
  }

  // 4b. Kryvyi Rih Raion Boundary (Clean Green Outline)
  if (showDistrictBoundary && kryvyiRihRaionGeojson) {
    drawGeoJsonGeometry(
      kryvyiRihRaionGeojson.geometry || kryvyiRihRaionGeojson,
      undefined,
      '#10b981',
      Math.max(2.2, 2.5 * visualScale)
    );
  }

  // 4c. Kryvyi Rih City Boundary (Sky Blue Dashed Line)
  if (showCityBoundary && kryvyiRihCityGeojson) {
    drawGeoJsonGeometry(
      kryvyiRihCityGeojson.geometry || kryvyiRihCityGeojson,
      'rgba(56, 189, 248, 0.05)',
      '#38bdf8',
      Math.max(2.0, 2.2 * visualScale),
      [6 * visualScale, 6 * visualScale]
    );
  }

  // 4d. Highlighted Red Danger Zones / Searched Areas
  searchedAreas.forEach((area) => {
    if (area.geojson) {
      drawGeoJsonGeometry(
        area.geojson.geometry || area.geojson,
        area.color || 'rgba(239, 68, 68, 0.25)',
        area.borderColor || 'rgba(239, 68, 68, 0.90)',
        Math.max(2.0, 2.2 * visualScale)
      );
    }
  });

  // 4e. Air Alerts Polygons & Sirens ("3. шар тривог")
  if (showAlerts && showAlertPolygons && activeAlerts.length > 0) {
    try {
      const { oblasts, raions } = await getAlertGeojsonBoundaries();
      for (const alert of activeAlerts) {
        const visuals = getAlertVisuals(alert, language || 'uk');
        const fillColor = visuals.fillColor.startsWith('#')
          ? hexToRgba(visuals.fillColor, 0.28)
          : visuals.fillColor;
        const strokeColor = visuals.color || '#ef4444';

        // Draw oblast polygon
        if (alert.location_type === 'oblast' && oblasts?.features) {
          for (const feature of oblasts.features) {
            if (matchAlertToFeature(alert, feature.properties)) {
              drawGeoJsonGeometry(
                feature.geometry,
                fillColor,
                strokeColor,
                Math.max(2, 2.5 * visualScale),
                [6 * visualScale, 6 * visualScale]
              );
            }
          }
        } else if (raions?.features) {
          // Draw raion polygon
          for (const feature of raions.features) {
            if (matchAlertToFeature(alert, feature.properties)) {
              drawGeoJsonGeometry(
                feature.geometry,
                fillColor,
                strokeColor,
                Math.max(1.8, 2.2 * visualScale),
                [4 * visualScale, 4 * visualScale]
              );
            }
          }
        }

        // City alert sirens/markers removed per user requirement to keep city names clean
      }
    } catch (alertErr) {
      console.warn('Failed to render air alerts on high-res export', alertErr);
    }
  }

  // 5. Marker Threat Zones (Circular Range Radii)
  markers.forEach((m) => {
    if (m.hasZone) {
      const center = proj(m.lat, m.lng);
      const radiusKm = m.zoneRadiusKm || 15;
      // Calculate pixel radius on canvas
      const pEdge = proj(m.lat, m.lng + (radiusKm / (111.32 * Math.cos((m.lat * Math.PI) / 180))));
      const radiusPx = Math.abs(pEdge.x - center.x);

      ctx.save();
      ctx.beginPath();
      ctx.arc(center.x, center.y, radiusPx, 0, 2 * Math.PI);
      ctx.fillStyle = m.zoneColor ? `${m.zoneColor}22` : 'rgba(239, 68, 68, 0.18)';
      ctx.fill();
      ctx.strokeStyle = m.zoneColor || '#ef4444';
      ctx.lineWidth = Math.max(1.8, 2.0 * visualScale);
      ctx.setLineDash([8 * visualScale, 6 * visualScale]);
      ctx.stroke();
      ctx.restore();
    }
  });

  // 6. Drawn Lines (Polylines, Vectors, Arrows, Dashed Paths)
  drawnLines.forEach((line) => {
    if (!line.points || line.points.length < 2) return;

    const displayPoints = line.smoothed ? smoothPolylinePoints(line.points, 4) : line.points;
    const canvasPoints = displayPoints.map((pt) => proj(pt[0], pt[1]));

    ctx.save();
    ctx.strokeStyle = line.color || '#ef4444';
    ctx.lineWidth = Math.max(2, (line.weight || 5) * visualScale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (line.dashStyle === 'dashed') {
      ctx.setLineDash([12 * visualScale, 8 * visualScale]);
    } else if (line.dashStyle === 'dotted') {
      ctx.setLineDash([3 * visualScale, 6 * visualScale]);
    }

    ctx.beginPath();
    canvasPoints.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Arrowhead endpoint
    if (line.endPointStyle === 'arrow' && canvasPoints.length >= 2) {
      const last = canvasPoints[canvasPoints.length - 1];
      const prev = canvasPoints[canvasPoints.length - 2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const arrowLen = Math.max(14, 18 * visualScale);

      ctx.save();
      ctx.fillStyle = line.color || '#ef4444';
      ctx.translate(last.x, last.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-arrowLen, -arrowLen * 0.45);
      ctx.lineTo(-arrowLen * 0.75, 0);
      ctx.lineTo(-arrowLen, arrowLen * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  });

  // 7. Marker Direction Lines & Handles
  markers.forEach((m) => {
    const hasEndPoint = m.endPointStyle && m.endPointStyle !== 'none';
    if (hasEndPoint) {
      let finalEndLat = m.endLat;
      let finalEndLng = m.endLng;
      if (finalEndLat === undefined || finalEndLng === undefined) {
        const angleRad = ((m.rotation || 0) * Math.PI) / 180;
        finalEndLat = m.lat + Math.cos(angleRad) * 0.003;
        finalEndLng = m.lng + Math.sin(angleRad) * 0.005;
      }

      const pStart = proj(m.lat, m.lng);
      const pEnd = proj(finalEndLat, finalEndLng);

      ctx.save();
      ctx.strokeStyle = m.color && m.color !== 'none' ? m.color : '#ef4444';
      ctx.lineWidth = Math.max(1.8, (m.lineWidth || 3) * visualScale);
      ctx.setLineDash([10 * visualScale, 5 * visualScale, 2 * visualScale, 5 * visualScale]); // Dash-dotted
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();

      if (m.endPointStyle === 'explosion') {
        ctx.font = `${Math.round(24 * visualScale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💥', pEnd.x, pEnd.y);
      }

      ctx.restore();
    }
  });

  onProgress?.({
    phase: 'settlements',
    percent: 78,
    message: 'Рендеринг назв населених пунктів (векторні підписи без розмиття)...',
  });

  // 8. Settlement Labels ("5. назви міст та н.п.")
  if (showSettlementLabels) {
    const userCustom = (customSettlements || []).filter((s) => !(s as any).isDeleted);
    const allSettlements = [
      ...SETTLEMENTS,
      ...userCustom.filter((cs) => !SETTLEMENTS.some((s) => s.id === cs.id)),
    ];

    allSettlements.forEach((item) => {
      const category = getSettlementCategory(item);
      if (disabledSettlementCategories.includes(category)) return;

      const isUserCustomPoint = item.id.startsWith('custom_');
      if (!isUserCustomPoint) {
        if (settlementLabelMode === 'districts_only' && item.type !== 'district') return;
        if (settlementLabelMode === 'districts_cities' && item.type !== 'district' && item.type !== 'city') return;
      }

      let minZoom = 0;
      if (item.type === 'district') minZoom = 0;
      else if (item.priority === 1) minZoom = 0;
      else if (item.priority === 2) minZoom = 3.0;
      else if (item.priority === 3) minZoom = 5.0;
      else if (item.priority === 4) minZoom = 6.0;
      else minZoom = 7.0;

      if (screenZoom < minZoom) return;

      const pos = proj(item.lat, item.lng);

      // Only draw if within reasonable canvas margin
      if (pos.x < -100 || pos.x > targetWidth + 100 || pos.y < -100 || pos.y > targetHeight + 100) return;

      let dotColor = '#94a3b8';
      let dotRingColor = '#64748b';
      let dotRadius = 3.5 * visualScale;
      let textColor = '#ffffff';
      let borderColor = '#334155';
      let fontSize = Math.round(11 * visualScale);
      let isBold = true;
      let isDistrict = item.type === 'district';

      if (isDistrict) {
        dotColor = '#fbbf24';
        dotRingColor = '#d97706';
        dotRadius = 6 * visualScale;
        textColor = '#fde68a';
        borderColor = 'rgba(245, 158, 11, 0.95)';
        fontSize = Math.round(15 * visualScale);
      } else if (item.priority === 1) {
        dotColor = '#22d3ee';
        dotRingColor = '#0284c7';
        dotRadius = 5.5 * visualScale;
        textColor = '#a5f3fc';
        borderColor = 'rgba(34, 211, 238, 0.95)';
        fontSize = Math.round(14.5 * visualScale);
      } else if (item.priority === 2) {
        dotColor = '#34d399';
        dotRingColor = '#059669';
        dotRadius = 4.8 * visualScale;
        textColor = '#a7f3d0';
        borderColor = 'rgba(52, 211, 153, 0.90)';
        fontSize = Math.round(13.5 * visualScale);
      } else if (item.priority === 3) {
        dotColor = '#38bdf8';
        dotRingColor = '#0284c7';
        dotRadius = 4 * visualScale;
        textColor = '#bae6fd';
        borderColor = 'rgba(56, 189, 248, 0.85)';
        fontSize = Math.round(12 * visualScale);
      } else {
        dotColor = '#e2e8f0';
        dotRingColor = '#94a3b8';
        dotRadius = 3.2 * visualScale;
        textColor = '#f1f5f9';
        borderColor = 'rgba(100, 116, 139, 0.85)';
        fontSize = Math.round(11 * visualScale);
        isBold = false;
      }

      ctx.save();

      // Dot Indicator with glow shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 4 * visualScale;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotRadius, 0, 2 * Math.PI);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.strokeStyle = dotRingColor;
      ctx.lineWidth = Math.max(1, 1.8 * visualScale);
      ctx.stroke();

      // Text Badge
      ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const text = isDistrict ? item.name.toUpperCase() : item.name;
      const textMetrics = ctx.measureText(text);
      const padX = Math.round(7 * visualScale);
      const padY = Math.round(3.5 * visualScale);
      const badgeW = textMetrics.width + padX * 2;
      const badgeH = fontSize + padY * 2;
      const badgeX = pos.x + dotRadius + Math.round(6 * visualScale);
      const badgeY = pos.y - badgeH / 2;

      // Badge background pill with shadow
      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, Math.round(6 * visualScale));
      ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = Math.max(1, 1.4 * visualScale);
      ctx.stroke();

      // Text label
      ctx.shadowBlur = 0;
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, badgeX + padX, badgeY + badgeH / 2);

      ctx.restore();
    });
  }

  onProgress?.({
    phase: 'overlays',
    percent: 88,
    message: 'Накладення тактичних маркерів, символів та водяних знаків...',
  });

  // 9. Tactical Markers & Icons ("4. лого іконк")
  for (const m of markers) {
    const pos = proj(m.lat, m.lng);
    const mSize = Math.max(20, (m.size || 28) * visualScale);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    if (m.rotation) {
      ctx.rotate((m.rotation * Math.PI) / 180);
    }

    try {
      let iconImg: HTMLImageElement | null = null;
      let isCustomBitmap = false;

      if (m.customIconUrl) {
        // User custom logo / icon
        iconImg = await loadBitmapImage(m.customIconUrl);
        isCustomBitmap = true;
      } else if (m.iconType === 'standard-aircraft') {
        iconImg = await loadBitmapImage('/img/icon_aircraft_custom.png');
        isCustomBitmap = true;
      } else if (m.iconType === 'standard-symbol-2') {
        iconImg = await loadBitmapImage('/img/icon_custom_2.png');
        isCustomBitmap = true;
      }

      if (iconImg) {
        if (m.color && m.color !== 'transparent' && m.color !== 'none' && m.color !== '#ffffff') {
          // Tint bitmap icon using offscreen buffer
          const offCanvas = document.createElement('canvas');
          offCanvas.width = Math.round(mSize);
          offCanvas.height = Math.round(mSize);
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(iconImg, 0, 0, mSize, mSize);
            offCtx.globalCompositeOperation = 'source-in';
            offCtx.fillStyle = m.color;
            offCtx.fillRect(0, 0, mSize, mSize);
            ctx.drawImage(offCanvas, -mSize / 2, -mSize / 2, mSize, mSize);
          } else {
            ctx.drawImage(iconImg, -mSize / 2, -mSize / 2, mSize, mSize);
          }
        } else {
          ctx.drawImage(iconImg, -mSize / 2, -mSize / 2, mSize, mSize);
        }
      } else {
        // Standard SVG content
        const svg = getIconSvgContent(m.iconType, m.color || '#ef4444', m.borderColor || '#ffffff');
        const svgImg = await loadSvgImage(svg);
        ctx.drawImage(svgImg, -mSize / 2, -mSize / 2, mSize, mSize);
      }
    } catch {
      // Fallback simple circle marker
      ctx.beginPath();
      ctx.arc(0, 0, mSize / 2, 0, 2 * Math.PI);
      ctx.fillStyle = m.color || '#ef4444';
      ctx.fill();
      ctx.strokeStyle = m.borderColor || '#ffffff';
      ctx.lineWidth = Math.max(2, 2.5 * visualScale);
      ctx.stroke();
    }

    ctx.restore();

    // Marker title badge if visible
    if (m.labelVisible && m.title) {
      ctx.save();
      const labelFontSize = Math.round(11.5 * visualScale);
      ctx.font = `bold ${labelFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const labelMetrics = ctx.measureText(m.title);
      const lPadX = Math.round(7 * visualScale);
      const lPadY = Math.round(3.5 * visualScale);
      const lWidth = labelMetrics.width + lPadX * 2;
      const lHeight = labelFontSize + lPadY * 2;
      const lX = pos.x - lWidth / 2;
      const lY = pos.y + mSize / 2 + Math.round(4 * visualScale);

      drawRoundRect(ctx, lX, lY, lWidth, lHeight, Math.round(4 * visualScale));
      ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
      ctx.fill();
      ctx.strokeStyle = m.color || '#ef4444';
      ctx.lineWidth = Math.max(1, 1.4 * visualScale);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.title, lX + lPadX, lY + lHeight / 2);
      ctx.restore();
    }
  }

  // 10. Watermark (Text or Image Tiled)
  if (watermarkType === 'image' && watermarkImageUrl) {
    try {
      const logoImg = await loadBitmapImage(watermarkImageUrl);
      const imgSize = Math.max(24, Math.round((watermarkSize || 48) * visualScale));
      const bgTileW = Math.round(Math.max(60 * visualScale, imgSize * 2.2));
      const bgTileH = Math.round(Math.max(50 * visualScale, imgSize * 1.8));
      const rotRad = ((watermarkRotation !== undefined ? watermarkRotation : -25) * Math.PI) / 180;
      const op = Math.max(0.04, Math.min(1.0, watermarkOpacity !== undefined ? watermarkOpacity : 0.20));

      ctx.save();
      ctx.globalAlpha = op;
      for (let y = -bgTileH; y < targetHeight + bgTileH * 2; y += bgTileH) {
        for (let x = -bgTileW; x < targetWidth + bgTileW * 2; x += bgTileW) {
          ctx.save();
          ctx.translate(x + bgTileW / 2, y + bgTileH / 2);
          ctx.rotate(rotRad);
          ctx.drawImage(logoImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
          ctx.restore();
        }
      }
      ctx.restore();
    } catch (wmImgErr) {
      console.warn('Failed to render image watermark', wmImgErr);
    }
  } else if (watermarkType === 'text' && watermarkText) {
    ctx.save();
    const wmFontSize = Math.round((watermarkSize || 14) * visualScale * 1.3);
    ctx.font = `bold ${wmFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = theme === 'light' ? '#000000' : '#ffffff';
    ctx.globalAlpha = Math.max(0.04, Math.min(0.8, watermarkOpacity || 0.10));

    const stepX = Math.round(240 * visualScale);
    const stepY = Math.round(160 * visualScale);
    const rot = watermarkRotation !== undefined ? watermarkRotation : -22;

    ctx.rotate((rot * Math.PI) / 180);
    for (let x = -targetWidth; x < targetWidth * 2; x += stepX) {
      for (let y = -targetHeight; y < targetHeight * 2; y += stepY) {
        ctx.fillText(watermarkText, x, y);
      }
    }
    ctx.restore();
  }

  // 11. Top Tactical Logo Capsule ("1. лого")
  try {
    ctx.save();
    const logoTitle = 'UA Mapper';
    const logoAuthor = 'BY @KRRIG_ALERTS';
    const logoTitleColor = theme === 'light' ? 'rgb(225, 255, 0)' : 'rgb(255, 0, 0)';
    const logoAuthorColor = theme === 'light' ? '#ffffff' : '#020617';

    const titleFontSize = Math.round(16 * visualScale);
    const authorFontSize = Math.round(9 * visualScale);
    const tgIconSize = Math.round(16 * visualScale);

    ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const titleWidth = ctx.measureText(logoTitle).width;

    ctx.font = `bold ${authorFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const authorWidth = ctx.measureText(logoAuthor).width;

    const padX = Math.round(16 * visualScale);
    const padY = Math.round(8 * visualScale);
    const gap = Math.round(8 * visualScale);
    const dividerW = Math.round(1 * visualScale);
    const totalContentW = titleWidth + gap + dividerW + gap + authorWidth + gap + tgIconSize;
    const capsuleW = totalContentW + padX * 2;
    const capsuleH = Math.max(titleFontSize, tgIconSize) + padY * 2;
    const capsuleX = (targetWidth - capsuleW) / 2;
    const capsuleY = Math.round(16 * visualScale);

    // Draw capsule background with smooth shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 10 * visualScale;
    ctx.shadowOffsetY = 3 * visualScale;
    drawRoundRect(ctx, capsuleX, capsuleY, capsuleW, capsuleH, capsuleH / 2);
    ctx.fillStyle = theme === 'light' ? 'rgba(2, 6, 23, 0.55)' : 'rgba(255, 255, 255, 0.55)';
    ctx.fill();
    ctx.strokeStyle = theme === 'light' ? 'rgba(255, 255, 255, 0.20)' : 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = Math.max(1, 1.2 * visualScale);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Draw Title
    let curX = capsuleX + padX;
    const midY = capsuleY + capsuleH / 2;
    ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = logoTitleColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(logoTitle, curX, midY);
    curX += titleWidth + gap;

    // Divider line
    ctx.fillStyle = theme === 'light' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(2, 6, 23, 0.25)';
    ctx.fillRect(curX, midY - Math.round(7 * visualScale), dividerW, Math.round(14 * visualScale));
    curX += dividerW + gap;

    // Author
    ctx.font = `bold ${authorFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = logoAuthorColor;
    ctx.fillText(logoAuthor, curX, midY);
    curX += authorWidth + gap;

    // Telegram icon
    const tgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="${tgIconSize}" height="${tgIconSize}"><defs><linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2AABEE"/><stop offset="100%" stop-color="#229ED9"/></linearGradient></defs><circle cx="14" cy="14" r="13" fill="url(#tg)"/><path d="M10.8 14.9L10.5 19.1C10.9 19.1 11.1 18.9 11.3 18.7L13.2 16.9L17.2 19.8C17.9 20.2 18.4 20.0 18.6 19.2L21.2 6.9C21.4 6.0 20.8 5.6 20.2 5.9L4.8 11.8C3.9 12.2 3.9 12.7 4.7 13.0L8.6 14.2L17.6 8.5C18.0 8.2 18.4 8.4 18.1 8.7L10.8 14.9Z" fill="white"/></svg>`;
    const tgImg = await loadSvgImage(tgSvg);
    ctx.drawImage(tgImg, curX, midY - tgIconSize / 2, tgIconSize, tgIconSize);

    ctx.restore();
  } catch (logoErr) {
    console.warn('Failed to render top logo capsule', logoErr);
  }

  // 12. Tactical Legend Disclaimer Banner ("2. легенда")
  if (showLegendOverlay) {
    ctx.save();
    const defaultLegend =
      language === 'en'
        ? 'This map is for informational purposes only and is not an official source. The data displayed on the map is formed solely on the basis of information from the @krrig_alerts channel'
        : 'Ця карта має інформаційний характер, не є офіційним джерелом. Дані які відображені на карті сформовані виключно на основі інформації з каналу @krrig_alerts';
    const textToDisplay = legendOverlayText && legendOverlayText.trim().length > 0 ? legendOverlayText.trim() : defaultLegend;

    const legFontSize = Math.max(9, Math.round(9.5 * visualScale));
    ctx.font = `bold ${legFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    const padX = Math.round(20 * visualScale);
    const padY = Math.round(8 * visualScale);
    const maxLegendW = Math.min(targetWidth * 0.88, Math.round(1100 * visualScale));

    // Word wrap lines cleanly so no text is truncated
    const words = textToDisplay.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxLegendW - padX * 2 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = Math.round(legFontSize * 1.45);
    const contentH = lines.length * lineHeight;
    const bannerH = contentH + padY * 2;

    let longestLineWidth = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > longestLineWidth) longestLineWidth = w;
    }
    const bannerW = Math.min(maxLegendW, longestLineWidth + padX * 2);
    const bannerX = (targetWidth - bannerW) / 2;
    const bannerY = targetHeight - bannerH - Math.round(20 * visualScale);

    // Draw sleek rounded pill banner
    ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
    ctx.shadowBlur = 8 * visualScale;
    ctx.shadowOffsetY = 2 * visualScale;
    drawRoundRect(ctx, bannerX, bannerY, bannerW, bannerH, Math.min(bannerH / 2, Math.round(18 * visualScale)));
    ctx.fillStyle = theme === 'light' ? 'rgba(2, 6, 23, 0.60)' : 'rgba(255, 255, 255, 0.60)';
    ctx.fill();
    ctx.strokeStyle = theme === 'light' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = Math.max(1, 1.2 * visualScale);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Text lines
    ctx.fillStyle = theme === 'light' ? '#f1f5f9' : '#020617';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let textY = bannerY + padY + lineHeight / 2;
    for (const line of lines) {
      ctx.fillText(line, targetWidth / 2, textY);
      textY += lineHeight;
    }

    ctx.restore();
  }

  onProgress?.({
    phase: 'encode',
    percent: 96,
    message: `Кодування PNG високої роздільності (${targetWidth}×${targetHeight} px)...`,
  });

  // 12. Convert Canvas to PNG Blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error('Canvas PNG encoding failed or produced empty file'));
          return;
        }
        onProgress?.({
          phase: 'encode',
          percent: 100,
          message: 'Готово!',
        });
        resolve(blob);
      },
      'image/png',
      1.0
    );
  });
}
