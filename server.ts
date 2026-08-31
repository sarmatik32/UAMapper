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
