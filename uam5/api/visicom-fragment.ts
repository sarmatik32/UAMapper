import https from "https";
import type { IncomingMessage, ServerResponse } from "http";

function fetchVisicom(url: string): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "UAMapper/1.0", Accept: "image/png,image/*;q=0.9,*/*;q=0.8" } }, (upstream) => {
      const chunks: Buffer[] = [];
      upstream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      upstream.on("end", () => {
        const headers: Record<string, string> = {};
        const contentType = upstream.headers["content-type"];
        if (contentType) headers["content-type"] = Array.isArray(contentType) ? contentType[0] : contentType;
        resolve({ status: upstream.statusCode || 502, headers, body: Buffer.concat(chunks) });
      });
    }).on("error", reject);
  });
}

export default async function handler(req: IncomingMessage & { query?: Record<string, string | string[]> }, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.end();
    return;
  }

  const q = req.query || {};
  const get = (name: string) => Array.isArray(q[name]) ? q[name][0] : q[name];
  const z = get("z");
  const lng = get("lng");
  const lat = get("lat");
  const width = Number(get("width"));
  const height = Number(get("height"));
  const lang = get("lang") === "en" ? "en" : "uk";
  const key = get("key");

  if (!z || !lng || !lat || !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > 2048 || height > 2048 || !key) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Invalid Visicom fragment parameters");
    return;
  }

  const url = `https://tms.visicom.ua/2.0.0/planet3/base/${encodeURIComponent(z)}/${encodeURIComponent(lng)},${encodeURIComponent(lat)}/${Math.round(width)}/${Math.round(height)}.png?lang=${lang}&key=${encodeURIComponent(key)}`;

  try {
    const upstream = await fetchVisicom(url);
    res.statusCode = upstream.status;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.setHeader("Content-Type", upstream.headers["content-type"] || "image/png");
    res.end(upstream.body);
  } catch (error: any) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(`Visicom proxy error: ${error?.message || "upstream request failed"}`);
  }
}
