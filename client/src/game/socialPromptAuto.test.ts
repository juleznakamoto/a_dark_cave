import { describe, it, expect } from "vitest";
import {
  isMarketingEmailRewardClaimedForPrompt,
  isSocialPromptFirstWaveEligible,
  isSocialPromptRepeatWaveEligible,
  SOCIAL_PROMPT_REFERRAL_CAP,
  socialPromptHighestMilestoneIndexToOpen,
  socialPromptMilestoneFloorFromPlayTime,
  socialPromptMilestoneIndexAfterOpen,
} from "./socialPromptAuto";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "./playlightDiscoverReward";

const MIN = 60 * 1000;

const claimedSocialPlatforms = {
  youtube: { claimed: true as const, timestamp: 1 },
  instagram: { claimed: true as const, timestamp: 1 },
  reddit: { claimed: true as const, timestamp: 1 },
};

const claimedPlaylightDiscover = {
  [PLAYLIGHT_DISCOVER_REWARD_KEY]: { claimed: true as const, timestamp: 1 },
};

describe("socialPromptMilestoneFloorFromPlayTime", () => {
  it("marks the one-hour auto-open as passed and stays there", () => {
    expect(socialPromptMilestoneFloorFromPlayTime(0)).toBe(0);
    expect(socialPromptMilestoneFloorFromPlayTime(59 * MIN)).toBe(0);
    expect(socialPromptMilestoneFloorFromPlayTime(60 * MIN)).toBe(1);
    expect(socialPromptMilestoneFloorFromPlayTime(24 * 60 * MIN)).toBe(1);
  });
});

describe("socialPromptHighestMilestoneIndexToOpen", () => {
  it("returns null once the auto-open was already shown", () => {
    expect(socialPromptHighestMilestoneIndexToOpen(24 * 60 * MIN, 1)).toBe(null);
    expect(socialPromptHighestMilestoneIndexToOpen(24 * 60 * MIN, 5)).toBe(null);
  });

  it("opens once at one hour and not again", () => {
    expect(socialPromptHighestMilestoneIndexToOpen(59 * MIN, 0)).toBe(null);
    expect(socialPromptHighestMilestoneIndexToOpen(60 * MIN, 0)).toBe(0);
    expect(socialPromptHighestMilestoneIndexToOpen(360 * MIN, 0)).toBe(0);
    expect(socialPromptMilestoneIndexAfterOpen(0)).toBe(1);
    expect(socialPromptHighestMilestoneIndexToOpen(360 * MIN, 1)).toBe(null);
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
          ...claimedSocialPlatforms,
          marketing_email: { claimed: true, timestamp: 1 },
          ...claimedPlaylightDiscover,
        },
        referralCount: 0,
        isUserSignedIn: false,
      }),
    ).toBe(true);
  });

  it("first wave: not eligible when platforms, email, and Playlight discover are done", () => {
    expect(
      isSocialPromptFirstWaveEligible({
        social_media_rewards: {
          ...claimedSocialPlatforms,
          marketing_email: { claimed: true, timestamp: 1 },
          ...claimedPlaylightDiscover,
        },
        referralCount: 0,
        isUserSignedIn: true,
      }),
    ).toBe(false);
  });

  it("first wave: ignores invites once the social tasks are done", () => {
    expect(
      isSocialPromptFirstWaveEligible({
        social_media_rewards: {
          ...claimedSocialPlatforms,
          marketing_email: { claimed: true, timestamp: 1 },
          ...claimedPlaylightDiscover,
        },
        referralCount: SOCIAL_PROMPT_REFERRAL_CAP - 1,
        isUserSignedIn: true,
      }),
    ).toBe(false);
  });

  it("repeat wave: not eligible when platforms, email, and Playlight discover are done", () => {
    expect(
      isSocialPromptRepeatWaveEligible({
        social_media_rewards: {
          ...claimedSocialPlatforms,
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
          ...claimedSocialPlatforms,
          marketing_email: { claimed: true, timestamp: 1 },
          ...claimedPlaylightDiscover,
        },
        isUserSignedIn: false,
      }),
    ).toBe(true);
  });

  it("repeat wave: eligible when a platform is missing even at referral cap", () => {
    expect(
      isSocialPromptRepeatWaveEligible({
        social_media_rewards: {
          youtube: { claimed: true, timestamp: 1 },
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
          ...claimedSocialPlatforms,
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
          ...claimedSocialPlatforms,
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
