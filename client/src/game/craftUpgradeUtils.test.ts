import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { applyActionEffects } from "./rules/actionEffects";
import { calculateResourceGains } from "./rules/tooltips";
import {
  applyCraftProduceScaling,
  getCraftProduceAmount,
} from "./craftUpgradeUtils";
import { scaleCraftProduceAmount } from "./rules/effectsCalculation";

function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    resources: {
      leather_totem: 0,
      leather: 500,
    },
    buildings: {},
    books: {},
    fellowship: {},
    story: { seen: {} },
    buttonUpgrades: {},
    priorAssignedActions: [],
    disgracedPriorSkills: { level: 0 },
    ...overrides,
  } as GameState;
}

describe("craft upgrade produce scaling", () => {
  it("applies base bonuses before craft mastery", () => {
    const state = createTestState({
      buildings: { temple: 1 },
      books: { book_of_ascension: true },
      buttonUpgrades: { craftLeatherTotems: { clicks: 15, level: 2 } },
      fellowship: { disgraced_prior: true },
      priorAssignedActions: ["craftLeatherTotems"],
      disgracedPriorSkills: { level: 2 },
    });

    // Prior 2.5x at base, then craft mastery 3x: floor(floor(1 * 2.5) * 3) = 6
    expect(scaleCraftProduceAmount(1, "craftLeatherTotems", state)).toBe(6);
    expect(applyCraftProduceScaling(1, "craftLeatherTotems", state, 2.5)).toBe(
      6,
    );
  });

  it("does not double-apply prior in applyActionEffects", () => {
    const state = createTestState({
      buildings: { temple: 1 },
      books: { book_of_ascension: true },
      buttonUpgrades: { craftLeatherTotems: { clicks: 15, level: 2 } },
      fellowship: { disgraced_prior: true },
      priorAssignedActions: ["craftLeatherTotems"],
      disgracedPriorSkills: { level: 4 },
      resources: { leather_totem: 0, leather: 500 },
    });

    const effectUpdates = applyActionEffects("craftLeatherTotems", state);
    expect(effectUpdates.resources?.leather_totem).toBe(12);
  });

  it("level badge shows craft mastery only", () => {
    const state = createTestState({
      buildings: { temple: 1 },
      books: { book_of_ascension: true },
      buttonUpgrades: { craftLeatherTotems: { clicks: 15, level: 2 } },
      fellowship: { disgraced_prior: true },
      priorAssignedActions: ["craftLeatherTotems"],
      disgracedPriorSkills: { level: 4 },
    });

    expect(getCraftProduceAmount("craftLeatherTotems", state)).toBe(3);
    expect(scaleCraftProduceAmount(1, "craftLeatherTotems", state)).toBe(12);
  });

  it("tooltip matches scaled craft output", () => {
    const state = createTestState({
      buildings: { temple: 1 },
      books: { book_of_ascension: true },
      buttonUpgrades: { craftLeatherTotems: { clicks: 15, level: 2 } },
      fellowship: { disgraced_prior: true },
      priorAssignedActions: ["craftLeatherTotems"],
      disgracedPriorSkills: { level: 4 },
    });

    const { gains } = calculateResourceGains("craftLeatherTotems", state);
    expect(gains.find((g) => g.resource === "leather_totem")).toEqual({
      resource: "leather_totem",
      min: 12,
      max: 12,
    });
  });
});
