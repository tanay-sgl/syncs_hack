import { describe, it, expect } from "vitest";
import { skillSimilarity, bestSkillMatch } from "../lib/skills.js";

describe("skillSimilarity", () => {
  it("returns 1.0 for exact match", () => {
    expect(skillSimilarity("react", "react")).toBe(1.0);
  });

  it("is case-insensitive", () => {
    expect(skillSimilarity("React", "REACT")).toBe(1.0);
  });

  it("returns 0.85 for substring match", () => {
    expect(skillSimilarity("javascript", "java")).toBe(0.85);
  });

  it("returns 0.7 for same-cluster skills", () => {
    expect(skillSimilarity("react", "frontend")).toBe(0.7);
    expect(skillSimilarity("pytorch", "machine learning")).toBe(0.7);
    expect(skillSimilarity("figma", "design")).toBe(0.7);
    expect(skillSimilarity("node", "backend")).toBe(0.7);
  });

  it("returns 0 for unrelated skills", () => {
    expect(skillSimilarity("react", "python")).toBe(0);
    expect(skillSimilarity("design", "devops")).toBe(0);
  });
});

describe("bestSkillMatch", () => {
  it("finds the best match from a list", () => {
    const result = bestSkillMatch(["python", "react", "css"], "frontend");
    expect(result.skill).toBe("react");
    expect(result.similarity).toBe(0.7);
  });

  it("prefers exact match over cluster match", () => {
    const result = bestSkillMatch(["frontend", "react"], "react");
    expect(result.skill).toBe("react");
    expect(result.similarity).toBe(1.0);
  });

  it("returns 0 similarity when nothing matches", () => {
    const result = bestSkillMatch(["python", "flask"], "design");
    expect(result.similarity).toBe(0);
  });
});
