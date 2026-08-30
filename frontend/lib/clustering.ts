import { Intent, IntentCategory } from "./types.js";
import { skillSimilarity } from "./skills.js";

export interface ActiveIntent {
  id: string;
  userId: string;
  intent: Intent;
}

export interface IntentCluster {
  category: IntentCategory;
  course: string | null;
  topic: string | null;
  location: string;
  timeWindow: string | null;
  intentIds: string[];
  userIds: string[];
  size: number;
  suggestedEvent: string;
}

function intentsOverlap(a: Intent, b: Intent): boolean {
  if (a.category !== b.category) return false;

  if (a.course && b.course) {
    if (a.course.toLowerCase() !== b.course.toLowerCase()) return false;
  }

  if (a.roles.length > 0 && b.roles.length > 0) {
    const hasSkillOverlap = a.roles.some((ra) =>
      b.roles.some((rb) => skillSimilarity(ra.skill, rb.skill) > 0.5)
    );
    if (!hasSkillOverlap && !a.course) return false;
  }

  const aDays = a.availability.days.map((d) => d.toLowerCase());
  const bDays = b.availability.days.map((d) => d.toLowerCase());
  if (aDays.length > 0 && bDays.length > 0) {
    const dayOverlap = aDays.some((d) => bDays.includes(d));
    if (!dayOverlap) return false;
  }

  const aLoc = a.location.toLowerCase();
  const bLoc = b.location.toLowerCase();
  const locCompatible =
    aLoc === bLoc ||
    aLoc === "remote" ||
    bLoc === "remote" ||
    aLoc === "nearby" ||
    bLoc === "nearby";
  if (!locCompatible) return false;

  return true;
}

function generateEventName(intent: Intent, size: number): string {
  const prefix = intent.course ?? intent.topic ?? intent.projectType;

  switch (intent.category) {
    case "study":
      return `${prefix} Study Session — ${size} people`;
    case "hackathon":
      return `Hackathon Team Formation — ${size} people looking`;
    case "project":
      return `${prefix} Project Meetup — ${size} people`;
    case "coffee":
      return `Networking Coffee — ${size} people interested`;
    case "volunteer":
      return `${prefix} Volunteer Group — ${size} people`;
    default:
      return `${prefix} — ${size} people interested`;
  }
}

export function detectClusters(
  intents: ActiveIntent[],
  minSize: number = 3
): IntentCluster[] {
  const assigned = new Set<string>();
  const clusters: IntentCluster[] = [];

  const sorted = [...intents].sort((a, b) => {
    const urgencyRank = { high: 0, medium: 1, low: 2 };
    return (
      (urgencyRank[a.intent.urgency] ?? 2) -
      (urgencyRank[b.intent.urgency] ?? 2)
    );
  });

  for (const seed of sorted) {
    if (assigned.has(seed.id)) continue;

    const group: ActiveIntent[] = [seed];

    for (const candidate of sorted) {
      if (candidate.id === seed.id || assigned.has(candidate.id)) continue;
      if (intentsOverlap(seed.intent, candidate.intent)) {
        group.push(candidate);
      }
    }

    if (group.length >= minSize) {
      for (const g of group) assigned.add(g.id);

      clusters.push({
        category: seed.intent.category,
        course: seed.intent.course,
        topic: seed.intent.topic,
        location: seed.intent.location,
        timeWindow: seed.intent.availability.timeWindow,
        intentIds: group.map((g) => g.id),
        userIds: group.map((g) => g.userId),
        size: group.length,
        suggestedEvent: generateEventName(seed.intent, group.length),
      });
    }
  }

  return clusters.sort((a, b) => b.size - a.size);
}
