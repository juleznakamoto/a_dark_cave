import type { GameState } from "@shared/schema";
import { isMarketingEmailRewardClaimedForPrompt } from "@/game/marketingEmailReward";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "@/game/playlightDiscoverReward";
import { SOCIAL_PLATFORMS } from "@/game/socialPlatforms";
import { isSocialRewardFulfilled } from "@/game/socialTaskRewards";

/**
 * Active-play milestones (ms) at which the rewards dialog auto-opens once each, * for both guests and signed-in players.
 */
export const SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS = [
  60 * 60 * 1000,
  120 * 60 * 1000,
  180 * 60 * 1000,
  240 * 60 * 1000,
  360 * 60 * 1000,
] as const;

export const SOCIAL_PROMPT_AUTO_OPEN_COUNT = SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS.length;

/** Milestone indices skipped when the player has already completed ≥3 exclusive-track tasks. */
const SOCIAL_PROMPT_SKIP_MILESTONE_INDICES_WHEN_ENGAGED = new Set([1, 3]);

export const SOCIAL_PROMPT_ENGAGED_TASK_SKIP_THRESHOLD = 3;

export function shouldSkipSocialPromptMilestone(
  index: number,
  completedTasks: number,
): boolean {
  return (
    completedTasks >= SOCIAL_PROMPT_ENGAGED_TASK_SKIP_THRESHOLD &&
    SOCIAL_PROMPT_SKIP_MILESTONE_INDICES_WHEN_ENGAGED.has(index)
  );
}

/** Advance past milestones that should not auto-open for engaged players. */
export function normalizeSocialPromptMilestoneIndex(
  index: number,
  completedTasks: number,
): number {
  let i = Math.max(0, Math.min(index, SOCIAL_PROMPT_AUTO_OPEN_COUNT));
  while (
    i < SOCIAL_PROMPT_AUTO_OPEN_COUNT &&
    shouldSkipSocialPromptMilestone(i, completedTasks)
  ) {
    i++;
  }
  return i;
}

/** How many {@link SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS} thresholds `playTimeMs` has already passed (for save migration). */
export function socialPromptMilestoneFloorFromPlayTime(
  playTimeMs: number,
  completedTasks = 0,
): number {
  let passed = 0;
  for (let i = 0; i < SOCIAL_PROMPT_AUTO_OPEN_COUNT; i++) {
    if (shouldSkipSocialPromptMilestone(i, completedTasks)) continue;
    if (playTimeMs >= SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS[i]) {
      passed = i + 1;
    } else {
      break;
    }
  }
  return normalizeSocialPromptMilestoneIndex(passed, completedTasks);
}

/**
 * When `playTimeMs` has crossed several unreached milestones at once (e.g. after returning
 * with the tab open), returns the index of the highest threshold to show once; lower thresholds
 * are skipped.
 */
export function socialPromptHighestMilestoneIndexToOpen(
  playTimeMs: number,
  nextMilestoneIndex: number,
  completedTasks = 0,
): number | null {
  const start = normalizeSocialPromptMilestoneIndex(
    nextMilestoneIndex,
    completedTasks,
  );
  if (start >= SOCIAL_PROMPT_AUTO_OPEN_COUNT) return null;

  let target = start;
  while (target + 1 < SOCIAL_PROMPT_AUTO_OPEN_COUNT) {
    const nextIndex = target + 1;
    if (playTimeMs < SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS[nextIndex]) break;
    target = nextIndex;
  }

  target = normalizeSocialPromptMilestoneIndex(target, completedTasks);
  if (target >= SOCIAL_PROMPT_AUTO_OPEN_COUNT) return null;

  if (playTimeMs >= SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS[target]) {
    return target;
  }
  return null;
}

/** Index to persist after showing the milestone at `openedMilestoneIndex`. */
export function socialPromptMilestoneIndexAfterOpen(
  openedMilestoneIndex: number,
  completedTasks: number,
): number {
  return normalizeSocialPromptMilestoneIndex(
    openedMilestoneIndex + 1,
    completedTasks,
  );
}

export const SOCIAL_PROMPT_REFERRAL_CAP = 10;

export { REFERRAL_REWARD_GOLD } from "@shared/schema";

function socialPlatformsRewardDone(
  rewards: GameState["social_media_rewards"],
): boolean {
  return SOCIAL_PLATFORMS.every((p) => isSocialRewardFulfilled(rewards[p.id]));
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

/** First wave: show if any of email, all platforms, Playlight discover, or invite cap is still incomplete. */
export function isSocialPromptFirstWaveEligible(
  state: SocialPromptRewardSlice,
): boolean {
  if (!state.isUserSignedIn) return true;
  const rewards = state.social_media_rewards ?? {};
  const platformsDone = socialPlatformsRewardDone(rewards);
  const emailDone = isMarketingEmailRewardClaimedForPrompt(rewards);
  const discoverDone = playlightDiscoverRewardDone(rewards);
  const invitesDone =
    (state.referralCount ?? 0) >= SOCIAL_PROMPT_REFERRAL_CAP;
  return !(platformsDone && emailDone && discoverDone && invitesDone);
}

/** Repeat wave: email + platform follows + Playlight discover (invite cap ignored). */
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
