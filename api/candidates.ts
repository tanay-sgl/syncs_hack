import type { VercelRequest, VercelResponse } from "@vercel/node";
import candidates from "../data/candidates.json" with { type: "json" };

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(200).json({ candidates });
}
