import type { IncomingMessage, ServerResponse } from "http";
import { handleAppleTile } from "../lib/appleMaps";

type TileRequest = IncomingMessage & { url?: string; method?: string };

export default function handler(req: TileRequest, res: ServerResponse): Promise<void> {
  const requestUrl = new URL(req.url || "/api/apple-tiles", "https://uamapper.local");
  const layer = requestUrl.searchParams.get("layer");
  const z = requestUrl.searchParams.get("z");
  const x = requestUrl.searchParams.get("x");
  const y = requestUrl.searchParams.get("y");

  if ((layer !== "standard" && layer !== "satellite" && layer !== "hybrid") ||
      !z || !x || !y ||
      ![z, x, y].every((value) => /^\d{1,2}$/.test(value))) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Invalid Apple tile parameters");
    return Promise.resolve();
  }

  const extension = layer === "satellite" ? "jpg" : "png";
  req.url = `/api/tiles/apple/${z}/${x}/${y}.${extension}`;
  return handleAppleTile(req, res, layer);
}
