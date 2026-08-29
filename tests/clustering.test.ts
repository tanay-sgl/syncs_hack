import { describe, it, expect } from "vitest";
import { detectClusters, ActiveIntent } from "../lib/clustering.js";
import { Intent } from "../lib/types.js";

function makeActiveIntent(
  id: string,
  userId: string,
  overrides: Partial<Intent> = {}
): ActiveIntent {
  return {
    id,
    userId,
    intent: {
      category: "study",
      roles: [{ skill: "COMP2022", level: "any" as const, count: 1 }],
      availability: { days: ["today"], timezone: "UTC", timeWindow: "tonight" },
      location: "campus",
      projectType: "exam cram",
      teamSize: 1,
      preferences: [],
      course: "COMP2022",
      topic: null,
      commitment: "moderate" as const,
      urgency: "high" as const,
      ...overrides,
    },
  };
}

describe("detectClusters", () => {
  it("groups similar study intents into a cluster", () => {
    const intents = [
      makeActiveIntent("i1", "u1"),
      makeActiveIntent("i2", "u2"),
      makeActiveIntent("i3", "u3"),
      makeActiveIntent("i4", "u4"),
    ];

    const clusters = detectClusters(intents, 3);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].size).toBe(4);
    expect(clusters[0].course).toBe("COMP2022");
    expect(clusters[0].suggestedEvent).toContain("Study Session");
  });

  it("does not cluster below minSize", () => {
    const intents = [
      makeActiveIntent("i1", "u1"),
      makeActiveIntent("i2", "u2"),
    ];

    const clusters = detectClusters(intents, 3);
    expect(clusters).toHaveLength(0);
  });

  it("separates different courses into different clusters", () => {
    const comp2022 = [
      makeActiveIntent("i1", "u1", { course: "COMP2022" }),
      makeActiveIntent("i2", "u2", { course: "COMP2022" }),
      makeActiveIntent("i3", "u3", { course: "COMP2022" }),
    ];
    const math1081 = [
      makeActiveIntent("i4", "u4", {
        course: "MATH1081",
        roles: [{ skill: "MATH1081", level: "any", count: 1 }],
      }),
      makeActiveIntent("i5", "u5", {
        course: "MATH1081",
        roles: [{ skill: "MATH1081", level: "any", count: 1 }],
      }),
      makeActiveIntent("i6", "u6", {
        course: "MATH1081",
        roles: [{ skill: "MATH1081", level: "any", count: 1 }],
      }),
    ];

    const clusters = detectClusters([...comp2022, ...math1081], 3);
    expect(clusters).toHaveLength(2);
    const courses = clusters.map((c) => c.course).sort();
    expect(courses).toEqual(["COMP2022", "MATH1081"]);
  });

  it("does not cluster intents with different categories", () => {
    const study = [
      makeActiveIntent("i1", "u1", { category: "study" }),
      makeActiveIntent("i2", "u2", { category: "study" }),
      makeActiveIntent("i3", "u3", { category: "study" }),
    ];
    const coffee = [
      makeActiveIntent("i4", "u4", { category: "coffee" }),
      makeActiveIntent("i5", "u5", { category: "coffee" }),
    ];

    const clusters = detectClusters([...study, ...coffee], 3);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].category).toBe("study");
  });

  it("does not cluster intents with no day overlap", () => {
    const today = [
      makeActiveIntent("i1", "u1"),
      makeActiveIntent("i2", "u2"),
      makeActiveIntent("i3", "u3"),
    ];
    const tomorrow = [
      makeActiveIntent("i4", "u4", {
        availability: { days: ["tomorrow"], timezone: "UTC", timeWindow: null },
      }),
      makeActiveIntent("i5", "u5", {
        availability: { days: ["tomorrow"], timezone: "UTC", timeWindow: null },
      }),
      makeActiveIntent("i6", "u6", {
        availability: { days: ["tomorrow"], timezone: "UTC", timeWindow: null },
      }),
    ];

    const clusters = detectClusters([...today, ...tomorrow], 3);
    expect(clusters).toHaveLength(2);
  });

  it("generates a descriptive suggested event name", () => {
    const intents = [
      makeActiveIntent("i1", "u1"),
      makeActiveIntent("i2", "u2"),
      makeActiveIntent("i3", "u3"),
    ];

    const clusters = detectClusters(intents, 3);
    expect(clusters[0].suggestedEvent).toBe("COMP2022 Study Session — 3 people");
  });

  it("returns clusters sorted by size descending", () => {
    const big = Array.from({ length: 5 }, (_, i) =>
      makeActiveIntent(`b${i}`, `ub${i}`, { course: "COMP3900", roles: [{ skill: "COMP3900", level: "any", count: 1 }] })
    );
    const small = Array.from({ length: 3 }, (_, i) =>
      makeActiveIntent(`s${i}`, `us${i}`, { course: "COMP2022" })
    );

    const clusters = detectClusters([...small, ...big], 3);
    expect(clusters[0].size).toBeGreaterThanOrEqual(clusters[1].size);
  });
});
