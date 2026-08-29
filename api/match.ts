import type { VercelRequest, VercelResponse } from "@vercel/node";
import { rankCandidates } from "../lib/scoring.js";
import type { Intent, User } from "../lib/types.js";

function isValidUser(u: any): u is User {
  return (
    typeof u?.id === "string" &&
    typeof u?.name === "string" &&
    Array.isArray(u?.skills) &&
    Array.isArray(u?.availability?.days) &&
    typeof u?.availability?.timezone === "string" &&
    typeof u?.location === "string"
  );
}

function isValidIntent(i: any): i is Intent {
  return (
    Array.isArray(i?.skills) &&
    Array.isArray(i?.availability?.days) &&
    typeof i?.availability?.timezone === "string" &&
    typeof i?.location === "string" &&
    typeof i?.projectType === "string" &&
    typeof i?.teamSize === "number"
  );
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { intent, candidates, topN } = req.body ?? {};

  if (!isValidIntent(intent)) {
    return res.status(400).json({ error: "Missing or invalid 'intent' object" });
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: "'candidates' must be a non-empty array" });
  }

  for (let i = 0; i < candidates.length; i++) {
    if (!isValidUser(candidates[i])) {
      return res.status(400).json({ error: `Invalid user at candidates[${i}]` });
    }
  }

  const n = typeof topN === "number" && topN > 0 ? topN : intent.teamSize;
  const results = rankCandidates(candidates, intent, n);

  return res.status(200).json({ results });
}
