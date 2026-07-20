import type { GameState } from "@shared/schema";
import type { AchievementChartConfig } from "./achievementTypes";
import { basicChartConfig } from "./configs/basic";
import { buildingChartConfig } from "./configs/building";
import { itemChartConfig } from "./configs/item";
import { actionChartConfig } from "./configs/action";
import { useGameStore } from "@/game/state";

/** Claimable / per-run categories — excludes Overall (general / meta). */
export const NON_OVERALL_ACHIEVEMENT_CONFIGS: AchievementChartConfig[] = [
  basicChartConfig,
  buildingChartConfig,
  itemChartConfig,
  actionChartConfig,
];

/** Total number of non-overall achievements (Y in X/Y progress). */
export function getNonOverallAchievementTotal(): number {
  let total = 0;
  for (const config of NON_OVERALL_ACHIEVEMENT_CONFIGS) {
    for (const ring of config.rings) {
      total += ring.length;
    }
  }
  return total;
}

/** How many non-overall achievements have reached their max count (X in X/Y). */
export function getNonOverallAchievementsCompletedCount(
  state: GameState,
): number {
  let completed = 0;
  for (const config of NON_OVERALL_ACHIEVEMENT_CONFIGS) {
    for (const ring of config.rings) {
      for (const seg of ring) {
        if (seg.getCount(state) >= seg.maxCount) completed += 1;
      }
    }
  }
  return completed;
}

/** True when every non-overall achievement has reached its max count. */
export function isAllNonOverallAchievementsComplete(state: GameState): boolean {
  const total = getNonOverallAchievementTotal();
  return (
    total > 0 && getNonOverallAchievementsCompletedCount(state) >= total
  );
}

/** Persist Achievement Maxer once all non-overall achievements are complete. */
export function persistAchievementMaxerIfComplete(
  state: GameState = useGameStore.getState() as unknown as GameState,
): void {
  if (state.hasAchievementMaxer) return;
  if (!isAllNonOverallAchievementsComplete(state)) return;
  useGameStore.setState({ hasAchievementMaxer: true });
}
