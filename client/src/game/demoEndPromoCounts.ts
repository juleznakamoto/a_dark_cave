import { ACHIEVEMENT_CHART_CONFIGS } from "@/achievements/achievementProgress";
import { getAchievementConfigForEdition } from "@/achievements/achievementEdition";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import {
  DEMO_END_ESTATE_SKILL_IDS,
  DEMO_END_ITEM_IDS,
  DEMO_END_VILLAGE_JOB_IDS,
} from "@/game/demoEndCatalog";

/** Unique items you can craft or find (tools, weapons, clothing, relics, books, schematics, combat, consumables). */
export function getDemoEndCraftItemCount(): number {
  return DEMO_END_ITEM_IDS.length;
}

/** Village Build actions, including upgrade tiers and fortifications. */
export function getDemoEndBuildingCount(): number {
  return Object.keys(villageBuildActions).length;
}

/** Village Produce jobs. */
export function getDemoEndJobCount(): number {
  return DEMO_END_VILLAGE_JOB_IDS.length;
}

/** Estate skill tracks. */
export function getDemoEndSkillCount(): number {
  return DEMO_END_ESTATE_SKILL_IDS.length;
}

/** Achievement category tabs (Basics, Buildings, Items, Actions, Epic). */
export function getDemoEndAchievementCategoryCount(): number {
  return ACHIEVEMENT_CHART_CONFIGS.length;
}

/** Achievement rows in the current edition (Steam strips web-only). */
export function getDemoEndAchievementCount(): number {
  let total = 0;
  for (const config of ACHIEVEMENT_CHART_CONFIGS) {
    for (const ring of getAchievementConfigForEdition(config).rings) {
      total += ring.length;
    }
  }
  return total;
}
