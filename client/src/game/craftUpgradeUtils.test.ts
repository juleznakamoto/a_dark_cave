import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { applyActionEffects } from "./rules/actionEffects";
import { calculateResourceGains } from "./rules/tooltips";
import {
  getCraftProduceAmount,
  scaleCraftProduceAmount,
} from "./craftUpgradeUtils";
import { executeGameAction } from "./actions";

function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    resources: {
      leather_totem: 0,
      leather: 500,
      bones: 500,
      bone_totem: 0,
    },
    buildings: {},
    books: {},
    fellowship: {},
    story: { seen: {} },
    buttonUpgrades: {},
    priorAssignedActions: [],
    disgracedPriorSkills: { level: 0 },
    cooldowns: {},
    ...overrides,
  } as GameState;
}

describe("craft upgrade produce scaling", () => {
  it("craftLeatherTotems at mastery level 2 produces 3 totems without prior", () => {
    const state = createTestState({
      buildings: { temple: 1 },
      books: { book_of_ascension: true },
      buttonUpgrades: { craftLeatherTotems: { clicks: 15, level: 2 } },
    });

    expect(scaleCraftProduceAmount(1, "craftLeatherTotems", state)).toBe(3);
    expect(getCraftProduceAmount("craftLeatherTotems", state)).toBe(3);

    const effectUpdates = applyActionEffects("craftLeatherTotems", state);
    expect(effectUpdates.resources?.leather_totem).toBe(3);
  });

  it("prior and mastery stack additively (4 + 3 = 7)", () => {
    const state = createTestState({
      buildings: { temple: 1 },
      books: { book_of_ascension: true },
      buttonUpgrades: { craftLeatherTotems: { clicks: 15, level: 2 } },
      fellowship: { disgraced_prior: true },
      priorAssignedActions: ["craftLeatherTotems"],
      disgracedPriorSkills: { level: 4 },
    });

    // Prior 4× on base 1 → 4; mastery 3× on base 1 → 3; total 7
    expect(scaleCraftProduceAmount(1, "craftLeatherTotems", state)).toBe(7);

    const effectUpdates = applyActionEffects("craftLeatherTotems", state);
    expect(effectUpdates.resources?.leather_totem).toBe(7);
  });

  it("executeGameAction matches additive craft output", () => {
    const state = createTestState({
      buildings: { temple: 1 },
      books: { book_of_ascension: true },
      buttonUpgrades: { craftLeatherTotems: { clicks: 15, level: 2 } },
      fellowship: { disgraced_prior: true },
      priorAssignedActions: ["craftLeatherTotems"],
      disgracedPriorSkills: { level: 4 },
    });

    const result = executeGameAction("craftLeatherTotems", state);
    expect(result.stateUpdates.resources?.leather_totem).toBe(7);
  });

  it("tooltip shows full additive craft output", () => {
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
      min: 7,
      max: 7,
    });
  });

  it("prior only (no ascension book) produces prior-scaled base", () => {
    const state = createTestState({
      buildings: { temple: 1 },
      fellowship: { disgraced_prior: true },
      priorAssignedActions: ["craftLeatherTotems"],
      disgracedPriorSkills: { level: 4 },
    });

    expect(scaleCraftProduceAmount(1, "craftLeatherTotems", state)).toBe(4);
  });

  it("craftBoneTotems at mastery level 3 with prior level 4 produces 8", () => {
    const state = createTestState({
      buildings: { altar: 1 },
      books: { book_of_ascension: true },
      buttonUpgrades: { craftBoneTotems: { clicks: 30, level: 3 } },
      fellowship: { disgraced_prior: true },
      priorAssignedActions: ["craftBoneTotems"],
      disgracedPriorSkills: { level: 4 },
    });

    const effectUpdates = applyActionEffects("craftBoneTotems", state);
    expect(effectUpdates.resources?.bone_totem).toBe(8);
  });
});
