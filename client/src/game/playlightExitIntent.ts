import type { GameState } from "@shared/schema";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "@/game/playlightDiscoverReward";
import { isSocialRewardFulfilled } from "@/game/socialTaskRewards";

/** Normal play: one exit-intent show per milestone once `playTime` reaches it. */
export const PLAYLIGHT_EXIT_INTENT_MILESTONES_MS = [
  90 * 60 * 1000,
  150 * 60 * 1000,
  210 * 60 * 1000,
  270 * 60 * 1000,
  330 * 60 * 1000,
] as const;

export const PLAYLIGHT_EXIT_INTENT_MILESTONE_COUNT =
  PLAYLIGHT_EXIT_INTENT_MILESTONES_MS.length;

/** Milestone indices skipped when the Playlight discover social task is fulfilled (150m, 270m). */
const PLAYLIGHT_EXIT_INTENT_SKIP_INDICES_WHEN_DISCOVER_FULFILLED = new Set([
  1, 3,
]);

export function isPlaylightDiscoverSocialTaskFulfilled(
  socialRewards: GameState["social_media_rewards"] | undefined,
): boolean {
  return isSocialRewardFulfilled(socialRewards?.[PLAYLIGHT_DISCOVER_REWARD_KEY]);
}

export function shouldSkipPlaylightExitIntentMilestone(
  index: number,
  discoverFulfilled: boolean,
): boolean {
  return (
    discoverFulfilled &&
    PLAYLIGHT_EXIT_INTENT_SKIP_INDICES_WHEN_DISCOVER_FULFILLED.has(index)
  );
}

/** Advance past milestones that should not show after Playlight discover is fulfilled. */
export function normalizePlaylightExitIntentMilestoneIndex(
  index: number,
  discoverFulfilled: boolean,
): number {
  let i = Math.max(0, Math.min(index, PLAYLIGHT_EXIT_INTENT_MILESTONE_COUNT));
  while (
    i < PLAYLIGHT_EXIT_INTENT_MILESTONE_COUNT &&
    shouldSkipPlaylightExitIntentMilestone(i, discoverFulfilled)
  ) {
    i++;
  }
  return i;
}

/** How many milestones `playTimeMs` has already passed (for save migration on load). */
export function playlightExitIntentMilestoneFloorFromPlayTime(
  playTimeMs: number,
  discoverFulfilled = false,
): number {
  let passed = 0;
  for (let i = 0; i < PLAYLIGHT_EXIT_INTENT_MILESTONE_COUNT; i++) {
    if (shouldSkipPlaylightExitIntentMilestone(i, discoverFulfilled)) continue;
    if (playTimeMs >= PLAYLIGHT_EXIT_INTENT_MILESTONES_MS[i]) {
      passed = i + 1;
    } else {
      break;
    }
  }
  return normalizePlaylightExitIntentMilestoneIndex(passed, discoverFulfilled);
}

/**
 * Next milestone ms the player may trigger, or null if none left / playTime not there yet.
 * `milestoneIndex` = next array index to consume (persisted in save).
 */
export function getActivePlaylightExitMilestone(
  playTimeMs: number,
  milestoneIndex: number,
  discoverFulfilled = false,
): number | null {
  const index = normalizePlaylightExitIntentMilestoneIndex(
    milestoneIndex,
    discoverFulfilled,
  );
  if (index >= PLAYLIGHT_EXIT_INTENT_MILESTONE_COUNT) return null;
  const milestone = PLAYLIGHT_EXIT_INTENT_MILESTONES_MS[index];
  if (playTimeMs >= milestone) return milestone;
  return null;
}

/** Index to persist after exit intent is shown at `shownMilestoneIndex`. */
export function playlightExitIntentMilestoneIndexAfterShow(
  shownMilestoneIndex: number,
  discoverFulfilled: boolean,
): number {
  return normalizePlaylightExitIntentMilestoneIndex(
    shownMilestoneIndex + 1,
    discoverFulfilled,
  );
}
