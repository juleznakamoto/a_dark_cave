import { describe, expect, it } from "vitest";
import {
  getActivePlaylightExitMilestone,
  isPlaylightDiscoverSocialTaskFulfilled,
  normalizePlaylightExitIntentMilestoneIndex,
  playlightExitIntentMilestoneFloorFromPlayTime,
  playlightExitIntentMilestoneIndexAfterShow,
  PLAYLIGHT_EXIT_INTENT_MILESTONES_MS,
} from "./playlightExitIntent";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "./playlightDiscoverReward";

const H = 60 * 60 * 1000;

const fulfilledPlaylightDiscover = {
  [PLAYLIGHT_DISCOVER_REWARD_KEY]: { fulfilled: true, claimed: false },
};

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

  it("detects fulfilled Playlight discover social task", () => {
    expect(isPlaylightDiscoverSocialTaskFulfilled(undefined)).toBe(false);
    expect(
      isPlaylightDiscoverSocialTaskFulfilled(fulfilledPlaylightDiscover),
    ).toBe(true);
    expect(
      isPlaylightDiscoverSocialTaskFulfilled({
        [PLAYLIGHT_DISCOVER_REWARD_KEY]: { claimed: true, fulfilled: true },
      }),
    ).toBe(true);
  });

  it("skips 150m and 270m exit-intent milestones when discover is fulfilled", () => {
    expect(normalizePlaylightExitIntentMilestoneIndex(1, true)).toBe(2);
    expect(normalizePlaylightExitIntentMilestoneIndex(3, true)).toBe(4);

    expect(getActivePlaylightExitMilestone(2.5 * H, 1, true)).toBeNull();
    expect(getActivePlaylightExitMilestone(2.5 * H, 0, true)).toBe(
      PLAYLIGHT_EXIT_INTENT_MILESTONES_MS[0],
    );
    expect(getActivePlaylightExitMilestone(3.5 * H, 2, true)).toBe(
      PLAYLIGHT_EXIT_INTENT_MILESTONES_MS[2],
    );
    expect(getActivePlaylightExitMilestone(4.5 * H, 3, true)).toBeNull();
    expect(getActivePlaylightExitMilestone(5.5 * H, 4, true)).toBe(
      PLAYLIGHT_EXIT_INTENT_MILESTONES_MS[4],
    );
  });

  it("advances past skipped milestones after show", () => {
    expect(playlightExitIntentMilestoneIndexAfterShow(0, true)).toBe(2);
    expect(playlightExitIntentMilestoneIndexAfterShow(2, true)).toBe(4);
  });

  it("floors migration skips 150m and 270m when discover is fulfilled", () => {
    expect(playlightExitIntentMilestoneFloorFromPlayTime(2.5 * H, true)).toBe(
      2,
    );
    expect(playlightExitIntentMilestoneFloorFromPlayTime(4.5 * H, true)).toBe(
      4,
    );
  });
});
