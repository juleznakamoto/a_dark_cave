import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  mergeCombatVictoryState,
  mergeCombatDefeatState,
  mergeCombatStorySeen,
} from "./stateHelpers";

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

  it("keeps mid-combat veinfireElixirsUsed when victory returns a stale story.seen snapshot", () => {
    const base = gameStateSchema.parse({});
    const prevState = gameStateSchema.parse({
      story: {
        ...base.story,
        seen: { ...base.story.seen, veinfireElixirsUsed: 6 },
      },
    });
    const merged = mergeCombatVictoryState(prevState, {
      resources: { gold: 10 },
      story: {
        ...base.story,
        seen: {
          ...base.story.seen,
          veinfireElixirsUsed: 5, // combat-start snapshot
          firstWaveVictory: true,
        },
      },
    }) as typeof prevState;

    expect(merged.story?.seen?.veinfireElixirsUsed).toBe(6);
    expect(merged.story?.seen?.firstWaveVictory).toBe(true);
  });
});

describe("mergeCombatDefeatState", () => {
  it("keeps mid-combat veinfireElixirsUsed when defeat returns a stale story.seen snapshot", () => {
    const base = gameStateSchema.parse({});
    const prevState = gameStateSchema.parse({
      story: {
        ...base.story,
        seen: { ...base.story.seen, veinfireElixirsUsed: 3 },
      },
    });
    const merged = mergeCombatDefeatState(prevState, {
      story: {
        ...base.story,
        seen: {
          ...base.story.seen,
          veinfireElixirsUsed: 2,
          bastionDamaged: true,
        },
      },
    }) as typeof prevState;

    expect(merged.story?.seen?.veinfireElixirsUsed).toBe(3);
    expect(merged.story?.seen?.bastionDamaged).toBe(true);
  });
});

describe("mergeCombatStorySeen", () => {
  it("takes Math.max for numeric counters and applies new flags", () => {
    const merged = mergeCombatStorySeen(
      { veinfireElixirsUsed: 4, firstWaveVictory: false } as never,
      { veinfireElixirsUsed: 3, firstWaveVictory: true } as never,
    );
    expect(merged.veinfireElixirsUsed).toBe(4);
    expect(merged.firstWaveVictory).toBe(true);
  });
});
