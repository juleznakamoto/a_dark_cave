import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import {
  defineSuccessChance,
  formatSuccessChancePercent,
  getSuccessChanceBreakdown,
} from "./eventSuccessChance";

describe("eventSuccessChance", () => {
  it("clamps evaluated chance between 0 and 1", () => {
    const state = createInitialState();
    expect(defineSuccessChance({ base: 1.5 }).success_chance(state)).toBe(1);
    expect(defineSuccessChance({ base: -0.2 }).success_chance(state)).toBe(0);
  });

  it("applies cruel mode penalty and can omit luck", () => {
    const state = createInitialState();
    state.cruelMode = true;
    state.stats.strength = 0;

    const defined = defineSuccessChance({
      base: 0.5,
      stats: (s) => [
        { type: "strength", multiplier: 0.02 },
        ...(s.cruelMode ? [] : [{ type: "luck" as const, multiplier: 0.04 }]),
      ],
      relevantStats: ["strength", "luck"],
    });

    expect(defined.success_chance(state)).toBeCloseTo(0.4);
    expect(getSuccessChanceBreakdown(defined.success_formula, state).stats).toEqual(
      [{
        type: "strength",
        statValue: 0,
        percentPerPoint: "2",
        contributionPercent: "0",
      }],
    );
  });

  it("formats percent strings without trailing zeros", () => {
    expect(formatSuccessChancePercent(0.1)).toBe("10");
    expect(formatSuccessChancePercent(0.0075)).toBe("0.75");
    expect(formatSuccessChancePercent(-0.1)).toBe("-10");
  });

  it("builds a tooltip breakdown of base and per-stat multipliers", () => {
    const state = createInitialState();
    const { success_formula } = defineSuccessChance({
      base: 0.15,
      stats: [{ type: "strength", multiplier: 0.01 }],
    });
    const breakdown = getSuccessChanceBreakdown(success_formula, state);

    expect(breakdown.forceZero).toBe(false);
    expect(breakdown.basePercent).toBe("15");
    expect(breakdown.stats).toEqual([
      {
        type: "strength",
        statValue: 0,
        percentPerPoint: "1",
        contributionPercent: "0",
      },
    ]);
    expect(breakdown.cruelPercent).toBeNull();
  });

  it("includes current stat value and contribution in the breakdown", () => {
    const state = createInitialState();
    state.weapons.crude_bow = true;
    const { success_formula } = defineSuccessChance({
      base: 0.1,
      stats: [{ type: "strength", multiplier: 0.02 }],
    });

    expect(getSuccessChanceBreakdown(success_formula, state).stats).toEqual([
      {
        type: "strength",
        statValue: 1,
        percentPerPoint: "2",
        contributionPercent: "2",
      },
    ]);
  });

  it("shows cruel penalty in the breakdown when cruel mode is on", () => {
    const state = createInitialState();
    state.cruelMode = true;
    const { success_formula } = defineSuccessChance({
      base: 0.2,
      stats: [{ type: "luck", multiplier: 0.01 }],
    });
    const breakdown = getSuccessChanceBreakdown(success_formula, state);

    expect(breakdown.cruelPercent).toBe("-10");
  });
});
