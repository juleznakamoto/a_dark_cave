import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { shouldShowAction } from "./index";
import {
  calculateTotalEffects,
  getActionBonuses,
} from "./effectsCalculation";
import { handleTameWolf } from "./villageUtilityActions";
import { GREY_ONE_UPGRADES } from "./skillUpgrades";
import type { ActionResult } from "@/game/types";

function withGreyOne(level: number) {
  return gameStateSchema.parse({
    fellowship: { grey_one: true },
    greyOneSkills: { level },
  });
}

describe("Grey One", () => {
  it("shows Tame Wolf only after the alpha is slain, until the pup joins", () => {
    const before = gameStateSchema.parse({});
    expect(shouldShowAction("tameWolf", before)).toBe(false);

    const slain = gameStateSchema.parse({
      clothing: { alphas_hide: true },
    });
    expect(shouldShowAction("tameWolf", slain)).toBe(true);

    const joined = gameStateSchema.parse({
      clothing: { alphas_hide: true },
      fellowship: { grey_one: true },
    });
    expect(shouldShowAction("tameWolf", joined)).toBe(false);
  });

  it("adds Grey One to the fellowship when taming finishes", () => {
    const state = gameStateSchema.parse({
      clothing: { alphas_hide: true },
      resources: { bones: 2500 },
    });
    const result: ActionResult = {
      stateUpdates: {},
      logEntries: [],
      delayedEffects: [],
    };
    handleTameWolf(state, result);
    expect(result.stateUpdates.fellowship?.grey_one).toBe(true);
    expect(result.logEntries?.[0]?.actionLogKey).toBe("complete");
  });

  it("keeps earlier stats when a tier only changes some of them", () => {
    const level0 = calculateTotalEffects(withGreyOne(0));
    expect(level0.statBonuses.madness).toBe(-1);
    expect(level0.statBonuses.luck).toBe(1);
    expect(level0.statBonuses.strength).toBe(0);
    expect(getActionBonuses("hunt", withGreyOne(0)).resourceMultiplier).toBe(1);

    const level1 = calculateTotalEffects(withGreyOne(1));
    expect(level1.statBonuses.madness).toBe(-1);
    expect(level1.statBonuses.luck).toBe(1);
    expect(level1.statBonuses.strength).toBe(1);
    expect(getActionBonuses("hunt", withGreyOne(1)).resourceMultiplier).toBe(1.25);

    const level2 = calculateTotalEffects(withGreyOne(2));
    expect(level2.statBonuses.madness).toBe(-3);
    expect(level2.statBonuses.luck).toBe(3);
    expect(level2.statBonuses.strength).toBe(1);
    expect(getActionBonuses("hunt", withGreyOne(2)).resourceMultiplier).toBe(1.25);

    const level5 = calculateTotalEffects(withGreyOne(5));
    expect(level5.statBonuses.madness).toBe(GREY_ONE_UPGRADES[5].madness);
    expect(level5.statBonuses.luck).toBe(5);
    expect(level5.statBonuses.strength).toBe(5);
    expect(getActionBonuses("hunt", withGreyOne(5)).resourceMultiplier).toBe(2);
  });
});
