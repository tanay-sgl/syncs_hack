import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { INTENT_SYSTEM_PROMPT } from "../lib/prompts.js";
import type { Intent } from "../lib/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body ?? {};
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'query' string in request body" });
  }

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash-preview-05-20"),
      system: INTENT_SYSTEM_PROMPT,
      prompt: query,
      maxTokens: 500,
    });

    const intent: Intent = JSON.parse(text);

    if (
      !Array.isArray(intent.skills) ||
      !intent.availability?.days ||
      !intent.availability?.timezone ||
      typeof intent.location !== "string" ||
      typeof intent.projectType !== "string" ||
      typeof intent.teamSize !== "number"
    ) {
      return res.status(502).json({ error: "Model returned invalid intent structure", raw: text });
    }

    return res.status(200).json({ intent });
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "Model did not return valid JSON" });
    }
    return res.status(500).json({ error: err.message ?? "Internal server error" });
  }
}
