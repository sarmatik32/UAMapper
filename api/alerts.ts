import type { IncomingMessage, ServerResponse } from "http";

type Request = IncomingMessage & {
  method?: string;
  url?: string;
};
type Response = ServerResponse & {
  status?: (code: number) => Response;
  json?: (data: unknown) => Response;
};

type CacheEntry = { data: unknown; timestamp: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10_000;
const UPSTREAM = "https://api.ukrainealarm.com/api/v3";

async function fetchUkraineAlarm(path: string, token: string): Promise<unknown> {
  const response = await fetch(`${UPSTREAM}${path}`, {
    method: "GET",
    headers: {
      Authorization: token,
      Accept: "application/json",
      "User-Agent": "UAMapper/1.0",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 300);
    const error = new Error(`UkraineAlarm API returned HTTP ${response.status}: ${details}`);
    (error as Error & { statusCode?: number }).statusCode = response.status;
    throw error;
  }

  return response.json();
}

export default async function handler(req: Request, res: Response): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, OPTIONS");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const token = process.env.UKRAINEALARM_API_TOKEN?.trim();
  if (!token) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      error: "UkraineAlarm API token is not configured",
      setup: "Set UKRAINEALARM_API_TOKEN in the Vercel project Environment Variables, then redeploy.",
    }));
    return;
  }

  const rawPath = new URL(req.url || "/api/ukrainealarm", "http://localhost").searchParams.get("resource") || "alerts";
  const regionId = new URL(req.url || "/api/ukrainealarm", "http://localhost").searchParams.get("regionId");
  let path: string;

  switch (rawPath) {
    case "alerts":
      path = "/alerts";
      break;
    case "regions":
      path = "/regions";
      break;
    case "status":
      path = "/alerts/status";
      break;
    case "history":
      path = "/alerts/regionHistory";
      break;
    case "region":
      if (!regionId || !/^[a-zA-Z0-9_-]{1,80}$/.test(regionId)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "A valid regionId query parameter is required" }));
        return;
      }
      path = `/alerts/${encodeURIComponent(regionId)}`;
      break;
    default:
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Unsupported resource. Use alerts, regions, status, history or region." }));
      return;
  }

  const cacheKey = `${rawPath}:${regionId || ""}`;
  const now = Date.now();
  const entry = cache.get(cacheKey);
  if (entry && now - entry.timestamp < CACHE_TTL_MS) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=5");
    res.statusCode = 200;
    res.end(JSON.stringify({ data: entry.data, cached: true, cacheAgeMs: now - entry.timestamp }));
    return;
  }

  try {
    const data = await fetchUkraineAlarm(path, token);
    cache.set(cacheKey, { data, timestamp: Date.now() });
    if (cache.size > 20) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=5");
    res.statusCode = 200;
    res.end(JSON.stringify({ data, cached: false, fetchedAt: new Date().toISOString() }));
  } catch (cause) {
    const error = cause as Error & { statusCode?: number };
    console.error("[UkraineAlarm API]", error.message);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.statusCode = error.statusCode === 401 || error.statusCode === 403
      ? error.statusCode
      : error.statusCode === 429
        ? 429
        : 502;
    res.end(JSON.stringify({
      error: "Failed to retrieve data from UkraineAlarm API",
      statusCode: error.statusCode || 502,
      message: error.statusCode === 401 || error.statusCode === 403
        ? "Перевір токен UKRAINEALARM_API_TOKEN у налаштуваннях Vercel."
        : error.statusCode === 429
          ? "Ліміт API перевищено. Спробуй пізніше."
          : "Сервіс API тимчасово недоступний.",
    }));
  }
}
