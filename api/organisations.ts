import type { VercelRequest, VercelResponse } from "@vercel/node";
import organisations from "../data/organisations.json" with { type: "json" };

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(200).json({ organisations });
}
