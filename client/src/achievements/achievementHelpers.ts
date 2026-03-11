import { useGameStore } from "@/game/state";
import type { AchievementChartConfig } from "./achievementTypes";

export interface AchievementRow {
  segmentId: string;
  label: string;
  currentCount: number;
  maxCount: number;
  achievementId: string;
  /** @deprecated Use rewards instead */
  reward?: number;
  /** Computed rewards per resource (e.g. { silver: 250, gold: 10 }) */
  rewards: Record<string, number>;
  isFull: boolean;
  isClaimed: boolean;
}

/** Computes silver reward for an achievement (matches legacy ring chart logic). */
export function computeSilverReward(
  reward: number | undefined,
  maxCount: number,
  BTP: number
): number {
  const candidate = reward || 0 + BTP * 250;
  return candidate ?? 50 * maxCount;
}

/** Computes all achievement rewards. Supports legacy reward (silver) and new rewards map. */
export function computeAchievementRewards(
  segment: { reward?: number; rewards?: Record<string, number>; maxCount: number },
  BTP: number
): Record<string, number> {
  if (segment.rewards && Object.keys(segment.rewards).length > 0) {
    const result = { ...segment.rewards };
    if ("silver" in result) {
      result.silver = computeSilverReward(result.silver, segment.maxCount, BTP);
    }
    return result;
  }
  const silver = computeSilverReward(segment.reward, segment.maxCount, BTP);
  return silver > 0 ? { silver } : {};
}

/** Formats rewards for tooltip display, e.g. "+250 Silver, +10 Gold". */
export function formatRewardsTooltip(rewards: Record<string, number>): string {
  const entries = Object.entries(rewards).filter(([, amount]) => amount > 0);
  if (entries.length === 0) return "";
  const formatResourceName = (key: string) =>
    key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return entries
    .map(([key, amount]) => `+${amount} ${formatResourceName(key)}`)
    .join(", ");
}

/** Flattens a category config's rings into per-achievement row data. */
export function getAchievementRows(
  config: AchievementChartConfig,
  state: ReturnType<typeof useGameStore.getState>,
  claimedAchievements: string[]
): AchievementRow[] {
  const BTP = state.BTP ?? 0;
  const rows: AchievementRow[] = [];
  config.rings.forEach((segments) => {
    segments.forEach((seg) => {
      const currentCount = seg.getCount(state);
      const achievementId = `${config.idPrefix}-${seg.segmentId}`;
      const isFull = currentCount >= seg.maxCount;
      const isClaimed = claimedAchievements.includes(achievementId);
      const rewards = computeAchievementRewards(seg, BTP);
      rows.push({
        segmentId: seg.segmentId,
        label: seg.label,
        currentCount,
        maxCount: seg.maxCount,
        achievementId,
        reward: seg.reward,
        rewards,
        isFull,
        isClaimed,
      });
    });
  });
  return rows;
}

/** Claims an achievement: grants all rewards, logs, updates claimedAchievements. */
export function claimAchievement(
  achievementId: string,
  segment: { name: string; reward?: number; rewards?: Record<string, number>; maxCount: number }
): void {
  const BTP = useGameStore.getState().BTP || 0;
  const rewards = computeAchievementRewards(segment, BTP);

  for (const [resource, amount] of Object.entries(rewards)) {
    if (amount > 0) {
      useGameStore.getState().updateResource(resource, amount);
    }
  }

  const rewardText = formatRewardsTooltip(rewards);

  useGameStore.setState((s) => ({
    log: [
      ...s.log,
      {
        id: `achievement-${achievementId}-${Date.now()}`,
        message: `${segment.name} Achievement complete: ${rewardText}`,
        timestamp: Date.now(),
        type: "event" as const,
      },
    ].slice(-100),
    claimedAchievements: [...(s.claimedAchievements || []), achievementId],
  }));
}
