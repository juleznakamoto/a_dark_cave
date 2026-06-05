import { useGameStore } from "@/game/state";
import SidePanelSection from "./SidePanelSection";
import StatEffectsTooltip from "@/components/game/StatEffectsTooltip";
import { ActionInsightBadge } from "@/components/game/ActionInsightBadge";
import { ResourceCoinIcon } from "@/components/ui/resource-coin-icon";
import { ResourceInsightIcon } from "@/components/ui/resource-insight-icon";
import { clothingEffects } from "@/game/rules/effects";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import { capitalizeWords, cn, formatSignedNumber } from "@/lib/utils";
import {
  getActionLabel,
  getEffectName,
  getResourceName,
  getStatName,
  getVillagerJobName,
  tWithFallback,
} from "@/i18n/resolveGameText";
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  type FortificationBuildingKey,
} from "@/game/bastionStats";
import {
  getDisplayTools,
  getTotalLuck,
  getTotalStrength,
  getTotalKnowledge,
  getTotalMadness,
  getMadnessComponents,
  getAllActionBonuses,
  getTotalCraftingCostReduction,
  getTotalBuildingCostReduction,
  getDoubleGainChance,
} from "@/game/rules/effectsCalculation";
import { bookEffects, fellowshipEffects } from "@/game/rules/effects";
import { gameStateSchema, FELLOWSHIP_MEMBER_ORDER, type GameState } from "@shared/schema";
import {
  getStorageLimitText,
  isResourceLimited,
  getResourceLimit,
  COMBAT_ITEM_RESOURCES,
  type CombatItemResourceKey,
} from "@/game/resourceLimits";
import {
  shouldHideBuilding,
  shouldExcludeFromBuildingsSection,
} from "@/game/buildingHierarchy";
import { getTotalPopulationEffects } from "@/game/population";
import { getMapFragmentCount } from "@/game/mapFragments";
import { getSeenResourceKeys } from "@/game/stateHelpers";

function getFortificationDisplayLabel(
  key: FortificationBuildingKey,
  buildings: GameState["buildings"],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (key === "bastion") return t("fortifications.bastion");
  if (key === "fortifiedMoat") return t("fortifications.fortifiedMoat");
  if (key === "chitinPlating") return t("fortifications.chitinPlating");
  if (key === "watchtower") {
    const level = buildings.watchtower ?? 0;
    const levelKeys = [
      "fortifications.watchtower1",
      "fortifications.watchtower2",
      "fortifications.watchtower3",
      "fortifications.watchtower4",
    ] as const;
    return t(levelKeys[level - 1] ?? "fortifications.watchtowerFallback");
  }
  if (key === "palisades") {
    const level = buildings.palisades ?? 0;
    const levelKeys = [
      "fortifications.palisades1",
      "fortifications.palisades2",
      "fortifications.palisades3",
      "fortifications.palisades4",
    ] as const;
    return t(levelKeys[level - 1] ?? "fortifications.palisadesFallback");
  }
  return key;
}

// Extract property order from schema by parsing defaults
const defaultGameState = gameStateSchema.parse({});
const resourceOrder = Object.keys(defaultGameState.resources);
const buildingOrder = Object.keys(defaultGameState.buildings);
const villagerOrder = Object.keys(defaultGameState.villagers);

/** Fortress / Bastion side panel row order (`bastion_stats` object uses defense-first insertion order). */
const BASTION_STAT_SIDE_PANEL_ORDER = ["attack", "defense", "integrity"] as const;

const BASTION_STAT_SIDE_PANEL_ICONS: Record<
  (typeof BASTION_STAT_SIDE_PANEL_ORDER)[number],
  string
> = {
  attack: "⟐",
  defense: "⧈",
  integrity: "✚",
};

const BASTION_STAT_SIDE_PANEL_ICON_COLORS: Record<
  (typeof BASTION_STAT_SIDE_PANEL_ORDER)[number],
  string
> = {
  attack: "text-red-400/60",
  defense: "text-blue-400/60",
  integrity: "text-green-400/60",
};

export default function SidePanel() {
  const { t } = useTranslation("ui");
  const {
    resources,
    buildings,
    villagers,
    expeditionVillagers,
    current_population,
    total_population,
    activeTab,
    bastion_stats, // Added bastion_stats
    story,
    flags,
  } = useGameStore();

  // Track resource changes for notifications with a max size limit
  const [resourceChanges, setResourceChanges] = useState<
    Array<{ resource: string; amount: number; timestamp: number }>
  >([]);
  const resourceChangeEvents = useGameStore(
    (state) => state.resourceChangeEvents ?? [],
  );
  const consumedResourceChangeEventIdsRef = useRef<Set<string>>(new Set());

  // Clean up old resource changes periodically
  useEffect(() => {
    if (resourceChanges.length === 0) return;

    const cleanupTimer = setTimeout(() => {
      const now = Date.now();
      setResourceChanges((prev) =>
        prev.filter((change) => now - change.timestamp < 2000),
      );
    }, 2000);

    return () => clearTimeout(cleanupTimer);
  }, [resourceChanges]);

  useEffect(() => {
    const newEvents = resourceChangeEvents.filter((event) => {
      if (consumedResourceChangeEventIdsRef.current.has(event.id)) {
        return false;
      }
      consumedResourceChangeEventIdsRef.current.add(event.id);
      return true;
    });

    if (newEvents.length === 0) return;

    setResourceChanges((prev) =>
      [
        ...prev,
        ...newEvents.map(({ resource, amount, timestamp }) => ({
          resource,
          amount,
          timestamp,
        })),
      ].slice(-50),
    );
  }, [resourceChangeEvents]);

  // Get game state once for the entire component (needed early for stat calculations)
  const gameState = useGameStore();
  const gameStateTyped = gameState as unknown as GameState;

  // Calculate total stats including bonuses from relics/clothing
  const totalLuck = getTotalLuck(gameState);
  const totalStrength = getTotalStrength(gameState);
  const totalKnowledge = getTotalKnowledge(gameState);
  const totalMadness = getTotalMadness(gameState);

  // Show resource if it has ever been > 0, even if currently 0 (persisted in game state)
  const seenResourceKeySet = new Set(getSeenResourceKeys(gameStateTyped));
  const seenResourceKeys = resourceOrder.filter((key) =>
    seenResourceKeySet.has(key),
  );

  const PRECIOUS_RESOURCE_ORDER = ["gold", "silver", "insight"] as const;
  const preciousResources = seenResourceKeys.filter((key) =>
    PRECIOUS_RESOURCE_ORDER.includes(key as (typeof PRECIOUS_RESOURCE_ORDER)[number]),
  );
  const otherResources = seenResourceKeys.filter(
    (key) =>
      !PRECIOUS_RESOURCE_ORDER.includes(key as (typeof PRECIOUS_RESOURCE_ORDER)[number]) &&
      !COMBAT_ITEM_RESOURCES.includes(key as CombatItemResourceKey),
  );

  const orderedPrecious = PRECIOUS_RESOURCE_ORDER.filter((key) =>
    preciousResources.includes(key),
  );

  // Net production per resource (for sidepanel delta column)
  const productionDeltas: Record<string, number> =
    getTotalPopulationEffects(
      gameState,
      Object.keys(gameState.villagers).filter(
        (id) => (gameState.villagers[id as keyof typeof gameState.villagers] ?? 0) > 0,
      ),
    );

  // Create resource items with special styling for gold and silver
  const resourceItems = [
    ...orderedPrecious.map((key, index) => ({
      id: key,
      label: (
        <span className="inline-flex items-center gap-1">
          {key === "insight" ? (
            <ResourceInsightIcon
              className={cn("shrink-0", "text-blue-600")}
            />
          ) : (
            <ResourceCoinIcon
              resource={key as "gold" | "silver"}
              className={cn(
                "shrink-0",
                key === "gold" ? "text-yellow-600" : "text-gray-400",
              )}
            />
          )}
          <span>{getResourceName(key, capitalizeWords(key))}</span>
        </span>
      ),
      value: resources[key as keyof typeof resources] ?? 0,
      productionDelta: productionDeltas[key] ?? undefined,
      testId: `resource-${key}`,
      visible: true,
      isPrecious: true,
      hasSpacingAfter:
        index === orderedPrecious.length - 1 && otherResources.length > 0,
    })),
    // Other resources
    ...otherResources.map((key) => ({
      id: key,
      label: getResourceName(key, capitalizeWords(key)),
      value: resources[key as keyof typeof resources] ?? 0,
      productionDelta: productionDeltas[key] ?? undefined,
      testId: `resource-${key}`,
      visible: true,
    })),
  ];

  // Dynamically generate tool items from state (only show best tools, no weapons)
  const displayTools = getDisplayTools(gameState);

  // Filter out weapons from tools display and used special items
  const toolItems = Object.entries(displayTools)
    .filter(([key, value]) => {
      // Filter out weapons
      if (Object.keys(gameState.weapons).includes(key)) return false;

      // Filter out reinforced_rope after low chamber is explored
      if (key === "reinforced_rope" && gameState.tools.mastermason_chisel) {
        return false;
      }

      // Filter out giant_trap after laying trap
      if (key === "giant_trap" && gameState.clothing.black_bear_fur) {
        return false;
      }

      // Filter out occultist_map after exploring occultist chamber
      if (key === "occultist_map" && gameState.relics.occultist_grimoire) {
        return false;
      }

      // Filter out hidden_library_map after exploring hidden library
      if (key === "hidden_library_map" && gameState.relics.stonebinders_codex) {
        return false;
      }

      return true;
    })
    .map(([key, value]) => ({
      id: key,
      label: getEffectName("tools", key, capitalizeWords(key)),
      value: 1,
      testId: `tool-${key}`,
      visible: true,
      tooltip: true,
    }));

  // Dynamically generate weapon items from state (only show weapons from displayTools)
  const weaponItemsFromTools = Object.entries(displayTools)
    .filter(([key, value]) => Object.keys(gameState.weapons).includes(key))
    .map(([key, value]) => ({
      id: key,
      label: getEffectName("weapons", key, capitalizeWords(key)),
      value: 1,
      testId: `weapon-${key}`,
      visible: true,
      tooltip: true,
    }));

  // Combat Items section (bombs + consumables stored in resources)
  const combatItemRows = COMBAT_ITEM_RESOURCES.filter((key) =>
    seenResourceKeySet.has(key),
  ).map((key) => {
    const value = resources[key as keyof typeof resources] ?? 0;
    const label = getResourceName(key, capitalizeWords(key));
    return {
      id: key,
      label,
      value,
      testId: `combat-${key}`,
      visible: true,
      tooltip: true,
    };
  });

  const weaponItems = weaponItemsFromTools;

  // Check if any resource has hit the limit
  const limit = getResourceLimit(gameState);
  const hasResourceAtLimit = resourceOrder.some((key) => {
    const resource = resources[key as keyof typeof resources];
    return isResourceLimited(key, gameState) && resource >= limit;
  });

  // Set the flag if we detect a resource at limit and flag isn't set yet
  useEffect(() => {
    if (hasResourceAtLimit && !gameState.flags.hasHitResourceLimit) {
      useGameStore.getState().setFlag("hasHitResourceLimit", true);
    }
  }, [hasResourceAtLimit, gameState.flags.hasHitResourceLimit]);

  const showResourceLimit =
    resourceOrder.some((key) => isResourceLimited(key, gameState)) &&
    gameState.flags.hasHitResourceLimit;
  const resourceLimitText = getStorageLimitText(gameState); // Get the storage limit text

  // Dynamically generate tool items from state (only show best tools, no weapons)

  // Dynamically generate clothing items from state
  const clothingItems = Object.entries(gameState.clothing || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: getEffectName(
        "clothing",
        key,
        clothingEffects[key]?.name || capitalizeWords(key),
      ),
      value: 1,
      testId: `clothing-${key}`,
      visible: true,
      tooltip: true,
    }));

  // Dynamically generate relic items from state (whispering_cube always first)
  const mapFragmentCount = getMapFragmentCount(gameState as GameState);
  const showMapFragmentRow =
    mapFragmentCount > 0 && !gameState.story?.seen?.swampMapAssembled;

  const relicItems = Object.entries(gameState.relics || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: getEffectName(
        "clothing",
        key,
        clothingEffects[key]?.name || capitalizeWords(key),
      ),
      value: 1,
      testId: `relic-${key}`,
      visible: true,
      tooltip: true,
    }))
    .sort((a, b) => {
      if (a.id === "whispering_cube") return -1;
      if (b.id === "whispering_cube") return 1;
      return 0;
    });

  if (showMapFragmentRow) {
    const mapRow = {
      id: "map_fragment",
      label: t("sidePanel.mapFragments"),
      value: mapFragmentCount,
      testId: "relic-map_fragment",
      visible: true,
      tooltip: true,
    };
    const insertAt = relicItems[0]?.id === "whispering_cube" ? 1 : 0;
    relicItems.splice(insertAt, 0, mapRow);
  }

  // Dynamically generate book items from state
  const bookItems = Object.entries(gameState.books || {})
    .filter(([key, value]) => value === true)
    .map(([key, value]) => ({
      id: key,
      label: getEffectName(
        "books",
        key,
        bookEffects[key]?.name || capitalizeWords(key),
      ),
      value: 1,
      testId: `book-${key}`,
      visible: true,
      tooltip: true, // Tooltip will be generated in itemTooltips.tsx
    }));

  // Dynamically generate fellowship items from state, sorted by schema-defined order
  const fellowshipItems = Object.entries(gameState.fellowship || {})
    .filter(([key, value]) => value === true)
    .sort(([a], [b]) => {
      const ai = FELLOWSHIP_MEMBER_ORDER.indexOf(a as any);
      const bi = FELLOWSHIP_MEMBER_ORDER.indexOf(b as any);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    })
    .map(([key]) => ({
      id: key,
      label: getEffectName(
        "fellowship",
        key,
        fellowshipEffects[key]?.name || capitalizeWords(key),
      ),
      value: 1,
      testId: `fellowship-${key}`,
      visible: true,
      tooltip: true, // Tooltip will be generated in itemTooltips.tsx
    }));

  // Dynamically generate schematic items from state
  const schematicItems = Object.entries(gameState.schematics || {})
    .filter(([key, value]) => {
      if (!value) return false;

      // Hide schematic if item is crafted
      const k = key.replace("_schematic", "");

      if (
        (k in gameState.weapons &&
          gameState.weapons[k as keyof typeof gameState.weapons]) ||
        (k in gameState.tools &&
          gameState.tools[k as keyof typeof gameState.tools]) ||
        (k in gameState.clothing &&
          gameState.clothing[k as keyof typeof gameState.clothing]) ||
        (k in gameState.relics &&
          gameState.relics[k as keyof typeof gameState.relics])
      ) {
        return false;
      }

      return true;
    })
    .map(([key, value]) => ({
      id: key,
      label: getEffectName(
        "clothing",
        key,
        clothingEffects[key]?.name || capitalizeWords(key.replace("_schematic", "")),
      ),
      value: 1,
      testId: `schematic-${key}`,
      visible: true,
      tooltip: true,
    }));

  // Dynamically generate blessing items from state
  const blessingItems = Object.entries(gameState.blessings || {})
    .filter(([key, value]) => {
      // Show blessing if it's true OR if its enhanced version is true
      if (value === true) return true;

      // Check if this is a base blessing with an enhanced version
      const enhancedKey = `${key}_enhanced`;
      if (
        gameState.blessings[enhancedKey as keyof typeof gameState.blessings]
      ) {
        return true;
      }

      return false;
    })
    .filter(([key]) => {
      // Don't show base blessing if enhanced version exists and is active
      if (key.endsWith("_enhanced")) return true;

      const enhancedKey = `${key}_enhanced`;
      if (
        gameState.blessings[enhancedKey as keyof typeof gameState.blessings]
      ) {
        return false; // Hide base version, show enhanced instead
      }

      return true;
    })
    .map(([key, value]) => ({
      id: key,
      label: getEffectName(
        "clothing",
        key,
        clothingEffects[key]?.name || capitalizeWords(key),
      ),
      value: 1,
      testId: `blessing-${key}`,
      visible: true,
      tooltip: true,
    }));

  // Dynamically generate building items from state (in schema order)
  const buildingItems = buildingOrder
    .filter((key) => {
      if (shouldExcludeFromBuildingsSection(key)) {
        return false;
      }
      // Filter out fortification buildings from the buildings section
      if (
        ["bastion", "watchtower", "palisades", "fortifiedMoat"].includes(key)
      ) {
        return false;
      }
      return (buildings[key as keyof typeof buildings] ?? 0) > 0;
    })
    .map((key) => {
      const value = buildings[key as keyof typeof buildings];
      // Get the action definition to access the label
      const actionId = `build${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const buildAction = villageBuildActions[actionId];

      // Use the label from villageBuildActions, with special handling for multiple huts
      let label = getActionLabel(
        actionId,
        buildAction?.label || capitalizeWords(key),
      );
      const showCount =
        key === "woodenHut" || key === "stoneHut" || key === "longhouse";

      return {
        id: key,
        label: showCount ? (
          <>
            {label} <span className="text-muted-foreground">({value})</span>
          </>
        ) : (
          label
        ),
        value: value ?? 0,
        testId: `building-${key}`,
        visible: (value ?? 0) > 0,
        tooltip: true, // Tooltip will be generated in itemTooltips.tsx
      };
    })
    .filter((item) => item !== null) // Remove nulls from buildings not present
    .filter((item) => {
      // Hide buildings that are superseded by higher-tier versions or have specific conditions
      if (shouldHideBuilding(item.id, buildings)) {
        return false;
      }
      return true;
    });

  // Dynamically generate villager items from state (in schema order)
  const populationItems = villagerOrder
    .filter((key) => (villagers[key as keyof typeof villagers] ?? 0) > 0)
    .map((key) => ({
      id: key,
      label: getVillagerJobName(key, capitalizeWords(key)),
      value: villagers[key as keyof typeof villagers] ?? 0,
      testId: `population-${key}`,
      visible: true,
    }));

  const onExpeditionCount = Object.values(expeditionVillagers || {}).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  if (onExpeditionCount > 0) {
    const expeditionItem = {
      id: "on_expedition",
      label: t("sidePanel.onExpedition"),
      value: onExpeditionCount,
      testId: "population-on-expedition",
      visible: true,
    };

    const freeVillagerIndex = populationItems.findIndex((item) => item.id === "free");
    if (freeVillagerIndex >= 0) {
      populationItems.splice(freeVillagerIndex + 1, 0, expeditionItem);
    } else {
      populationItems.unshift(expeditionItem);
    }
  }

  // Build stats items with total values
  const statsItems = [];
  statsItems.push({
    id: "luck",
    label: getStatName("luck", "Luck"),
    value: totalLuck,
    testId: "stat-luck",
    visible: true,
    icon: "☆",
    iconColor: "text-green-300/80",
    tooltip: (
      <>
        <span className="text-gray-400">{t("sidePanel.statLuckTooltip")}</span>
        <StatEffectsTooltip statKey="luck" />
      </>
    ),
  });

  statsItems.push({
    id: "strength",
    label: getStatName("strength", "Strength"),
    value: totalStrength,
    testId: "stat-strength",
    visible: true,
    icon: "⬡",
    iconColor: "text-red-300/80",
    tooltip: (
      <>
        <span className="text-gray-400">{t("sidePanel.statStrengthTooltip")}</span>
        <StatEffectsTooltip statKey="strength" />
      </>
    ),
  });

  statsItems.push({
    id: "knowledge",
    label: getStatName("knowledge", "Knowledge"),
    value: totalKnowledge,
    testId: "stat-knowledge",
    visible: true,
    icon: "✧",
    iconColor: "text-blue-300/80",
    tooltip: (
      <>
        <span className="text-gray-400">{t("sidePanel.statKnowledgeTooltip")}</span>
        <StatEffectsTooltip statKey="knowledge" />
      </>
    ),
  });

  const { fromItems, fromBuildings, fromEvents } =
    getMadnessComponents(gameState);
  const showMadnessBreakdown =
    fromItems !== 0 ||
    fromBuildings !== 0 ||
    fromEvents !== 0;
  const madnessTooltipContent = (
    <>
      <div className="text-gray-400">{t("sidePanel.statMadnessTooltip")}</div>
      {showMadnessBreakdown && (
        <div>
          <div>
            {t("sidePanel.madnessFromItems", {
              value: formatSignedNumber(fromItems),
            })}
          </div>
          <div>
            {t("sidePanel.madnessFromBuildings", {
              value: formatSignedNumber(fromBuildings),
            })}
          </div>
          <div>
            {t("sidePanel.madnessFromEvents", {
              value: formatSignedNumber(fromEvents),
            })}
          </div>
        </div>
      )}
      <StatEffectsTooltip statKey="madness" />
    </>
  );

  statsItems.push({
    id: "madness",
    label: getStatName("madness", "Madness"),
    value: totalMadness,
    testId: "stat-madness",
    visible: true,
    icon: "✺",
    iconColor: "text-violet-300/80",
    tooltip: madnessTooltipContent,
  });

  // Dynamically generate fortification items from state
  const fortificationItems = Object.entries(buildings)
    .map(([key, value]) => {
      // Only include fortification buildings
      if (
        ![
          "bastion",
          "watchtower",
          "palisades",
          "fortifiedMoat",
          "chitinPlating",
        ].includes(key)
      ) {
        return null;
      }

      if ((value ?? 0) === 0) return null;

      const fk = key as FortificationBuildingKey;
      let label = getFortificationDisplayLabel(fk, buildings, t);

      const isDamaged =
        (key === "watchtower" && story?.seen?.watchtowerDamaged) ||
        (key === "bastion" && story?.seen?.bastionDamaged) ||
        (key === "palisades" && story?.seen?.palisadesDamaged);

      if (isDamaged) {
        label += " ↓";
      }

      return {
        id: key,
        label,
        value: value ?? 0,
        testId: `fortification-${key}`,
        visible: (value ?? 0) > 0,
      };
    })
    .filter((item) => item !== null); // Remove nulls from buildings not present

  // Dynamically generate bastion stats items from state (fixed display order).
  const bastionStatsItems =
    bastion_stats == null
      ? []
      : BASTION_STAT_SIDE_PANEL_ORDER.map((key) => {
        const value = bastion_stats[key] ?? 0;
        let tooltip = undefined;

        if (key === "defense") {
          tooltip = (
            <span className="text-gray-400">
              {t("sidePanel.bastionDefenseTooltip")}
            </span>
          );
        }

        if (key === "integrity") {
          tooltip = (
            <span className="text-gray-400">
              {t("sidePanel.bastionIntegrityTooltip")}
            </span>
          );
        }

        if (key === "attack") {
          const fortAttack = bastion_stats.attackFromFortifications || 0;
          const strengthAttack = bastion_stats.attackFromStrength || 0;
          tooltip = (
            <div>
              <div className="mb-1 text-gray-400">
                {t("sidePanel.bastionAttackTooltip")}
              </div>
              <div>
                {t("sidePanel.bastionAttackFromFortifications", {
                  value: fortAttack,
                })}
              </div>
              <div>
                {t("sidePanel.bastionAttackFromStrength", {
                  value: strengthAttack,
                })}
              </div>
            </div>
          );
        }

        return {
          id: `bastion-${key}`,
          label: getStatName(key, capitalizeWords(key)),
          icon: BASTION_STAT_SIDE_PANEL_ICONS[key],
          iconColor: BASTION_STAT_SIDE_PANEL_ICON_COLORS[key],
          value,
          testId: `bastion-stat-${key}`,
          visible: true,
          tooltip,
        };
      });

  // Use SSOT for bonus calculations
  const bonusItems = getAllActionBonuses(gameState).map((bonus) => ({
    id: bonus.id,
    label: bonus.label,
    value: bonus.displayValue,
    testId: `bonus-${bonus.id}`,
    visible: true,
  }));

  // Add crafting cost reduction if present
  const craftingCostReduction = getTotalCraftingCostReduction(gameState);
  if (craftingCostReduction > 0) {
    bonusItems.push({
      id: "craftingCostReduction",
      label: t("sidePanel.craftDiscount"),
      value: `${Number((craftingCostReduction * 100).toFixed(1))}%`,
      testId: "bonus-crafting-cost-reduction",
      visible: true,
    });
  }

  // Add building cost reduction if present
  const buildingCostReduction = getTotalBuildingCostReduction(gameState);
  if (buildingCostReduction > 0) {
    bonusItems.push({
      id: "buildingCostReduction",
      label: t("sidePanel.buildDiscount"),
      value: `${Number((buildingCostReduction * 100).toFixed(1))}%`,
      testId: "bonus-building-cost-reduction",
      visible: true,
    });
  }

  const doubleGainChance = getDoubleGainChance(gameState);
  if (doubleGainChance > 0) {
    bonusItems.push({
      id: "doubleGainChance",
      label: t("sidePanel.doubleGainChance"),
      value: `${Number((doubleGainChance * 100).toFixed(1))}%`,
      testId: "bonus-double-gain-chance",
      visible: true,
    });
  }

  // Check if estate is unlocked
  const estateUnlocked = gameState.buildings.darkEstate >= 1;

  const anyPlayerStatPositive =
    totalLuck > 0 ||
    totalStrength > 0 ||
    totalKnowledge > 0 ||
    totalMadness > 0;

  const statsHeaderTooltipFallback =
    "Stats influence the outcome of events and grant specific effects that reveal as you progress.";
  const statsHeaderTooltipRaw = tWithFallback(
    "ui",
    "sidePanel.statsTooltip",
    statsHeaderTooltipFallback,
  );
  const statsHeaderTooltip =
    statsHeaderTooltipRaw === "sidePanel.statsTooltip" ||
      statsHeaderTooltipRaw === "ui:sidePanel.statsTooltip"
      ? statsHeaderTooltipFallback
      : statsHeaderTooltipRaw;

  // Determine which sections to show based on active tab
  const shouldShowSection = (sectionName: string): boolean => {
    switch (activeTab) {
      case "cave": {
        const caveSections = [
          "resources",
          "tools",
          "weapons",
          "clothing",
          "schematics",
        ];
        if (!flags.bastionUnlocked) caveSections.push("combatItems");
        if (!estateUnlocked) caveSections.push("stats");
        return caveSections.includes(sectionName);
      }
      case "village":
        return ["resources", "buildings", "population"].includes(sectionName);
      case "forest":
        return ["resources", "relics", "blessings", "bonuses"].includes(
          sectionName,
        );
      case "estate":
        return ["resources", "books", "fellowship", "stats"].includes(
          sectionName,
        );
      case "bastion":
        return ["resources", "bastion", "combatItems", "fortifications"].includes(
          sectionName,
        );
      case "achievements":
        return ["resources"].includes(sectionName);
      case "timedevent":
        return ["resources"].includes(sectionName);
      default:
        return true; // Show all sections by default
    }
  };

  return (
    <ScrollArea className="h-full max-h-[36vh] md:max-h-full px-3 pt-2 pb-1.5 pl-1 pr-2">
      <div className="pb-1 flex gap-1 md:gap-1.5 items-start min-w-0">
        {/* First column - Resources */}
        <div className="w-fit shrink-0 flex-none">
          {resourceItems.length > 0 && shouldShowSection("resources") && (
            <SidePanelSection
              className="pt-0"
              sectionId="resources"
              title={
                showResourceLimit ? (
                  <>
                    <span className="font-medium">{t("sidePanel.resources")}</span>
                    <span className="font-normal text-[10px] text-muted-foreground">
                      {" "}
                      {t("sidePanel.resourceLimitMax", {
                        limit: resourceLimitText,
                      })}
                    </span>
                  </>
                ) : (
                  t("sidePanel.resources")
                )
              }
              activeTab={activeTab}
              titleTooltip={
                showResourceLimit
                  ? t("sidePanel.resourceLimitTooltip")
                  : undefined
              }
              items={resourceItems}
              onValueChange={(itemId, oldValue, newValue) => {
                logger.log(
                  `Resource ${itemId} increased from ${oldValue} to ${newValue}`,
                );
              }}
              resourceChanges={resourceChanges}
              showNotifications
              onResourceChange={(change) => {
                setResourceChanges((prev) => {
                  const updated = [...prev, change];
                  return updated.slice(-50);
                });
              }}
              forceNotifications
            />
          )}
        </div>

        {/* Second column - Everything else */}
        <div className="min-w-[10rem] flex-[2] basis-0">
          {toolItems.length > 0 && shouldShowSection("tools") && (
            <SidePanelSection className="pt-0" sectionId="tools" title={t("sidePanel.tools")} items={toolItems} />
          )}
          {weaponItems.length > 0 && shouldShowSection("weapons") && (
            <SidePanelSection sectionId="weapons" title={t("sidePanel.weapons")} items={weaponItems} />
          )}
          {combatItemRows.length > 0 && shouldShowSection("combatItems") && (
            <SidePanelSection sectionId="combatItems" title={t("sidePanel.combatItems")} items={combatItemRows} />
          )}
          {bastionStatsItems.length > 0 && shouldShowSection("bastion") && (
            <SidePanelSection
              sectionId="bastion"
              title={
                flags.hasFortress
                  ? t("sidePanel.fortress")
                  : t("sidePanel.bastion")
              }
              items={bastionStatsItems}
            />
          )}
          {fortificationItems.length > 0 &&
            shouldShowSection("fortifications") && (
              <SidePanelSection
                sectionId="fortifications"
                title={t("sidePanel.fortifications")}
                items={fortificationItems}
              />
            )}
          {clothingItems.length > 0 && shouldShowSection("clothing") && (
            <SidePanelSection sectionId="clothing" title={t("sidePanel.clothing")} items={clothingItems} />
          )}
          {relicItems.length > 0 && shouldShowSection("relics") && (
            <SidePanelSection sectionId="relics" title={t("sidePanel.relics")} items={relicItems} />
          )}
          {schematicItems.length > 0 && shouldShowSection("schematics") && (
            <SidePanelSection sectionId="schematics" title={t("sidePanel.schematics")} items={schematicItems} />
          )}
          {blessingItems.length > 0 && shouldShowSection("blessings") && (
            <SidePanelSection sectionId="blessings" title={t("sidePanel.blessings")} items={blessingItems} />
          )}
          {buildingItems.length > 0 && shouldShowSection("buildings") && (
            <SidePanelSection sectionId="buildings" title={t("sidePanel.buildings")} items={buildingItems} />
          )}
          {populationItems.length > 0 && shouldShowSection("population") && (
            <SidePanelSection
              sectionId="population"
              title={
                <>
                  {t("sidePanel.population")}{" "}
                  <span className="text-muted-foreground font-normal">
                    {current_population}/{total_population}
                  </span>
                </>
              }
              items={populationItems}
              titleTooltip={t("sidePanel.populationTooltip")}
            />
          )}
          {anyPlayerStatPositive && shouldShowSection("stats") && (
            <SidePanelSection
              sectionId="stats"
              title={t("sidePanel.stats")}
              titleTooltip={statsHeaderTooltip}
              titleExtra={<ActionInsightBadge target="stats" />}
              items={statsItems}
            />
          )}
          {bonusItems.length > 0 && shouldShowSection("bonuses") && (
            <SidePanelSection sectionId="bonuses" title={t("sidePanel.bonuses")} items={bonusItems} />
          )}
          {bookItems.length > 0 && shouldShowSection("books") && (
            <SidePanelSection sectionId="books" title={t("sidePanel.books")} items={bookItems} />
          )}
          {fellowshipItems.length > 0 && shouldShowSection("fellowship") && (
            <SidePanelSection sectionId="fellowship" title={t("sidePanel.fellowship")} items={fellowshipItems} />
          )}
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
