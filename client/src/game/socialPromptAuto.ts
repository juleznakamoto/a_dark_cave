import type { GameState } from "@shared/schema";
import { MARKETING_EMAIL_REWARD_KEY } from "@/game/marketingEmailReward";
import { SOCIAL_PLATFORMS } from "@/game/socialPlatforms";

/** @deprecated Legacy signed-in scheduler; auto-open now uses {@link SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS}. */
export const SOCIAL_PROMPT_INITIAL_PLAY_MS = 30 * 60 * 1000;

/** @deprecated Legacy signed-in scheduler. */
export const SOCIAL_PROMPT_REPEAT_PLAY_MS = 90 * 60 * 1000;

/** @deprecated Legacy signed-in scheduler. */
export const SOCIAL_PROMPT_LONG_REPEAT_PLAY_MS = 4 * 60 * 60 * 1000;

/**
 * Active-play milestones (ms) at which the rewards dialog auto-opens once each,
 * for both guests and signed-in players.
 */
export const SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS = [
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  120 * 60 * 1000,
] as const;

export const SOCIAL_PROMPT_AUTO_OPEN_COUNT = SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS.length;

/** How many {@link SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS} thresholds `playTimeMs` has already passed (for save migration). */
export function socialPromptMilestoneFloorFromPlayTime(
  playTimeMs: number,
): number {
  let n = 0;
  for (const m of SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS) {
    if (playTimeMs >= m) n++;
    else break;
  }
  return n;
}

export const SOCIAL_PROMPT_REFERRAL_CAP = 10;

function socialPlatformsRewardDone(
  rewards: GameState["social_media_rewards"],
): boolean {
  return SOCIAL_PLATFORMS.every((p) => !!rewards[p.id]?.claimed);
}

/**
 * Email counts as fulfilled if they ever claimed the one-time subscribe reward (persists if they unsubscribe later).
 */
export function isMarketingEmailRewardClaimedForPrompt(
  socialRewards: GameState["social_media_rewards"],
): boolean {
  return !!socialRewards[MARKETING_EMAIL_REWARD_KEY]?.claimed;
}

/** Minimal slice for eligibility checks (compatible with `GameStore` from `getState()`). */
export type SocialPromptRewardSlice = {
  social_media_rewards?: GameState["social_media_rewards"];
  referralCount?: number;
  isUserSignedIn?: boolean;
};

/** First wave: show if any of email, all platforms, or invite cap is still incomplete. */
export function isSocialPromptFirstWaveEligible(
  state: SocialPromptRewardSlice,
): boolean {
  if (!state.isUserSignedIn) return true;
  const rewards = state.social_media_rewards ?? {};
  const platformsDone = socialPlatformsRewardDone(rewards);
  const emailDone = isMarketingEmailRewardClaimedForPrompt(rewards);
  const invitesDone =
    (state.referralCount ?? 0) >= SOCIAL_PROMPT_REFERRAL_CAP;
  return !(platformsDone && emailDone && invitesDone);
}

/** Repeat wave: only email + platform follows (invite cap ignored). */
export function isSocialPromptRepeatWaveEligible(
  state: SocialPromptRewardSlice,
): boolean {
  if (!state.isUserSignedIn) return true;
  const rewards = state.social_media_rewards ?? {};
  const platformsDone = socialPlatformsRewardDone(rewards);
  const emailDone = isMarketingEmailRewardClaimedForPrompt(rewards);
  return !(platformsDone && emailDone);
}
