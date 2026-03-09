import { useGameStore } from "@/game/state";
import type { AchievementChartConfig } from "./AchievementRingChart";

export interface AchievementRow {
  segmentId: string;
  label: string;
  currentCount: number;
  maxCount: number;
  achievementId: string;
  reward?: number;
  isFull: boolean;
  isClaimed: boolean;
}

/** Flattens a category config's rings into per-achievement row data. */
export function getAchievementRows(
  config: AchievementChartConfig,
  state: ReturnType<typeof useGameStore.getState>,
  claimedAchievements: string[]
): AchievementRow[] {
  const rows: AchievementRow[] = [];
  config.rings.forEach((segments) => {
    segments.forEach((seg) => {
      const currentCount = seg.getCount(state);
      const achievementId = `${config.idPrefix}-${seg.segmentId}`;
      const isFull = currentCount >= seg.maxCount;
      const isClaimed = claimedAchievements.includes(achievementId);
      rows.push({
        segmentId: seg.segmentId,
        label: seg.label,
        currentCount,
        maxCount: seg.maxCount,
        achievementId,
        reward: seg.reward,
        isFull,
        isClaimed,
      });
    });
  });
  return rows;
}

/** Computes silver reward for an achievement (matches legacy ring chart logic). */
function computeSilverReward(
  reward: number | undefined,
  maxCount: number,
  BTP: number
): number {
  const candidate = reward || 0 + BTP * 250;
  return candidate ?? 50 * maxCount;
}

/** Claims an achievement: grants silver, logs, updates claimedAchievements. */
export function claimAchievement(
  achievementId: string,
  segment: { name: string; reward?: number; maxCount: number }
): void {
  const BTP = useGameStore.getState().BTP || 0;
  const silverReward = computeSilverReward(
    segment.reward,
    segment.maxCount,
    BTP
  );

  useGameStore.getState().updateResource("silver", silverReward);

  useGameStore.setState((s) => ({
    log: [
      ...s.log,
      {
        id: `achievement-${achievementId}-${Date.now()}`,
        message: `${segment.name} Achievement complete: +${silverReward} Silver`,
        timestamp: Date.now(),
        type: "event" as const,
      },
    ].slice(-100),
    claimedAchievements: [...(s.claimedAchievements || []), achievementId],
  }));
}
