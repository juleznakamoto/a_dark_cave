import { describe, it, expect } from "vitest";
import {
  isMarketingEmailRewardClaimedForPrompt,
  isSocialPromptFirstWaveEligible,
  isSocialPromptRepeatWaveEligible,
  SOCIAL_PROMPT_REFERRAL_CAP,
} from "@/game/socialPromptAuto";

describe("socialPromptAuto eligibility", () => {
  const emptyRewards = {};

  it("first wave: eligible when anything missing", () => {
    expect(
      isSocialPromptFirstWaveEligible({
        social_media_rewards: emptyRewards,
        referralCount: 0,
      }),
    ).toBe(true);
  });

  it("first wave: not eligible when platforms, email reward, and referrals complete", () => {
    expect(
      isSocialPromptFirstWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          reddit: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
        },
        referralCount: SOCIAL_PROMPT_REFERRAL_CAP,
      }),
    ).toBe(false);
  });

  it("first wave: eligible when referrals incomplete even if social+email done", () => {
    expect(
      isSocialPromptFirstWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          reddit: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
        },
        referralCount: SOCIAL_PROMPT_REFERRAL_CAP - 1,
      }),
    ).toBe(true);
  });

  it("repeat wave: ignores referrals — not eligible when platforms + email reward done", () => {
    expect(
      isSocialPromptRepeatWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          reddit: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
        },
      }),
    ).toBe(false);
  });

  it("repeat wave: eligible when a platform is missing even at referral cap", () => {
    expect(
      isSocialPromptRepeatWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
        },
      }),
    ).toBe(true);
  });

  it("email counts via reward claim flag (unsubscribe does not clear)", () => {
    const rewards = {
      marketing_email: { claimed: true, timestamp: 1 },
    };
    expect(isMarketingEmailRewardClaimedForPrompt(rewards)).toBe(true);
    expect(
      isSocialPromptFirstWaveEligible({
        social_media_rewards: rewards,
        referralCount: SOCIAL_PROMPT_REFERRAL_CAP,
      }),
    ).toBe(true);
    expect(
      isSocialPromptRepeatWaveEligible({ social_media_rewards: rewards }),
    ).toBe(true);
  });
});
