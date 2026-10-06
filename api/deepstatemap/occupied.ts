import type { IncomingMessage, ServerResponse } from "http";
import https from "https";
import fs from "fs";
import path from "path";

interface CachedData {
  data: any;
  timestamp: number;
}

let cachedDeepState: CachedData | null = null;
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

function httpsGetJson(url: string, timeoutMs = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; UAMapper/1.0)",
          Accept: "application/json",
        },
        timeout: timeoutMs,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(new Error("Invalid JSON"));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.on("error", reject);
  });
}

function getFallbackData(): any {
  try {
    const fallbackPath = path.join(process.cwd(), "public/data/deepstatemap_occupied_fallback.json");
    if (fs.existsSync(fallbackPath)) {
      return JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
    }
  } catch (err) {}
  return null;
}

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, max-age=600, s-maxage=600");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (_req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const now = Date.now();
  if (cachedDeepState && now - cachedDeepState.timestamp < CACHE_TTL_MS) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ...cachedDeepState.data, cached: true }));
    return;
  }

  try {
    const historyList = await httpsGetJson("https://deepstatemap.live/api/history/public", 8000);
    const last = Array.isArray(historyList) ? historyList[historyList.length - 1] : null;
    if (!last || !last.id) throw new Error("No history record found");

    const rawGeo = await httpsGetJson(`https://deepstatemap.live/api/history/${last.id}/geojson`, 10000);

    const foreignKeywords = [
      "петсамо", "салла", "естоні", "латві", "курильськ", "пруссія",
      "карелі", "ічкерія", "абхазі", "цхінваль", "придністров", "печорськ", "саатсе"
    ];

    const filteredFeatures = (rawGeo.features || [])
      .filter((f: any) => {
        if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) return false;
        const n = (f.properties?.name || "").toLowerCase();
        if (foreignKeywords.some((kw) => n.includes(kw))) return false;

        const isOccupied =
          n.includes("окупован") ||
          n.includes("ордло") ||
          n.includes("крим") ||
          n.includes("тузла") ||
          n.includes("occupied") ||
          f.properties?.fill === "#a52714";
        const isGray =
          n.includes("невідомий") || n.includes("unknown") || f.properties?.fill === "#bdbdbd";
        return isOccupied || isGray;
      })
      .map((f: any) => {
        const n = (f.properties?.name || "").toLowerCase();
        const isGray = n.includes("невідомий") || n.includes("unknown") || f.properties?.fill === "#bdbdbd";
        const rawName = f.properties?.name || "";
        const parts = rawName.split("///");
        return {
          type: "Feature",
          properties: {
            name: parts[0]?.trim() || (isGray ? "Сіра зона" : "Окупована територія"),
            nameEn: parts[1]?.trim() || (isGray ? "Gray zone" : "Occupied territory"),
            zoneType: isGray ? "gray" : "occupied",
            description: f.properties?.description || "",
            originalFill: f.properties?.fill || (isGray ? "#bdbdbd" : "#a52714"),
            originalStroke: f.properties?.stroke || (isGray ? "#757575" : "#7f1d1d"),
          },
          geometry: f.geometry,
        };
      });

    const processedData = {
      type: "FeatureCollection",
      updatedAt: last.updatedAt || new Date().toISOString(),
      datetime: last.datetime || "",
      historyId: last.id,
      features: filteredFeatures,
    };

    cachedDeepState = {
      data: processedData,
      timestamp: now,
    };

    res.statusCode = 200;
    res.end(JSON.stringify({ ...processedData, cached: false }));
  } catch (err: any) {
    if (cachedDeepState) {
      res.statusCode = 200;
      res.end(JSON.stringify({ ...cachedDeepState.data, cached: true, stale: true }));
      return;
    }

    const fallback = getFallbackData();
    if (fallback) {
      res.statusCode = 200;
      res.end(JSON.stringify({ ...fallback, cached: true, fallback: true }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ type: "FeatureCollection", features: [], error: err?.message }));
  }
}
