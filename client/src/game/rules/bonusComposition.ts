import type { GameState } from "@shared/schema";
import {
  ACTION_TO_UPGRADE_KEY,
  getUpgradeBonus,
  type UpgradeKey,
} from "@/game/buttonUpgrades";
import { CRAFT_UPGRADE_ACTIONS } from "@/game/craftUpgradeUtils";
import {
  getBuilderBuildCostReduction,
  getBuilderBuildTimeReduction,
  getBuilderLevel,
} from "@/game/constructionQueueSlots";
import {
  getActionLabel,
  getEffectName,
  tWithFallback,
} from "@/i18n/resolveGameText";
import {
  bookEffects,
  clothingEffects,
  fellowshipEffects,
  toolEffects,
  weaponEffects,
  type EffectDefinition,
} from "./effects";
import {
  getActiveEffects,
  getTotalBuildingCostReduction,
  getTotalBuildingTimeReduction,
  getTotalCraftingCostReduction,
  getDoubleGainChance,
} from "./effectsCalculation";
import {
  CROWS_EYE_UPGRADES,
  HUNT_BONUSES,
  getChainmasterProductionBonus,
  getFeralHowlConstructionTimeReduction,
} from "./skillUpgrades";
import { villageBuildActions } from "./villageBuildActions";

/** One contributing source in a side-panel bonus tooltip. */
export type BonusCompositionLine = {
  sourceId: string;
  sourceLabel: string;
  /** Percentage points (e.g. 50 for +50%). Always positive. */
  percent: number;
  /** When true, render as a reduction (−%). */
  isReduction?: boolean;
};

const CAVE_EXPLORE_ACTION_IDS = [
  "caveExplore",
  "exploreCave",
  "ventureDeeper",
  "descendFurther",
  "exploreRuins",
  "exploreTemple",
  "exploreCitadel",
] as const;

const STORAGE_PRIORITY = [
  "greatVault",
  "grandRepository",
  "villageWarehouse",
  "fortifiedStorehouse",
  "storehouse",
] as const;

const BLACKSMITH_PRIORITY = ["grandBlacksmith", "advancedBlacksmith"] as const;

const BUILDER_BUILDING_BY_LEVEL: Record<number, string> = {
  1: "buildersLodge",
  2: "buildersHall",
  3: "buildersGuild",
};

function formatPercentPoints(value: number): number {
  return Number(value.toFixed(1));
}

function getActiveEffectSourceLabel(effect: EffectDefinition): string {
  const id = effect.id;
  if (toolEffects[id]) return getEffectName("tools", id, effect.name);
  if (weaponEffects[id]) return getEffectName("weapons", id, effect.name);
  if (bookEffects[id]) return getEffectName("books", id, effect.name);
  if (fellowshipEffects[id]) {
    return getEffectName("fellowship", id, effect.name);
  }
  if (clothingEffects[id]) return getEffectName("clothing", id, effect.name);
  return effect.name;
}

function getBuildingSourceLabel(buildingKey: string): string {
  const actionId = `build${buildingKey.charAt(0).toUpperCase()}${buildingKey.slice(1)}`;
  const buildAction = villageBuildActions[actionId];
  return getActionLabel(actionId, buildAction?.label ?? buildingKey);
}

function getBookOfAscensionLabel(): string {
  return getEffectName(
    "books",
    "book_of_ascension",
    bookEffects.book_of_ascension?.name ?? "Book of Ascension",
  );
}

function getBookOfChainmasterLabel(): string {
  return getEffectName(
    "books",
    "book_of_chainmaster",
    bookEffects.book_of_chainmaster?.name ?? "Book of Chainmaster",
  );
}

function pushLine(
  lines: BonusCompositionLine[],
  line: BonusCompositionLine,
): void {
  if (line.percent <= 0) return;
  lines.push(line);
}

function getActionBonusComposition(
  actionId: string,
  state: GameState,
): BonusCompositionLine[] {
  const lines: BonusCompositionLine[] = [];
  const seenEffects = new Set<string>();

  for (const effect of getActiveEffects(state)) {
    let contrib = 0;

    if (actionId === "caveExplore") {
      const general = effect.bonuses.generalBonuses?.caveExploreMultiplier;
      if (general && general !== 1) {
        contrib += general - 1;
      }
      for (const caveAction of CAVE_EXPLORE_ACTION_IDS) {
        const bonus = effect.bonuses.actionBonuses?.[caveAction];
        if (bonus?.resourceMultiplier && bonus.resourceMultiplier !== 1) {
          contrib += bonus.resourceMultiplier - 1;
        }
      }
    } else {
      const bonus = effect.bonuses.actionBonuses?.[actionId];
      if (bonus?.resourceMultiplier && bonus.resourceMultiplier !== 1) {
        contrib += bonus.resourceMultiplier - 1;
      }
    }

    if (contrib <= 0 || seenEffects.has(effect.id)) continue;
    seenEffects.add(effect.id);
    pushLine(lines, {
      sourceId: effect.id,
      sourceLabel: getActiveEffectSourceLabel(effect),
      percent: Math.round(contrib * 100),
    });
  }

  if (state.books?.book_of_ascension) {
    const upgradeKey: UpgradeKey | undefined =
      actionId === "caveExplore"
        ? "caveExplore"
        : ACTION_TO_UPGRADE_KEY[actionId];
    const isCraft = (CRAFT_UPGRADE_ACTIONS as readonly string[]).includes(
      actionId,
    );
    if (upgradeKey && !isCraft) {
      const bonus = getUpgradeBonus(upgradeKey, state);
      pushLine(lines, {
        sourceId: "book_of_ascension",
        sourceLabel: getBookOfAscensionLabel(),
        percent: bonus,
      });
    }
  }

  if (actionId === "hunt" && (state.huntingSkills?.level ?? 0) > 0) {
    const huntBonus = HUNT_BONUSES[state.huntingSkills!.level] ?? 0;
    pushLine(lines, {
      sourceId: "huntressTraining",
      sourceLabel: tWithFallback(
        "ui",
        "forest.huntressTraining",
        "Huntress Training",
      ),
      percent: huntBonus,
    });
  }

  return lines;
}

function getCraftingCostReductionComposition(
  state: GameState,
): BonusCompositionLine[] {
  const lines: BonusCompositionLine[] = [];

  for (const effect of getActiveEffects(state)) {
    const reduction = effect.bonuses.generalBonuses?.craftingCostReduction;
    if (!reduction) continue;
    pushLine(lines, {
      sourceId: effect.id,
      sourceLabel: getActiveEffectSourceLabel(effect),
      percent: formatPercentPoints(reduction * 100),
    });
  }

  for (const buildingKey of STORAGE_PRIORITY) {
    if ((state.buildings[buildingKey as keyof typeof state.buildings] ?? 0) > 0) {
      const actionId = `build${buildingKey.charAt(0).toUpperCase()}${buildingKey.slice(1)}`;
      const reduction = villageBuildActions[actionId]?.craftingCostReduction;
      if (reduction) {
        pushLine(lines, {
          sourceId: buildingKey,
          sourceLabel: getBuildingSourceLabel(buildingKey),
          percent: formatPercentPoints(reduction * 100),
        });
      }
      break;
    }
  }

  for (const buildingKey of BLACKSMITH_PRIORITY) {
    if ((state.buildings[buildingKey as keyof typeof state.buildings] ?? 0) > 0) {
      const actionId = `build${buildingKey.charAt(0).toUpperCase()}${buildingKey.slice(1)}`;
      const reduction = villageBuildActions[actionId]?.craftingCostReduction;
      if (reduction) {
        pushLine(lines, {
          sourceId: buildingKey,
          sourceLabel: getBuildingSourceLabel(buildingKey),
          percent: formatPercentPoints(reduction * 100),
        });
      }
      break;
    }
  }

  return lines;
}

function getBuildingCostReductionComposition(
  state: GameState,
): BonusCompositionLine[] {
  const lines: BonusCompositionLine[] = [];

  for (const effect of getActiveEffects(state)) {
    const reduction = effect.bonuses.generalBonuses?.buildingCostReduction;
    if (!reduction) continue;
    pushLine(lines, {
      sourceId: effect.id,
      sourceLabel: getActiveEffectSourceLabel(effect),
      percent: formatPercentPoints(reduction * 100),
    });
  }

  for (const buildingKey of STORAGE_PRIORITY) {
    if ((state.buildings[buildingKey as keyof typeof state.buildings] ?? 0) > 0) {
      const actionId = `build${buildingKey.charAt(0).toUpperCase()}${buildingKey.slice(1)}`;
      const reduction = villageBuildActions[actionId]?.buildingCostReduction;
      if (reduction) {
        pushLine(lines, {
          sourceId: buildingKey,
          sourceLabel: getBuildingSourceLabel(buildingKey),
          percent: formatPercentPoints(reduction * 100),
        });
      }
      break;
    }
  }

  const builderLevel = getBuilderLevel(state);
  const builderReduction = getBuilderBuildCostReduction(builderLevel);
  if (builderReduction > 0) {
    const buildingKey = BUILDER_BUILDING_BY_LEVEL[builderLevel];
    pushLine(lines, {
      sourceId: buildingKey ?? "builder",
      sourceLabel: buildingKey
        ? getBuildingSourceLabel(buildingKey)
        : tWithFallback("ui", "sidePanel.buildDiscount", "Build Discount"),
      percent: formatPercentPoints(builderReduction * 100),
    });
  }

  return lines;
}

function getBuildingTimeReductionComposition(
  state: GameState,
): BonusCompositionLine[] {
  const lines: BonusCompositionLine[] = [];
  const builderLevel = getBuilderLevel(state);
  const builderReduction = getBuilderBuildTimeReduction(builderLevel);
  if (builderReduction > 0) {
    const buildingKey = BUILDER_BUILDING_BY_LEVEL[builderLevel];
    lines.push({
      sourceId: buildingKey ?? "builder",
      sourceLabel: buildingKey
        ? getBuildingSourceLabel(buildingKey)
        : tWithFallback("ui", "sidePanel.constructionTime", "Construction Time"),
      percent: formatPercentPoints(builderReduction * 100),
      isReduction: true,
    });
  }

  const houndReduction = getFeralHowlConstructionTimeReduction(state);
  if (houndReduction > 0) {
    lines.push({
      sourceId: "feral_howl",
      sourceLabel: tWithFallback("ui", "estate.feralHowl", "Feral Howl"),
      percent: formatPercentPoints(houndReduction * 100),
      isReduction: true,
    });
  }

  return lines;
}

function getVillagerProductionComposition(
  state: GameState,
): BonusCompositionLine[] {
  const bonus = getChainmasterProductionBonus(state);
  if (bonus <= 0) return [];
  return [
    {
      sourceId: "book_of_chainmaster",
      sourceLabel: getBookOfChainmasterLabel(),
      percent: Math.round(bonus * 100),
    },
  ];
}

function getDoubleGainChanceComposition(
  state: GameState,
): BonusCompositionLine[] {
  const lines: BonusCompositionLine[] = [];

  for (const effect of getActiveEffects(state)) {
    const chance = effect.bonuses.generalBonuses?.actionBonusChance;
    if (typeof chance !== "number" || chance <= 0) continue;
    pushLine(lines, {
      sourceId: effect.id,
      sourceLabel: getActiveEffectSourceLabel(effect),
      percent: formatPercentPoints(chance * 100),
    });
  }

  if (state.crowsEyeSkills && state.crowsEyeSkills.level > 0) {
    const upgrade = CROWS_EYE_UPGRADES.find(
      (u) => u.level === state.crowsEyeSkills!.level,
    );
    if (upgrade) {
      pushLine(lines, {
        sourceId: "crowsEye",
        sourceLabel: tWithFallback("ui", "forest.crowsEye", "Crow's Eye"),
        percent: upgrade.doubleChance,
      });
    }
  }

  return lines;
}

/**
 * Per-source breakdown for a side-panel Bonuses row.
 * Lines are ordered for display; percent points match the sidebar value model.
 */
export function getBonusComposition(
  bonusId: string,
  state: GameState,
): BonusCompositionLine[] {
  switch (bonusId) {
    case "craftingCostReduction":
      return getCraftingCostReductionComposition(state);
    case "buildingCostReduction":
      return getBuildingCostReductionComposition(state);
    case "buildingTimeReduction":
      return getBuildingTimeReductionComposition(state);
    case "villagerProductionBonus":
      return getVillagerProductionComposition(state);
    case "doubleGainChance":
      return getDoubleGainChanceComposition(state);
    default:
      return getActionBonusComposition(bonusId, state);
  }
}

/** True when a bonus row has at least one composition line to show. */
export function hasBonusComposition(bonusId: string, state: GameState): boolean {
  return getBonusComposition(bonusId, state).length > 0;
}

/**
 * Sanity check: composition percent sum should match the displayed bonus value
 * for the special (non-action) bonus rows.
 */
export function getBonusCompositionTotalPercent(
  bonusId: string,
  state: GameState,
): number {
  const lines = getBonusComposition(bonusId, state);
  const sum = lines.reduce((acc, line) => acc + line.percent, 0);
  switch (bonusId) {
    case "craftingCostReduction":
      return formatPercentPoints(getTotalCraftingCostReduction(state) * 100);
    case "buildingCostReduction":
      return formatPercentPoints(getTotalBuildingCostReduction(state) * 100);
    case "buildingTimeReduction":
      return formatPercentPoints(getTotalBuildingTimeReduction(state) * 100);
    case "villagerProductionBonus":
      return Math.round(getChainmasterProductionBonus(state) * 100);
    case "doubleGainChance":
      return formatPercentPoints(getDoubleGainChance(state) * 100);
    default:
      return Math.round(sum);
  }
}
