import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/store/createInitialState";
import {
  hasPriorInsightExposure,
  isInsightIntroSeen,
  migrateInsightIntroSeenOnLoad,
  INSIGHT_INTRO_SEEN_KEY,
} from "./insightIntro";
import { applyGameStateLoadMigrations } from "./stateHelpers";

describe("insightIntro", () => {
  it("does not treat a fresh save as prior Insight exposure", () => {
    const state = createInitialState();
    expect(hasPriorInsightExposure(state)).toBe(false);
    expect(isInsightIntroSeen(state)).toBe(false);
    expect(migrateInsightIntroSeenOnLoad(state)).toBeNull();
  });

  it("migrates saves that already hold or have seen Insight", () => {
    const withAmount = createInitialState();
    withAmount.resources.insight = 3;
    const migratedAmount = migrateInsightIntroSeenOnLoad(withAmount);
    expect(migratedAmount?.story?.seen?.[INSIGHT_INTRO_SEEN_KEY]).toBe(true);

    const withSeen = createInitialState();
    withSeen.seenResources = ["insight"];
    const migratedSeen = migrateInsightIntroSeenOnLoad(withSeen);
    expect(migratedSeen?.story?.seen?.[INSIGHT_INTRO_SEEN_KEY]).toBe(true);
  });

  it("applies the migration through load migrations", () => {
    const state = createInitialState();
    state.resources.insight = 10;
    const migrated = applyGameStateLoadMigrations(state);
    expect(migrated.story.seen[INSIGHT_INTRO_SEEN_KEY]).toBe(true);
  });
});
