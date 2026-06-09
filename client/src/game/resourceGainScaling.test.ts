import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { computeResourceRandomRange } from "./rules/effectsCalculation";
import { calculateResourceGains } from "./rules/tooltips";
import { gameActions } from "./rules";
import { forestSacrificeActions } from "./rules/forestSacrificeActions";

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    resources: {},
    buildings: { temple: 1, altar: 1 },
    fellowship: {},
    story: { seen: { leatherTotemsUsageCount: 10 } },
    priorAssignedActions: [],
    disgracedPriorSkills: { level: 0 },
    ...overrides,
  } as GameState;
}

describe("computeResourceRandomRange", () => {
  it("applies Prior to base random range only, not extra flat", () => {
    const state = createState({
      fellowship: { disgraced_prior: true },
      priorAssignedActions: ["leatherTotems"],
      disgracedPriorSkills: { level: 4 },
    });

    const { min, max } = computeResourceRandomRange(10, 25, "leatherTotems", state, {
      extraFlat: 20,
      resourceKey: "gold",
    });

    expect(min).toBe(60);
    expect(max).toBe(120);
  });

  it("tooltip matches computeResourceRandomRange for leatherTotems sacrifice", () => {
    const state = createState({
      fellowship: { disgraced_prior: true },
      priorAssignedActions: ["leatherTotems"],
      disgracedPriorSkills: { level: 4 },
    });

    expect(forestSacrificeActions.leatherTotems).toBeDefined();
    expect(gameActions.leatherTotems).toBeDefined();
    const { gains } = calculateResourceGains("leatherTotems", state);
    const gold = gains.find((g) => g.resource === "gold");
    expect(gold).toEqual({ resource: "gold", min: 60, max: 120 });
  });
});
