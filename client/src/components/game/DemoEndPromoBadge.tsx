import {
  getDemoEndAchievementCategoryCount,
  getDemoEndAchievementCount,
  getDemoEndBuildingCount,
  getDemoEndCraftItemCount,
  getDemoEndJobCount,
  getDemoEndSkillCount,
} from "@/game/demoEndPromoCounts";
import { useUiTranslation } from "@/i18n/useUiTranslation";

export type DemoEndPromoKind =
  | "craft"
  | "build"
  | "produce"
  | "skills"
  | "whispers"
  | "explore"
  | "attackWaves"
  | "heal"
  | "repair"
  | "achievements";

/** Highlighter-style tease on demo-end section headers. Shop cards keep the pill. */
export function DemoEndPromoBadge({ kind }: { kind: DemoEndPromoKind }) {
  const { t } = useUiTranslation();
  const text = (() => {
    switch (kind) {
      case "craft":
        return t("demoEnd.craftUpTo", {
          count: getDemoEndCraftItemCount(),
          defaultValue: "Craft or find {{count}} items",
        });
      case "build":
        return t("demoEnd.constructUpTo", {
          count: getDemoEndBuildingCount(),
          defaultValue: "Construct {{count}} buildings",
        });
      case "produce":
        return t("demoEnd.unlockJobs", {
          count: getDemoEndJobCount(),
          defaultValue: "Unlock {{count}} jobs",
        });
      case "skills":
        return t("demoEnd.unlockSkills", {
          count: getDemoEndSkillCount(),
          defaultValue: "Unlock {{count}} skills",
        });
      case "whispers":
        return t("demoEnd.whisperedMemories", {
          defaultValue: "Explore a dark and lore-rich story",
        });
      case "explore":
        return t("demoEnd.explore", {
          defaultValue: "Explore a cruel world",
        });
      case "attackWaves":
        return t("demoEnd.attackWaves", {
          defaultValue: "Fight against unspeakable creatures",
        });
      case "heal":
        return t("demoEnd.heal", {
          defaultValue: "Assemble a powerful fellowship",
        });
      case "repair":
        return t("demoEnd.repair", {
          defaultValue: "Build a mighty fortress",
        });
      case "achievements":
        return t("demoEnd.unlockAchievements", {
          count: getDemoEndAchievementCount(),
          categories: getDemoEndAchievementCategoryCount(),
          defaultValue: "Unlock {{count}} achievements in {{categories}} categories",
        });
    }
  })();

  return (
    <span
      className="inline w-fit box-decoration-clone px-1 py-px text-xs font-medium leading-tight text-green-600 bg-green-700/25"
      data-testid={`demo-end-promo-${kind}`}
    >
      {text}
    </span>
  );
}
