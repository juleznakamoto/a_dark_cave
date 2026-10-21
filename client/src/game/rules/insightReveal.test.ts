import { describe, it, expect } from "vitest";
import "@/game/rules";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  getAchievementTitleInsightCost,
  isBuildingDescriptionVisible,
  isCraftDescriptionVisible,
  ACHIEVEMENT_TITLE_INSIGHT_COST,
  ACHIEVEMENT_TITLE_INSIGHT_COST_BASIC,
  isCraftOnceAction,
} from "./insightReveal";

describe("insightReveal", () => {
  const base = (): GameState => createInitialState();

  it("building and craft descriptions are always visible", () => {
    const state = base();
    expect(isBuildingDescriptionVisible(state, "buildClerksHut")).toBe(true);
    expect(isCraftDescriptionVisible(state, "craftStoneAxe")).toBe(true);
  });

  it("isCraftOnceAction distinguishes one-time crafts", () => {
    expect(isCraftOnceAction("craftStoneAxe")).toBe(true);
    expect(isCraftOnceAction("craftTorches")).toBe(false);
  });

  it("getAchievementTitleInsightCost is 250 for basic, 500 otherwise", () => {
    expect(getAchievementTitleInsightCost("basic-0-woodGatherer")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST_BASIC,
    );
    expect(getAchievementTitleInsightCost("basic-1-explorer")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST_BASIC,
    );
    expect(getAchievementTitleInsightCost("building-0-0")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST,
    );
    expect(getAchievementTitleInsightCost("overall-0-speedrunner")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST,
    );
    expect(getAchievementTitleInsightCost("building-1-0")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST,
    );
    expect(getAchievementTitleInsightCost("action-2-something")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST,
    );
    expect(getAchievementTitleInsightCost("item-0-leather")).toBe(
      ACHIEVEMENT_TITLE_INSIGHT_COST,
    );
  });
});
