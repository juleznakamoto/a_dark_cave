import { describe, expect, it } from "vitest";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import {
  DEMO_END_BOOK_IDS,
  DEMO_END_CLOTHING_IDS,
  DEMO_END_ESTATE_SKILL_IDS,
  DEMO_END_ITEM_IDS,
  DEMO_END_RELIC_IDS,
  DEMO_END_VILLAGE_JOB_IDS,
  DEMO_END_WEAPON_IDS,
} from "@/game/demoEndCatalog";
import { ACHIEVEMENT_CHART_CONFIGS } from "@/achievements/achievementProgress";
import { getAchievementConfigForEdition } from "@/achievements/achievementEdition";
import {
  getDemoEndAchievementCategoryCount,
  getDemoEndAchievementCount,
  getDemoEndBuildingCount,
  getDemoEndCraftItemCount,
  getDemoEndJobCount,
  getDemoEndSkillCount,
} from "./demoEndPromoCounts";

describe("demoEndPromoCounts", () => {
  it("counts unique craftable and found inventory items", () => {
    expect(getDemoEndCraftItemCount()).toBe(DEMO_END_ITEM_IDS.length);
    expect(DEMO_END_ITEM_IDS).toContain("stone_axe");
    expect(DEMO_END_ITEM_IDS).toContain("whispering_cube");
    expect(DEMO_END_ITEM_IDS).toContain("blacksteel_armor");
    expect(DEMO_END_ITEM_IDS).toContain("torch");
    expect(new Set(DEMO_END_ITEM_IDS).size).toBe(DEMO_END_ITEM_IDS.length);
    expect(getDemoEndCraftItemCount()).toBeGreaterThan(
      DEMO_END_WEAPON_IDS.length +
        DEMO_END_CLOTHING_IDS.length +
        DEMO_END_RELIC_IDS.length +
        DEMO_END_BOOK_IDS.length,
    );
  });

  it("counts every village build action", () => {
    expect(getDemoEndBuildingCount()).toBe(
      Object.keys(villageBuildActions).length,
    );
    expect(getDemoEndBuildingCount()).toBeGreaterThan(0);
  });

  it("counts village jobs and estate skills from the demo-end catalogs", () => {
    expect(getDemoEndJobCount()).toBe(DEMO_END_VILLAGE_JOB_IDS.length);
    expect(getDemoEndSkillCount()).toBe(DEMO_END_ESTATE_SKILL_IDS.length);
    expect(getDemoEndJobCount()).toBeGreaterThan(0);
    expect(getDemoEndSkillCount()).toBeGreaterThan(0);
  });

  it("counts achievement rows and categories from the edition catalogs", () => {
    let expected = 0;
    for (const config of ACHIEVEMENT_CHART_CONFIGS) {
      for (const ring of getAchievementConfigForEdition(config).rings) {
        expected += ring.length;
      }
    }
    expect(getDemoEndAchievementCount()).toBe(expected);
    expect(getDemoEndAchievementCount()).toBeGreaterThan(0);
    expect(getDemoEndAchievementCategoryCount()).toBe(
      ACHIEVEMENT_CHART_CONFIGS.length,
    );
    expect(getDemoEndAchievementCategoryCount()).toBeGreaterThan(1);
  });
});
