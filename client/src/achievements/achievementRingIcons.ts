import type { AchievementChartConfig } from "./achievementTypes";
import { actionChartConfig } from "./configs/action";
import { basicChartConfig } from "./configs/basic";
import { buildingChartConfig } from "./configs/building";
import { itemChartConfig } from "./configs/item";
import { overallChartConfig } from "./configs/overall";

/** Compact tab-trigger size. Share and other sizes scale from this. */
export const ACHIEVEMENT_RING_TAB_SIZE = 58;
/** Share-card ring size. Keep in sync with ShareDialog. */
export const ACHIEVEMENT_RING_SHARE_SIZE = 208;

export type AchievementRingIcon = {
  id: AchievementChartConfig["idPrefix"];
  label: string;
  config: AchievementChartConfig;
  /**
   * Optical down-nudge in CSS px at tab size (58). Share and other sizes
   * scale this. Edit here; AchievementsPanel, ShareDialog, and
   * `/dev/production-icons` all read this list.
   */
  paddingTopPx: number;
};

export const ACHIEVEMENT_RING_ICONS: AchievementRingIcon[] = [
  {
    id: "basic",
    label: "Basics",
    config: basicChartConfig,
    paddingTopPx: 2,
  },
  {
    id: "building",
    label: "Buildings",
    config: buildingChartConfig,
    paddingTopPx: 3,
  },
  {
    id: "item",
    label: "Items",
    config: itemChartConfig,
    paddingTopPx: 3,
  },
  {
    id: "action",
    label: "Actions",
    config: actionChartConfig,
    paddingTopPx: 1,
  },
  {
    id: "overall",
    label: "Epic",
    config: overallChartConfig,
    paddingTopPx: 2.5,
  },
];

export function achievementRingIcon(
  id: AchievementChartConfig["idPrefix"],
): AchievementRingIcon | undefined {
  return ACHIEVEMENT_RING_ICONS.find((icon) => icon.id === id);
}

export function achievementRingSymbolPaddingTop(
  id: AchievementChartConfig["idPrefix"],
  size: number,
): number {
  const icon = achievementRingIcon(id);
  if (!icon) return 0;
  return icon.paddingTopPx * (size / ACHIEVEMENT_RING_TAB_SIZE);
}
