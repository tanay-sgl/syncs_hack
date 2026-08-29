import {
  Intent,
  IntentCategory,
  User,
  MatchResult,
  MatchResponse,
  GroupSpace,
} from "./types.js";
import { bestSkillMatch, skillSimilarity } from "./skills.js";
import { timezoneProximity } from "./timezones.js";

interface Weights {
  skillRelevance: number;
  availabilityOverlap: number;
  locationProximity: number;
  complementarity: number;
  contextual: number;
}

const CATEGORY_WEIGHTS: Record<IntentCategory, Weights> = {
  study: {
    skillRelevance: 0.15,
    availabilityOverlap: 0.25,
    locationProximity: 0.15,
    complementarity: 0.05,
    contextual: 0.40,
  },
  hackathon: {
    skillRelevance: 0.30,
    availabilityOverlap: 0.20,
    locationProximity: 0.10,
    complementarity: 0.25,
    contextual: 0.15,
  },
  project: {
    skillRelevance: 0.30,
    availabilityOverlap: 0.20,
    locationProximity: 0.10,
    complementarity: 0.25,
    contextual: 0.15,
  },
  cofounder: {
    skillRelevance: 0.25,
    availabilityOverlap: 0.10,
    locationProximity: 0.10,
    complementarity: 0.30,
    contextual: 0.25,
  },
  volunteer: {
    skillRelevance: 0.10,
    availabilityOverlap: 0.35,
    locationProximity: 0.30,
    complementarity: 0.05,
    contextual: 0.20,
  },
  coffee: {
    skillRelevance: 0.10,
    availabilityOverlap: 0.25,
    locationProximity: 0.35,
    complementarity: 0.00,
    contextual: 0.30,
  },
  mentor: {
    skillRelevance: 0.40,
    availabilityOverlap: 0.15,
    locationProximity: 0.05,
    complementarity: 0.05,
    contextual: 0.35,
  },
  investor: {
    skillRelevance: 0.30,
    availabilityOverlap: 0.05,
    locationProximity: 0.10,
    complementarity: 0.10,
    contextual: 0.45,
  },
  other: {
    skillRelevance: 0.30,
    availabilityOverlap: 0.25,
    locationProximity: 0.20,
    complementarity: 0.15,
    contextual: 0.10,
  },
};

const LEVEL_RANK: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  senior: 3,
  any: 0,
};

function scoreSkillRelevance(
  user: User,
  intent: Intent
): { score: number; bestRole: string | null } {
  if (intent.roles.length === 0) return { score: 0, bestRole: null };

  const userSkillNames = user.skills.map((s) => s.name);
  let bestScore = 0;
  let bestRole: string | null = null;

  for (const role of intent.roles) {
    const match = bestSkillMatch(userSkillNames, role.skill);
    let roleScore = match.similarity;

    if (roleScore === 0 && intent.course) {
      const courseMatch = user.courses.some(
        (c) => c.toLowerCase() === role.skill.toLowerCase()
      );
      if (courseMatch) roleScore = 0.9;
    }

    if (roleScore > 0 && role.level !== "any") {
      const userSkill = user.skills.find(
        (s) => s.name.toLowerCase() === match.skill.toLowerCase()
      );
      if (userSkill) {
        const required = LEVEL_RANK[role.level];
        const actual = LEVEL_RANK[userSkill.level];
        if (actual >= required) roleScore *= 1.0;
        else if (actual === required - 1) roleScore *= 0.7;
        else roleScore *= 0.4;
      }
    }

    if (roleScore > bestScore) {
      bestScore = roleScore;
      bestRole = role.skill;
    }
  }

  return { score: bestScore, bestRole };
}

function scoreAvailabilityOverlap(user: User, intent: Intent): number {
  const intentDays = intent.availability.days.map((d) => d.toLowerCase());
  const userDays = user.availability.days.map((d) => d.toLowerCase());

  if (intentDays.length === 0) return 0.5;

  const overlap = userDays.filter((d) => intentDays.includes(d));
  const dayScore = overlap.length / intentDays.length;
  const tzScore = timezoneProximity(
    user.availability.timezone,
    intent.availability.timezone
  );

  return dayScore * 0.7 + tzScore * 0.3;
}

function scoreLocationProximity(user: User, intent: Intent): number {
  const intentLoc = intent.location.toLowerCase();
  const userLoc = user.location.toLowerCase();
  if (intentLoc === "remote") return 1;
  if (userLoc === intentLoc) return 1;
  if (intentLoc === "campus" && userLoc === "campus") return 1;
  if (intentLoc === "nearby" && userLoc !== "remote") return 0.8;
  if (userLoc === "remote") return 0.7;
  return 0.2;
}

function scoreComplementarity(
  user: User,
  intent: Intent,
  alreadySelected: User[],
  filledRoles: Map<string, number>
): number {
  if (alreadySelected.length === 0) return 1;

  const userSkillNames = user.skills.map((s) => s.name);

  let roleCoverageBonus = 0;
  for (const role of intent.roles) {
    const filled = filledRoles.get(role.skill) ?? 0;
    if (filled < role.count) {
      const match = bestSkillMatch(userSkillNames, role.skill);
      if (match.similarity > 0.5) {
        roleCoverageBonus = 0.3;
        break;
      }
    }
  }

  const selectedSkills = alreadySelected.flatMap((u) =>
    u.skills.map((s) => s.name.toLowerCase())
  );
  let duplicationPenalty = 0;
  let checked = 0;
  for (const us of userSkillNames) {
    for (const ss of selectedSkills) {
      if (skillSimilarity(us, ss) > 0.6) {
        duplicationPenalty++;
        break;
      }
    }
    checked++;
  }
  const uniquenessScore = Math.max(0, 1 - duplicationPenalty / (checked || 1));

  return Math.min(1, uniquenessScore * 0.7 + roleCoverageBonus);
}

function scoreContextual(user: User, intent: Intent): number {
  let score = 0;
  let factors = 0;

  if (intent.category === "study" && intent.course) {
    factors++;
    const hasCourse = user.courses.some(
      (c) => c.toLowerCase() === intent.course!.toLowerCase()
    );
    score += hasCourse ? 1.0 : 0.0;
  }

  if (intent.category === "study" && intent.topic) {
    factors++;
    const userSkillNames = user.skills.map((s) => s.name);
    const match = bestSkillMatch(userSkillNames, intent.topic);
    score += match.similarity;
  }

  const commitmentMatch: Record<string, Record<string, number>> = {
    casual: { casual: 1, moderate: 0.7, dedicated: 0.4 },
    moderate: { casual: 0.7, moderate: 1, dedicated: 0.7 },
    dedicated: { casual: 0.3, moderate: 0.6, dedicated: 1 },
  };
  factors++;
  score += commitmentMatch[intent.commitment]?.[user.commitment] ?? 0.5;

  if (
    intent.category === "cofounder" ||
    intent.category === "project" ||
    intent.category === "hackathon"
  ) {
    factors++;
    const styleCompat: Record<string, Record<string, number>> = {
      async: { async: 1, flexible: 0.8, sync: 0.4 },
      sync: { sync: 1, flexible: 0.8, async: 0.4 },
      flexible: { flexible: 1, async: 0.8, sync: 0.8 },
    };
    score += styleCompat.flexible?.[user.workingStyle] ?? 0.5;
  }

  if (intent.category === "mentor") {
    factors++;
    const mentorBonus =
      user.year !== null && user.year >= 3 ? 1.0 : user.year === 2 ? 0.5 : 0.2;
    score += mentorBonus;
  }

  if (intent.category === "investor") {
    factors++;
    const prefScore = intent.preferences.length > 0
      ? intent.preferences.filter((p) => {
          const pLow = p.toLowerCase();
          return (
            user.bio?.toLowerCase().includes(pLow) ||
            user.skills.some((s) => s.name.toLowerCase().includes(pLow)) ||
            user.major?.toLowerCase().includes(pLow)
          );
        }).length / intent.preferences.length
      : 0;
    score += prefScore;
  }

  if (intent.category === "coffee") {
    factors++;
    const prefScore = intent.preferences.length > 0
      ? intent.preferences.filter((p) => {
          const pLow = p.toLowerCase();
          return (
            user.bio?.toLowerCase().includes(pLow) ||
            user.skills.some((s) => s.name.toLowerCase().includes(pLow))
          );
        }).length / intent.preferences.length
      : 0.5;
    score += prefScore;
  }

  return factors > 0 ? score / factors : 0.5;
}

function buildGroupSpace(
  results: MatchResult[],
  intent: Intent
): GroupSpace {
  const objective = intent.category === "study"
    ? `${intent.course ?? "Study"} session${intent.topic ? `: ${intent.topic}` : ""}`
    : intent.category === "hackathon"
    ? `Hackathon team — ${intent.projectType}`
    : intent.category === "cofounder"
    ? `Cofounder matching — ${intent.projectType}`
    : intent.category === "coffee"
    ? "Coffee chat"
    : intent.category === "volunteer"
    ? `Volunteer group — ${intent.projectType}`
    : intent.category === "mentor"
    ? "Mentorship connection"
    : intent.category === "investor"
    ? `Investor discovery — ${intent.projectType}`
    : intent.projectType || "Collaboration";

  const roles = results.map((r) => ({
    userId: r.user.id,
    role: r.matchedRole ?? "member",
  }));

  const suggestedTime = intent.availability.timeWindow
    ?? (intent.availability.days.length > 0
      ? intent.availability.days[0]
      : null);

  const nextSteps: string[] = [];
  if (intent.category === "study") {
    nextSteps.push("Share study materials or topics to cover");
    nextSteps.push("Confirm meeting location and time");
  } else if (intent.category === "hackathon") {
    nextSteps.push("Agree on project idea and tech stack");
    nextSteps.push("Divide responsibilities by role");
    nextSteps.push("Set up shared repo and communication channel");
  } else if (intent.category === "cofounder") {
    nextSteps.push("Schedule an intro call to discuss the vision");
    nextSteps.push("Align on commitment level and equity expectations");
  } else if (intent.category === "coffee") {
    nextSteps.push("Pick a spot and confirm the time");
  } else if (intent.category === "volunteer") {
    nextSteps.push("Confirm attendance and assign shifts");
  } else if (intent.category === "mentor") {
    nextSteps.push("Share what you need help with");
    nextSteps.push("Schedule a first session");
  } else if (intent.category === "investor") {
    nextSteps.push("Share pitch deck or one-pager");
    nextSteps.push("Schedule an intro meeting");
  } else {
    nextSteps.push("Introduce yourselves and align on goals");
  }

  return { objective, roles, suggestedTime, nextSteps };
}

export function rankCandidates(
  candidates: User[],
  intent: Intent,
  topN: number
): MatchResponse {
  const weights = CATEGORY_WEIGHTS[intent.category] ?? CATEGORY_WEIGHTS.other;
  const selected: User[] = [];
  const results: MatchResult[] = [];
  const filledRoles = new Map<string, number>();

  for (let i = 0; i < Math.min(topN, candidates.length); i++) {
    let bestResult: MatchResult | null = null;

    for (const candidate of candidates) {
      if (selected.some((s) => s.id === candidate.id)) continue;

      const { score: skillScore, bestRole } = scoreSkillRelevance(
        candidate,
        intent
      );
      const breakdown = {
        skillRelevance: skillScore,
        availabilityOverlap: scoreAvailabilityOverlap(candidate, intent),
        locationProximity: scoreLocationProximity(candidate, intent),
        complementarity: scoreComplementarity(
          candidate,
          intent,
          selected,
          filledRoles
        ),
        contextual: scoreContextual(candidate, intent),
      };

      const score =
        breakdown.skillRelevance * weights.skillRelevance +
        breakdown.availabilityOverlap * weights.availabilityOverlap +
        breakdown.locationProximity * weights.locationProximity +
        breakdown.complementarity * weights.complementarity +
        breakdown.contextual * weights.contextual;

      const result: MatchResult = {
        user: candidate,
        score,
        breakdown,
        matchedRole: bestRole,
      };

      if (!bestResult || score > bestResult.score) {
        bestResult = result;
      }
    }

    if (bestResult) {
      results.push(bestResult);
      selected.push(bestResult.user);
      if (bestResult.matchedRole) {
        const prev = filledRoles.get(bestResult.matchedRole) ?? 0;
        filledRoles.set(bestResult.matchedRole, prev + 1);
      }
    }
  }

  const groupSpace = buildGroupSpace(results, intent);
  return { results, groupSpace };
}
