import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { INTENT_SYSTEM_PROMPT } from "../lib/prompts.js";

const IntentSchema = z.object({
  category: z.enum([
    "study", "hackathon", "project", "cofounder",
    "volunteer", "coffee", "mentor", "investor", "other",
  ]),
  roles: z.array(
    z.object({
      skill: z.string().max(100),
      level: z.enum(["beginner", "intermediate", "senior", "any"]),
      count: z.number().int().positive().max(20),
    })
  ).max(20),
  availability: z.object({
    days: z.array(z.string().max(20)).max(7),
    timezone: z.string().max(50),
    timeWindow: z.string().max(100).nullable(),
  }),
  location: z.string().max(200),
  projectType: z.string().max(200),
  teamSize: z.number().int().positive().max(50),
  preferences: z.array(z.string().max(200)).max(10),
  course: z.string().max(50).nullable(),
  topic: z.string().max(200).nullable(),
  commitment: z.enum(["casual", "moderate", "dedicated"]),
  urgency: z.enum(["low", "medium", "high"]),
});

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fenced) return fenced[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return text.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body ?? {};
  if (!query || typeof query !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'query' string in request body" });
  }

  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) {
    return res
      .status(400)
      .json({ error: "Query must be between 1 and 2000 characters" });
  }

  let raw = "";
  try {
    const { text } = await generateText({
      model: google("gemini-3.6-flash"),
      system: INTENT_SYSTEM_PROMPT,
      prompt: `Extract collaboration intent from this request:\n\n${trimmed}`,
      maxTokens: 1000,
    });

    raw = text;
    const cleaned = extractJson(text);
    const parsed = JSON.parse(cleaned);
    const result = IntentSchema.safeParse(parsed);

    if (!result.success) {
      return res.status(502).json({
        error: "Model returned invalid intent structure",
        details: result.error.flatten(),
      });
    }

    return res.status(200).json({ intent: result.data });
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "Model did not return valid JSON", raw });
    }
    return res
      .status(500)
      .json({ error: err.message ?? "Internal server error" });
  }
}
