import { describe, it, expect } from "vitest";
import "@/game/rules";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  canRevealEffects,
  getInsightRevealCost,
  INSIGHT_REVEAL_BUILDING_COST,
  INSIGHT_REVEAL_BUILDING_COST_EARLY,
  INSIGHT_REVEAL_CRAFT_COST,
  INSIGHT_REVEAL_CRAFT_COST_EARLY,
  INSIGHT_REVEAL_FORTIFICATION_COST,
  isCraftOnceAction,
} from "./insightReveal";

describe("insightReveal", () => {
  const base = (): GameState => createInitialState();

  const withWoodenHuts = (count: number): GameState => ({
    ...base(),
    buildings: { ...base().buildings, woodenHut: count },
  });

  it("getInsightRevealCost returns early tier for buildings with <=5 wooden huts", () => {
    expect(getInsightRevealCost("buildClerksHut", withWoodenHuts(0))).toBe(
      INSIGHT_REVEAL_BUILDING_COST_EARLY,
    );
    expect(getInsightRevealCost("buildClerksHut", withWoodenHuts(5))).toBe(
      INSIGHT_REVEAL_BUILDING_COST_EARLY,
    );
  });

  it("getInsightRevealCost returns standard tier for buildings with >5 wooden huts", () => {
    expect(getInsightRevealCost("buildClerksHut", withWoodenHuts(6))).toBe(
      INSIGHT_REVEAL_BUILDING_COST,
    );
  });

  it("getInsightRevealCost returns 100 for fortification builds regardless of wooden huts", () => {
    expect(getInsightRevealCost("buildWatchtower", withWoodenHuts(0))).toBe(
      INSIGHT_REVEAL_FORTIFICATION_COST,
    );
    expect(getInsightRevealCost("buildWatchtower", withWoodenHuts(10))).toBe(
      INSIGHT_REVEAL_FORTIFICATION_COST,
    );
  });

  it("getInsightRevealCost returns early tier for craft-once items with <=5 wooden huts", () => {
    expect(getInsightRevealCost("craftStoneAxe", withWoodenHuts(3))).toBe(
      INSIGHT_REVEAL_CRAFT_COST_EARLY,
    );
  });

  it("getInsightRevealCost returns standard tier for craft-once items with >5 wooden huts", () => {
    expect(getInsightRevealCost("craftStoneAxe", withWoodenHuts(6))).toBe(
      INSIGHT_REVEAL_CRAFT_COST,
    );
  });

  it("getInsightRevealCost returns null for repeatable crafts", () => {
    expect(getInsightRevealCost("craftTorches", withWoodenHuts(0))).toBeNull();
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
