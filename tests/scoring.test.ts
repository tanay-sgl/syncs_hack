import { describe, it, expect } from "vitest";
import { rankCandidates } from "../lib/scoring.js";
import { Intent, User } from "../lib/types.js";

function makeUser(overrides: Partial<User> & { id: string; name: string }): User {
  return {
    skills: [],
    availability: { days: [], timezone: "UTC" },
    location: "remote",
    courses: [],
    year: null,
    major: null,
    commitment: "moderate",
    workingStyle: "flexible",
    bio: null,
    ...overrides,
  };
}

function makeIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    category: "other",
    roles: [],
    availability: { days: [], timezone: "UTC", timeWindow: null },
    location: "remote",
    projectType: "general",
    teamSize: 1,
    preferences: [],
    course: null,
    topic: null,
    commitment: "moderate",
    urgency: "medium",
    ...overrides,
  };
}

describe("rankCandidates", () => {
  describe("study category", () => {
    it("prioritises students enrolled in the requested course", () => {
      const intent = makeIntent({
        category: "study",
        roles: [{ skill: "COMP2022", level: "any", count: 2 }],
        course: "COMP2022",
        availability: { days: ["today"], timezone: "UTC", timeWindow: "tonight" },
        location: "campus",
      });

      const enrolled = makeUser({
        id: "1", name: "Enrolled",
        courses: ["COMP2022"],
        availability: { days: ["today"], timezone: "UTC" },
        location: "campus",
      });
      const notEnrolled = makeUser({
        id: "2", name: "Not Enrolled",
        courses: ["COMP1511"],
        availability: { days: ["today"], timezone: "UTC" },
        location: "campus",
      });

      const { results } = rankCandidates([notEnrolled, enrolled], intent, 2);
      expect(results[0].user.id).toBe("1");
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it("shows skillRelevance > 0 for course-matched students", () => {
      const intent = makeIntent({
        category: "study",
        roles: [{ skill: "COMP2022", level: "any", count: 1 }],
        course: "COMP2022",
      });
      const user = makeUser({
        id: "1", name: "Student",
        courses: ["COMP2022"],
      });

      const { results } = rankCandidates([user], intent, 1);
      expect(results[0].breakdown.skillRelevance).toBeGreaterThan(0);
    });
  });

  describe("hackathon category", () => {
    it("fills all requested roles with different people", () => {
      const intent = makeIntent({
        category: "hackathon",
        roles: [
          { skill: "backend", level: "any", count: 1 },
          { skill: "frontend", level: "any", count: 1 },
          { skill: "design", level: "any", count: 1 },
        ],
        teamSize: 3,
      });

      const candidates = [
        makeUser({ id: "1", name: "Backend", skills: [{ name: "node", level: "senior" }] }),
        makeUser({ id: "2", name: "Frontend", skills: [{ name: "react", level: "senior" }] }),
        makeUser({ id: "3", name: "Designer", skills: [{ name: "figma", level: "senior" }] }),
        makeUser({ id: "4", name: "Also Backend", skills: [{ name: "express", level: "senior" }] }),
      ];

      const { results } = rankCandidates(candidates, intent, 3);
      const roles = results.map((r) => r.matchedRole).sort();
      expect(roles).toEqual(["backend", "design", "frontend"]);
    });

    it("penalises skill duplication in the group", () => {
      const intent = makeIntent({
        category: "hackathon",
        roles: [
          { skill: "backend", level: "any", count: 1 },
          { skill: "design", level: "any", count: 1 },
        ],
        teamSize: 2,
      });

      const backend1 = makeUser({ id: "1", name: "B1", skills: [{ name: "node", level: "senior" }] });
      const backend2 = makeUser({ id: "2", name: "B2", skills: [{ name: "express", level: "senior" }] });
      const designer = makeUser({ id: "3", name: "D", skills: [{ name: "figma", level: "senior" }] });

      const { results } = rankCandidates([backend1, backend2, designer], intent, 2);
      const picked = results.map((r) => r.user.id);
      expect(picked).toContain("3");
    });

    it("factors in experience level when required", () => {
      const intent = makeIntent({
        category: "hackathon",
        roles: [{ skill: "react", level: "senior", count: 1 }],
        teamSize: 1,
      });

      const senior = makeUser({ id: "1", name: "Senior", skills: [{ name: "react", level: "senior" }] });
      const beginner = makeUser({ id: "2", name: "Beginner", skills: [{ name: "react", level: "beginner" }] });

      const { results } = rankCandidates([beginner, senior], intent, 1);
      expect(results[0].user.id).toBe("1");
    });
  });

  describe("cofounder category", () => {
    it("values commitment compatibility", () => {
      const intent = makeIntent({
        category: "cofounder",
        roles: [{ skill: "full-stack", level: "senior", count: 1 }],
        commitment: "dedicated",
        teamSize: 1,
      });

      const dedicated = makeUser({
        id: "1", name: "Dedicated",
        skills: [{ name: "fullstack", level: "senior" }],
        commitment: "dedicated",
      });
      const casual = makeUser({
        id: "2", name: "Casual",
        skills: [{ name: "fullstack", level: "senior" }],
        commitment: "casual",
      });

      const { results } = rankCandidates([casual, dedicated], intent, 1);
      expect(results[0].user.id).toBe("1");
    });
  });

  describe("coffee category", () => {
    it("prioritises location over skills", () => {
      const intent = makeIntent({
        category: "coffee",
        roles: [{ skill: "startups", level: "any", count: 1 }],
        location: "campus",
        teamSize: 1,
      });

      const nearby = makeUser({ id: "1", name: "Nearby", location: "campus" });
      const remote = makeUser({
        id: "2", name: "Remote",
        location: "remote",
        skills: [{ name: "startups", level: "senior" }],
      });

      const { results } = rankCandidates([remote, nearby], intent, 1);
      expect(results[0].user.id).toBe("1");
    });
  });

  describe("mentor category", () => {
    it("prefers senior students", () => {
      const intent = makeIntent({
        category: "mentor",
        roles: [{ skill: "python", level: "senior", count: 1 }],
        teamSize: 1,
      });

      const year4 = makeUser({
        id: "1", name: "Senior Student",
        skills: [{ name: "python", level: "senior" }],
        year: 4,
      });
      const year1 = makeUser({
        id: "2", name: "First Year",
        skills: [{ name: "python", level: "senior" }],
        year: 1,
      });

      const { results } = rankCandidates([year1, year4], intent, 1);
      expect(results[0].user.id).toBe("1");
    });
  });

  describe("group space generation", () => {
    it("generates a group space with roles and next steps", () => {
      const intent = makeIntent({
        category: "hackathon",
        roles: [{ skill: "backend", level: "any", count: 1 }],
        teamSize: 1,
        availability: { days: ["saturday"], timezone: "UTC", timeWindow: null },
      });

      const user = makeUser({
        id: "1", name: "Dev",
        skills: [{ name: "node", level: "senior" }],
      });

      const { groupSpace } = rankCandidates([user], intent, 1);
      expect(groupSpace.objective).toContain("Hackathon");
      expect(groupSpace.roles).toHaveLength(1);
      expect(groupSpace.roles[0].userId).toBe("1");
      expect(groupSpace.nextSteps.length).toBeGreaterThan(0);
    });
  });
});
