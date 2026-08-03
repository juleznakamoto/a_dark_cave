import { describe, expect, it } from "vitest";
import { calculateEnemyCriticalChancePercent } from "./effectsStats";

describe("calculateEnemyCriticalChancePercent", () => {
  it("starts at 0% on wave 1 in normal mode", () => {
    expect(calculateEnemyCriticalChancePercent(1, false)).toBe(0);
  });

  it("starts at 5% on wave 1 in cruel mode", () => {
    expect(calculateEnemyCriticalChancePercent(1, true)).toBe(5);
  });

  it("adds 1% per wave through wave 10", () => {
    expect(calculateEnemyCriticalChancePercent(2, false)).toBe(1);
    expect(calculateEnemyCriticalChancePercent(10, false)).toBe(9);
    expect(calculateEnemyCriticalChancePercent(10, true)).toBe(14);
  });

  it("adds 0.25% per wave after wave 10", () => {
    expect(calculateEnemyCriticalChancePercent(11, false)).toBe(9.25);
    expect(calculateEnemyCriticalChancePercent(12, false)).toBe(9.5);
    expect(calculateEnemyCriticalChancePercent(11, true)).toBe(14.25);
    expect(calculateEnemyCriticalChancePercent(20, true)).toBe(16.5);
  });

  it("treats invalid wave numbers as wave 1", () => {
    expect(calculateEnemyCriticalChancePercent(0, false)).toBe(0);
    expect(calculateEnemyCriticalChancePercent(-3, true)).toBe(5);
  });
});
