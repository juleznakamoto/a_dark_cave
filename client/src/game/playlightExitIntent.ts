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

/** How many milestones `playTimeMs` has already passed (for save migration on load). */
export function playlightExitIntentMilestoneFloorFromPlayTime(
  playTimeMs: number,
): number {
  let n = 0;
  for (const m of PLAYLIGHT_EXIT_INTENT_MILESTONES_MS) {
    if (playTimeMs >= m) n++;
    else break;
  }
  return n;
}

/**
 * Next milestone ms the player may trigger, or null if none left / playTime not there yet.
 * `milestoneIndex` = count of milestones already consumed (persisted in save).
 */
export function getActivePlaylightExitMilestone(
  playTimeMs: number,
  milestoneIndex: number,
): number | null {
  if (milestoneIndex >= PLAYLIGHT_EXIT_INTENT_MILESTONE_COUNT) return null;
  const milestone = PLAYLIGHT_EXIT_INTENT_MILESTONES_MS[milestoneIndex];
  if (playTimeMs >= milestone) return milestone;
  return null;
}
