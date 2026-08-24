import { describe, expect, it } from "vitest";
import {
  achievementTabPulseIds,
  achievementTabPulseSeenKey,
  BOOK_OF_TRIALS_TAB_PULSE_ID,
  hasUnviewedUnclaimedAchievementsForTabPulse,
  withAchievementTabPulseViewed,
} from "./achievementTabPulse";

describe("achievementTabPulse", () => {
  it("adds a Book of Trials pulse id only after the book is owned", () => {
    expect(achievementTabPulseIds(["build_hut"], false)).toEqual(["build_hut"]);
    expect(achievementTabPulseIds(["build_hut"], true)).toEqual([
      "build_hut",
      BOOK_OF_TRIALS_TAB_PULSE_ID,
    ]);
    expect(
      hasUnviewedUnclaimedAchievementsForTabPulse(
        { seen: {}, merchantPurchases: 0, heavySleeperHours: 0 },
        achievementTabPulseIds([], true),
      ),
    ).toBe(true);
    const viewed = withAchievementTabPulseViewed(undefined, [
      BOOK_OF_TRIALS_TAB_PULSE_ID,
    ]);
    expect(
      hasUnviewedUnclaimedAchievementsForTabPulse(
        viewed,
        achievementTabPulseIds([], true),
      ),
    ).toBe(false);
  });

  it("hasUnviewedUnclaimedAchievementsForTabPulse is false when all ids are marked seen", () => {
    const story = withAchievementTabPulseViewed(undefined, ["build_hut", "first_wood"]);
    expect(
      hasUnviewedUnclaimedAchievementsForTabPulse(story, ["build_hut", "first_wood"]),
    ).toBe(false);
    expect(
      hasUnviewedUnclaimedAchievementsForTabPulse(story, ["build_hut", "new_one"]),
    ).toBe(true);
  });

  it("uses prefixed keys in story.seen", () => {
    const story = withAchievementTabPulseViewed(undefined, ["foo"]);
    expect(story.seen[achievementTabPulseSeenKey("foo")]).toBe(true);
  });
});
