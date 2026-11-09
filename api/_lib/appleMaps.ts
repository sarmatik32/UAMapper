import type { IncomingMessage, ServerResponse } from "http";

type LayerType = "standard" | "satellite" | "hybrid";
interface AppleConfig {
  standardPath: string;
  satellitePath: string;
  hybridPath: string;
  satelliteDomain: string;
  expiresAt: number;
}
type TileResult = { body: Buffer; contentType: string };
const TILE_CACHE = new Map<string, { value: TileResult; expiresAt: number }>();
const CACHE_LIMIT = 1500;
let config: AppleConfig | null = null;
let configPromise: Promise<AppleConfig> | null = null;

function send(res: ServerResponse, status: number, body: string | Buffer, contentType: string) {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(body);
}

async function getMasterToken(): Promise<string> {
  const configured = process.env.APPLE_MAPS_MASTER_TOKEN?.trim();
  if (configured) return configured;
  for (const page of ["https://maps.apple.com/", "https://beta.maps.apple.com/"]) {
    const response = await fetch(page, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) continue;
    const html = await response.text();
    const token = html.match(/data-token="([^"]+)"/)?.[1];
    if (token) return token;
  }
  throw new Error("Apple Maps master token was not found on maps.apple.com");
}

async function loadConfig(): Promise<AppleConfig> {
  if (config && Date.now() < config.expiresAt - 60_000) return config;
  if (configPromise) return configPromise;
  configPromise = (async () => {
    const token = await getMasterToken();
    const response = await fetch("https://cdn.apple-mapkit.com/ma/bootstrap?apiVersion=2&mkjsVersion=5.75.2", {
      headers: {
        Origin: "https://maps.apple.com",
        Referer: "https://maps.apple.com/",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Apple bootstrap returned HTTP ${response.status}`);
    const data = await response.json() as any;
    const standard = data.tileSources?.find((source: any) => source.tileSource === "standard");
    const satellite = data.tileSources?.find((source: any) => source.tileSource === "satellite");
    const hybrid = data.tileSources?.find((source: any) => source.tileSource === "hybrid-overlay");
    if (!standard?.path) throw new Error("Apple standard tile source is missing");
    const expiresSeconds = Math.max(120, Number(data.expiresInSeconds) || 1800);
    config = {
      standardPath: standard.path,
      satellitePath: satellite?.path || "",
      hybridPath: hybrid?.path || "",
      satelliteDomain: satellite?.domains?.[0] || "sat-cdn.apple-mapkit.com",
      expiresAt: Date.now() + expiresSeconds * 1000,
    };
    return config;
  })();
  try {
    return await configPromise;
  } finally {
    configPromise = null;
  }
}

function buildTileUrl(cfg: AppleConfig, layer: LayerType, z: number, x: number, y: number, retina: boolean): string {
  const scale = layer === "satellite" ? 1 : retina ? 2 : 1;
  const size = retina ? 2 : 1;
  const shard = (Math.abs(x + y) % 4) + 1;
  const replace = (template: string) => template
    .replace(/\\{\\{tileSizeIndex\\}\\}/g, String(size))
    .replace(/\\{\\{resolution\\}\\}/g, String(scale))
    .replace(/\\{\\{lang\\}\\}/g, "uk")
    .replace(/\\{\\{z\\}\\}/g, String(z))
    .replace(/\\{\\{x\\}\\}/g, String(x))
    .replace(/\\{\\{y\\}\\}/g, String(y));
  if (layer === "satellite") {
    const template = cfg.satellitePath || "/tile?style=7&size={{tileSizeIndex}}&scale={{resolution}}&z={{z}}&x={{x}}&y={{y}}";
    const domain = cfg.satelliteDomain.replace("sat-cdn.", `sat-cdn${shard}.`);
    return `https://${domain}${replace(template)}`;
  }
  if (layer === "hybrid") {
    const template = cfg.hybridPath || cfg.standardPath.replace("style=0", "style=46");
    return `https://cdn${shard}.apple-mapkit.com${replace(template)}`;
  }
  return `https://cdn${shard}.apple-mapkit.com${replace(cfg.standardPath)}`;
}

async function fetchTile(url: string): Promise<TileResult> {
  const response = await fetch(url, {
    headers: {
      Origin: "https://maps.apple.com",
      Referer: "https://maps.apple.com/",
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Apple tile returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) throw new Error("Apple tile response is not an image");
  return { body: Buffer.from(await response.arrayBuffer()), contentType };
}

async function fetchFallback(layer: LayerType, z: number, x: number, y: number): Promise<TileResult> {
  const url = layer === "satellite"
    ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
    : layer === "hybrid"
      ? `https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${y}/${x}`
      : `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${z}/${y}/${x}`;
  const response = await fetch(url, { headers: { "User-Agent": "UAMapper/1.0" }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Fallback tile returned HTTP ${response.status}`);
  return { body: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") || "image/png" };
}

export async function handleAppleTile(req: IncomingMessage & { url?: string; method?: string }, res: ServerResponse, layer: LayerType): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    send(res, 405, "Method not allowed", "text/plain; charset=utf-8");
    return;
  }

  const pathname = new URL(req.url || "/", "https://uamapper.local").pathname;
  const parts = pathname.split("/").filter(Boolean);
  const z = Number(parts.at(-3));
  const x = Number(parts.at(-2));
  const tile = parts.at(-1) || "";
  const retina = /@2x|@3x/.test(tile);
  const y = Number(tile.replace(/@\\d+x/gi, "").replace(/\\.(png|jpe?g|webp)$/i, ""));
  if (![z, x, y].every(Number.isInteger) || z < 1 || z > 22 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
    send(res, 400, "Invalid tile coordinates", "text/plain; charset=utf-8");
    return;
  }

  const key = `${layer}/${z}/${x}/${y}/${retina ? "2x" : "1x"}`;
  const cached = TILE_CACHE.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    res.statusCode = 200;
    res.setHeader("Content-Type", cached.value.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.end(req.method === "HEAD" ? undefined : cached.value.body);
    return;
  }

  try {
    const cfg = await loadConfig();
    const tileData = await fetchTile(buildTileUrl(cfg, layer, z, x, y, retina));
    if (TILE_CACHE.size >= CACHE_LIMIT) {
      const first = TILE_CACHE.keys().next().value;
      if (first) TILE_CACHE.delete(first);
    }
    TILE_CACHE.set(key, { value: tileData, expiresAt: Date.now() + 86400000 });
    res.statusCode = 200;
    res.setHeader("Content-Type", tileData.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.end(req.method === "HEAD" ? undefined : tileData.body);
  } catch (error) {
    console.error(`[Apple Maps ${layer}]`, error);
    try {
      const fallback = await fetchFallback(layer, z, x, y);
      res.statusCode = 200;
      res.setHeader("Content-Type", fallback.contentType);
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.setHeader("X-UAMapper-Tile-Source", "fallback");
      res.end(req.method === "HEAD" ? undefined : fallback.body);
    } catch (fallbackError) {
      console.error("[Apple Maps fallback]", fallbackError);
      send(res, 502, "Map tile is temporarily unavailable", "text/plain; charset=utf-8");
    }
  }
}
