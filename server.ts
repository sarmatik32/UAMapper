import express from "express";
import path from "path";
import https from "https";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;
const DEFAULT_ALERTS_TOKEN = "3a0222c65a8814cbf1c92f1ce831c62e24d51f63ab2203";

interface CachedAlerts {
  data: any;
  timestamp: number;
}

let cachedAlerts: CachedAlerts | null = null;
const CACHE_TTL_MS = 12 * 1000; // 12 seconds in-memory cache

function fetchAlertsFromApi(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.alerts.in.ua",
      path: "/v1/alerts/active.json",
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "UAMapper/1.0",
        Accept: "application/json",
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (err) {
            reject(new Error("Failed to parse JSON response from alerts.in.ua"));
          }
        } else {
          reject(
            new Error(
              `Alerts API responded with status ${res.statusCode}: ${body.slice(0, 200)}`
            )
          );
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout connecting to alerts.in.ua"));
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });
}

// Apple Maps MapKit integration and tile proxy
interface AppleMapKitConfig {
  accessKey: string;
  v: string;
  template: string;
  satelliteTemplate: string;
  satelliteDomain: string;
  hybridTemplate: string;
  fetchedAt: number;
  expiresInSeconds: number;
}

let appleConfig: AppleMapKitConfig | null = null;
let appleMasterToken =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkdKNUdaREZMODkifQ.eyJpc3MiOiJDNVU4OTI3MzZZIiwib3JpZ2luIjoiaHR0cHM6Ly9iZXRhLm1hcHMuYXBwbGUuY29tLGh0dHBzOi8vbWFwcy5hcHBsZS5jb20iLCJpYXQiOjE3ODkxMjk1MjEsImV4cCI6MTc5OTQ5NzUyMX0.CAEYM6xXfVhEdWGedQJRTtelM1KuZ84p-xqBjRdD3NY0eHTHViJT8jM4L1BqAuJfdkXFpyTBUeK7eGw5GnQdXQ";

const tileCache = new Map<
  string,
  { buffer: Buffer; contentType: string; timestamp: number }
>();
const MAX_TILE_CACHE = 1200;

function scrapeMasterTokenFromApple(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      "https://maps.apple.com/",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 8000,
      },
      (res) => {
        let html = "";
        res.on("data", (d) => (html += d));
        res.on("end", () => {
          const match = html.match(/data-token="([^"]+)"/);
          if (match && match[1]) {
            resolve(match[1]);
          } else {
            reject(
              new Error(
                "Unable to extract Apple MapKit data-token from maps.apple.com"
              )
            );
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout scraping Apple MapKit token"));
    });
    req.on("error", reject);
  });
}

function fetchAppleBootstrap(token: string): Promise<AppleMapKitConfig> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      "https://cdn.apple-mapkit.com/ma/bootstrap?apiVersion=2&mkjsVersion=5.75.2",
      {
        headers: {
          Origin: "https://maps.apple.com",
          Referer: "https://maps.apple.com/",
          Authorization: `Bearer ${token}`,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        timeout: 8000,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            return reject(
              new Error(
                `Apple bootstrap returned HTTP ${res.statusCode}: ${body.slice(0, 100)}`
              )
            );
          }
          try {
            const data = JSON.parse(body);
            const standard = data.tileSources?.find(
              (s: any) => s.tileSource === "standard"
            );
            const satellite = data.tileSources?.find(
              (s: any) => s.tileSource === "satellite"
            );
            const hybrid = data.tileSources?.find(
              (s: any) => s.tileSource === "hybrid-overlay"
            );
            if (!standard || !standard.path) {
              return reject(
                new Error(
                  "Standard tileSource not found in Apple bootstrap response"
                )
              );
            }
            const pathStr = standard.path as string;
            const accessKeyMatch = pathStr.match(/accessKey=([^&]+)/);
            const vMatch = pathStr.match(/v=([^&]+)/);
            resolve({
              accessKey: accessKeyMatch
                ? decodeURIComponent(accessKeyMatch[1])
                : data.accessKey || "",
              v: vMatch ? vMatch[1] : "2609132",
              template: pathStr,
              satelliteTemplate: satellite?.path || "",
              satelliteDomain:
                (satellite?.domains && satellite.domains[0]) ||
                "sat-cdn.apple-mapkit.com",
              hybridTemplate: hybrid?.path || "",
              fetchedAt: Date.now(),
              expiresInSeconds: data.expiresInSeconds || 1800,
            });
          } catch (e: any) {
            reject(
              new Error(`Failed to parse Apple bootstrap JSON: ${e?.message}`)
            );
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout calling Apple bootstrap"));
    });
    req.on("error", reject);
    req.end();
  });
}

async function getValidAppleConfig(): Promise<AppleMapKitConfig> {
  const now = Date.now();
  if (
    appleConfig &&
    now - appleConfig.fetchedAt < (appleConfig.expiresInSeconds - 300) * 1000
  ) {
    return appleConfig;
  }

  try {
    appleConfig = await fetchAppleBootstrap(appleMasterToken);
    return appleConfig;
  } catch (err: any) {
    console.warn(
      "[Apple Maps] Bootstrap with current token failed, refreshing...",
      err?.message
    );
    try {
      const newToken = await scrapeMasterTokenFromApple();
      appleMasterToken = newToken;
      appleConfig = await fetchAppleBootstrap(appleMasterToken);
      return appleConfig;
    } catch (scrapeErr: any) {
      console.error("[Apple Maps] Token refresh failed:", scrapeErr?.message);
      if (appleConfig) {
        return appleConfig;
      }
      throw scrapeErr;
    }
  }
}

function fetchTileBuffer(
  tileUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      tileUrl,
      {
        headers: {
          Origin: "https://maps.apple.com",
          Referer: "https://maps.apple.com/",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        timeout: 9000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Apple tile returned HTTP ${res.statusCode}`));
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: res.headers["content-type"] || "image/png",
          });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout fetching Apple tile"));
    });
    req.on("error", reject);
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Active air raid alerts proxy endpoint
  app.get("/api/alerts", async (req, res) => {
    const customToken = req.headers["x-alerts-token"] as string | undefined;
    const token =
      customToken || process.env.ALERTS_IN_UA_TOKEN || DEFAULT_ALERTS_TOKEN;

    const now = Date.now();
    // Return cached data if valid and using default token
    if (
      !customToken &&
      cachedAlerts &&
      now - cachedAlerts.timestamp < CACHE_TTL_MS
    ) {
      return res.json({
        ...cachedAlerts.data,
        cached: true,
        cache_age_ms: now - cachedAlerts.timestamp,
      });
    }

    try {
      const data = await fetchAlertsFromApi(token);
      if (!customToken) {
        cachedAlerts = {
          data,
          timestamp: now,
        };
      }
      return res.json({
        ...data,
        cached: false,
        last_synced_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.warn("[Alerts API Warning]:", error?.message || error);
      // If we have stale cached data, return it as fallback
      if (cachedAlerts) {
        return res.json({
          ...cachedAlerts.data,
          cached: true,
          stale: true,
          warning: "Using stale cached data due to upstream delay",
        });
      }
      return res.status(200).json({
        alerts: [],
        disclaimer: "No alerts available at this moment",
        warning: error?.message || "Failed to fetch active alerts",
      });
    }
  });

  // Helper to build tile url for a given layer
  const getAppleTileUrl = (
    cfg: AppleMapKitConfig,
    layerType: "standard" | "satellite" | "hybrid",
    z: number,
    x: number,
    y: number,
    isRetina: boolean
  ) => {
    const tileSizeIndex = isRetina ? 2 : 1;
    const resolution = isRetina ? 2 : 1;
    if (layerType === "satellite") {
      const template =
        cfg.satelliteTemplate ||
        "/tile?style=7&size={{tileSizeIndex}}&scale={{resolution}}&z={{z}}&x={{x}}&y={{y}}&v=10441&accessKey=" +
          encodeURIComponent(cfg.accessKey);
      const domain = cfg.satelliteDomain || "sat-cdn.apple-mapkit.com";
      const path = template
        .replace("{{tileSizeIndex}}", String(tileSizeIndex))
        .replace("{{resolution}}", String(resolution))
        .replace("{{z}}", String(z))
        .replace("{{x}}", String(x))
        .replace("{{y}}", String(y));
      return `https://${domain}${path}`;
    }
    if (layerType === "hybrid") {
      const template =
        cfg.hybridTemplate || cfg.template.replace("style=0", "style=46");
      const path = template
        .replace("{{tileSizeIndex}}", String(tileSizeIndex))
        .replace("{{resolution}}", String(resolution))
        .replace("{{lang}}", "uk")
        .replace("{{z}}", String(z))
        .replace("{{x}}", String(x))
        .replace("{{y}}", String(y));
      return `https://cdn.apple-mapkit.com${path}`;
    }
    // standard light
    const path = cfg.template
      .replace("{{tileSizeIndex}}", String(tileSizeIndex))
      .replace("{{resolution}}", String(resolution))
      .replace("{{lang}}", "uk")
      .replace("{{z}}", String(z))
      .replace("{{x}}", String(x))
      .replace("{{y}}", String(y));
    return `https://cdn.apple-mapkit.com${path}`;
  };

  async function handleAppleTileRequest(
    req: express.Request,
    res: express.Response,
    layerType: "standard" | "satellite" | "hybrid"
  ) {
    const z = parseInt(req.params.z, 10);
    const x = parseInt(req.params.x, 10);
    const tileParam = req.params.tile || "";
    const isRetina = tileParam.includes("@2x");
    const y = parseInt(
      tileParam.replace("@2x", "").replace(/\.(png|jpg|jpeg)$/, ""),
      10
    );

    if (isNaN(z) || isNaN(x) || isNaN(y)) {
      return res.status(400).send("Invalid tile coordinates");
    }

    const cacheKey = `${layerType}/${z}/${x}/${y}${isRetina ? "@2x" : ""}`;
    const cached = tileCache.get(cacheKey);
    if (cached) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader(
        "Cache-Control",
        "public, max-age=86400, stale-while-revalidate=604800"
      );
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(cached.buffer);
    }

    try {
      let cfg = await getValidAppleConfig();
      let tileUrl = getAppleTileUrl(cfg, layerType, z, x, y, isRetina);
      let tileData: { buffer: Buffer; contentType: string };

      try {
        tileData = await fetchTileBuffer(tileUrl);
      } catch (fetchErr) {
        console.warn(
          `[Apple Maps ${layerType}] Tile fetch failed, retrying with fresh bootstrap...`,
          fetchErr
        );
        appleConfig = null;
        cfg = await getValidAppleConfig();
        tileUrl = getAppleTileUrl(cfg, layerType, z, x, y, isRetina);
        tileData = await fetchTileBuffer(tileUrl);
      }

      if (tileCache.size >= MAX_TILE_CACHE) {
        const oldestKey = tileCache.keys().next().value;
        if (oldestKey) tileCache.delete(oldestKey);
      }
      tileCache.set(cacheKey, {
        buffer: tileData.buffer,
        contentType: tileData.contentType,
        timestamp: Date.now(),
      });

      res.setHeader("Content-Type", tileData.contentType);
      res.setHeader(
        "Cache-Control",
        "public, max-age=86400, stale-while-revalidate=604800"
      );
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(tileData.buffer);
    } catch (err: any) {
      console.error(`[Apple Maps ${layerType} Error]:`, err?.message || err);
      // Fallback
      let fallbackUrl = `https://a.basemaps.cartocdn.com/light_nolabels/${z}/${x}/${y}.png`;
      if (layerType === "satellite") {
        fallbackUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
      }
      https
        .get(fallbackUrl, (fbRes) => {
          if (fbRes.statusCode === 200) {
            res.setHeader(
              "Content-Type",
              fbRes.headers["content-type"] || "image/png"
            );
            res.setHeader("Cache-Control", "public, max-age=3600");
            res.setHeader("Access-Control-Allow-Origin", "*");
            fbRes.pipe(res);
          } else {
            res.status(502).send("Failed to load map tile");
          }
        })
        .on("error", () => {
          res.status(502).send("Failed to load map tile");
        });
    }
  }

  // Apple Maps Tile Proxy endpoints
  app.get("/api/tiles/apple/:z/:x/:tile", (req, res) =>
    handleAppleTileRequest(req, res, "standard")
  );
  app.get("/api/tiles/apple-satellite/:z/:x/:tile", (req, res) =>
    handleAppleTileRequest(req, res, "satellite")
  );
  app.get("/api/tiles/apple-hybrid/:z/:x/:tile", (req, res) =>
    handleAppleTileRequest(req, res, "hybrid")
  );

  // Serve static assets from public folder (favicon, images, etc.)
  app.use(express.static(path.join(process.cwd(), "public")));

  // Vite development middleware vs production static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UAMapper Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
