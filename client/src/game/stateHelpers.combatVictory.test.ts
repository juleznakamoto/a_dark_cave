import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { mergeCombatVictoryState } from "./stateHelpers";

describe("mergeCombatVictoryState", () => {
  it("adds silver delta to live resources without reverting bombs spent in combat", () => {
    const base = gameStateSchema.parse({});
    const prevState = gameStateSchema.parse({
      resources: {
        ...base.resources,
        silver: 100,
        ember_bomb: 4, // one bomb used during combat; stale victory used to restore 5
      },
    });

    const victoryResult = {
      resources: { silver: 25 },
      _combatSummary: { silverReward: 25 },
    };

    const merged = mergeCombatVictoryState(prevState, victoryResult) as typeof prevState;

    expect(merged.resources?.silver).toBe(125);
    expect(merged.resources?.ember_bomb).toBe(4);
  });

  it("adds gold delta to live resources the same way", () => {
    const base = gameStateSchema.parse({});
    const prevState = gameStateSchema.parse({
      resources: { ...base.resources, gold: 10, ember_bomb: 3 },
    });
    const merged = mergeCombatVictoryState(prevState, {
      resources: { gold: 50 },
      _combatSummary: { goldReward: 50 },
    }) as typeof prevState;
    expect(merged.resources?.gold).toBe(60);
    expect(merged.resources?.ember_bomb).toBe(3);
  });
});
