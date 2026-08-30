import type { VercelRequest, VercelResponse } from "@vercel/node";
import { detectClusters, ActiveIntent } from "../lib/clustering.js";

const VALID_CATEGORIES = [
  "study", "hackathon", "project", "cofounder",
  "volunteer", "coffee", "mentor", "investor", "other",
];
const VALID_COMMITMENTS = ["casual", "moderate", "dedicated"];
const VALID_URGENCIES = ["low", "medium", "high"];

function isValidActiveIntent(ai: any): ai is ActiveIntent {
  return (
    typeof ai?.id === "string" &&
    typeof ai?.userId === "string" &&
    typeof ai?.intent === "object" &&
    VALID_CATEGORIES.includes(ai.intent?.category) &&
    Array.isArray(ai.intent?.roles) &&
    typeof ai.intent?.availability?.timezone === "string" &&
    typeof ai.intent?.location === "string" &&
    typeof ai.intent?.teamSize === "number" &&
    VALID_COMMITMENTS.includes(ai.intent?.commitment) &&
    VALID_URGENCIES.includes(ai.intent?.urgency)
  );
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { intents, minSize } = req.body ?? {};

  if (!Array.isArray(intents) || intents.length === 0) {
    return res
      .status(400)
      .json({ error: "'intents' must be a non-empty array" });
  }

  if (intents.length > 1000) {
    return res
      .status(400)
      .json({ error: "'intents' exceeds maximum of 1000" });
  }

  for (let i = 0; i < intents.length; i++) {
    if (!isValidActiveIntent(intents[i])) {
      return res
        .status(400)
        .json({ error: `Invalid intent at intents[${i}]` });
    }
  }

  const min = typeof minSize === "number" && minSize >= 2 ? Math.min(minSize, 50) : 3;
  const clusters = detectClusters(intents, min);

  return res.status(200).json({ clusters });
}
