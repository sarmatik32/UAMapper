import type { IncomingMessage, ServerResponse } from "http";

type Request = IncomingMessage & { method?: string; url?: string };
type Response = ServerResponse;
type CacheEntry = { data: unknown; timestamp: number };

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10_000;

async function fetchJson(url: string, token: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Authorization: token, Accept: "application/json", "User-Agent": "UAMapper/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error(`Upstream HTTP ${response.status}`) as Error & { statusCode?: number };
    error.statusCode = response.status;
    throw error;
  }
  return response.json();
}

export default async function handler(req: Request, res: Response): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
  if (req.method !== "GET") {
    res.statusCode = 405; res.setHeader("Allow", "GET, OPTIONS");
    res.end(JSON.stringify({ error: "Method not allowed" })); return;
  }

  const token = process.env.ALERTS_IN_UA_TOKEN?.trim() || process.env.UKRAINEALARM_API_TOKEN?.trim();
  if (!token) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: "UkraineAlarm token is not configured", setup: "Set UKRAINEALARM_API_TOKEN in Vercel Environment Variables and redeploy." }));
    return;
  }

  const url = new URL(req.url || "/api/alerts", "http://localhost");
  const resource = url.searchParams.get("resource") || "alerts";
  const regionId = url.searchParams.get("regionId");
  let upstream: string;

  switch (resource) {
    case "alerts": upstream = "https://api.ukrainealarm.com/api/v3/alerts"; break;
    case "regions": upstream = "https://api.ukrainealarm.com/api/v3/regions"; break;
    case "status": upstream = "https://api.ukrainealarm.com/api/v3/alerts/status"; break;
    case "history": upstream = "https://api.ukrainealarm.com/api/v3/alerts/regionHistory"; break;
    case "region":
      if (!regionId || !/^[a-zA-Z0-9_-]{1,100}$/.test(regionId)) {
        res.statusCode = 400; res.end(JSON.stringify({ error: "Valid regionId is required" })); return;
      }
      upstream = `https://api.ukrainealarm.com/api/v3/alerts/${encodeURIComponent(regionId)}`;
      break;
    default:
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Unsupported resource", allowed: ["alerts", "regions", "status", "history", "region"] }));
      return;
  }

  const key = `${resource}:${regionId || ""}`;
  const now = Date.now();
  const old = cache.get(key);
  if (old && now - old.timestamp < CACHE_TTL_MS) {
    res.setHeader("Cache-Control", "private, max-age=5");
    res.statusCode = 200;
    res.end(JSON.stringify({ data: old.data, cached: true, cacheAgeMs: now - old.timestamp }));
    return;
  }

  try {
    const data = await fetchJson(upstream, token);
    cache.set(key, { data, timestamp: Date.now() });
    if (cache.size > 30) { const first = cache.keys().next().value; if (first) cache.delete(first); }
    res.setHeader("Cache-Control", "private, max-age=5");
    res.statusCode = 200;
    res.end(JSON.stringify({ data, cached: false, fetchedAt: new Date().toISOString() }));
  } catch (cause) {
    const error = cause as Error & { statusCode?: number };
    console.error("[UkraineAlarm API]", error.message);
    res.statusCode = error.statusCode === 401 || error.statusCode === 403 ? error.statusCode : error.statusCode === 429 ? 429 : 502;
    res.end(JSON.stringify({
      error: "UkraineAlarm API request failed",
      statusCode: error.statusCode || 502,
      message: error.statusCode === 401 || error.statusCode === 403 ? "Перевір UKRAINEALARM_API_TOKEN у налаштуваннях Vercel." : error.statusCode === 429 ? "Перевищено ліміт API. Спробуй пізніше." : "API тимчасово недоступний.",
    }));
  }
}
