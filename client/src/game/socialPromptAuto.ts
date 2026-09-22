import {
  INVITE_FRIEND_TASK_ACTIVE,
  REFERRAL_LIMIT as SOCIAL_PROMPT_REFERRAL_CAP,
  type GameState,
} from "@shared/schema";
import { isMarketingEmailRewardClaimedForPrompt } from "@/game/marketingEmailReward";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "@/game/playlightDiscoverReward";
import { ACTIVE_SOCIAL_PLATFORMS } from "@/game/socialPlatforms";
import {
  getSocialPlatformRewardEntry,
  isSocialRewardFulfilled,
} from "@/game/socialTaskRewards";

/**
 * Active-play time (ms) at which the rewards dialog auto-opens once,
 * for both guests and signed-in players.
 */
export const SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS = [60 * 60 * 1000] as const;

export const SOCIAL_PROMPT_AUTO_OPEN_COUNT = SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS.length;

function clampSocialPromptMilestoneIndex(index: number): number {
  return Math.max(0, Math.min(index, SOCIAL_PROMPT_AUTO_OPEN_COUNT));
}

/** How many {@link SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS} thresholds `playTimeMs` has already passed (for save migration). */
export function socialPromptMilestoneFloorFromPlayTime(playTimeMs: number): number {
  let passed = 0;
  for (let i = 0; i < SOCIAL_PROMPT_AUTO_OPEN_COUNT; i++) {
    if (playTimeMs >= SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS[i]) {
      passed = i + 1;
    } else {
      break;
    }
  }
  return passed;
}

/** The single unreached auto-open, or null once it has been shown or play time is still under an hour. */
export function socialPromptHighestMilestoneIndexToOpen(
  playTimeMs: number,
  nextMilestoneIndex: number,
): number | null {
  const start = clampSocialPromptMilestoneIndex(nextMilestoneIndex);
  if (start >= SOCIAL_PROMPT_AUTO_OPEN_COUNT) return null;
  if (playTimeMs >= SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS[start]) return start;
  return null;
}

/** Index to persist after showing the auto-open. */
export function socialPromptMilestoneIndexAfterOpen(
  openedMilestoneIndex: number,
): number {
  return clampSocialPromptMilestoneIndex(openedMilestoneIndex + 1);
}

export { SOCIAL_PROMPT_REFERRAL_CAP };
export { REFERRAL_REWARD_GOLD } from "@shared/schema";

function socialPlatformsRewardDone(
  rewards: GameState["social_media_rewards"],
): boolean {
  return ACTIVE_SOCIAL_PLATFORMS.every((p) =>
    isSocialRewardFulfilled(getSocialPlatformRewardEntry(rewards, p.id)),
  );
}

function playlightDiscoverRewardDone(
  rewards: GameState["social_media_rewards"],
): boolean {
  return isSocialRewardFulfilled(rewards[PLAYLIGHT_DISCOVER_REWARD_KEY]);
}

export { isMarketingEmailRewardClaimedForPrompt } from "@/game/marketingEmailReward";

/** Minimal slice for eligibility checks (compatible with `GameStore` from `getState()`). */
export type SocialPromptRewardSlice = {
  social_media_rewards?: GameState["social_media_rewards"];
  referralCount?: number;
  isUserSignedIn?: boolean;
};

/** First wave: email, platform follows, Playlight discover, and the invite cap while that task is on. */
export function isSocialPromptFirstWaveEligible(
  state: SocialPromptRewardSlice,
): boolean {
  if (isSocialPromptRepeatWaveEligible(state)) return true;
  if (!INVITE_FRIEND_TASK_ACTIVE || !state.isUserSignedIn) return false;
  return (state.referralCount ?? 0) < SOCIAL_PROMPT_REFERRAL_CAP;
}

/** Repeat wave: email + platform follows + Playlight discover. */
export function isSocialPromptRepeatWaveEligible(
  state: SocialPromptRewardSlice,
): boolean {
  if (!state.isUserSignedIn) return true;
  const rewards = state.social_media_rewards ?? {};
  const platformsDone = socialPlatformsRewardDone(rewards);
  const emailDone = isMarketingEmailRewardClaimedForPrompt(rewards);
  const discoverDone = playlightDiscoverRewardDone(rewards);
  return !(platformsDone && emailDone && discoverDone);
}
