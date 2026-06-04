import type { GameState } from "@shared/schema";
import { MARKETING_EMAIL_REWARD_KEY } from "@/game/marketingEmailReward";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "@/game/playlightDiscoverReward";
import { SOCIAL_PLATFORMS } from "@/game/socialPlatforms";

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

/**
 * When `playTimeMs` has crossed several unreached milestones at once (e.g. after returning
 * with the tab open), returns the index of the highest threshold to show once; lower thresholds
 * are skipped.
 */
export function socialPromptHighestMilestoneIndexToOpen(
  playTimeMs: number,
  nextMilestoneIndex: number,
): number | null {
  if (nextMilestoneIndex >= SOCIAL_PROMPT_AUTO_OPEN_COUNT) return null;

  let target = nextMilestoneIndex;
  while (
    target + 1 < SOCIAL_PROMPT_AUTO_OPEN_COUNT &&
    playTimeMs >= SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS[target + 1]
  ) {
    target++;
  }

  if (playTimeMs >= SOCIAL_PROMPT_AUTO_OPEN_PLAY_MS[target]) {
    return target;
  }
  return null;
}

export const SOCIAL_PROMPT_REFERRAL_CAP = 10;

export { REFERRAL_REWARD_GOLD } from "@shared/schema";

function socialPlatformsRewardDone(
  rewards: GameState["social_media_rewards"],
): boolean {
  return SOCIAL_PLATFORMS.every((p) => !!rewards[p.id]?.claimed);
}

function playlightDiscoverRewardDone(
  rewards: GameState["social_media_rewards"],
): boolean {
  return !!rewards[PLAYLIGHT_DISCOVER_REWARD_KEY]?.claimed;
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
