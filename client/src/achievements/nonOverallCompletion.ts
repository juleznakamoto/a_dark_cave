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

/** True when every non-overall achievement has reached its max count. */
export function isAllNonOverallAchievementsComplete(state: GameState): boolean {
  for (const config of NON_OVERALL_ACHIEVEMENT_CONFIGS) {
    for (const ring of config.rings) {
      for (const seg of ring) {
        if (seg.getCount(state) < seg.maxCount) return false;
      }
    }
  }
  return true;
}

/** Persist Achievement Maxer once all non-overall achievements are complete. */
export function persistAchievementMaxerIfComplete(
  state: GameState = useGameStore.getState() as unknown as GameState,
): void {
  if (state.hasAchievementMaxer) return;
  if (!isAllNonOverallAchievementsComplete(state)) return;
  useGameStore.setState({ hasAchievementMaxer: true });
}
