import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { getExecutionTime } from "./executionTime";
import { getTotalBuildingTimeReduction } from "./effectsCalculation";
import {
  FERAL_HOWL_UPGRADES,
  getFeralHowlCritDamageBonusPercent,
} from "./skillUpgrades";
import { CRITICAL_STRIKE_DAMAGE_MULTIPLIER } from "./effectsStats";

function state(overrides: Record<string, unknown> = {}) {
  return gameStateSchema.parse(overrides);
}

describe("Feral Howl skill", () => {
  it("has levels 0–5 with the configured combat stats", () => {
    expect(FERAL_HOWL_UPGRADES).toHaveLength(6);
    expect(FERAL_HOWL_UPGRADES.map((u) => u.successChance)).toEqual([
      50, 55, 60, 65, 70, 80,
    ]);
    expect(FERAL_HOWL_UPGRADES.map((u) => u.enemyDamageReduction)).toEqual([
      20, 25, 25, 30, 35, 35,
    ]);
    expect(FERAL_HOWL_UPGRADES.map((u) => u.debuffRounds)).toEqual([
      1, 1, 2, 2, 2, 3,
    ]);
    expect(FERAL_HOWL_UPGRADES.map((u) => u.critDamageBonus)).toEqual([
      25, 25, 50, 50, 75, 100,
    ]);
  });

  it("applies crit bonus only when Brute Hound is present", () => {
    const without = state({
      combatSkills: { feralHowlLevel: 5 },
    });
    expect(getFeralHowlCritDamageBonusPercent(without)).toBe(0);

    const withHound = state({
      fellowship: { the_hound: true },
      combatSkills: { feralHowlLevel: 5 },
    });
    expect(getFeralHowlCritDamageBonusPercent(withHound)).toBe(100);
  });

  it("keeps L0→L1 crit bonus unchanged", () => {
    expect(FERAL_HOWL_UPGRADES[0].critDamageBonus).toBe(
      FERAL_HOWL_UPGRADES[1].critDamageBonus,
    );
  });

  it("stacks crit bonus on top of the base critical multiplier", () => {
    const houndState = state({
      fellowship: { the_hound: true },
      combatSkills: { feralHowlLevel: 0 },
    });
    const bonus = getFeralHowlCritDamageBonusPercent(houndState) / 100;
    expect(CRITICAL_STRIKE_DAMAGE_MULTIPLIER + bonus).toBeCloseTo(1.75);
  });

  it("does not reduce build execution time", () => {
    const base = state({});
    const withHound = state({
      fellowship: { the_hound: true },
      combatSkills: { feralHowlLevel: 5 },
    });
    expect(getExecutionTime("buildWoodenHut", withHound)).toBe(
      getExecutionTime("buildWoodenHut", base),
    );
    expect(getTotalBuildingTimeReduction(withHound)).toBe(0);
  });
});
