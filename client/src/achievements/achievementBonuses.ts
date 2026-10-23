import type { GameState } from "@shared/schema";
import type { AchievementBonuses, AchievementChartConfig } from "./achievementTypes";
import { basicChartConfig } from "./configs/basic";
import { buildingChartConfig } from "./configs/building";
import { itemChartConfig } from "./configs/item";
import { actionChartConfig } from "./configs/action";
import { getAchievementLabel } from "@/i18n/resolveGameText";

/** Claimable charts that may define permanent `bonuses` (overall is meta-only). */
const ACHIEVEMENT_BONUS_CONFIGS: AchievementChartConfig[] = [
  basicChartConfig,
  buildingChartConfig,
  itemChartConfig,
  actionChartConfig,
];

export type ClaimedAchievementBonusContribution = {
  achievementId: string;
  sourceLabel: string;
  bonuses: AchievementBonuses;
};

function forEachClaimedBonusSegment(
  claimedAchievements: string[] | undefined,
  visit: (
    achievementId: string,
    label: string,
    bonuses: NonNullable<AchievementChartConfig["rings"][number][number]["bonuses"]>,
  ) => void,
): void {
  const claimed = new Set(claimedAchievements || []);
  for (const config of ACHIEVEMENT_BONUS_CONFIGS) {
    for (const ring of config.rings) {
      for (const seg of ring) {
        const id = `${config.idPrefix}-${seg.segmentId}`;
        if (!claimed.has(id) || !seg.bonuses) continue;
        visit(
          id,
          getAchievementLabel(config.idPrefix, seg.segmentId, seg.label),
          seg.bonuses,
        );
      }
    }
  }
}

/** Bonuses from claimed achievements (SSOT: segment `bonuses` fields). */
export function getClaimedAchievementBonuses(
  claimedAchievements: string[] | undefined,
): AchievementBonuses {
  let strangerApproachBonus = 0;
  let craftingCostReduction = 0;
  let buildingCostReduction = 0;
  forEachClaimedBonusSegment(claimedAchievements, (_id, _label, bonuses) => {
    strangerApproachBonus += bonuses.strangerApproachBonus ?? 0;
    craftingCostReduction += bonuses.craftingCostReduction ?? 0;
    buildingCostReduction += bonuses.buildingCostReduction ?? 0;
  });
  return {
    strangerApproachBonus,
    craftingCostReduction,
    buildingCostReduction,
  };
}

/** Per-achievement contributions for side-panel bonus breakdown. */
export function listClaimedAchievementBonusContributions(
  claimedAchievements: string[] | undefined,
): ClaimedAchievementBonusContribution[] {
  const rows: ClaimedAchievementBonusContribution[] = [];
  forEachClaimedBonusSegment(claimedAchievements, (achievementId, sourceLabel, bonuses) => {
    rows.push({ achievementId, sourceLabel, bonuses });
  });
  return rows;
}

export function getClaimedAchievementStrangerApproachBonus(
  state: Pick<GameState, "claimedAchievements">,
): number {
  return (
    getClaimedAchievementBonuses(state.claimedAchievements)
      .strangerApproachBonus ?? 0
  );
}

export function getClaimedAchievementCraftingCostReduction(
  state: Pick<GameState, "claimedAchievements">,
): number {
  return (
    getClaimedAchievementBonuses(state.claimedAchievements)
      .craftingCostReduction ?? 0
  );
}

export function getClaimedAchievementBuildingCostReduction(
  state: Pick<GameState, "claimedAchievements">,
): number {
  return (
    getClaimedAchievementBonuses(state.claimedAchievements)
      .buildingCostReduction ?? 0
  );
}
