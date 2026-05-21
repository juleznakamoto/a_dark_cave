import { describe, it, expect } from "vitest";
import {
  isMarketingEmailRewardClaimedForPrompt,
  isSocialPromptFirstWaveEligible,
  isSocialPromptRepeatWaveEligible,
  SOCIAL_PROMPT_REFERRAL_CAP,
  socialPromptMilestoneFloorFromPlayTime,
} from "@/game/socialPromptAuto";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "@/game/playlightDiscoverReward";

const MIN = 60 * 1000;

const claimedPlaylightDiscover = {
  [PLAYLIGHT_DISCOVER_REWARD_KEY]: { claimed: true as const, timestamp: 1 },
};

describe("socialPromptMilestoneFloorFromPlayTime", () => {
  it("counts thresholds strictly by active-play milestones", () => {
    expect(socialPromptMilestoneFloorFromPlayTime(0)).toBe(0);
    expect(socialPromptMilestoneFloorFromPlayTime(14 * MIN)).toBe(0);
    expect(socialPromptMilestoneFloorFromPlayTime(15 * MIN)).toBe(1);
    expect(socialPromptMilestoneFloorFromPlayTime(29 * MIN)).toBe(1);
    expect(socialPromptMilestoneFloorFromPlayTime(30 * MIN)).toBe(2);
    expect(socialPromptMilestoneFloorFromPlayTime(59 * MIN)).toBe(2);
    expect(socialPromptMilestoneFloorFromPlayTime(60 * MIN)).toBe(3);
    expect(socialPromptMilestoneFloorFromPlayTime(89 * MIN)).toBe(3);
    expect(socialPromptMilestoneFloorFromPlayTime(90 * MIN)).toBe(4);
    expect(socialPromptMilestoneFloorFromPlayTime(119 * MIN)).toBe(4);
    expect(socialPromptMilestoneFloorFromPlayTime(120 * MIN)).toBe(5);
    expect(socialPromptMilestoneFloorFromPlayTime(239 * MIN)).toBe(5);
    expect(socialPromptMilestoneFloorFromPlayTime(240 * MIN)).toBe(6);
    expect(socialPromptMilestoneFloorFromPlayTime(359 * MIN)).toBe(6);
    expect(socialPromptMilestoneFloorFromPlayTime(360 * MIN)).toBe(7);
    expect(socialPromptMilestoneFloorFromPlayTime(24 * 60 * MIN)).toBe(7);
  });
});

describe("socialPromptAuto eligibility", () => {
  const emptyRewards = {};

  it("first wave: eligible when anything missing (signed in)", () => {
    expect(
      isSocialPromptFirstWaveEligible({
        social_media_rewards: emptyRewards,
        referralCount: 0,
        isUserSignedIn: true,
      }),
    ).toBe(true);
  });

  it("first wave: eligible when not signed in even if rewards complete", () => {
    expect(
      isSocialPromptFirstWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          reddit: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
        },
        referralCount: SOCIAL_PROMPT_REFERRAL_CAP,
        isUserSignedIn: false,
      }),
    ).toBe(true);
  });

  it("first wave: not eligible when platforms, email, Playlight discover, and referrals complete", () => {
    expect(
      isSocialPromptFirstWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          reddit: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
          ...claimedPlaylightDiscover,
        },
        referralCount: SOCIAL_PROMPT_REFERRAL_CAP,
        isUserSignedIn: true,
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
        isUserSignedIn: true,
      }),
    ).toBe(true);
  });

  it("repeat wave: ignores referrals — not eligible when platforms + email + Playlight discover done", () => {
    expect(
      isSocialPromptRepeatWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          reddit: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
          ...claimedPlaylightDiscover,
        },
        isUserSignedIn: true,
      }),
    ).toBe(false);
  });

  it("repeat wave: eligible when not signed in", () => {
    expect(
      isSocialPromptRepeatWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          reddit: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
        },
        isUserSignedIn: false,
      }),
    ).toBe(true);
  });

  it("repeat wave: eligible when a platform is missing even at referral cap", () => {
    expect(
      isSocialPromptRepeatWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
          ...claimedPlaylightDiscover,
        },
        isUserSignedIn: true,
      }),
    ).toBe(true);
  });

  it("first wave: eligible when Playlight discover is missing but otherwise complete", () => {
    expect(
      isSocialPromptFirstWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          reddit: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
        },
        referralCount: SOCIAL_PROMPT_REFERRAL_CAP,
        isUserSignedIn: true,
      }),
    ).toBe(true);
  });

  it("repeat wave: eligible when Playlight discover is missing", () => {
    expect(
      isSocialPromptRepeatWaveEligible({
        social_media_rewards: {
          instagram: { claimed: true, timestamp: 1 },
          reddit: { claimed: true, timestamp: 1 },
          marketing_email: { claimed: true, timestamp: 1 },
        },
        isUserSignedIn: true,
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
        isUserSignedIn: true,
      }),
    ).toBe(true);
    expect(
      isSocialPromptRepeatWaveEligible({
        social_media_rewards: rewards,
        isUserSignedIn: true,
      }),
    ).toBe(true);
  });
});
