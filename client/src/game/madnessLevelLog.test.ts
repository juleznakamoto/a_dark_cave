/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  buildMadnessLevelLogEntry,
  getMadnessLevelLogEpoch,
  MADNESS_LEVEL_DECREASED_LOG_EN,
  MADNESS_LEVEL_DECREASED_LOG_KEY,
  MADNESS_LEVEL_INCREASED_LOG_EN,
  MADNESS_LEVEL_INCREASED_LOG_KEY,
  madnessLevelLogDirection,
  resetMadnessLevelLogBaseline,
} from "./madnessLevelLog";

describe("madnessLevelLogDirection", () => {
  it("skips the first observation and same-band ticks", () => {
    expect(madnessLevelLogDirection(null, 1, 0, 0)).toBeNull();
    expect(madnessLevelLogDirection(2, 2, 1, 1)).toBeNull();
  });

  it("skips a full state replace", () => {
    expect(madnessLevelLogDirection(4, 0, 1, 2)).toBeNull();
    expect(madnessLevelLogDirection(0, 4, 3, 4)).toBeNull();
  });

  it("names band crossings", () => {
    expect(madnessLevelLogDirection(0, 1, 1, 1)).toBe("increased");
    expect(madnessLevelLogDirection(2, 4, 1, 1)).toBe("increased");
    expect(madnessLevelLogDirection(4, 3, 1, 1)).toBe("decreased");
    expect(madnessLevelLogDirection(1, 0, 1, 1)).toBe("decreased");
  });
});

describe("buildMadnessLevelLogEntry", () => {
  it("stores English plus a ui:log key", () => {
    const up = buildMadnessLevelLogEntry("increased", 42);
    expect(up).toMatchObject({
      id: "madness-level-increased-42",
      message: MADNESS_LEVEL_INCREASED_LOG_EN,
      logKey: MADNESS_LEVEL_INCREASED_LOG_KEY,
      timestamp: 42,
      type: "system",
    });
    const down = buildMadnessLevelLogEntry("decreased", 42);
    expect(down.message).toBe(MADNESS_LEVEL_DECREASED_LOG_EN);
    expect(down.logKey).toBe(MADNESS_LEVEL_DECREASED_LOG_KEY);
  });
});

describe("resetMadnessLevelLogBaseline", () => {
  it("bumps the epoch so the next observation is a baseline", () => {
    const before = getMadnessLevelLogEpoch();
    resetMadnessLevelLogBaseline();
    expect(getMadnessLevelLogEpoch()).toBe(before + 1);
  });
});
