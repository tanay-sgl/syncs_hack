import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const liveIntents = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "live-intents.json"), "utf-8")
);

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(200).json({ liveIntents });
}
