import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "@shared/schema";
import { computeResourceRandomRange } from "./rules/effectsCalculation";
import { getActionBonuses } from "./rules/effectsCalculation";
import { getBonusComposition } from "./rules/bonusComposition";

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isDemoEdition: vi.fn(() => false),
  };
});

import { isDemoEdition } from "@/lib/edition";
import {
  DEMO_ACTION_BASE_REWARD_MULTIPLIER,
  getDemoActionBaseRewardMultiplier,
  scaleDemoActionBaseRange,
  scaleDemoActionBaseReward,
} from "./demoActionRewards";

const isDemoEditionMock = vi.mocked(isDemoEdition);

function emptyState(): GameState {
  return {
    resources: {},
    buildings: {},
    fellowship: {},
    tools: {},
    books: {},
    clothing: {},
    relics: {},
    weapons: {},
    story: { seen: {} },
    priorAssignedActions: [],
    disgracedPriorSkills: { level: 0 },
    buttonUpgrades: {},
  } as GameState;
}

describe("demo action base rewards", () => {
  afterEach(() => {
    isDemoEditionMock.mockReturnValue(false);
  });

  it("does nothing outside demo editions", () => {
    expect(getDemoActionBaseRewardMultiplier("chopWood")).toBe(1);
    expect(scaleDemoActionBaseReward(10, "chopWood")).toBe(10);
    expect(scaleDemoActionBaseRange(6, 12, "chopWood")).toEqual({
      min: 6,
      max: 12,
    });
  });

  it("scales Gather Wood, Hunt, cave explore, and mine bases by 25%", () => {
    isDemoEditionMock.mockReturnValue(true);

    expect(getDemoActionBaseRewardMultiplier("chopWood")).toBe(
      DEMO_ACTION_BASE_REWARD_MULTIPLIER,
    );
    expect(getDemoActionBaseRewardMultiplier("hunt")).toBe(
      DEMO_ACTION_BASE_REWARD_MULTIPLIER,
    );
    expect(getDemoActionBaseRewardMultiplier("exploreCave")).toBe(
      DEMO_ACTION_BASE_REWARD_MULTIPLIER,
    );
    expect(getDemoActionBaseRewardMultiplier("exploreCitadel")).toBe(
      DEMO_ACTION_BASE_REWARD_MULTIPLIER,
    );
    expect(getDemoActionBaseRewardMultiplier("mineStone")).toBe(
      DEMO_ACTION_BASE_REWARD_MULTIPLIER,
    );
    expect(getDemoActionBaseRewardMultiplier("mineMoonstone")).toBe(
      DEMO_ACTION_BASE_REWARD_MULTIPLIER,
    );
    expect(getDemoActionBaseRewardMultiplier("craftTorches")).toBe(1);

    expect(scaleDemoActionBaseRange(6, 12, "chopWood")).toEqual({
      min: 8,
      max: 15,
    });
    expect(scaleDemoActionBaseRange(5, 10, "exploreCave")).toEqual({
      min: 6,
      max: 13,
    });
    expect(scaleDemoActionBaseRange(2, 5, "hunt")).toEqual({
      min: 3,
      max: 6,
    });
    expect(scaleDemoActionBaseRange(4, 8, "mineStone")).toEqual({
      min: 5,
      max: 10,
    });
  });

  it("raises computeResourceRandomRange bases so bonuses apply after", () => {
    isDemoEditionMock.mockReturnValue(true);
    const state = emptyState();

    const demoBase = computeResourceRandomRange(6, 12, "chopWood", state);
    expect(demoBase).toEqual({ min: 8, max: 15 });

    const withAxe = computeResourceRandomRange(6, 12, "chopWood", {
      ...state,
      tools: { stone_axe: true },
    });
    // stone axe +50% on the demo base 8–15, not on 6–12
    expect(withAxe).toEqual({ min: 12, max: 22 });
  });

  it("does not add a 25% bonus source", () => {
    isDemoEditionMock.mockReturnValue(true);
    const state = emptyState();

    expect(getActionBonuses("chopWood", state).resourceMultiplier).toBe(1);
    expect(getBonusComposition("chopWood", state)).toEqual([]);
  });
});
