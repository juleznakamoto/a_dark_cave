import { getUnclaimedBuildingIds, buildingChartConfig } from "./configs/building";
import { getUnclaimedItemIds, itemChartConfig } from "./configs/item";
import { getUnclaimedActionIds, actionChartConfig } from "./configs/action";

/** Returns IDs of achievements that are full (claimable) but not yet claimed. */
export function getUnclaimedAchievementIds(): string[] {
  return [
    ...getUnclaimedBuildingIds(),
    ...getUnclaimedItemIds(),
    ...getUnclaimedActionIds(),
  ];
}

// Re-export chart configs for convenience
export { buildingChartConfig, itemChartConfig, actionChartConfig };

// Re-export types
export type { AchievementChartConfig, AchievementSegment } from "./achievementTypes";

// Re-export achievement colors (SSoT for circle + bar charts)
export {
  INDICATOR_CLASS_INCOMPLETE,
  INDICATOR_CLASS_COMPLETE,
  INCOMPLETE_COLOR,
  COMPLETE_COLOR,
  BACKGROUND_COLOR_HEX,
  PROGRESS_BAR_BG_CLASS,
} from "./achievementColors";