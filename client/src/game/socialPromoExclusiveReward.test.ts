import { describe, it, expect } from "vitest";
import {
  getSocialPromoExclusiveProgress,
  isInviteFriendsFloatingButtonVisible,
  isRewardsTasksShortcutVisible,
  isSocialPromoExclusiveRewardComplete,
  REWARDS_TASKS_SHORTCUT_VISIBLE_AFTER_MS,
  socialPromoExclusiveStepsCompleted,
} from "@/game/socialPromoExclusiveReward";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "@/game/playlightDiscoverReward";
import {
  ACTIVE_SOCIAL_PLATFORMS,
  SOCIAL_PLATFORMS,
} from "@/game/socialPlatforms";

describe("socialPromoExclusiveReward", () => {
  const empty = {
    social_media_rewards: {},
    referralCount: 0,
    referrals: [],
  };

  it("counts exclusive-track steps as rewards accumulate", () => {
    expect(socialPromoExclusiveStepsCompleted(empty)).toBe(0);
    expect(
      socialPromoExclusiveStepsCompleted({
        ...empty,
        social_media_rewards: { marketing_email: { claimed: true, timestamp: 1 } },
      }),
    ).toBe(1);
    expect(
      socialPromoExclusiveStepsCompleted({
        ...empty,
        social_media_rewards: {
          marketing_email: { claimed: true, timestamp: 1 },
          youtube: { claimed: true, timestamp: 1 },
        },
      }),
    ).toBe(2);
  });

  it("complete when all six exclusive-track steps satisfied", () => {
    const full = {
      isUserSignedIn: true,
      social_media_rewards: {
        marketing_email: { claimed: true, timestamp: 1 },
        youtube: { claimed: true, timestamp: 1 },
        instagram: { claimed: true, timestamp: 1 },
        reddit: { claimed: true, timestamp: 1 },
        [PLAYLIGHT_DISCOVER_REWARD_KEY]: { claimed: true, timestamp: 1 },
      },
      referralCount: 0,
      referrals: [] as { userId: string; claimed: boolean; timestamp: number }[],
    };
    expect(isSocialPromoExclusiveRewardComplete(full)).toBe(true);
    const p = getSocialPromoExclusiveProgress(full);
    expect(p.completed).toBe(6);
    expect(p.percent).toBe(100);
  });

  it("counts Instagram as its own exclusive-track step", () => {
    expect(
      SOCIAL_PLATFORMS.some(
        (platform) => platform.id === "instagram" && platform.active === true,
      ),
    ).toBe(true);
    expect(
      ACTIVE_SOCIAL_PLATFORMS.some((platform) => platform.id === "instagram"),
    ).toBe(true);
    expect(
      socialPromoExclusiveStepsCompleted({
        ...empty,
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
        },
      }),
    ).toBe(1);
    expect(
      socialPromoExclusiveStepsCompleted({
        ...empty,
        social_media_rewards: {
          youtube: { claimed: true, timestamp: 1 },
          instagram: { claimed: true, timestamp: 1 },
        },
      }),
    ).toBe(2);
  });
  it("counts fulfilled-but-unclaimed rewards toward exclusive-track progress", () => {
    expect(
      socialPromoExclusiveStepsCompleted({
        ...empty,
        social_media_rewards: {
          marketing_email: { claimed: false, fulfilled: true, timestamp: 1 },
        },
      }),
    ).toBe(1);
  });

  it("does not treat an invite as an exclusive-track step while that task is off", () => {
    expect(
      socialPromoExclusiveStepsCompleted({
        ...empty,
        isUserSignedIn: true,
        referralCount: 1,
        referrals: [{ userId: "u", claimed: true, timestamp: 1 }],
      }),
    ).toBe(1);
  });

  it("shows the floating invite button for a signed-in player under the referral cap", () => {
    expect(
      isInviteFriendsFloatingButtonVisible({
        isUserSignedIn: true,
        referralCount: 0,
      }),
    ).toBe(true);
    expect(
      isInviteFriendsFloatingButtonVisible({
        isUserSignedIn: false,
        referralCount: 0,
      }),
    ).toBe(false);
  });

  it("hides the header Rewards shortcut until 15 minutes of play time", () => {
    expect(isRewardsTasksShortcutVisible({ ...empty, playTime: 0 })).toBe(false);
    expect(
      isRewardsTasksShortcutVisible({
        ...empty,
        playTime: REWARDS_TASKS_SHORTCUT_VISIBLE_AFTER_MS - 1,
      }),
    ).toBe(false);
    expect(
      isRewardsTasksShortcutVisible({
        ...empty,
        playTime: REWARDS_TASKS_SHORTCUT_VISIBLE_AFTER_MS,
      }),
    ).toBe(true);
  });

  it("hides the header Rewards shortcut after exclusive tasks and gifted ring", () => {
    const complete = {
      isUserSignedIn: true,
      social_media_rewards: {
        marketing_email: { claimed: true, timestamp: 1 },
        youtube: { claimed: true, timestamp: 1 },
        instagram: { claimed: true, timestamp: 1 },
        reddit: { claimed: true, timestamp: 1 },
        [PLAYLIGHT_DISCOVER_REWARD_KEY]: { claimed: true, timestamp: 1 },
      },
      referralCount: 1,
      referrals: [] as { userId: string; claimed: boolean; timestamp: number }[],
      playTime: REWARDS_TASKS_SHORTCUT_VISIBLE_AFTER_MS,
    };
    expect(isRewardsTasksShortcutVisible(complete)).toBe(true);
    expect(
      isRewardsTasksShortcutVisible({
        ...complete,
        clothing: { gifted_ring: true } as { gifted_ring: true },
      }),
    ).toBe(false);
  });
});
