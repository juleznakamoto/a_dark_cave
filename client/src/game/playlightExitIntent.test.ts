import { describe, expect, it } from "vitest";
import {
  getActivePlaylightExitMilestone,
  playlightExitIntentMilestoneFloorFromPlayTime,
  PLAYLIGHT_EXIT_INTENT_MILESTONES_MS,
} from "./playlightExitIntent";

const H = 60 * 60 * 1000;

describe("playlightExitIntent", () => {
  it("returns the milestone at the current index when playTime qualifies", () => {
    expect(getActivePlaylightExitMilestone(1.5 * H, 0)).toBe(
      PLAYLIGHT_EXIT_INTENT_MILESTONES_MS[0],
    );
    expect(getActivePlaylightExitMilestone(2.5 * H, 1)).toBe(
      PLAYLIGHT_EXIT_INTENT_MILESTONES_MS[1],
    );
  });

  it("returns null when playTime is below the next milestone", () => {
    expect(getActivePlaylightExitMilestone(1.5 * H - 1, 0)).toBeNull();
  });

  it("returns null when all milestones were consumed", () => {
    expect(
      getActivePlaylightExitMilestone(10 * H, PLAYLIGHT_EXIT_INTENT_MILESTONES_MS.length),
    ).toBeNull();
  });

  it("floors migration from playTime", () => {
    expect(playlightExitIntentMilestoneFloorFromPlayTime(0)).toBe(0);
    expect(playlightExitIntentMilestoneFloorFromPlayTime(1.5 * H)).toBe(1);
    expect(playlightExitIntentMilestoneFloorFromPlayTime(2.5 * H)).toBe(2);
    expect(playlightExitIntentMilestoneFloorFromPlayTime(10 * H)).toBe(5);
  });
});
