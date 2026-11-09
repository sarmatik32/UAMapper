import type { IncomingMessage, ServerResponse } from "http";
import { handleAppleTile } from "../../../../../lib/appleMaps";

export default function handler(req: IncomingMessage & { url?: string; method?: string }, res: ServerResponse): Promise<void> {
  return handleAppleTile(req, res, "satellite");
}
