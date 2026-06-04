import { describe, expect, it } from "vitest";
import {
  achievementTabPulseSeenKey,
  hasUnviewedUnclaimedAchievementsForTabPulse,
  withAchievementTabPulseViewed,
} from "./achievementTabPulse";

describe("achievementTabPulse", () => {
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
