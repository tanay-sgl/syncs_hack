import type { VercelRequest, VercelResponse } from "@vercel/node";
import { rankCandidates } from "../lib/scoring.js";
import type { Intent, User } from "../lib/types.js";

function isValidUser(u: any): u is User {
  return (
    typeof u?.id === "string" &&
    typeof u?.name === "string" &&
    Array.isArray(u?.skills) &&
    u.skills.every(
      (s: any) =>
        typeof s?.name === "string" &&
        ["beginner", "intermediate", "senior"].includes(s?.level)
    ) &&
    Array.isArray(u?.availability?.days) &&
    typeof u?.availability?.timezone === "string" &&
    typeof u?.location === "string"
  );
}

function isValidIntent(i: any): i is Intent {
  return (
    Array.isArray(i?.roles) &&
    i.roles.every(
      (r: any) =>
        typeof r?.skill === "string" &&
        ["beginner", "intermediate", "senior", "any"].includes(r?.level) &&
        typeof r?.count === "number"
    ) &&
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
    return res
      .status(400)
      .json({ error: "'candidates' must be a non-empty array" });
  }

  if (candidates.length > 500) {
    return res
      .status(400)
      .json({ error: "'candidates' exceeds maximum of 500" });
  }

  for (let i = 0; i < candidates.length; i++) {
    if (!isValidUser(candidates[i])) {
      return res
        .status(400)
        .json({ error: `Invalid user at candidates[${i}]` });
    }
    candidates[i].name = candidates[i].name.slice(0, 200);
    candidates[i].id = candidates[i].id.slice(0, 100);
    candidates[i].location = candidates[i].location.slice(0, 200);
    candidates[i].skills = candidates[i].skills.slice(0, 50).map((s: any) => ({
      name: s.name.slice(0, 100),
      level: s.level,
    }));
  }

  const maxN = Math.min(candidates.length, 50);
  const n = typeof topN === "number" && topN > 0 ? Math.min(topN, maxN) : Math.min(intent.teamSize, maxN);
  const results = rankCandidates(candidates, intent, n);

  return res.status(200).json({ results });
}
