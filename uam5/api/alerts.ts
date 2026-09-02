import type { IncomingMessage, ServerResponse } from "http";
import https from "https";

const DEFAULT_ALERTS_TOKEN = "3a0222c65a8814cbf1c92f1ce831c62e24d51f63ab2203";

interface CachedAlerts {
  data: any;
  timestamp: number;
}

let cachedAlerts: CachedAlerts | null = null;
const CACHE_TTL_MS = 12 * 1000;

function fetchFromAlertsInUa(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.alerts.in.ua",
      path: "/v1/alerts/active.json",
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "UAMapper-Vercel/1.0",
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

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]>; headers?: Record<string, string | string[] | undefined> },
  res: ServerResponse & { status?: (code: number) => any; json?: (data: any) => any }
) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Alerts-Token");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const customHeaderToken = req.headers && (req.headers["x-alerts-token"] as string | undefined);
  const token = customHeaderToken || process.env.ALERTS_IN_UA_TOKEN || DEFAULT_ALERTS_TOKEN;

  const now = Date.now();
  if (!customHeaderToken && cachedAlerts && now - cachedAlerts.timestamp < CACHE_TTL_MS) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=12, stale-while-revalidate=30");
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ...cachedAlerts.data,
        cached: true,
        cache_age_ms: now - cachedAlerts.timestamp,
      })
    );
    return;
  }

  try {
    const data = await fetchFromAlertsInUa(token);
    if (!customHeaderToken) {
      cachedAlerts = { data, timestamp: now };
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=12, stale-while-revalidate=30");
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error: any) {
    console.error("Vercel Alerts Proxy Error:", error);
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 502;
    res.end(
      JSON.stringify({
        error: error.message || "Failed to fetch alerts from alerts.in.ua",
      })
    );
  }
}
