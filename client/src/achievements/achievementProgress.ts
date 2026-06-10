import type { GameState } from "@shared/schema";
import type { AchievementChartConfig } from "./achievementTypes";
import {
  basicChartConfig,
  buildingChartConfig,
  itemChartConfig,
  actionChartConfig,
} from "./index";

/** The four achievement category charts, in display order. */
export const ACHIEVEMENT_CHART_CONFIGS: AchievementChartConfig[] = [
  basicChartConfig,
  buildingChartConfig,
  itemChartConfig,
  actionChartConfig,
];

interface CompletionTally {
  completed: number;
  total: number;
}

function tallyConfig(
  config: AchievementChartConfig,
  state: GameState,
): CompletionTally {
  let completed = 0;
  let total = 0;
  for (const ring of config.rings) {
    for (const seg of ring) {
      total += 1;
      if (seg.getCount(state) >= seg.maxCount) completed += 1;
    }
  }
  return { completed, total };
}

/** Percentage (0–100) of segments completed within a single category. */
export function getCategoryAchievementPercent(
  config: AchievementChartConfig,
  state: GameState,
): number {
  const { completed, total } = tallyConfig(config, state);
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * Overall percentage (0–100) of all achievements completed across every
 * category. An achievement counts as finished when its current count reaches
 * its max count — matching the filled-ring visual in the achievements panel.
 */
export function getOverallAchievementPercent(state: GameState): number {
  let completed = 0;
  let total = 0;
  for (const config of ACHIEVEMENT_CHART_CONFIGS) {
    const tally = tallyConfig(config, state);
    completed += tally.completed;
    total += tally.total;
  }
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}
