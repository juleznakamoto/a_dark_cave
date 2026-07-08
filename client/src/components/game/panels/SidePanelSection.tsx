import React, { useEffect, useRef, useState } from "react";
import {
  clothingEffects,
  weaponEffects,
  toolEffects,
} from "@/game/rules/effects";
import { madnessTooltip } from "@/game/rules/tooltips";
import {
  renderFortificationTooltip,
  renderItemTooltip,
} from "@/game/rules/itemTooltips";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
  INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS,
} from "@/components/game/BuildingActionBadge";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import ResourceChangeNotification from "./ResourceChangeNotification";
import { SidePanelSectionIcon } from "./SidePanelSectionIcon";
import { useGameStore } from "@/game/state";
import { useGlobalTooltip } from "@/hooks/useGlobalTooltip";
import { cn } from "@/lib/utils";
import { getResourceLimit, isResourceLimited } from "@/game/resourceLimits";
import {
  isVillagerFoodUpkeepActive,
  isVillagerWoodUpkeepActive,
} from "@/game/population";
import {
  getStatEffectLinesSignature,
  shouldPulseStatItem,
  type TooltipStatKey,
} from "@/components/game/StatEffectsTooltip";
import {
  getInsightAmount,
  INSIGHT_REVEAL_DURATION_MS,
  isInsightUnlocked,
  isStatEffectsRevealed,
} from "@/game/rules/insightReveal";
import type { GameState } from "@shared/schema";
import {
  areVillagerCapsEnabled,
  getGroupForBuildingKey,
  getNextCapUpgradeCost,
  getVillagerCapLevel,
  MAX_VILLAGER_CAP_LEVEL,
} from "@/game/villagerCapUpgrades";
import {
  getNextEnchantCost,
  isWeaponEnchantUnlocked,
} from "@/game/weaponEnchantments";
import { getUiTooltip } from "@/i18n/tooltipLabels";
import { GAME_PANEL_HEADER_BAND } from "@/components/game/gameChrome";

const STAT_EFFECT_PULSE_STAT_IDS: TooltipStatKey[] = [
  "luck",
  "strength",
  "knowledge",
  "madness",
];

interface SidePanelItem {
  id: string;
  label: string | React.ReactNode; // Changed to allow ReactNode
  value: number | string;
  testId?: string;
  visible?: boolean;
  tooltip?: string | React.ReactNode; // Changed to allow ReactNode
  icon?: string;
  iconColor?: string;
  isPrecious?: boolean; // For special styling of gold/silver
  isSpacer?: boolean; // For spacing between sections
  hasSpacingAfter?: boolean; // Add spacing after this item
  productionDelta?: number; // Net production per cycle for Resources section
}

interface ResourceChange {
  resource: string;
  amount: number;
  timestamp: number;
}

export type SidePanelSectionId =
  | "resources"
  | "tools"
  | "weapons"
  | "bastion"
  | "fortifications"
  | "combatItems"
  | "clothing"
  | "relics"
  | "schematics"
  | "blessings"
  | "buildings"
  | "stats"
  | "bonuses"
  | "books"
  | "fellowship";

const SECTIONS_WITHOUT_ITEM_VALUES = new Set<SidePanelSectionId>([
  "relics",
  "tools",
  "weapons",
  "clothing",
  "buildings",
  "fortifications",
  "blessings",
  "schematics",
  "fellowship",
  "books",
]);

const EFFECT_TOOLTIP_SECTIONS = new Set<SidePanelSectionId>([
  "relics",
  "tools",
  "weapons",
  "clothing",
  "schematics",
  "blessings",
]);

/** Shared layout for resource name + amount + production delta / change hint. */
const RESOURCE_ROW_GRID_CLASS =
  "grid w-fit min-w-[calc(5.5rem+4rem+3rem+0.5rem+0.25rem)] max-w-full pr-1 grid-cols-[5.5rem_4rem_3rem] items-baseline gap-x-1";
/** Label + amount — fills column width; value sits at the right edge. */
const LABEL_VALUE_ROW_GRID_CLASS =
  "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2";
/** Uniform vertical gap between side-panel sections (applied on column parents). */
export const SIDE_PANEL_SECTION_SPACING_CLASS = "space-y-0";
/** Resources column sizes to content; second column fills remaining side-panel width. */
export const SIDE_PANEL_GRID_CLASS =
  "grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 items-start min-w-0";

/** One active tooltip-hover highlight for the whole side panel (all sections share this). */
let sidePanelActiveTooltipHoverId: string | null = null;
const sidePanelTooltipHoverListeners = new Set<() => void>();
const sidePanelPulseDismissTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();

function getSidePanelActiveTooltipHoverId(): string | null {
  return sidePanelActiveTooltipHoverId;
}

function setSidePanelActiveTooltipHoverId(id: string | null) {
  if (sidePanelActiveTooltipHoverId === id) return;
  sidePanelActiveTooltipHoverId = id;
  sidePanelTooltipHoverListeners.forEach((listener) => listener());
}

/** Scope pulse/hover keys per section so duplicate item ids cannot collide across sections. */
function getSidePanelScopedTooltipKey(
  sectionId: SidePanelSectionId | undefined,
  itemId: string,
): string {
  return sectionId ? `${sectionId}:${itemId}` : itemId;
}

function cancelSidePanelPulseDismissTimer(timerKey: string) {
  const timer = sidePanelPulseDismissTimers.get(timerKey);
  if (timer) {
    clearTimeout(timer);
    sidePanelPulseDismissTimers.delete(timerKey);
  }
}

/** After 500ms hover, permanently dismiss new-item pulse for this id (never reset on leave). */
function scheduleSidePanelPulseDismiss(
  sectionId: SidePanelSectionId | undefined,
  itemId: string,
) {
  const timerKey = getSidePanelScopedTooltipKey(sectionId, itemId);
  cancelSidePanelPulseDismissTimer(timerKey);
  const timer = setTimeout(() => {
    useGameStore.getState().setHoveredTooltip(itemId, true);
    sidePanelPulseDismissTimers.delete(timerKey);
  }, 500);
  sidePanelPulseDismissTimers.set(timerKey, timer);
}

/** Clear row/header highlight when the pointer leaves the panel or the list scrolls. */
export function clearSidePanelActiveTooltipHover() {
  setSidePanelActiveTooltipHoverId(null);
}

function useSidePanelActiveTooltipHoverId(): string | null {
  const [, bump] = useState(0);
  useEffect(() => {
    const listener = () => bump((n) => n + 1);
    sidePanelTooltipHoverListeners.add(listener);
    return () => {
      sidePanelTooltipHoverListeners.delete(listener);
    };
  }, []);
  return getSidePanelActiveTooltipHoverId();
}
const RESOURCE_ROW_TEXT_CLASS = "text-xs leading-none";
/** Third column: production rate and change popup share one right-aligned slot. */
const RESOURCE_DELTA_SLOT_CLASS =
  "block w-full min-w-[3rem] text-right font-mono tabular-nums whitespace-nowrap";

function ResourceDeltaSlot({
  resourceId,
  resourceChanges,
  onResourceChange,
  showProductionDelta,
  productionDeltaCell,
  layoutPlaceholder,
}: {
  resourceId: string;
  resourceChanges: ResourceChange[];
  onResourceChange?: (change: ResourceChange) => void;
  showProductionDelta: boolean;
  productionDeltaCell: React.ReactNode;
  layoutPlaceholder: React.ReactNode;
}) {
  const [changePopupVisible, setChangePopupVisible] = useState(false);

  return (
    <div className="relative shrink-0 text-right">
      {showProductionDelta && !changePopupVisible
        ? productionDeltaCell
        : layoutPlaceholder}
      {onResourceChange ? (
        <ResourceChangeNotification
          resource={resourceId}
          changes={resourceChanges}
          onVisibleChange={setChangePopupVisible}
        />
      ) : null}
    </div>
  );
}

/** Food/wood at zero while villagers remain — blink red in the resources panel. */
const CRITICAL_ZERO_RESOURCES = new Set(["food", "wood"]);

interface SidePanelSectionProps {
  title: string | React.ReactNode;
  sectionId?: SidePanelSectionId;
  items: SidePanelItem[];
  className?: string;
  onValueChange?: (itemId: string, oldValue: number, newValue: number) => void;
  resourceChanges?: ResourceChange[];
  showNotifications?: boolean;
  forceNotifications?: boolean; // Added prop
  onResourceChange?: (change: ResourceChange) => void;
  titleExtra?: React.ReactNode;
  activeTab?: string;
}
import { logger } from "@/lib/logger";
import { abbreviateNumber, formatNumber } from "@/lib/utils";

/**
 * Villager-cap upgrade badge shown next to a building name. Mirrors the insight
 * reveal badges: clicking plays the blob animation for INSIGHT_REVEAL_DURATION_MS
 * (3s) and the actual upgrade is applied when the animation resolves.
 */
function BuildingCapUpgradeBadge({ buildingKey }: { buildingKey: string }) {
  const gameState = useGameStore((s) => s as unknown as GameState);
  const setHighlightedResources = useGameStore(
    (s) => s.setHighlightedResources,
  );
  const [playingUntil, setPlayingUntil] = useState(0);
  const [, forceUpdate] = useState(0);
  const upgradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playing = playingUntil > Date.now();

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(
      () => forceUpdate((n) => n + 1),
      Math.max(0, playingUntil - Date.now()),
    );
    return () => clearTimeout(id);
  }, [playing, playingUntil]);

  useEffect(
    () => () => {
      if (upgradeTimerRef.current) clearTimeout(upgradeTimerRef.current);
    },
    [],
  );

  if (!areVillagerCapsEnabled(gameState)) return null;

  const groupId = getGroupForBuildingKey(buildingKey);
  if (!groupId) return null;

  const level = getVillagerCapLevel(gameState, groupId);
  if (level >= MAX_VILLAGER_CAP_LEVEL) return null;
  if (!isInsightUnlocked(gameState)) return null;

  const cost = getNextCapUpgradeCost(level);
  const affordable = getInsightAmount(gameState) >= cost;
  const tooltipId = `villager-cap-upgrade-${buildingKey}`;
  const isDisabled = !affordable || playing;

  const handleClick = () => {
    if (isDisabled) return;
    setPlayingUntil(Date.now() + INSIGHT_REVEAL_DURATION_MS);
    setHighlightedResources(["insight"]);
    upgradeTimerRef.current = setTimeout(() => {
      useGameStore.getState().upgradeVillagerCap(groupId);
      setHighlightedResources([]);
    }, INSIGHT_REVEAL_DURATION_MS);
  };

  return (
    <TooltipWrapper
      tooltip={
        <div className="text-xs">
          {getUiTooltip("improveForInsight", "Improve for {{cost}} Insight", {
            cost,
          })}
        </div>
      }
      tooltipId={tooltipId}
      disabled={isDisabled}
      tooltipContentClassName="max-w-xs"
      tooltipTriggerAsChild
      tooltipTriggerClassName={INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS}
      onMouseEnter={() => setHighlightedResources(["insight"])}
      onMouseLeave={() => {
        if (!playing) setHighlightedResources([]);
      }}
      className="inline-flex shrink-0 items-center self-center"
    >
      <button
        type="button"
        aria-label={getUiTooltip(
          "improveForInsight",
          "Improve for {{cost}} Insight",
          { cost },
        )}
        aria-busy={playing}
        disabled={isDisabled}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        className={getInsightBadgeTriggerClassName({
          canAfford: affordable,
          playing,
          className: cn(
            "h-7 w-7 leading-none",
            isDisabled ? "cursor-not-allowed" : "cursor-pointer",
          ),
        })}
      >
        <BuildingActionBadge embedded size="sm" playing={playing} />
      </button>
    </TooltipWrapper>
  );
}

/**
 * Enchant badge shown next to an owned weapon once the Tomewarden Academy is built.
 * Mirrors {@link BuildingCapUpgradeBadge}: clicking plays the blob animation for
 * INSIGHT_REVEAL_DURATION_MS and the enchantment is applied when the animation resolves.
 */
function WeaponEnchantBadge({ weaponId }: { weaponId: string }) {
  const gameState = useGameStore((s) => s as unknown as GameState);
  const setHighlightedResources = useGameStore(
    (s) => s.setHighlightedResources,
  );
  const [playingUntil, setPlayingUntil] = useState(0);
  const [, forceUpdate] = useState(0);
  const enchantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playing = playingUntil > Date.now();

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(
      () => forceUpdate((n) => n + 1),
      Math.max(0, playingUntil - Date.now()),
    );
    return () => clearTimeout(id);
  }, [playing, playingUntil]);

  useEffect(
    () => () => {
      if (enchantTimerRef.current) clearTimeout(enchantTimerRef.current);
    },
    [],
  );

  if (!isWeaponEnchantUnlocked(gameState)) return null;
  if (!isInsightUnlocked(gameState)) return null;
  if (!(gameState.weapons as Record<string, boolean>)[weaponId]) return null;

  const cost = getNextEnchantCost(gameState, weaponId);
  // Hide once the weapon is fully enchanted (no further level available).
  if (cost == null) return null;

  const affordable = getInsightAmount(gameState) >= cost;
  const tooltipId = `weapon-enchant-${weaponId}`;
  const isDisabled = !affordable || playing;

  const handleClick = () => {
    if (isDisabled) return;
    setPlayingUntil(Date.now() + INSIGHT_REVEAL_DURATION_MS);
    setHighlightedResources(["insight"]);
    enchantTimerRef.current = setTimeout(() => {
      useGameStore.getState().enchantWeapon(weaponId);
      setHighlightedResources([]);
    }, INSIGHT_REVEAL_DURATION_MS);
  };

  return (
    <TooltipWrapper
      tooltip={
        <div className="text-xs">
          {getUiTooltip("enchantForInsight", "Enchant for {{cost}} Insight", {
            cost,
          })}
        </div>
      }
      tooltipId={tooltipId}
      disabled={isDisabled}
      tooltipContentClassName="max-w-xs"
      tooltipTriggerAsChild
      tooltipTriggerClassName={INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS}
      onMouseEnter={() => setHighlightedResources(["insight"])}
      onMouseLeave={() => {
        if (!playing) setHighlightedResources([]);
      }}
      className="inline-flex shrink-0 items-center self-center"
    >
      <button
        type="button"
        aria-label={getUiTooltip(
          "enchantForInsight",
          "Enchant for {{cost}} Insight",
          { cost },
        )}
        aria-busy={playing}
        disabled={isDisabled}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        className={getInsightBadgeTriggerClassName({
          canAfford: affordable,
          playing,
          className: cn(
            "h-7 w-7 leading-none",
            isDisabled ? "cursor-not-allowed" : "cursor-pointer",
          ),
        })}
      >
        <BuildingActionBadge embedded size="sm" playing={playing} />
      </button>
    </TooltipWrapper>
  );
}

export default function SidePanelSection({
  title,
  sectionId,
  items,
  className = "",
  resourceChanges = [],
  onResourceChange,
  titleExtra,
  activeTab,
}: SidePanelSectionProps) {
  const visibleItems = (items || []).filter((item) => item.visible !== false);
  const [animatedItems, setAnimatedItems] = useState<Set<string>>(new Set());
  const [decreaseAnimatedItems, setDecreaseAnimatedItems] = useState<
    Set<string>
  >(new Set());
  const activeTooltipHoverId = useSidePanelActiveTooltipHoverId();
  const prevValuesRef = useRef<Map<string, number>>(new Map());
  const isInitialRender = useRef(true);
  const gameState = useGameStore((state) => state);
  const storeActiveTab = useGameStore((state) => state.activeTab);
  const hoveredTooltips = useGameStore((state) => state.hoveredTooltips || {});
  const setHoveredTooltip = useGameStore((state) => state.setHoveredTooltip);
  const setHighlightedResources = useGameStore(
    (state) => state.setHighlightedResources,
  );
  const highlightedResourcesRaw = useGameStore(
    (state) => state.highlightedResources,
  );
  const highlightedResources =
    highlightedResourcesRaw instanceof Set
      ? highlightedResourcesRaw
      : new Set(
        Array.isArray(highlightedResourcesRaw) ? highlightedResourcesRaw : [],
      );
  const globalTooltip = useGlobalTooltip();

  const sidePanelTooltipTriggerClass = cn(
    "min-w-0 flex-1 break-words",
    globalTooltip.isMobile && "cursor-pointer",
  );

  const handleItemTooltipEnter = (itemId: string) => {
    const scopedKey = getSidePanelScopedTooltipKey(sectionId, itemId);
    const previousId = getSidePanelActiveTooltipHoverId();
    if (previousId !== null && previousId !== scopedKey) {
      cancelSidePanelPulseDismissTimer(previousId);
    }
    setSidePanelActiveTooltipHoverId(scopedKey);
    // Desktop-only: 500ms hover dismisses new-item pulse (old handleTooltipHover guard).
    if (!globalTooltip.isMobile) {
      scheduleSidePanelPulseDismiss(sectionId, itemId);
    }
  };

  const handleItemTooltipLeave = (itemId: string) => {
    const scopedKey = getSidePanelScopedTooltipKey(sectionId, itemId);
    if (getSidePanelActiveTooltipHoverId() === scopedKey) {
      setSidePanelActiveTooltipHoverId(null);
    }
    // Cancel pending pulse dismiss only; do not reset hoveredTooltips — glow stays off once seen.
    cancelSidePanelPulseDismissTimer(scopedKey);
  };

  const isItemTooltipHovered = (itemId: string) => {
    const scopedKey = getSidePanelScopedTooltipKey(sectionId, itemId);
    if (activeTooltipHoverId !== null) {
      return activeTooltipHoverId === scopedKey;
    }
    return globalTooltip.openTooltipId === itemId;
  };

  const visibleItemIdsRef = useRef<string[]>([]);
  visibleItemIdsRef.current = visibleItems.map((item) => item.id);

  // Cancel this section's pending pulse-dismiss timers only (hoveredTooltips persist).
  useEffect(() => {
    return () => {
      visibleItemIdsRef.current.forEach((id) =>
        cancelSidePanelPulseDismissTimer(
          getSidePanelScopedTooltipKey(sectionId, id),
        ),
      );
    };
  }, [sectionId]);

  // Mark as hovered when tooltip opens via hold (stops pulse animation)
  useEffect(() => {
    if (
      globalTooltip.openTooltipId &&
      !hoveredTooltips[globalTooltip.openTooltipId]
    ) {
      setHoveredTooltip(globalTooltip.openTooltipId, true);
    }
  }, [globalTooltip.openTooltipId, hoveredTooltips, setHoveredTooltip]);

  /** Last seen effect-line keys per stat; when new lines unlock, clear hover to re-pulse. */
  const prevStatEffectSigsRef = useRef<Partial<Record<TooltipStatKey, string>>>(
    {},
  );
  const statEffectPulseInitializedRef = useRef(false);

  useEffect(() => {
    if (sectionId !== "stats") return;

    const state = gameState as unknown as GameState;
    if (!isStatEffectsRevealed(state)) return;

    for (const statId of STAT_EFFECT_PULSE_STAT_IDS) {
      const sig = getStatEffectLinesSignature(statId, state);
      const prev = prevStatEffectSigsRef.current[statId] ?? "";

      if (!statEffectPulseInitializedRef.current) {
        prevStatEffectSigsRef.current[statId] = sig;
        if (sig.length > 0) {
          setHoveredTooltip(statId, false);
        }
        continue;
      }

      if (sig === prev) continue;

      const prevKeys = new Set(prev ? prev.split(",") : []);
      const gainedLine = sig
        .split(",")
        .filter((key) => key.length > 0 && !prevKeys.has(key));

      if (gainedLine.length > 0) {
        setHoveredTooltip(statId, false);
      }

      prevStatEffectSigsRef.current[statId] = sig;
    }

    statEffectPulseInitializedRef.current = true;
  }, [gameState, sectionId, setHoveredTooltip]);

  const [maxAnimatedItems, setMaxAnimatedItems] = useState<Set<string>>(
    new Set(),
  );

  // Track resource changes from game loop to detect capped gains
  const lastResourceChanges = useRef<Map<string, number>>(new Map());
  const processedResourceChangeKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newAnimatedItems = new Set<string>();
    const newDecreaseAnimatedItems = new Set<string>();
    const newMaxAnimatedItems = new Set<string>();

    visibleItems.forEach((item) => {
      const currentValue =
        typeof item.value === "number"
          ? item.value
          : parseInt(item.value.toString()) || 0;
      const prevValue = prevValuesRef.current.get(item.id);

      // Skip animations on initial render to avoid false positives
      if (isInitialRender.current) {
        prevValuesRef.current.set(item.id, currentValue);
        return;
      }

      // Check if resource is at max limit
      const isLimited = isResourceLimited(item.id, gameState);
      const limit = isLimited ? getResourceLimit(gameState) : null;
      const isAtLimit = isLimited && limit !== null && currentValue === limit;
      const hitMax = isAtLimit && prevValue !== undefined && prevValue < limit;

      // Check if we stayed at max (resource was capped)
      const stayedAtMax =
        isAtLimit && prevValue !== undefined && prevValue === limit;

      // We have a previous value to compare against
      if (prevValue !== undefined) {
        const actualChange = currentValue - prevValue;

        // Check if this resource had a change in the last tick from resourceChanges
        const lastChange = lastResourceChanges.current.get(item.id);

        if (actualChange > 0 || (stayedAtMax && lastChange && lastChange > 0)) {
          // Determine intended change: if we're at max and stayed there, use lastChange; otherwise use actual
          const intendedChange =
            stayedAtMax && lastChange && lastChange > 0
              ? lastChange
              : actualChange;

          if (hitMax || stayedAtMax) {
            newMaxAnimatedItems.add(item.id);
            // Remove animation after 2 seconds
            setTimeout(() => {
              setMaxAnimatedItems((prev) => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
            }, 2000);
          } else if (actualChange > 0) {
            newAnimatedItems.add(item.id);
            // Remove animation after 2 seconds
            setTimeout(() => {
              setAnimatedItems((prev) => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
            }, 2000);
          }

          // Add to resourceChanges for notifications with intended change amount
          if (onResourceChange && intendedChange > 0) {
            const newChange = {
              resource: item.id,
              amount: intendedChange,
              timestamp: Date.now(),
            };
            onResourceChange(newChange);
          }
        } else if (actualChange < 0) {
          newDecreaseAnimatedItems.add(item.id);

          // Add to resourceChanges for notifications
          if (onResourceChange) {
            const newChange = {
              resource: item.id,
              amount: actualChange,
              timestamp: Date.now(),
            };
            onResourceChange(newChange);
          }

          // Remove animation after 2 seconds
          setTimeout(() => {
            setDecreaseAnimatedItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(item.id);
              return newSet;
            });
          }, 2000);
        }
      }

      // Always update the ref with current value for next comparison
      prevValuesRef.current.set(item.id, currentValue);
    });

    // Mark initial render as complete after processing all items
    if (isInitialRender.current) {
      isInitialRender.current = false;
    }

    if (newAnimatedItems.size > 0) {
      setAnimatedItems((prev) => new Set([...prev, ...newAnimatedItems]));
    }
    if (newDecreaseAnimatedItems.size > 0) {
      setDecreaseAnimatedItems(
        (prev) => new Set([...prev, ...newDecreaseAnimatedItems]),
      );
    }
    if (newMaxAnimatedItems.size > 0) {
      setMaxAnimatedItems((prev) => new Set([...prev, ...newMaxAnimatedItems]));
    }
  }, [visibleItems, onResourceChange, gameState]); // Simplified dependencies

  // Track resource changes to detect intended changes even when capped
  useEffect(() => {
    resourceChanges.forEach((change) => {
      const changeKey = `${change.resource}-${change.timestamp}-${change.amount}`;
      if (processedResourceChangeKeys.current.has(changeKey)) return;
      processedResourceChangeKeys.current.add(changeKey);

      const visibleItem = visibleItems.find(
        (item) => item.id === change.resource,
      );
      if (visibleItem) {
        if (change.amount > 0) {
          setAnimatedItems((prev) => {
            const newSet = new Set(prev);
            newSet.add(change.resource);
            return newSet;
          });
          setTimeout(() => {
            setAnimatedItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(change.resource);
              return newSet;
            });
          }, 2000);
        } else if (change.amount < 0) {
          setDecreaseAnimatedItems((prev) => {
            const newSet = new Set(prev);
            newSet.add(change.resource);
            return newSet;
          });
          setTimeout(() => {
            setDecreaseAnimatedItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(change.resource);
              return newSet;
            });
          }, 2000);
        }
      }

      if (change.amount > 0) {
        lastResourceChanges.current.set(change.resource, change.amount);

        // Clear after a short delay to avoid stale data
        setTimeout(() => {
          lastResourceChanges.current.delete(change.resource);
        }, 100);
      }
    });
  }, [resourceChanges, visibleItems]);

  if (visibleItems.length === 0) {
    return null;
  }

  const formatValue = (value: number | string) => {
    // If it's already a string, return it as-is
    if (typeof value === "string") {
      return value;
    }

    if (value === -1) {
      return "done";
    } else if (value < 0) {
      return `${formatNumber(value)}`;
    } else if (value > 0 && value < 1) {
      return `${Math.round(value * 100)}%`;
    }
    return formatNumber(value);
  };

  const renderBuildingVillagerCapUpgradeButton = (buildingKey: string) => (
    <BuildingCapUpgradeBadge buildingKey={buildingKey} />
  );

  const renderItemWithTooltip = (item: SidePanelItem) => {
    const isAnimated = animatedItems.has(item.id);
    const isDecreaseAnimated = decreaseAnimatedItems.has(item.id);
    const isMaxAnimated = maxAnimatedItems.has(item.id);
    const displayValue =
      item.id === "madness" && typeof item.value === "number" && item.value < 0
        ? `0 (-${formatNumber(Math.abs(item.value))})`
        : formatValue(item.value);
    const isLimited = isResourceLimited(item.id, gameState);
    const limit = isLimited ? getResourceLimit(gameState) : null;
    const isAtMax =
      isLimited &&
      limit !== null &&
      typeof item.value === "number" &&
      item.value >= limit;

    // Check if this is a relic, weapon, tool, blessing, or schematic that has effect information
    const relicEffect = clothingEffects[item.id];
    const weaponEffect = weaponEffects[item.id];
    const toolEffect = toolEffects[item.id];
    const effect = relicEffect || weaponEffect || toolEffect;

    // Check if the effect has actual content to display
    const hasGeneralBonuses =
      effect?.bonuses?.generalBonuses &&
      Object.keys(effect.bonuses.generalBonuses).length > 0;
    const hasActionBonuses =
      effect?.bonuses?.actionBonuses &&
      Object.keys(effect.bonuses.actionBonuses).length > 0;
    const hasEffect =
      effect &&
      (hasGeneralBonuses ||
        hasActionBonuses ||
        effect.name ||
        effect.description);

    // Check if this item has a tooltip (for buildings with stats)
    const hasTooltip =
      item.tooltip !== undefined &&
      item.tooltip !== false &&
      (typeof item.tooltip !== "string" || item.tooltip.length > 0);

    // Determine madness intensity classes
    const getMadnessClasses = (value: number) => {
      if (value >= 40) {
        return "madness-extreme madness-pulse-extreme text-red-500";
      } else if (value >= 30) {
        return "madness-intense madness-pulse-intense text-red-400";
      } else if (value >= 20) {
        return "madness-medium madness-pulse-medium text-red-300";
      } else if (value >= 10) {
        return "madness-light madness-pulse-light text-red-200";
      }
      return "";
    };

    // Check if the item is 'madness' and if there's any madness from events to display
    const madnessTooltipContent =
      item.id === "madness" ? madnessTooltip.getContent(gameState) : "";
    const isMadnessTooltip =
      item.id === "madness" && madnessTooltipContent.length > 0;

    const isMadness = item.id === "madness";
    const madnessForStyle =
      isMadness && typeof item.value === "number" ? Math.max(0, item.value) : 0;
    const madnessClasses = isMadness ? getMadnessClasses(madnessForStyle) : "";

    const statPulseKey = STAT_EFFECT_PULSE_STAT_IDS.includes(
      item.id as TooltipStatKey,
    )
      ? (item.id as TooltipStatKey)
      : null;

    // Pulse: effect items, building/fortification tooltips, or stat rows with revealed effect lines.
    // Stat tooltips are JSX (always truthy) — never use bare `item.tooltip` for the stats section.
    const shouldPulse =
      sectionId === "stats" && statPulseKey !== null
        ? shouldPulseStatItem(statPulseKey, gameState as GameState)
        : (hasEffect &&
          sectionId !== undefined &&
          EFFECT_TOOLTIP_SECTIONS.has(sectionId)) ||
        (hasTooltip &&
          (sectionId === "fortifications" || sectionId === "buildings")) ||
        Boolean(item.tooltip);

    const newItemPulseClass =
      shouldPulse && !hoveredTooltips[item.id] ? "new-item-pulse" : "";

    // Check if this resource is highlighted (external cost hover or tooltip hover)
    const isHighlighted =
      highlightedResources.has(item.id) || isItemTooltipHovered(item.id);

    const isResourcesSection = sectionId === "resources";
    const tabForProductionColors = activeTab ?? storeActiveTab;
    const isVillageTab = tabForProductionColors === "village";
    const villagerUpkeepActiveForResource =
      item.id === "food"
        ? isVillagerFoodUpkeepActive(gameState)
        : item.id === "wood"
          ? isVillagerWoodUpkeepActive(gameState)
          : false;
    const isCriticalZeroResource =
      isResourcesSection &&
      CRITICAL_ZERO_RESOURCES.has(item.id) &&
      typeof item.value === "number" &&
      item.value === 0 &&
      (gameState.current_population ?? 0) > 0 &&
      villagerUpkeepActiveForResource;
    const showVillageMaxCapacityHighlight =
      isResourcesSection &&
      isVillageTab &&
      isAtMax &&
      !isCriticalZeroResource &&
      !isAnimated &&
      !isDecreaseAnimated;

    const showValue =
      sectionId === undefined
        ? typeof title === "string" &&
        ![
          "Relics",
          "Tools",
          "Weapons",
          "Clothing",
          "Buildings",
          "Fortifications",
          "Blessings",
          "Schematics",
          "Fellowship",
          "Books",
        ].includes(title)
        : !SECTIONS_WITHOUT_ITEM_VALUES.has(sectionId);
    // Stats always show numeric values (legacy English-title fallback).
    const showItemValue =
      showValue || (sectionId === undefined && title === "Stats");
    const usesLabelValueGridLayout = showItemValue;

    const labelContent = (
      <span
        className={cn(
          "text-gray-400",
          usesLabelValueGridLayout ? RESOURCE_ROW_TEXT_CLASS : "text-xs",
          item.icon !== undefined &&
          (usesLabelValueGridLayout
            ? "inline-flex items-baseline gap-1"
            : "inline-flex items-start gap-1"),
          newItemPulseClass,
          isHighlighted && "!text-gray-100",
          isCriticalZeroResource && "resource-critical-blink",
        )}
      >
        {item.icon !== undefined && (
          <span className={cn("font-noto-symbols-2", item.iconColor)}>
            {item.icon}
          </span>
        )}
        {typeof item.label === "string" && item.label.includes("↓") ? (
          <>
            {item.label.replace(" ↓", "")}
            <span className="text-red-800 ml-1">↓</span>
          </>
        ) : (
          item.label
        )}
      </span>
    );

    const showProductionDelta =
      isResourcesSection &&
      item.productionDelta !== undefined &&
      item.productionDelta !== 0;

    const itemAnimationClass = isAnimated
      ? "text-green-400"
      : isDecreaseAnimated
        ? "text-red-400"
        : isMaxAnimated
          ? "text-yellow-400"
          : "";

    const valueCellClassName = cn(
      "text-right font-mono tabular-nums whitespace-nowrap text-gray-300",
      usesLabelValueGridLayout && RESOURCE_ROW_TEXT_CLASS,
      isAnimated && !isCriticalZeroResource && "text-green-600 font-bold",
      isDecreaseAnimated && !isCriticalZeroResource && "text-red-600 font-bold",
      isMaxAnimated && !isCriticalZeroResource && "text-yellow-600 font-bold",
      showVillageMaxCapacityHighlight && "text-yellow-500",
      isMadness && madnessClasses,
      isHighlighted && !isCriticalZeroResource && "font-bold !text-gray-100",
      isCriticalZeroResource && "resource-critical-blink font-bold",
    );

    const productionDeltaCellClassName = cn(
      isResourcesSection && RESOURCE_DELTA_SLOT_CLASS,
      isResourcesSection && RESOURCE_ROW_TEXT_CLASS,
      isResourcesSection && "font-normal",
      tabForProductionColors !== "village" && "text-muted-foreground",
      tabForProductionColors === "village" &&
      (item.productionDelta ?? 0) > 0 &&
      "text-green-600/80",
      tabForProductionColors === "village" &&
      (item.productionDelta ?? 0) < 0 &&
      "text-red-600/80",
    );

    const resourceRowClassName = cn(
      "min-w-0 transition-all duration-300",
      usesLabelValueGridLayout
        ? isResourcesSection
          ? RESOURCE_ROW_GRID_CLASS
          : LABEL_VALUE_ROW_GRID_CLASS
        : "flex gap-1.5 justify-between leading-tight items-start",
      itemAnimationClass,
    );

    const productionDeltaCell = showProductionDelta ? (
      <span className={productionDeltaCellClassName}>
        {(item.productionDelta ?? 0) > 0 ? "+" : ""}
        {abbreviateNumber(Math.round(item.productionDelta ?? 0))}
      </span>
    ) : null;

    const productionDeltaLayoutPlaceholder = (
      <span
        className={cn(productionDeltaCellClassName, "invisible select-none")}
        aria-hidden="true"
      >
        0
      </span>
    );

    const resourceThirdColumn = isResourcesSection ? (
      <ResourceDeltaSlot
        resourceId={item.id}
        resourceChanges={resourceChanges}
        onResourceChange={onResourceChange}
        showProductionDelta={showProductionDelta}
        productionDeltaCell={productionDeltaCell}
        layoutPlaceholder={productionDeltaLayoutPlaceholder}
      />
    ) : null;

    const labelValueCells = usesLabelValueGridLayout ? (
      <>
        <span className={valueCellClassName}>{displayValue}</span>
        {resourceThirdColumn}
      </>
    ) : null;

    const renderLabelValueRow = (tooltip?: React.ReactNode) => (
      <div data-testid={item.testId} className={resourceRowClassName}>
        <div className="min-w-0">
          {tooltip ? (
            <TooltipWrapper
              tooltip={tooltip}
              tooltipId={item.id}
              disabled
              tooltipContentClassName="max-w-xs"
              onMouseEnter={() => handleItemTooltipEnter(item.id)}
              onMouseLeave={() => handleItemTooltipLeave(item.id)}
              className={sidePanelTooltipTriggerClass}
            >
              {labelContent}
            </TooltipWrapper>
          ) : (
            labelContent
          )}
        </div>
        {labelValueCells}
      </div>
    );

    const itemContent = renderLabelValueRow();

    // If this item has effects, wrap it in a tooltip with item effects
    if (
      hasEffect &&
      sectionId !== undefined &&
      EFFECT_TOOLTIP_SECTIONS.has(sectionId)
    ) {
      const enchantBadge =
        sectionId === "weapons" ? (
          <WeaponEnchantBadge weaponId={item.id} />
        ) : null;
      return (
        <div
          key={item.id}
          data-testid={item.testId}
          className={`flex min-w-0 leading-tight justify-between items-center gap-x-1 transition-all duration-300 ${isAnimated
            ? "text-green-400"
            : isDecreaseAnimated
              ? "text-red-400"
              : isAtMax
                ? "text-yellow-400"
                : ""
            }`}
        >
          <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
            <TooltipWrapper
              tooltip={renderItemTooltip(
                item.id,
                sectionId === "weapons"
                  ? "weapon"
                  : sectionId === "blessings" ||
                    sectionId === "clothing" ||
                    sectionId === "relics" ||
                    sectionId === "schematics"
                    ? "blessing"
                    : "tool",
              )}
              tooltipId={item.id}
              disabled
              tooltipContentClassName="max-w-xs"
              onMouseEnter={() => handleItemTooltipEnter(item.id)}
              onMouseLeave={() => handleItemTooltipLeave(item.id)}
              className={cn(
                "inline-flex min-w-0 shrink-0",
                globalTooltip.isMobile && "cursor-pointer",
              )}
            >
              {labelContent}
            </TooltipWrapper>
            {enchantBadge}
          </span>
        </div>
      );
    }

    // If this item is a fellowship member or book with a tooltip, use renderItemTooltip
    if (item.tooltip && (sectionId === "fellowship" || sectionId === "books")) {
      const itemType = sectionId === "fellowship" ? "fellowship" : "book";
      return (
        <div
          key={item.id}
          data-testid={item.testId}
          className={`flex min-w-0 leading-tight justify-between items-center gap-x-1 transition-all duration-300 ${isAnimated
            ? "text-green-400"
            : isDecreaseAnimated
              ? "text-red-400"
              : isMaxAnimated
                ? "text-yellow-400"
                : ""
            }`}
        >
          <TooltipWrapper
            tooltip={renderItemTooltip(item.id, itemType)}
            tooltipId={item.id}
            disabled
            tooltipContentClassName="max-w-xs"
            onMouseEnter={() => handleItemTooltipEnter(item.id)}
            onMouseLeave={() => handleItemTooltipLeave(item.id)}
            className={sidePanelTooltipTriggerClass}
          >
            {labelContent}
          </TooltipWrapper>
        </div>
      );
    }

    // If this item is a fortification, use renderFortificationTooltip
    if (sectionId === "fortifications") {
      return (
        <div
          key={item.id}
          data-testid={item.testId}
          className={`flex min-w-0 leading-tight justify-between items-center gap-x-1 transition-all duration-300 ${isAnimated
            ? "text-green-400"
            : isDecreaseAnimated
              ? "text-red-400"
              : isMaxAnimated
                ? "text-yellow-400"
                : ""
            }`}
        >
          <TooltipWrapper
            tooltip={renderFortificationTooltip(
              item.id,
              typeof item.label === "string"
                ? item.label.replace(/ ↓$/, "")
                : undefined,
            )}
            tooltipId={item.id}
            disabled
            tooltipContentClassName="max-w-xs"
            onMouseEnter={() => handleItemTooltipEnter(item.id)}
            onMouseLeave={() => handleItemTooltipLeave(item.id)}
            className={sidePanelTooltipTriggerClass}
          >
            {labelContent}
          </TooltipWrapper>
        </div>
      );
    }

    // If this item is a building (not fortification) with a tooltip, use renderItemTooltip
    if (item.tooltip && sectionId === "buildings") {
      const capUpgradeButton = renderBuildingVillagerCapUpgradeButton(item.id);
      return (
        <div
          key={item.id}
          data-testid={item.testId}
          className={`flex min-w-0 leading-tight justify-between items-center gap-x-1 transition-all duration-300 ${isAnimated
            ? "text-green-400"
            : isDecreaseAnimated
              ? "text-red-400"
              : isMaxAnimated
                ? "text-yellow-400"
                : ""
            }`}
        >
          <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
            <TooltipWrapper
              tooltip={renderItemTooltip(item.id, "building")}
              tooltipId={item.id}
              disabled
              tooltipContentClassName="max-w-xs"
              onMouseEnter={() => handleItemTooltipEnter(item.id)}
              onMouseLeave={() => handleItemTooltipLeave(item.id)}
              className={cn(
                "inline-flex min-w-0 shrink-0",
                globalTooltip.isMobile && "cursor-pointer",
              )}
            >
              {labelContent}
            </TooltipWrapper>
            {capUpgradeButton}
          </span>
        </div>
      );
    }

    // Combat Items: bombs + Veinfire Elixir — merged combat tooltip like weapon bombs in itemTooltips
    if (sectionId === "combatItems") {
      const combatItemTooltip = renderItemTooltip(item.id, "weapon");
      if (combatItemTooltip) {
        return (
          <div key={item.id}>{renderLabelValueRow(combatItemTooltip)}</div>
        );
      }
    }

    // If this item has a tooltip, render with tooltip
    if (item.tooltip) {
      const tooltipContent =
        typeof item.tooltip === "string" ? (
          <>
            {isMadnessTooltip && (
              <p className="whitespace-pre-line">{madnessTooltipContent}</p>
            )}
            {item.tooltip}
          </>
        ) : (
          item.tooltip
        );

      if (usesLabelValueGridLayout) {
        return <div key={item.id}>{renderLabelValueRow(tooltipContent)}</div>;
      }

      return (
        <div
          key={item.id}
          data-testid={item.testId}
          className={cn(
            "mr-1 flex min-w-0 items-start justify-between gap-x-1 leading-tight transition-all duration-300",
            itemAnimationClass,
          )}
        >
          <TooltipWrapper
            tooltip={tooltipContent}
            tooltipId={item.id}
            disabled
            tooltipContentClassName="max-w-xs"
            onMouseEnter={() => handleItemTooltipEnter(item.id)}
            onMouseLeave={() => handleItemTooltipLeave(item.id)}
            className={sidePanelTooltipTriggerClass}
          >
            {labelContent}
          </TooltipWrapper>
        </div>
      );
    }

    // For non-relic items without tooltips, return the content directly
    return <div key={item.id}>{itemContent}</div>;
  };

  const titleHeading = (
    <h3 className="font-medium tracking-wide text-gray-300">
      <span
        className={cn(
          GAME_PANEL_HEADER_BAND,
          titleExtra ? "gap-1.5" : "gap-1",
        )}
      >
        {sectionId ? (
          <SidePanelSectionIcon sectionId={sectionId} />
        ) : null}
        {title}
        {titleExtra}
      </span>
    </h3>
  );

  return (
    <div className={cn("min-w-0 w-full", className)}>
      <div className="min-w-0 flex-1">{titleHeading}</div>
      <div className="min-w-0 text-xs">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className={item.hasSpacingAfter ? "mb-1" : undefined}
          >
            {renderItemWithTooltip(item)}
          </div>
        ))}
      </div>
    </div>
  );
}