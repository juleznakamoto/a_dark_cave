import { getUnclaimedBuildingIds, buildingChartConfig } from "./configs/building";
import { getUnclaimedItemIds, itemChartConfig } from "./configs/item";
import { getUnclaimedActionIds, actionChartConfig } from "./configs/action";
import { getUnclaimedBasicIds, basicChartConfig } from "./configs/basic";
import {
  isOverallAchievementCategoryEnabled,
  overallChartConfig,
  hasAnyOverallAchievementReached,
  isBasicAchievementTabUnlocked,
  isOverallAchievementTabUnlocked,
  isAchievementsGameTabUnlocked,
} from "./configs/overall";

/**
 * Returns IDs of achievements that are full (claimable) but not yet claimed.
 * Overall (meta) achievements are never claimable and are excluded.
 * @param includeBasic — basic ring (Survivor's Notes or Book of Trials)
 * @param includeAdvanced — building/item/action rings (only claimable in UI with Book of Trials)
 */
export function getUnclaimedAchievementIds(
  includeBasic = true,
  includeAdvanced = true,
): string[] {
  const ids: string[] = [];
  if (includeBasic) ids.push(...getUnclaimedBasicIds());
  if (includeAdvanced) {
    ids.push(
      ...getUnclaimedBuildingIds(),
      ...getUnclaimedItemIds(),
      ...getUnclaimedActionIds(),
    );
  }
  return ids;
}

// Re-export chart configs for convenience
export {
  buildingChartConfig,
  itemChartConfig,
  actionChartConfig,
  basicChartConfig,
  isOverallAchievementCategoryEnabled,
  overallChartConfig,
  hasAnyOverallAchievementReached,
  isBasicAchievementTabUnlocked,
  isOverallAchievementTabUnlocked,
  isAchievementsGameTabUnlocked,
};

export {
  ACHIEVEMENT_RING_ICONS,
  ACHIEVEMENT_RING_SHARE_SIZE,
  ACHIEVEMENT_RING_TAB_SIZE,
  achievementRingIcon,
  achievementRingSymbolPaddingTop,
} from "./achievementRingIcons";

// Re-export types
export type { AchievementChartConfig, AchievementSegment } from "./achievementTypes";
export type { AchievementRingIcon } from "./achievementRingIcons";

export {
  filterWebOnlyAchievements,
  getAchievementConfigForEdition,
  getAchievementConfigForSteam,
} from "./achievementEdition";

// Re-export achievement colors (SSoT for circle + bar charts)
export {
  INDICATOR_CLASS_INCOMPLETE,
  INDICATOR_CLASS_COMPLETE,
  CLAIM_BUTTON_CLASS,
  INCOMPLETE_COLOR,
  COMPLETE_COLOR,
  BACKGROUND_COLOR_HEX,
  PROGRESS_BAR_BG_CLASS,
} from "./achievementColors";