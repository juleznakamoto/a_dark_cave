import {
  FELLOWSHIP_MEMBER_ORDER,
  gameStateSchema,
  type GameState,
} from "@shared/schema";
import { derivedListEqual } from "@/game/useGameStoreWithoutTickClock";
import {
  shouldExcludeFromBuildingsSection,
  shouldHideBuilding,
} from "@/game/buildingHierarchy";
import { getMapFragmentCount } from "@/game/mapFragments";
import {
  getAssignedPopulationJobIds,
  getTotalPopulationEffects,
  hasResourceProductionBreakdown,
} from "@/game/population";
import { hasBonusComposition } from "@/game/rules/bonusComposition";
import {
  getAllActionBonuses,
  getDisplayTools,
  getDoubleGainChance,
  getMadnessComponents,
  getTotalBuildingCostReduction,
  getTotalBuildingTimeReduction,
  getTotalCraftingCostReduction,
  type EffectsForMadnessComponents,
} from "@/game/rules/effectsCalculation";
import { getChainmasterProductionBonus } from "@/game/rules/skillUpgrades";
import { getSeenResourceKeys } from "@/game/stateHelpers";
import {
  COMBAT_ITEM_RESOURCES,
  getResourceLimit,
  isResourceLimited,
  type CombatItemResourceKey,
} from "@/game/resourceLimits";

const defaultGameState = gameStateSchema.parse({});
export const SIDE_PANEL_RESOURCE_ORDER = Object.keys(defaultGameState.resources);
export const SIDE_PANEL_BUILDING_ORDER = Object.keys(
  defaultGameState.buildings,
);

export const PRECIOUS_RESOURCE_ORDER = ["silver", "gold", "insight"] as const;

const FORTIFICATION_KEYS = [
  "bastion",
  "watchtower",
  "palisades",
  "fortifiedMoat",
  "chitinPlating",
] as const;

export type SidePanelResourceRow = {
  id: string;
  value: number;
  productionDelta: number;
  isPrecious: boolean;
  hasSpacingAfter: boolean;
  hasFlow: boolean;
};

export type SidePanelIdValueRow = {
  id: string;
  value: number;
};

export type SidePanelBuildingRow = {
  id: string;
  value: number;
  showCount: boolean;
};

export type SidePanelFortificationRow = {
  id: string;
  value: number;
  damaged: boolean;
};

export type SidePanelBonusRow = {
  id: string;
  displayValue: string;
  hasComposition: boolean;
};

export type SidePanelBastionStats = {
  attack: number;
  defense: number;
  integrity: number;
  attackFromFortifications: number;
  attackFromStrength: number;
};

export type SidePanelModel = {
  resourceRows: SidePanelResourceRow[];
  combatItemRows: SidePanelIdValueRow[];
  toolIds: string[];
  weaponIds: string[];
  clothingIds: string[];
  relicIds: string[];
  mapFragmentCount: number;
  showMapFragmentRow: boolean;
  bookIds: string[];
  fellowshipIds: string[];
  schematicIds: string[];
  blessingIds: string[];
  buildingRows: SidePanelBuildingRow[];
  luck: number;
  strength: number;
  knowledge: number;
  madness: number;
  madnessFromItems: number;
  madnessFromBuildings: number;
  madnessFromEvents: number;
  fortificationRows: SidePanelFortificationRow[];
  bastionStats: SidePanelBastionStats | null;
  bonusRows: SidePanelBonusRow[];
  extraBonusRows: SidePanelBonusRow[];
  estateUnlocked: boolean;
  bastionUnlocked: boolean;
  hasFortress: boolean;
  hasHitResourceLimit: boolean;
  hasResourceAtLimit: boolean;
};

function stringListEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

function trueKeys(record: Record<string, boolean> | undefined): string[] {
  if (!record) return [];
  const ids: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (value === true) ids.push(key);
  }
  return ids;
}

function shouldShowDisplayTool(key: string, state: GameState): boolean {
  if (key === "reinforced_rope" && state.tools.mastermason_chisel) return false;
  if (key === "giant_trap" && state.clothing.black_bear_fur) return false;
  if (key === "occultist_map" && state.relics.occultist_grimoire) return false;
  if (key === "hidden_library_map" && state.relics.stonebinders_codex) {
    return false;
  }
  if (
    key === "mountain_village_map" &&
    state.story?.seen?.mountainVillageExplored
  ) {
    return false;
  }
  return true;
}

function blessingIdsFromState(state: GameState): string[] {
  const blessings = state.blessings || {};
  return Object.entries(blessings)
    .filter(([key, value]) => {
      if (value === true) return true;
      const enhancedKey = `${key}_enhanced`;
      return Boolean(blessings[enhancedKey as keyof typeof blessings]);
    })
    .filter(([key]) => {
      if (key.endsWith("_enhanced")) return true;
      const enhancedKey = `${key}_enhanced`;
      return !blessings[enhancedKey as keyof typeof blessings];
    })
    .map(([key]) => key);
}

function schematicIdsFromState(state: GameState): string[] {
  return Object.entries(state.schematics || {})
    .filter(([key, value]) => {
      if (!value) return false;
      const craftedKey = key.replace("_schematic", "");
      if (craftedKey in state.weapons && state.weapons[craftedKey as keyof typeof state.weapons]) {
        return false;
      }
      if (craftedKey in state.tools && state.tools[craftedKey as keyof typeof state.tools]) {
        return false;
      }
      if (
        craftedKey in state.clothing &&
        state.clothing[craftedKey as keyof typeof state.clothing]
      ) {
        return false;
      }
      if (craftedKey in state.relics && state.relics[craftedKey as keyof typeof state.relics]) {
        return false;
      }
      return true;
    })
    .map(([key]) => key);
}

function formatRateBonus(percent: number, negative = false): string {
  const shown = Number(percent.toFixed(1));
  return negative ? `-${shown}%` : `${shown}%`;
}

/** Serializable side-panel lists. Labels stay in the React layer (i18n). */
export function getSidePanelModel(state: GameState): SidePanelModel {
  const resources = state.resources;
  const buildings = state.buildings;
  const seenResourceKeySet = new Set(getSeenResourceKeys(state));
  const seenResourceKeys = SIDE_PANEL_RESOURCE_ORDER.filter((key) =>
    seenResourceKeySet.has(key),
  );
  const preciousResources = seenResourceKeys.filter((key) =>
    PRECIOUS_RESOURCE_ORDER.includes(
      key as (typeof PRECIOUS_RESOURCE_ORDER)[number],
    ),
  );
  const otherResources = seenResourceKeys.filter(
    (key) =>
      !PRECIOUS_RESOURCE_ORDER.includes(
        key as (typeof PRECIOUS_RESOURCE_ORDER)[number],
      ) && !COMBAT_ITEM_RESOURCES.includes(key as CombatItemResourceKey),
  );
  const orderedPrecious = PRECIOUS_RESOURCE_ORDER.filter((key) =>
    preciousResources.includes(key),
  );

  const assignedJobIds = getAssignedPopulationJobIds(state);
  const productionDeltas = getTotalPopulationEffects(state, assignedJobIds);

  const resourceRows: SidePanelResourceRow[] = [
    ...orderedPrecious.map((key, index) => ({
      id: key,
      value: resources[key as keyof typeof resources] ?? 0,
      productionDelta: productionDeltas[key] ?? 0,
      isPrecious: true,
      hasSpacingAfter:
        index === orderedPrecious.length - 1 && otherResources.length > 0,
      hasFlow: hasResourceProductionBreakdown(state, key),
    })),
    ...otherResources.map((key) => ({
      id: key,
      value: resources[key as keyof typeof resources] ?? 0,
      productionDelta: productionDeltas[key] ?? 0,
      isPrecious: false,
      hasSpacingAfter: false,
      hasFlow: hasResourceProductionBreakdown(state, key),
    })),
  ];

  const combatItemRows = COMBAT_ITEM_RESOURCES.filter((key) =>
    seenResourceKeySet.has(key),
  ).map((key) => ({
    id: key,
    value: resources[key as keyof typeof resources] ?? 0,
  }));

  const displayTools = getDisplayTools(state);
  const weaponKeySet = new Set(Object.keys(state.weapons || {}));
  const toolIds = Object.keys(displayTools).filter(
    (key) => !weaponKeySet.has(key) && shouldShowDisplayTool(key, state),
  );
  const weaponIds = Object.keys(displayTools).filter((key) =>
    weaponKeySet.has(key),
  );

  const mapFragmentCount = getMapFragmentCount(state);

  const relicIds = trueKeys(state.relics).sort((a, b) => {
    if (a === "whispering_cube") return -1;
    if (b === "whispering_cube") return 1;
    return 0;
  });

  const fellowshipIds = trueKeys(state.fellowship).sort((a, b) => {
    const ai = FELLOWSHIP_MEMBER_ORDER.indexOf(a as (typeof FELLOWSHIP_MEMBER_ORDER)[number]);
    const bi = FELLOWSHIP_MEMBER_ORDER.indexOf(b as (typeof FELLOWSHIP_MEMBER_ORDER)[number]);
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
  });

  const buildingRows = SIDE_PANEL_BUILDING_ORDER.filter((key) => {
    if (shouldExcludeFromBuildingsSection(key)) return false;
    if (
      ["bastion", "watchtower", "palisades", "fortifiedMoat"].includes(key)
    ) {
      return false;
    }
    return (buildings[key as keyof typeof buildings] ?? 0) > 0;
  })
    .map((key) => {
      const value = buildings[key as keyof typeof buildings] ?? 0;
      return {
        id: key,
        value,
        showCount:
          key === "woodenHut" || key === "stoneHut" || key === "longhouse",
      };
    })
    .filter((row) => !shouldHideBuilding(row.id, buildings));

  const cachedEffects = state.effects;
  const madnessParts = getMadnessComponents(
    state,
    cachedEffects &&
      ("statBonuses" in cachedEffects || "madness_reduction" in cachedEffects)
      ? (cachedEffects as EffectsForMadnessComponents)
      : undefined,
  );

  const storySeen = state.story?.seen;
  const fortificationRows = FORTIFICATION_KEYS.flatMap((key) => {
    const value = buildings[key] ?? 0;
    if (value === 0) return [];
    return [
      {
        id: key,
        value,
        damaged:
          (key === "watchtower" && !!storySeen?.watchtowerDamaged) ||
          (key === "bastion" && !!storySeen?.bastionDamaged) ||
          (key === "palisades" && !!storySeen?.palisadesDamaged),
      },
    ];
  });

  const bastionStats =
    state.bastion_stats == null
      ? null
      : {
        attack: state.bastion_stats.attack ?? 0,
        defense: state.bastion_stats.defense ?? 0,
        integrity: state.bastion_stats.integrity ?? 0,
        attackFromFortifications:
          state.bastion_stats.attackFromFortifications || 0,
        attackFromStrength: state.bastion_stats.attackFromStrength || 0,
      };

  const bonusRows = getAllActionBonuses(state).map((bonus) => ({
    id: bonus.id,
    displayValue: bonus.displayValue,
    hasComposition: hasBonusComposition(bonus.id, state),
  }));

  const extraBonusRows: SidePanelBonusRow[] = [];
  const craftingCostReduction = getTotalCraftingCostReduction(state);
  if (craftingCostReduction > 0) {
    extraBonusRows.push({
      id: "craftingCostReduction",
      displayValue: formatRateBonus(craftingCostReduction * 100),
      hasComposition: hasBonusComposition("craftingCostReduction", state),
    });
  }
  const buildingCostReduction = getTotalBuildingCostReduction(state);
  if (buildingCostReduction > 0) {
    extraBonusRows.push({
      id: "buildingCostReduction",
      displayValue: formatRateBonus(buildingCostReduction * 100),
      hasComposition: hasBonusComposition("buildingCostReduction", state),
    });
  }
  const buildingTimeReduction = getTotalBuildingTimeReduction(state);
  if (buildingTimeReduction > 0) {
    extraBonusRows.push({
      id: "buildingTimeReduction",
      displayValue: formatRateBonus(buildingTimeReduction * 100, true),
      hasComposition: hasBonusComposition("buildingTimeReduction", state),
    });
  }
  const chainmasterProductionBonus = getChainmasterProductionBonus(state);
  if (chainmasterProductionBonus > 0) {
    extraBonusRows.push({
      id: "villagerProductionBonus",
      displayValue: `${Math.round(chainmasterProductionBonus * 100)}%`,
      hasComposition: hasBonusComposition("villagerProductionBonus", state),
    });
  }
  const doubleGainChance = getDoubleGainChance(state);
  if (doubleGainChance > 0) {
    extraBonusRows.push({
      id: "doubleGainChance",
      displayValue: formatRateBonus(doubleGainChance * 100),
      hasComposition: hasBonusComposition("doubleGainChance", state),
    });
  }

  const limit = getResourceLimit(state);
  const hasResourceAtLimit = SIDE_PANEL_RESOURCE_ORDER.some((key) => {
    const amount = resources[key as keyof typeof resources] ?? 0;
    return isResourceLimited(key, state) && amount >= limit;
  });

  return {
    resourceRows,
    combatItemRows,
    toolIds,
    weaponIds,
    clothingIds: trueKeys(state.clothing),
    relicIds,
    mapFragmentCount,
    showMapFragmentRow:
      mapFragmentCount > 0 && !storySeen?.swampMapAssembled,
    bookIds: trueKeys(state.books),
    fellowshipIds,
    schematicIds: schematicIdsFromState(state),
    blessingIds: blessingIdsFromState(state),
    buildingRows,
    luck: state.stats.luck,
    strength: state.stats.strength,
    knowledge: state.stats.knowledge,
    madness: state.stats.madness,
    madnessFromItems: madnessParts.fromItems,
    madnessFromBuildings: madnessParts.fromBuildings,
    madnessFromEvents: madnessParts.fromEvents,
    fortificationRows,
    bastionStats,
    bonusRows,
    extraBonusRows,
    estateUnlocked: (buildings.darkEstate ?? 0) >= 1,
    bastionUnlocked: state.flags.bastionUnlocked === true,
    hasFortress: state.flags.hasFortress === true,
    hasHitResourceLimit: state.flags.hasHitResourceLimit === true,
    hasResourceAtLimit,
  };
}

function bastionStatsEqual(
  a: SidePanelBastionStats | null,
  b: SidePanelBastionStats | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.attack === b.attack &&
    a.defense === b.defense &&
    a.integrity === b.integrity &&
    a.attackFromFortifications === b.attackFromFortifications &&
    a.attackFromStrength === b.attackFromStrength
  );
}

export function sidePanelModelEqual(
  a: SidePanelModel,
  b: SidePanelModel,
): boolean {
  if (a === b) return true;
  return (
    derivedListEqual(a.resourceRows, b.resourceRows) &&
    derivedListEqual(a.combatItemRows, b.combatItemRows) &&
    stringListEqual(a.toolIds, b.toolIds) &&
    stringListEqual(a.weaponIds, b.weaponIds) &&
    stringListEqual(a.clothingIds, b.clothingIds) &&
    stringListEqual(a.relicIds, b.relicIds) &&
    stringListEqual(a.bookIds, b.bookIds) &&
    stringListEqual(a.fellowshipIds, b.fellowshipIds) &&
    stringListEqual(a.schematicIds, b.schematicIds) &&
    stringListEqual(a.blessingIds, b.blessingIds) &&
    derivedListEqual(a.buildingRows, b.buildingRows) &&
    derivedListEqual(a.fortificationRows, b.fortificationRows) &&
    derivedListEqual(a.bonusRows, b.bonusRows) &&
    derivedListEqual(a.extraBonusRows, b.extraBonusRows) &&
    a.mapFragmentCount === b.mapFragmentCount &&
    a.showMapFragmentRow === b.showMapFragmentRow &&
    a.luck === b.luck &&
    a.strength === b.strength &&
    a.knowledge === b.knowledge &&
    a.madness === b.madness &&
    a.madnessFromItems === b.madnessFromItems &&
    a.madnessFromBuildings === b.madnessFromBuildings &&
    a.madnessFromEvents === b.madnessFromEvents &&
    bastionStatsEqual(a.bastionStats, b.bastionStats) &&
    a.estateUnlocked === b.estateUnlocked &&
    a.bastionUnlocked === b.bastionUnlocked &&
    a.hasFortress === b.hasFortress &&
    a.hasHitResourceLimit === b.hasHitResourceLimit &&
    a.hasResourceAtLimit === b.hasResourceAtLimit
  );
}
