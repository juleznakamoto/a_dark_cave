import { describe, it, expect } from "vitest";
import "@/game/rules";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  canRevealEffects,
  canRevealBuildingDescriptions,
  canRevealCraftDescriptions,
  getInsightRevealCost,
  getAchievementTitleInsightCost,
  isBuildingDescriptionVisible,
  isCraftDescriptionVisible,
  isBuildingDescriptionsUnlockAvailable,
  isCraftDescriptionsUnlockAvailable,
  ACHIEVEMENT_TITLE_INSIGHT_COST,
  ACHIEVEMENT_TITLE_INSIGHT_COST_TIER_0,
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

  it("canRevealEffects is always false (per-action reveal removed)", () => {
    const state = {
      ...base(),
      buildings: { ...base().buildings, clerksHut: 1 },
    };
    expect(canRevealEffects("craftStoneAxe", state)).toBe(false);
    expect(canRevealEffects("buildClerksHut", state)).toBe(false);
    expect(canRevealEffects("buildWatchtower", state)).toBe(false);
  });

  it("building/craft description unlocks and purchases are disabled", () => {
    const eligible = {
      ...base(),
      buildings: {
        ...base().buildings,
        clerksHut: 1,
        buildersLodge: 1,
        blacksmith: 1,
      },
      resources: { ...base().resources, insight: 3000 },
    };
    expect(isBuildingDescriptionsUnlockAvailable(eligible)).toBe(false);
    expect(isCraftDescriptionsUnlockAvailable(eligible)).toBe(false);
    expect(canRevealBuildingDescriptions(eligible)).toBe(false);
    expect(canRevealCraftDescriptions(eligible)).toBe(false);
  });

  it("building and craft descriptions are always visible", () => {
    const state = base();
    expect(isBuildingDescriptionVisible(state, "buildClerksHut")).toBe(true);
    expect(isCraftDescriptionVisible(state, "craftStoneAxe")).toBe(true);
  });

  it("isCraftOnceAction distinguishes one-time crafts", () => {
    expect(isCraftOnceAction("craftStoneAxe")).toBe(true);
    expect(isCraftOnceAction("craftTorches")).toBe(false);
  });

  it("getAchievementTitleInsightCost is 250 for first ring, 500 for outer rings", () => {
    expect(getAchievementTitleInsightCost("basic-0-woodGatherer")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST_TIER_0,
    );
    expect(getAchievementTitleInsightCost("building-0-0")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST_TIER_0,
    );
    expect(getAchievementTitleInsightCost("overall-0-speedrunner")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST_TIER_0,
    );
    expect(getAchievementTitleInsightCost("basic-1-explorer")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST,
    );
    expect(getAchievementTitleInsightCost("building-1-0")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST,
    );
    expect(getAchievementTitleInsightCost("action-2-something")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST,
    );
  });
});
