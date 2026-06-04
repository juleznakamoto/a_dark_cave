import type { GameState } from "@shared/schema";

/** `story.seen` prefix: true once the player opened the achievements tab while this id was unclaimed. */
export const ACHIEVEMENT_TAB_PULSE_SEEN_PREFIX = "achievementTabPulseSeen_";

export function achievementTabPulseSeenKey(achievementId: string): string {
  return `${ACHIEVEMENT_TAB_PULSE_SEEN_PREFIX}${achievementId}`;
}

export function isAchievementTabPulseSeen(
  story: GameState["story"] | undefined,
  achievementId: string,
): boolean {
  return !!story?.seen?.[achievementTabPulseSeenKey(achievementId)];
}

/** True when at least one claimable achievement has not been “viewed” on the tab since it became claimable. */
export function hasUnviewedUnclaimedAchievementsForTabPulse(
  story: GameState["story"] | undefined,
  unclaimedIds: string[],
): boolean {
  return unclaimedIds.some((id) => !isAchievementTabPulseSeen(story, id));
}

export function withAchievementTabPulseViewed(
  story: GameState["story"] | undefined,
  achievementIds: string[],
): GameState["story"] {
  const base = story ?? { seen: {}, merchantPurchases: 0, heavySleeperHours: 0 };
  if (achievementIds.length === 0) return base;

  const seen = { ...base.seen };
  for (const id of achievementIds) {
    seen[achievementTabPulseSeenKey(id)] = true;
  }
  return { ...base, seen };
}
