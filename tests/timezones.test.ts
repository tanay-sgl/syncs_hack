import { describe, it, expect } from "vitest";
import { timezoneProximity, getUtcOffset } from "../lib/timezones.js";

describe("getUtcOffset", () => {
  it("returns correct offsets", () => {
    expect(getUtcOffset("America/New_York")).toBe(-5);
    expect(getUtcOffset("Australia/Sydney")).toBe(10);
    expect(getUtcOffset("Asia/Kolkata")).toBe(5.5);
  });

  it("returns null for unknown timezones", () => {
    expect(getUtcOffset("Mars/Olympus")).toBeNull();
  });
});

describe("timezoneProximity", () => {
  it("returns 1.0 for identical timezones", () => {
    expect(timezoneProximity("UTC", "UTC")).toBe(1.0);
  });

  it("scores close timezones high", () => {
    const score = timezoneProximity("America/New_York", "America/Chicago");
    expect(score).toBe(0.95);
  });

  it("scores moderate difference as 0.75", () => {
    const score = timezoneProximity("America/New_York", "America/Los_Angeles");
    expect(score).toBe(0.75);
  });

  it("scores large difference low", () => {
    const score = timezoneProximity("America/New_York", "Asia/Tokyo");
    expect(score).toBeLessThanOrEqual(0.25);
  });

  it("returns 0.5 for unknown timezones", () => {
    expect(timezoneProximity("Mars/Olympus", "UTC")).toBe(0.5);
  });
});
