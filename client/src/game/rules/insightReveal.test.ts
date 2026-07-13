import { describe, it, expect } from "vitest";
import "@/game/rules";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  canRevealEffects,
  canRevealBuildingDescriptions,
  canRevealCraftDescriptions,
  getInsightRevealCost,
  isBuildingDescriptionVisible,
  isCraftDescriptionVisible,
  isBuildingDescriptionsUnlockAvailable,
  isCraftDescriptionsUnlockAvailable,
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

  it("building descriptions unlock requires Clerks Hut and Builders Lodge", () => {
    expect(
      isBuildingDescriptionsUnlockAvailable({
        buildings: { clerksHut: 0, buildersLodge: 1 },
      } as GameState),
    ).toBe(false);
    expect(
      isBuildingDescriptionsUnlockAvailable({
        buildings: { clerksHut: 1, buildersLodge: 0 },
      } as GameState),
    ).toBe(false);
    expect(
      isBuildingDescriptionsUnlockAvailable({
        buildings: { clerksHut: 1, buildersLodge: 1 },
      } as GameState),
    ).toBe(true);
  });

  it("craft descriptions unlock requires Clerks Hut and Blacksmith", () => {
    expect(
      isCraftDescriptionsUnlockAvailable({
        buildings: { clerksHut: 0, blacksmith: 1 },
      } as GameState),
    ).toBe(false);
    expect(
      isCraftDescriptionsUnlockAvailable({
        buildings: { clerksHut: 1, blacksmith: 0 },
      } as GameState),
    ).toBe(false);
    expect(
      isCraftDescriptionsUnlockAvailable({
        buildings: { clerksHut: 1, blacksmith: 1 },
      } as GameState),
    ).toBe(true);
  });

  it("canRevealBuildingDescriptions checks insight and unlock state", () => {
    const eligible = {
      ...base(),
      buildings: { ...base().buildings, clerksHut: 1, buildersLodge: 1 },
      resources: { ...base().resources, insight: 3000 },
    };
    expect(canRevealBuildingDescriptions(eligible)).toBe(true);
    expect(
      canRevealBuildingDescriptions({
        ...eligible,
        buildingDescriptionsRevealed: true,
      }),
    ).toBe(false);
    expect(
      canRevealBuildingDescriptions({
        ...eligible,
        resources: { ...eligible.resources, insight: 100 },
      }),
    ).toBe(false);
  });

  it("description visibility respects bulk flags and legacy per-action reveals", () => {
    const state = base();
    expect(isBuildingDescriptionVisible(state, "buildClerksHut")).toBe(false);
    expect(isCraftDescriptionVisible(state, "craftStoneAxe")).toBe(false);

    expect(
      isBuildingDescriptionVisible(
        { ...state, buildingDescriptionsRevealed: true },
        "buildClerksHut",
      ),
    ).toBe(true);
    expect(
      isCraftDescriptionVisible(
        { ...state, craftDescriptionsRevealed: true },
        "craftStoneAxe",
      ),
    ).toBe(true);
    expect(
      isBuildingDescriptionVisible(
        { ...state, revealedEffects: ["buildClerksHut"] },
        "buildClerksHut",
      ),
    ).toBe(true);
  });

  it("isCraftOnceAction distinguishes one-time crafts", () => {
    expect(isCraftOnceAction("craftStoneAxe")).toBe(true);
    expect(isCraftOnceAction("craftTorches")).toBe(false);
  });
});
