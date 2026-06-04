import { describe, it, expect } from "vitest";
import { computePersistedSocialTasksGold } from "@/game/socialTasksGold";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "@/game/playlightRewards";
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
      100 +
      100 +
      100 +
      REFERRAL_REWARD_GOLD,
    );
  });
});
