import { describe, it, expect } from "vitest";
import {
  getSocialPromoExclusiveProgress,
  isExclusiveInviteStepDone,
  isSocialPromoExclusiveRewardComplete,
  socialPromoExclusiveStepsCompleted,
} from "@/game/socialPromoExclusiveReward";

describe("socialPromoExclusiveReward", () => {
  const empty = {
    social_media_rewards: {},
    referralCount: 0,
    referrals: [],
  };

  it("counts four independent steps", () => {
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
          instagram: { claimed: true, timestamp: 1 },
        },
      }),
    ).toBe(2);
  });

  it("invite step uses one referral", () => {
    expect(isExclusiveInviteStepDone({ referralCount: 0, referrals: [] })).toBe(
      false,
    );
    expect(isExclusiveInviteStepDone({ referralCount: 1, referrals: [] })).toBe(
      true,
    );
    expect(
      isExclusiveInviteStepDone({
        referralCount: 0,
        referrals: [{ userId: "u", claimed: false, timestamp: 1 }],
      }),
    ).toBe(true);
  });

  it("complete when all four satisfied", () => {
    const full = {
      social_media_rewards: {
        marketing_email: { claimed: true, timestamp: 1 },
        instagram: { claimed: true, timestamp: 1 },
        reddit: { claimed: true, timestamp: 1 },
      },
      referralCount: 1,
      referrals: [] as { userId: string; claimed: boolean; timestamp: number }[],
    };
    expect(isSocialPromoExclusiveRewardComplete(full)).toBe(true);
    const p = getSocialPromoExclusiveProgress(full);
    expect(p.completed).toBe(4);
    expect(p.percent).toBe(100);
  });
});
