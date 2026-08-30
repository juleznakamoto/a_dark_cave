import { useGameStore } from "@/game/state";
import {
  useDerivedGameState,
  useGameStoreWithoutTickClock,
} from "@/game/useGameStoreWithoutTickClock";
import SidePanelSection, {
  clearSidePanelActiveTooltipHover,
  SIDE_PANEL_GRID_CLASS,
  SIDE_PANEL_SECTION_SPACING_CLASS,
} from "./SidePanelSection";
import StatEffectsTooltip from "@/components/game/StatEffectsTooltip";
import BonusCompositionTooltip from "@/components/game/BonusCompositionTooltip";
import ResourceFlowTooltip from "@/components/game/ResourceFlowTooltip";
import { ActionTooltipSeparator } from "@/game/rules/actionTooltipLayout";
import { ResourceCoinIcon } from "@/components/ui/resource-coin-icon";
import { ResourceInsightIcon } from "@/components/ui/resource-insight-icon";
import { clothingEffects } from "@/game/rules/effects";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import { capitalizeWords, cn, formatSignedNumber } from "@/lib/utils";
import {
  getActionLabel,
  getBonusSidebarLabel,
  getEffectName,
  getResourceName,
  getStatName,
} from "@/i18n/resolveGameText";
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { type FortificationBuildingKey } from "@/game/bastionStats";
import { bookEffects, fellowshipEffects } from "@/game/rules/effects";
import {
  getSidePanelModel,
  sidePanelModelEqual,
  type SidePanelBonusRow,
} from "@/game/sidePanelModel";
import {
  appendRedactedItems,
  DEMO_END_BASTION_STAT_IDS,
  DEMO_END_BLESSING_IDS,
  DEMO_END_BOOK_IDS,
  DEMO_END_CLOTHING_IDS,
  DEMO_END_COMBAT_ITEM_IDS,
  DEMO_END_EXTRA_BONUS_IDS,
  DEMO_END_FELLOWSHIP_IDS,
  DEMO_END_FORTIFICATION_IDS,
  DEMO_END_RELIC_IDS,
  DEMO_END_RESOURCE_IDS,
  DEMO_END_STAT_IDS,
  DEMO_END_WEAPON_IDS,
  getDemoEndBuildingCatalogIds,
  getDemoEndSchematicCatalogIds,
  getDemoEndToolCatalogIds,
} from "@/game/demoEndCatalog";
import { useDemoEndCatalogActive } from "@/hooks/useSteamEditionActive";
import type { GameState } from "@shared/schema";

function getFortificationDisplayLabel(
  key: FortificationBuildingKey,
  level: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (key === "bastion") return t("fortifications.bastion");
  if (key === "fortifiedMoat") return t("fortifications.fortifiedMoat");
  if (key === "chitinPlating") return t("fortifications.chitinPlating");
  if (key === "watchtower") {
    const levelKeys = [
      "fortifications.watchtower1",
      "fortifications.watchtower2",
      "fortifications.watchtower3",
      "fortifications.watchtower4",
    ] as const;
    return t(levelKeys[level - 1] ?? "fortifications.watchtowerFallback");
  }
  if (key === "palisades") {
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

const BASTION_STAT_SIDE_PANEL_ORDER = [
  "attack",
  "defense",
  "integrity",
] as const;

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

const EXTRA_BONUS_LABEL_KEYS: Record<string, string> = {
  craftingCostReduction: "sidePanel.craftDiscount",
  buildingCostReduction: "sidePanel.buildDiscount",
  buildingTimeReduction: "sidePanel.constructionTime",
  villagerProductionBonus: "sidePanel.productionBonus",
  doubleGainChance: "sidePanel.doubleGainChance",
};

function bonusTooltip(row: SidePanelBonusRow) {
  return row.hasComposition ? (
    <BonusCompositionTooltip bonusId={row.id} />
  ) : undefined;
}

export default function SidePanel() {
  const { t } = useTranslation("ui");
  const model = useDerivedGameState(getSidePanelModel, sidePanelModelEqual);
  const activeTab = useGameStore((s) => s.activeTab);
  const catalogActive = useDemoEndCatalogActive();
  const catalogState = useGameStoreWithoutTickClock() as unknown as GameState;

  const [resourceChanges, setResourceChanges] = useState<
    Array<{ resource: string; amount: number; timestamp: number }>
  >([]);
  const resourceChangeEvents = useGameStore(
    (state) => state.resourceChangeEvents ?? [],
  );
  const consumedResourceChangeEventIdsRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    if (model.hasResourceAtLimit && !model.hasHitResourceLimit) {
      useGameStore.getState().setFlag("hasHitResourceLimit", true);
    }
  }, [model.hasResourceAtLimit, model.hasHitResourceLimit]);

  const resourceItems = model.resourceRows.map((row) => ({
    id: row.id,
    label: row.isPrecious ? (
      <span className="inline-flex items-center gap-1">
        {row.id === "insight" ? (
          <ResourceInsightIcon className={cn("shrink-0", "text-blue-600")} />
        ) : (
          <ResourceCoinIcon
            resource={row.id as "gold" | "silver"}
            className={cn(
              "shrink-0",
              row.id === "gold" ? "text-yellow-600" : "text-gray-400",
            )}
          />
        )}
        <span>{getResourceName(row.id, capitalizeWords(row.id))}</span>
      </span>
    ) : (
      getResourceName(row.id, capitalizeWords(row.id))
    ),
    value: row.value,
    productionDelta:
      row.productionDelta === 0 ? undefined : row.productionDelta,
    tooltip: row.hasFlow ? (
      <ResourceFlowTooltip resourceId={row.id} />
    ) : undefined,
    testId: `resource-${row.id}`,
    visible: true,
    isPrecious: row.isPrecious,
    hasSpacingAfter: row.hasSpacingAfter,
  }));

  const toolItems = model.toolIds.map((key) => ({
    id: key,
    label: getEffectName("tools", key, capitalizeWords(key)),
    value: 1,
    testId: `tool-${key}`,
    visible: true,
    tooltip: true,
  }));

  const weaponItems = model.weaponIds.map((key) => ({
    id: key,
    label: getEffectName("weapons", key, capitalizeWords(key)),
    value: 1,
    testId: `weapon-${key}`,
    visible: true,
    tooltip: true,
  }));

  const combatItemRows = model.combatItemRows.map((row) => ({
    id: row.id,
    label: getResourceName(row.id, capitalizeWords(row.id)),
    value: row.value,
    testId: `combat-${row.id}`,
    visible: true,
    tooltip: true,
  }));

  const clothingItems = model.clothingIds.map((key) => ({
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

  const relicItems = model.relicIds.map((key) => ({
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
  }));

  if (model.showMapFragmentRow) {
    const mapRow = {
      id: "map_fragment",
      label: t("sidePanel.mapFragments"),
      value: model.mapFragmentCount,
      testId: "relic-map_fragment",
      visible: true,
      tooltip: true,
    };
    const insertAt = relicItems[0]?.id === "whispering_cube" ? 1 : 0;
    relicItems.splice(insertAt, 0, mapRow);
  }

  const bookItems = model.bookIds.map((key) => ({
    id: key,
    label: getEffectName(
      "books",
      key,
      bookEffects[key]?.name || capitalizeWords(key),
    ),
    value: 1,
    testId: `book-${key}`,
    visible: true,
    tooltip: true,
  }));

  const fellowshipItems = model.fellowshipIds.map((key) => ({
    id: key,
    label: getEffectName(
      "fellowship",
      key,
      fellowshipEffects[key]?.name || capitalizeWords(key),
    ),
    value: 1,
    testId: `fellowship-${key}`,
    visible: true,
    tooltip: true,
  }));

  const schematicItems = model.schematicIds.map((key) => ({
    id: key,
    label: getEffectName(
      "clothing",
      key,
      clothingEffects[key]?.name ||
      capitalizeWords(key.replace("_schematic", "")),
    ),
    value: 1,
    testId: `schematic-${key}`,
    visible: true,
    tooltip: true,
  }));

  const blessingItems = model.blessingIds.map((key) => ({
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

  const buildingItems = model.buildingRows.map((row) => {
    const actionId = `build${row.id.charAt(0).toUpperCase() + row.id.slice(1)}`;
    const buildAction = villageBuildActions[actionId];
    const label = getActionLabel(
      actionId,
      buildAction?.label || capitalizeWords(row.id),
    );
    return {
      id: row.id,
      label: row.showCount ? (
        <>
          {label} <span className="text-muted-foreground">({row.value})</span>
        </>
      ) : (
        label
      ),
      value: row.value,
      testId: `building-${row.id}`,
      visible: row.value > 0,
      tooltip: true,
    };
  });

  const showMadnessBreakdown =
    model.madnessFromItems !== 0 ||
    model.madnessFromBuildings !== 0 ||
    model.madnessFromEvents !== 0;

  const statsItems = [
    {
      id: "luck",
      label: getStatName("luck", "Luck"),
      value: model.luck,
      testId: "stat-luck",
      visible: true,
      icon: "☆",
      iconColor: "text-green-300/80",
      tooltip: (
        <>
          <StatEffectsTooltip statKey="luck" />
          <ActionTooltipSeparator />
          <span className="text-muted-foreground">
            {t("sidePanel.statLuckTooltip")}
          </span>
        </>
      ),
    },
    {
      id: "strength",
      label: getStatName("strength", "Strength"),
      value: model.strength,
      testId: "stat-strength",
      visible: true,
      icon: "⬡",
      iconColor: "text-red-300/80",
      tooltip: (
        <>
          <StatEffectsTooltip statKey="strength" />
          <ActionTooltipSeparator />
          <span className="text-muted-foreground">
            {t("sidePanel.statStrengthTooltip")}
          </span>
        </>
      ),
    },
    {
      id: "knowledge",
      label: getStatName("knowledge", "Knowledge"),
      value: model.knowledge,
      testId: "stat-knowledge",
      visible: true,
      icon: "✧",
      iconColor: "text-blue-300/80",
      tooltip: (
        <>
          <StatEffectsTooltip statKey="knowledge" />
          <ActionTooltipSeparator />
          <span className="text-muted-foreground">
            {t("sidePanel.statKnowledgeTooltip")}
          </span>
        </>
      ),
    },
    {
      id: "madness",
      label: getStatName("madness", "Madness"),
      value: model.madness,
      testId: "stat-madness",
      visible: true,
      icon: "✺",
      iconColor: "text-violet-300/80",
      tooltip: (
        <>
          {showMadnessBreakdown && (
            <>
              <div>
                <div>
                  {t("sidePanel.madnessFromItems", {
                    value: formatSignedNumber(model.madnessFromItems),
                  })}
                </div>
                <div>
                  {t("sidePanel.madnessFromBuildings", {
                    value: formatSignedNumber(model.madnessFromBuildings),
                  })}
                </div>
                <div>
                  {t("sidePanel.madnessFromEvents", {
                    value: formatSignedNumber(model.madnessFromEvents),
                  })}
                </div>
              </div>
              <ActionTooltipSeparator />
            </>
          )}
          <StatEffectsTooltip statKey="madness" />
          <ActionTooltipSeparator />
          <div className="text-muted-foreground">
            {t("sidePanel.statMadnessTooltip")}
          </div>
        </>
      ),
    },
  ];

  const fortificationItems = model.fortificationRows.map((row) => {
    const fk = row.id as FortificationBuildingKey;
    let label = getFortificationDisplayLabel(fk, row.value, t);
    if (row.damaged) label += " ↓";
    return {
      id: row.id,
      label,
      value: row.value,
      testId: `fortification-${row.id}`,
      visible: row.value > 0,
    };
  });

  const bastionStatsItems =
    model.bastionStats == null
      ? []
      : BASTION_STAT_SIDE_PANEL_ORDER.map((key) => {
        const value = model.bastionStats![key];
        let tooltip = undefined;

        if (key === "defense") {
          tooltip = (
            <span className="text-foreground">
              {t("sidePanel.bastionDefenseTooltip")}
            </span>
          );
        }

        if (key === "integrity") {
          tooltip = (
            <span className="text-foreground">
              {t("sidePanel.bastionIntegrityTooltip")}
            </span>
          );
        }

        if (key === "attack") {
          tooltip = (
            <div>
              <div>
                {t("sidePanel.bastionAttackFromFortifications", {
                  value: model.bastionStats!.attackFromFortifications,
                })}
              </div>
              <div>
                {t("sidePanel.bastionAttackFromStrength", {
                  value: model.bastionStats!.attackFromStrength,
                })}
              </div>
              <ActionTooltipSeparator />
              <div className="text-muted-foreground">
                {t("sidePanel.bastionAttackTooltip")}
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

  const bonusItems = [
    ...model.bonusRows.map((row) => ({
      id: row.id,
      label: getBonusSidebarLabel(row.id),
      value: row.displayValue,
      testId: `bonus-${row.id}`,
      visible: true,
      tooltip: bonusTooltip(row),
    })),
    ...model.extraBonusRows.map((row) => ({
      id: row.id,
      label: t(EXTRA_BONUS_LABEL_KEYS[row.id] ?? row.id),
      value: row.displayValue,
      testId:
        row.id === "craftingCostReduction"
          ? "bonus-crafting-cost-reduction"
          : row.id === "buildingCostReduction"
            ? "bonus-building-cost-reduction"
            : row.id === "buildingTimeReduction"
              ? "bonus-building-time-reduction"
              : row.id === "villagerProductionBonus"
                ? "bonus-villager-production"
                : "bonus-double-gain-chance",
      visible: true,
      tooltip: bonusTooltip(row),
    })),
  ];

  const catalogToolIds = catalogActive
    ? getDemoEndToolCatalogIds(catalogState)
    : [];
  const catalogBuildingIds = catalogActive
    ? getDemoEndBuildingCatalogIds(catalogState)
    : [];
  const catalogSchematicIds = catalogActive
    ? getDemoEndSchematicCatalogIds(catalogState)
    : [];

  const panelResourceItems = catalogActive
    ? appendRedactedItems(resourceItems, DEMO_END_RESOURCE_IDS, (id) => ({
      id,
      label: getResourceName(id, capitalizeWords(id)),
      value: 0,
      testId: `resource-${id}`,
      visible: true,
    }))
    : resourceItems;
  const panelToolItems = catalogActive
    ? appendRedactedItems(toolItems, catalogToolIds, (key) => ({
      id: key,
      label: getEffectName("tools", key, capitalizeWords(key)),
      value: 1,
      testId: `tool-${key}`,
      visible: true,
      tooltip: true,
    }))
    : toolItems;
  const panelWeaponItems = catalogActive
    ? appendRedactedItems(weaponItems, DEMO_END_WEAPON_IDS, (key) => ({
      id: key,
      label: getEffectName("weapons", key, capitalizeWords(key)),
      value: 1,
      testId: `weapon-${key}`,
      visible: true,
      tooltip: true,
    }))
    : weaponItems;
  const panelCombatItems = catalogActive
    ? appendRedactedItems(combatItemRows, DEMO_END_COMBAT_ITEM_IDS, (key) => ({
      id: key,
      label: getResourceName(key, capitalizeWords(key)),
      value: 0,
      testId: `combat-${key}`,
      visible: true,
      tooltip: true,
    }))
    : combatItemRows;
  const panelClothingItems = catalogActive
    ? appendRedactedItems(clothingItems, DEMO_END_CLOTHING_IDS, (key) => ({
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
    }))
    : clothingItems;
  const panelRelicItems = catalogActive
    ? appendRedactedItems(relicItems, DEMO_END_RELIC_IDS, (key) => ({
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
    : relicItems;
  const panelBookItems = catalogActive
    ? appendRedactedItems(bookItems, DEMO_END_BOOK_IDS, (key) => ({
      id: key,
      label: getEffectName(
        "books",
        key,
        bookEffects[key]?.name || capitalizeWords(key),
      ),
      value: 1,
      testId: `book-${key}`,
      visible: true,
      tooltip: true,
    }))
    : bookItems;
  const panelFellowshipItems = catalogActive
    ? appendRedactedItems(fellowshipItems, DEMO_END_FELLOWSHIP_IDS, (key) => ({
      id: key,
      label: getEffectName(
        "fellowship",
        key,
        fellowshipEffects[key]?.name || capitalizeWords(key),
      ),
      value: 1,
      testId: `fellowship-${key}`,
      visible: true,
      tooltip: true,
    }))
    : fellowshipItems;
  const panelSchematicItems = catalogActive
    ? appendRedactedItems(schematicItems, catalogSchematicIds, (key) => ({
      id: key,
      label: getEffectName(
        "clothing",
        key,
        clothingEffects[key]?.name ||
        capitalizeWords(key.replace("_schematic", "")),
      ),
      value: 1,
      testId: `schematic-${key}`,
      visible: true,
      tooltip: true,
    }))
    : schematicItems;
  const panelBlessingItems = catalogActive
    ? appendRedactedItems(blessingItems, DEMO_END_BLESSING_IDS, (key) => ({
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
    }))
    : blessingItems;
  const panelBuildingItems = catalogActive
    ? appendRedactedItems(buildingItems, catalogBuildingIds, (id) => {
      const actionId = `build${id.charAt(0).toUpperCase() + id.slice(1)}`;
      const buildAction = villageBuildActions[actionId];
      return {
        id,
        label: getActionLabel(
          actionId,
          buildAction?.label || capitalizeWords(id),
        ),
        value: 0,
        testId: `building-${id}`,
        visible: true,
        tooltip: true,
      };
    })
    : buildingItems;
  const panelFortificationItems = catalogActive
    ? appendRedactedItems(
      fortificationItems,
      DEMO_END_FORTIFICATION_IDS,
      (id) => ({
        id,
        label: getFortificationDisplayLabel(
          id as FortificationBuildingKey,
          1,
          t,
        ),
        value: 0,
        testId: `fortification-${id}`,
        visible: true,
      }),
    )
    : fortificationItems;
  const panelBastionStatsItems =
    catalogActive && !model.bastionUnlocked
      ? DEMO_END_BASTION_STAT_IDS.map((id) => ({
        id,
        label: id.replace("bastion-", ""),
        value: 0,
        testId: `${id}-redacted-src`,
        visible: true,
        redacted: true,
      }))
      : bastionStatsItems;
  const panelBonusItems = catalogActive
    ? appendRedactedItems(bonusItems, DEMO_END_EXTRA_BONUS_IDS, (id) => ({
      id,
      label: t(EXTRA_BONUS_LABEL_KEYS[id] ?? id),
      value: "",
      testId: `bonus-${id}`,
      visible: true,
    }))
    : bonusItems;
  const panelStatsItems =
    catalogActive &&
      !(
        model.luck > 0 ||
        model.strength > 0 ||
        model.knowledge > 0 ||
        model.madness > 0
      )
      ? DEMO_END_STAT_IDS.map((id) => ({
        id,
        label: getStatName(id, capitalizeWords(id)),
        value: 0,
        testId: `stat-${id}`,
        visible: true,
        redacted: true,
      }))
      : statsItems;

  const anyPlayerStatPositive =
    model.luck > 0 ||
    model.strength > 0 ||
    model.knowledge > 0 ||
    model.madness > 0;

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
        // Demo-end / clickable teaser tabs keep combat + stats on Bastion / Estate.
        if (!catalogActive && !model.bastionUnlocked) {
          caveSections.push("combatItems");
        }
        if (!catalogActive && !model.estateUnlocked) {
          caveSections.push("stats");
        }
        return caveSections.includes(sectionName);
      }
      case "village":
        return ["resources", "buildings"].includes(sectionName);
      case "forest":
        return ["resources", "relics", "blessings", "bonuses"].includes(
          sectionName,
        );
      case "estate":
        return ["resources", "books", "fellowship", "stats"].includes(
          sectionName,
        );
      case "bastion":
        return [
          "resources",
          "bastion",
          "fortifications",
          "combatItems",
        ].includes(sectionName);
      case "achievements":
        return ["resources"].includes(sectionName);
      case "timedevent":
        return ["resources"].includes(sectionName);
      default:
        return true;
    }
  };

  const handleSidePanelPointerLeave = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const related = event.relatedTarget;
    if (
      related == null ||
      !(related instanceof Node) ||
      !event.currentTarget.contains(related)
    ) {
      clearSidePanelActiveTooltipHover();
    }
  };

  return (
    <div
      className="h-full max-h-[36vh] md:max-h-full min-h-0 overflow-hidden"
      onPointerLeave={handleSidePanelPointerLeave}
      onWheel={clearSidePanelActiveTooltipHover}
    >
      <ScrollArea className="h-full w-full pb-1.5 pr-2">
        <div className={cn("pb-1", SIDE_PANEL_GRID_CLASS)}>
          <div className={cn(SIDE_PANEL_SECTION_SPACING_CLASS)}>
            {panelResourceItems.length > 0 && shouldShowSection("resources") && (
              <SidePanelSection
                sectionId="resources"
                titleRedacted={catalogActive && model.resourceRows.length === 0}
                title={
                  <span className="font-medium">
                    {t("sidePanel.resources")}
                  </span>
                }
                activeTab={activeTab}
                items={panelResourceItems}
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

          <div className={cn("min-w-0 w-full", SIDE_PANEL_SECTION_SPACING_CLASS)}>
            {panelToolItems.length > 0 && shouldShowSection("tools") && (
              <SidePanelSection
                sectionId="tools"
                titleRedacted={catalogActive && model.toolIds.length === 0}
                title={t("sidePanel.tools")}
                items={panelToolItems}
              />
            )}
            {panelWeaponItems.length > 0 && shouldShowSection("weapons") && (
              <SidePanelSection
                sectionId="weapons"
                titleRedacted={catalogActive && model.weaponIds.length === 0}
                title={t("sidePanel.weapons")}
                items={panelWeaponItems}
              />
            )}
            {panelBastionStatsItems.length > 0 &&
              shouldShowSection("bastion") && (
                <SidePanelSection
                  sectionId="bastion"
                  titleRedacted={catalogActive && !model.bastionUnlocked}
                  title={
                    model.hasFortress
                      ? t("sidePanel.fortress")
                      : t("sidePanel.bastion")
                  }
                  items={panelBastionStatsItems}
                />
              )}
            {panelFortificationItems.length > 0 &&
              shouldShowSection("fortifications") && (
                <SidePanelSection
                  sectionId="fortifications"
                  titleRedacted={
                    catalogActive && model.fortificationRows.length === 0
                  }
                  title={t("sidePanel.fortifications")}
                  items={panelFortificationItems}
                />
              )}
            {panelCombatItems.length > 0 &&
              shouldShowSection("combatItems") && (
                <SidePanelSection
                  sectionId="combatItems"
                  titleRedacted={
                    catalogActive && model.combatItemRows.length === 0
                  }
                  title={t("sidePanel.combatItems")}
                  items={panelCombatItems}
                />
              )}
            {panelClothingItems.length > 0 && shouldShowSection("clothing") && (
              <SidePanelSection
                sectionId="clothing"
                titleRedacted={catalogActive && model.clothingIds.length === 0}
                title={t("sidePanel.clothing")}
                items={panelClothingItems}
              />
            )}
            {panelRelicItems.length > 0 && shouldShowSection("relics") && (
              <SidePanelSection
                sectionId="relics"
                titleRedacted={catalogActive && model.relicIds.length === 0}
                title={t("sidePanel.relics")}
                items={panelRelicItems}
              />
            )}
            {panelSchematicItems.length > 0 &&
              shouldShowSection("schematics") && (
                <SidePanelSection
                  sectionId="schematics"
                  titleRedacted={
                    catalogActive && model.schematicIds.length === 0
                  }
                  title={t("sidePanel.schematics")}
                  items={panelSchematicItems}
                />
              )}
            {panelBlessingItems.length > 0 && shouldShowSection("blessings") && (
              <SidePanelSection
                sectionId="blessings"
                titleRedacted={catalogActive && model.blessingIds.length === 0}
                title={t("sidePanel.blessings")}
                items={panelBlessingItems}
              />
            )}
            {panelBuildingItems.length > 0 && shouldShowSection("buildings") && (
              <SidePanelSection
                sectionId="buildings"
                titleRedacted={
                  catalogActive && model.buildingRows.length === 0
                }
                title={t("sidePanel.buildings")}
                items={panelBuildingItems}
              />
            )}
            {(anyPlayerStatPositive || catalogActive) &&
              shouldShowSection("stats") && (
                <SidePanelSection
                  sectionId="stats"
                  titleRedacted={catalogActive && !anyPlayerStatPositive}
                  title={t("sidePanel.stats")}
                  items={panelStatsItems}
                />
              )}
            {panelBonusItems.length > 0 && shouldShowSection("bonuses") && (
              <SidePanelSection
                sectionId="bonuses"
                titleRedacted={catalogActive && bonusItems.length === 0}
                title={t("sidePanel.bonuses")}
                items={panelBonusItems}
              />
            )}
            {panelBookItems.length > 0 && shouldShowSection("books") && (
              <SidePanelSection
                sectionId="books"
                titleRedacted={catalogActive && model.bookIds.length === 0}
                title={t("sidePanel.books")}
                items={panelBookItems}
              />
            )}
            {panelFellowshipItems.length > 0 &&
              shouldShowSection("fellowship") && (
                <SidePanelSection
                  sectionId="fellowship"
                  titleRedacted={
                    catalogActive && model.fellowshipIds.length === 0
                  }
                  title={t("sidePanel.fellowship")}
                  items={panelFellowshipItems}
                />
              )}
          </div>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}
