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
let pendingBootstrapPromise: Promise<AppleMapKitConfig> | null = null;
let appleMasterToken =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkdKNUdaREZMODkifQ.eyJpc3MiOiJDNVU4OTI3MzZZIiwib3JpZ2luIjoiaHR0cHM6Ly9iZXRhLm1hcHMuYXBwbGUuY29tLGh0dHBzOi8vbWFwcy5hcHBsZS5jb20iLCJpYXQiOjE3ODkxMjk1MjEsImV4cCI6MTc5OTQ5NzUyMX0.CAEYM6xXfVhEdWGedQJRTtelM1KuZ84p-xqBjRdD3NY0eHTHViJT8jM4L1BqAuJfdkXFpyTBUeK7eGw5GnQdXQ";

const tileCache = new Map<
  string,
  { buffer: Buffer; contentType: string; timestamp: number }
>();
const MAX_TILE_CACHE = 2000;

// Persistent HTTP keep-alive agent to reuse TCP/TLS connections to Apple's CDN
const httpsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 64,
  maxFreeSockets: 32,
  timeout: 15000,
});

function scrapeMasterTokenFromApple(url = "https://maps.apple.com/", depth = 0): Promise<string> {
  if (depth > 3) {
    return Promise.reject(new Error("Too many redirects scraping Apple token"));
  }
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        agent: httpsKeepAliveAgent,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 8000,
      },
      (res) => {
        if (
          (res.statusCode === 301 ||
            res.statusCode === 302 ||
            res.statusCode === 307 ||
            res.statusCode === 308) &&
          res.headers.location
        ) {
          const redirectUrl = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          return resolve(scrapeMasterTokenFromApple(redirectUrl, depth + 1));
        }

        let html = "";
        res.on("data", (d) => (html += d));
        res.on("end", () => {
          const match = html.match(/data-token="([^"]+)"/);
          if (match && match[1]) {
            resolve(match[1]);
          } else if (url !== "https://beta.maps.apple.com/") {
            // Try beta fallback
            resolve(scrapeMasterTokenFromApple("https://beta.maps.apple.com/", depth + 1));
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
        agent: httpsKeepAliveAgent,
        headers: {
          Origin: "https://maps.apple.com",
          Referer: "https://maps.apple.com/",
          Authorization: `Bearer ${token}`,
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
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

  // Mutex pattern: If a bootstrap request is already in progress, await the same promise
  // This prevents dozens of concurrent tile requests from flooding Apple's servers simultaneously
  if (pendingBootstrapPromise) {
    return pendingBootstrapPromise;
  }

  pendingBootstrapPromise = (async () => {
    try {
      appleConfig = await fetchAppleBootstrap(appleMasterToken);
      return appleConfig;
    } catch (err: any) {
      console.warn(
        "[Apple Maps] Bootstrap with cached token failed, scraping fresh token...",
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
    } finally {
      pendingBootstrapPromise = null;
    }
  })();

  return pendingBootstrapPromise;
}

function fetchTileBuffer(
  tileUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      tileUrl,
      {
        agent: httpsKeepAliveAgent,
        headers: {
          Origin: "https://maps.apple.com",
          Referer: "https://maps.apple.com/",
          Accept: "image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
        },
        timeout: 10000,
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

  // Global CORS and Preflight handler - guarantees mobile Safari & Chrome never block tile or API requests
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

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

  // 1x1 transparent PNG fallback buffer
  const TRANSPARENT_1PX_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );

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
    // Apple satellite CDN exclusively supports resolution scale=1
    const resolution = layerType === "satellite" ? 1 : isRetina ? 2 : 1;
    const cdnIndex = (Math.abs(x + y) % 4) + 1; // Round-robin across Apple CDN edge shards 1-4

    if (layerType === "satellite") {
      const template =
        cfg.satelliteTemplate ||
        "/tile?style=7&size={{tileSizeIndex}}&scale={{resolution}}&z={{z}}&x={{x}}&y={{y}}&v=10441&accessKey=" +
          encodeURIComponent(cfg.accessKey);
      const defaultDomain = `sat-cdn${cdnIndex}.apple-mapkit.com`;
      const domain = cfg.satelliteDomain
        ? cfg.satelliteDomain.replace("sat-cdn.", `sat-cdn${cdnIndex}.`)
        : defaultDomain;
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
      return `https://cdn${cdnIndex}.apple-mapkit.com${path}`;
    }
    // standard light
    const path = cfg.template
      .replace("{{tileSizeIndex}}", String(tileSizeIndex))
      .replace("{{resolution}}", String(resolution))
      .replace("{{lang}}", "uk")
      .replace("{{z}}", String(z))
      .replace("{{x}}", String(x))
      .replace("{{y}}", String(y));
    return `https://cdn${cdnIndex}.apple-mapkit.com${path}`;
  };

  async function handleAppleTileRequest(
    req: express.Request,
    res: express.Response,
    layerType: "standard" | "satellite" | "hybrid"
  ) {
    const z = parseInt(req.params.z, 10);
    const x = parseInt(req.params.x, 10);
    const tileParam = req.params.tile || "";
    const isRetina = tileParam.includes("@2x") || tileParam.includes("@3x");
    const cleanYStr = tileParam
      .split("?")[0]
      .replace(/@\d+x/g, "")
      .replace(/\.(png|jpg|jpeg|webp)$/i, "");
    const y = parseInt(cleanYStr, 10);

    // Standard cross-origin headers for full device and canvas compatibility
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    if (isNaN(z) || isNaN(x) || isNaN(y)) {
      return res.status(400).send("Invalid tile coordinates");
    }

    // Guard against out-of-range tiles
    const maxCoord = Math.pow(2, z);
    if (z < 1 || z > 22 || x < 0 || x >= maxCoord || y < 0 || y >= maxCoord) {
      if (layerType === "hybrid") {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(TRANSPARENT_1PX_PNG);
      }
    }

    const cacheKey = `${layerType}/${z}/${x}/${y}${isRetina ? "@2x" : ""}`;
    const cached = tileCache.get(cacheKey);
    if (cached) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader(
        "Cache-Control",
        "public, max-age=86400, stale-while-revalidate=604800"
      );
      return res.send(cached.buffer);
    }

    try {
      let cfg = await getValidAppleConfig();
      let tileUrl = getAppleTileUrl(cfg, layerType, z, x, y, isRetina);
      let tileData: { buffer: Buffer; contentType: string };

      try {
        tileData = await fetchTileBuffer(tileUrl);
      } catch (fetchErr: any) {
        // If 401/403 unauthorized or invalid token, refresh token
        const errMsg = fetchErr?.message || "";
        const isAuthError = errMsg.includes("401") || errMsg.includes("403");
        console.warn(
          `[Apple Maps ${layerType}] Tile fetch error (${errMsg}), ${isAuthError ? "refreshing bootstrap" : "retrying"}...`
        );
        if (isAuthError) {
          appleConfig = null;
        }
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
      return res.send(tileData.buffer);
    } catch (err: any) {
      console.error(`[Apple Maps ${layerType} Error]:`, err?.message || err);
      
      // If hybrid overlay fails, return transparent 1x1 tile or transparent Esri boundaries
      if (layerType === "hybrid") {
        const fallbackUrl = `https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${y}/${x}`;
        const fbReq = https.get(
          fallbackUrl,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              Accept: "image/webp,image/png,image/*;q=0.8,*/*;q=0.5",
            },
            timeout: 6000,
          },
          (fbRes) => {
            if (fbRes.statusCode === 200) {
              res.setHeader(
                "Content-Type",
                fbRes.headers["content-type"] || "image/png"
              );
              res.setHeader("Cache-Control", "public, max-age=86400");
              fbRes.pipe(res);
            } else {
              res.setHeader("Content-Type", "image/png");
              res.setHeader("Cache-Control", "public, max-age=86400");
              res.send(TRANSPARENT_1PX_PNG);
            }
          }
        );
        fbReq.on("error", () => {
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.send(TRANSPARENT_1PX_PNG);
        });
        return;
      }

      // Fallback for standard or satellite
      let fallbackUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${z}/${y}/${x}`;
      if (layerType === "satellite") {
        fallbackUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
      }
      const fbReq = https.get(
        fallbackUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
          },
          timeout: 6000,
        },
        (fbRes) => {
          if (fbRes.statusCode === 200) {
            res.setHeader(
              "Content-Type",
              fbRes.headers["content-type"] || "image/png"
            );
            res.setHeader("Cache-Control", "public, max-age=3600");
            fbRes.pipe(res);
          } else {
            res.status(502).send("Failed to load map tile");
          }
        }
      );
      fbReq.on("error", () => {
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
