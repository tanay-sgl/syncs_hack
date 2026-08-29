export type IntentCategory =
  | "study"
  | "hackathon"
  | "project"
  | "cofounder"
  | "volunteer"
  | "coffee"
  | "mentor"
  | "investor"
  | "other";

export type ExperienceLevel = "beginner" | "intermediate" | "senior";
export type Commitment = "casual" | "moderate" | "dedicated";
export type WorkingStyle = "async" | "sync" | "flexible";
export type Urgency = "low" | "medium" | "high";

export interface RoleRequirement {
  skill: string;
  level: ExperienceLevel | "any";
  count: number;
}

export interface Intent {
  category: IntentCategory;
  roles: RoleRequirement[];
  availability: {
    days: string[];
    timezone: string;
    timeWindow: string | null;
  };
  location: string;
  projectType: string;
  teamSize: number;
  preferences: string[];
  course: string | null;
  topic: string | null;
  commitment: Commitment;
  urgency: Urgency;
}

export interface User {
  id: string;
  name: string;
  skills: { name: string; level: ExperienceLevel }[];
  availability: {
    days: string[];
    timezone: string;
  };
  location: string;
  courses: string[];
  year: number | null;
  major: string | null;
  commitment: Commitment;
  workingStyle: WorkingStyle;
  bio: string | null;
}

export interface GroupSpace {
  objective: string;
  roles: { userId: string; role: string }[];
  suggestedTime: string | null;
  nextSteps: string[];
}

export interface MatchResult {
  user: User;
  score: number;
  breakdown: {
    skillRelevance: number;
    availabilityOverlap: number;
    locationProximity: number;
    complementarity: number;
    contextual: number;
  };
  matchedRole: string | null;
}

export interface MatchResponse {
  results: MatchResult[];
  groupSpace: GroupSpace;
}
