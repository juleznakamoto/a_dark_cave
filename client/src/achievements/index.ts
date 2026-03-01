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

// Re-export chart component
export { default as AchievementRingChart } from "./AchievementRingChart";

// Re-export types
export type { AchievementChartConfig, AchievementSegment } from "./AchievementRingChart";