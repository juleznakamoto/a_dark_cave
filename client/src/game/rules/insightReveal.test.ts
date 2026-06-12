import { describe, it, expect } from "vitest";
import "@/game/rules";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  canRevealEffects,
  getInsightRevealCost,
  INSIGHT_REVEAL_BUILDING_COST,
  INSIGHT_REVEAL_CRAFT_COST,
  INSIGHT_REVEAL_FORTIFICATION_COST,
  isCraftOnceAction,
} from "./insightReveal";

describe("insightReveal", () => {
  const base = (): GameState => createInitialState();

  it("getInsightRevealCost returns 100 for village buildings", () => {
    expect(getInsightRevealCost("buildClerksHut")).toBe(
      INSIGHT_REVEAL_BUILDING_COST,
    );
  });

  it("getInsightRevealCost returns 50 for fortification builds", () => {
    expect(getInsightRevealCost("buildWatchtower")).toBe(
      INSIGHT_REVEAL_FORTIFICATION_COST,
    );
  });

  it("getInsightRevealCost returns 50 for craft-once items", () => {
    expect(getInsightRevealCost("craftStoneAxe")).toBe(INSIGHT_REVEAL_CRAFT_COST);
  });

  it("getInsightRevealCost returns null for repeatable crafts", () => {
    expect(getInsightRevealCost("craftTorches")).toBeNull();
  });

  it("canRevealEffects is false when already revealed", () => {
    const state = {
      ...base(),
      revealedEffects: ["craftStoneAxe"],
    };
    expect(canRevealEffects("craftStoneAxe", state)).toBe(false);
  });

  it("canRevealEffects is false before Clerks Hut is built", () => {
    const state = base();
    expect(canRevealEffects("craftStoneAxe", state)).toBe(false);
    expect(canRevealEffects("buildWatchtower", state)).toBe(false);
  });

  it("canRevealEffects is true for craft-once and buildings after Clerks Hut", () => {
    const state = {
      ...base(),
      buildings: { ...base().buildings, clerksHut: 1 },
    };
    expect(canRevealEffects("craftStoneAxe", state)).toBe(true);
    expect(canRevealEffects("buildClerksHut", state)).toBe(true);
    expect(canRevealEffects("buildWatchtower", state)).toBe(true);
  });

  it("isCraftOnceAction distinguishes one-time crafts", () => {
    expect(isCraftOnceAction("craftStoneAxe")).toBe(true);
    expect(isCraftOnceAction("craftTorches")).toBe(false);
  });
});
