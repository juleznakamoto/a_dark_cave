import { describe, it, expect } from "vitest";
import { GameState } from "@shared/schema";
import { boneyardCrossCount, getBoneyardBurialMadnessReduction } from "./boneyardMadness";

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    buildings: { boneyard: 1 } as GameState["buildings"],
    story: { seen: { boneyardDeathBaseline: 0 }, merchantPurchases: 0 },
    stats: {
      strength: 0,
      knowledge: 0,
      luck: 0,
      madness: 0,
      madnessFromEvents: 0,
      villagerDeathsLifetime: 0,
    },
    ...over,
  } as GameState;
}

describe("getBoneyardBurialMadnessReduction", () => {
  it("returns 0 when no boneyard", () => {
    const s = baseState({
      buildings: { boneyard: 0 } as GameState["buildings"],
    });
    expect(getBoneyardBurialMadnessReduction(s)).toBe(0);
  });

  it("returns 0 when baseline missing", () => {
    const s = baseState({
      story: { seen: {}, merchantPurchases: 0 },
    });
    expect(getBoneyardBurialMadnessReduction(s)).toBe(0);
  });

  it("is -1 per 50 deaths since baseline, floored", () => {
    const s = baseState({
      stats: {
        strength: 0,
        knowledge: 0,
        luck: 0,
        madness: 0,
        madnessFromEvents: 0,
        villagerDeathsLifetime: 124,
      },
      story: { seen: { boneyardDeathBaseline: 0 }, merchantPurchases: 0 },
    });
    expect(getBoneyardBurialMadnessReduction(s)).toBe(-2);
  });

  it("counts one grave cross per point, capped at 10", () => {
    expect(boneyardCrossCount(baseState())).toBe(0);
    const capped = baseState({
      stats: {
        strength: 0,
        knowledge: 0,
        luck: 0,
        madness: 0,
        madnessFromEvents: 0,
        villagerDeathsLifetime: 1000,
      },
      story: { seen: { boneyardDeathBaseline: 0 }, merchantPurchases: 0 },
    });
    expect(boneyardCrossCount(capped)).toBe(10);
    expect(boneyardCrossCount(capped)).toBe(-getBoneyardBurialMadnessReduction(capped));
  });

  it("caps at -10", () => {
    const s = baseState({
      stats: {
        strength: 0,
        knowledge: 0,
        luck: 0,
        madness: 0,
        madnessFromEvents: 0,
        villagerDeathsLifetime: 1000,
      },
      story: { seen: { boneyardDeathBaseline: 0 }, merchantPurchases: 0 },
    });
    expect(getBoneyardBurialMadnessReduction(s)).toBe(-10);
  });

  it("only counts deaths after baseline", () => {
    const s = baseState({
      stats: {
        strength: 0,
        knowledge: 0,
        luck: 0,
        madness: 0,
        madnessFromEvents: 0,
        villagerDeathsLifetime: 200,
      },
      story: { seen: { boneyardDeathBaseline: 175 }, merchantPurchases: 0 },
    });
    expect(getBoneyardBurialMadnessReduction(s)).toBe(0);
  });
});
