import { describe, it, expect } from "vitest";
import "@/game/rules";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  canRevealEffects,
  getInsightRevealCost,
  INSIGHT_REVEAL_BUILDING_COST,
  INSIGHT_REVEAL_BUILDING_COST_EARLY,
  INSIGHT_REVEAL_FORTIFICATION_COST,
  INSIGHT_REVEAL_STONE_HUT_COST_HIGH,
  INSIGHT_REVEAL_STONE_HUT_COST_MID,
  isCraftOnceAction,
} from "./insightReveal";

describe("insightReveal", () => {
  const base = (): GameState => createInitialState();

  const withHuts = (
    woodenHut: number,
    stoneHut = 0,
  ): GameState => ({
    ...base(),
    buildings: { ...base().buildings, woodenHut, stoneHut },
  });

  it("getInsightRevealCost returns early tier for buildings with <=5 wooden huts and no stone huts", () => {
    expect(getInsightRevealCost("buildClerksHut", withHuts(0))).toBe(
      INSIGHT_REVEAL_BUILDING_COST_EARLY,
    );
    expect(getInsightRevealCost("buildClerksHut", withHuts(5))).toBe(
      INSIGHT_REVEAL_BUILDING_COST_EARLY,
    );
  });

  it("getInsightRevealCost returns standard tier for buildings with >5 wooden huts and no stone huts", () => {
    expect(getInsightRevealCost("buildClerksHut", withHuts(6))).toBe(
      INSIGHT_REVEAL_BUILDING_COST,
    );
  });

  it("getInsightRevealCost uses stone-hut tiers once stone huts exist", () => {
    expect(getInsightRevealCost("buildClerksHut", withHuts(10, 1))).toBe(
      INSIGHT_REVEAL_STONE_HUT_COST_MID,
    );
    expect(getInsightRevealCost("buildClerksHut", withHuts(10, 5))).toBe(
      INSIGHT_REVEAL_STONE_HUT_COST_MID,
    );
    expect(getInsightRevealCost("buildClerksHut", withHuts(10, 6))).toBe(
      INSIGHT_REVEAL_STONE_HUT_COST_HIGH,
    );
  });

  it("getInsightRevealCost returns 200 for fortification builds", () => {
    expect(getInsightRevealCost("buildWatchtower", withHuts(0))).toBe(
      INSIGHT_REVEAL_FORTIFICATION_COST,
    );
    expect(getInsightRevealCost("buildWatchtower", withHuts(10, 3))).toBe(
      INSIGHT_REVEAL_FORTIFICATION_COST,
    );
  });

  it("getInsightRevealCost mirrors building tiers for craft-once items", () => {
    expect(getInsightRevealCost("craftStoneAxe", withHuts(3))).toBe(
      INSIGHT_REVEAL_BUILDING_COST_EARLY,
    );
    expect(getInsightRevealCost("craftStoneAxe", withHuts(6))).toBe(
      INSIGHT_REVEAL_BUILDING_COST,
    );
    expect(getInsightRevealCost("craftStoneAxe", withHuts(10, 2))).toBe(
      INSIGHT_REVEAL_STONE_HUT_COST_MID,
    );
    expect(getInsightRevealCost("craftStoneAxe", withHuts(10, 8))).toBe(
      INSIGHT_REVEAL_STONE_HUT_COST_HIGH,
    );
  });

  it("getInsightRevealCost returns null for repeatable crafts", () => {
    expect(getInsightRevealCost("craftTorches", withHuts(0))).toBeNull();
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
