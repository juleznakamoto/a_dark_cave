import { describe, it, expect } from "vitest";
import {
  computePersistedSocialTaskResources,
  computePersistedSocialTasksGold,
} from "@/game/socialTasksGold";
import {
  PLAYLIGHT_DISCOVER_REWARD_KEY,
} from "@/game/playlightRewards";
import {
  MARKETING_SUBSCRIBE_GOLD,
  MARKETING_EMAIL_REWARD_KEY,
} from "@/game/marketingEmailReward";
import { REFERRAL_REWARD_GOLD, SIGN_UP_WELCOME_GOLD } from "@shared/schema";

describe("computePersistedSocialTasksGold", () => {
  it("returns 0 when nothing was claimed", () => {
    expect(computePersistedSocialTasksGold({})).toBe(0);
  });

  it("sums all persisted social task rewards", () => {
    const total = computePersistedSocialTasksGold({
      signupWelcomeGoldClaimed: true,
      social_media_rewards: {
        [MARKETING_EMAIL_REWARD_KEY]: { claimed: true, timestamp: 1 },
        youtube: { claimed: true, timestamp: 1 },
        instagram: { claimed: true, timestamp: 1 },
        reddit: { claimed: true, timestamp: 1 },
        [PLAYLIGHT_DISCOVER_REWARD_KEY]: { claimed: true, timestamp: 1 },
      },
      referrals: [
        { userId: "a", claimed: true, timestamp: 1 },
        { userId: "b", claimed: false, timestamp: 2 },
      ],
    });

    expect(total).toBe(
      SIGN_UP_WELCOME_GOLD +
      MARKETING_SUBSCRIBE_GOLD +
      REFERRAL_REWARD_GOLD,
    );
  });

  it("does not count follow or try-a-game rewards as gold", () => {
    expect(
      computePersistedSocialTasksGold({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          [PLAYLIGHT_DISCOVER_REWARD_KEY]: { claimed: true, timestamp: 1 },
        },
      }),
    ).toBe(0);
  });

  it("restores claimed follow and try-a-game resources", () => {
    expect(
      computePersistedSocialTaskResources({
        social_media_rewards: {
          youtube: { claimed: true, timestamp: 1 },
          instagram: { claimed: true, timestamp: 1 },
          reddit: { claimed: true, timestamp: 1 },
          [PLAYLIGHT_DISCOVER_REWARD_KEY]: { claimed: true, timestamp: 1 },
        },
      }),
    ).toEqual({
      wood: 250,
      food: 250,
      stone: 250,
      silver: 100,
    });
  });
});
