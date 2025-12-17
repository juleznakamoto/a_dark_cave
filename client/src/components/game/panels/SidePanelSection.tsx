import { useEffect, useRef, useState } from "react";
import {
  clothingEffects,
  weaponEffects,
  toolEffects,
} from "@/game/rules/effects";
import { madnessTooltip } from "@/game/rules/tooltips";
import { renderItemTooltip } from "@/game/rules/itemTooltips";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ResourceChangeNotification from "./ResourceChangeNotification";
import { useGameStore } from "@/game/state";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";
import cn from "clsx";
import { getResourceLimit, isResourceLimited } from "@/game/resourceLimits";

interface SidePanelItem {
  id: string;
  label: string;
  value: number | string;
  testId?: string;
  visible?: boolean;
  tooltip?: string | React.ReactNode; // Changed to allow ReactNode
  icon?: string;
  iconColor?: string;
}

interface ResourceChange {
  resource: string;
  amount: number;
  timestamp: number;
}

interface SidePanelSectionProps {
  title: string | React.ReactNode;
  items: SidePanelItem[];
  className?: string;
  onValueChange?: (itemId: string, oldValue: number, newValue: number) => void;
  resourceChanges?: ResourceChange[];
  showNotifications?: boolean;
  forceNotifications?: boolean; // Added prop
  onResourceChange?: (change: ResourceChange) => void;
  titleTooltip?: string;
}
import { logger } from "@/lib/logger";

export default function SidePanelSection({
  title,
  items,
  className = "",
  resourceChanges = [],
  onResourceChange,
  titleTooltip,
}: SidePanelSectionProps) {
  const visibleItems = (items || []).filter((item) => item.visible !== false);
  const [animatedItems, setAnimatedItems] = useState<Set<string>>(new Set());
  const [decreaseAnimatedItems, setDecreaseAnimatedItems] = useState<
    Set<string>
  >(new Set());
  const prevValuesRef = useRef<Map<string, number>>(new Map());
  const isInitialRender = useRef(true);
  const gameState = useGameStore((state) => state);
  const hoveredTooltips = useGameStore((state) => state.hoveredTooltips || {});
  const setHoveredTooltip = useGameStore((state) => state.setHoveredTooltip);
  const highlightedResourcesRaw = useGameStore(
    (state) => state.highlightedResources,
  );
  const highlightedResources =
    highlightedResourcesRaw instanceof Set
      ? highlightedResourcesRaw
      : new Set(
          Array.isArray(highlightedResourcesRaw) ? highlightedResourcesRaw : [],
        );
  const hoverTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const mobileTooltip = useMobileTooltip();

  const handleTooltipHover = (itemId: string) => {
    if (mobileTooltip.isMobile) return;

    const existingTimer = hoverTimersRef.current.get(itemId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      setHoveredTooltip(itemId, true);
      hoverTimersRef.current.delete(itemId);
    }, 500);

    hoverTimersRef.current.set(itemId, timer);
  };

  const handleTooltipLeave = (itemId: string) => {
    if (mobileTooltip.isMobile) return;

    const timer = hoverTimersRef.current.get(itemId);
    if (timer) {
      clearTimeout(timer);
      hoverTimersRef.current.delete(itemId);
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      hoverTimersRef.current.forEach((timer) => clearTimeout(timer));
      hoverTimersRef.current.clear();
    };
  }, []);

  const [maxAnimatedItems, setMaxAnimatedItems] = useState<Set<string>>(
    new Set(),
  );

  // Track resource changes from game loop to detect capped gains
  const lastResourceChanges = useRef<Map<string, number>>(new Map());

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
      if (change.amount > 0) {
        lastResourceChanges.current.set(change.resource, change.amount);

        // Clear after a short delay to avoid stale data
        setTimeout(() => {
          lastResourceChanges.current.delete(change.resource);
        }, 100);
      }
    });
  }, [resourceChanges]);

  if (visibleItems.length === 0) {
    return null;
  }

  const formatValue = (value: number | string) => {
    // If it's already a string, return it as-is
    if (typeof value === "string") {
      return value;
    }

    if (value < 0) {
      return `${value}`;
    } else if (value === -1) {
      return "done";
    } else if (value > 0 && value < 1) {
      return `${Math.round(value * 100)}%`;
    }
    return value.toString();
  };

  const renderItemWithTooltip = (item: SidePanelItem) => {
    const isAnimated = animatedItems.has(item.id);
    const isDecreaseAnimated = decreaseAnimatedItems.has(item.id);
    const isMaxAnimated = maxAnimatedItems.has(item.id);
    const displayValue = formatValue(item.value);
    const isLimited = isResourceLimited(item.id, gameState);
    const limit = isLimited ? getResourceLimit(gameState) : null;
    const isAtMax =
      isLimited &&
      limit !== null &&
      typeof item.value === "number" &&
      item.value === limit;

    // Handle mobile tooltip click - also mark as hovered to stop pulse
    const handleMobileTooltipClick = (id: string, e: React.MouseEvent) => {
      mobileTooltip.handleTooltipClick(id, e);
      if (!hoveredTooltips[id]) {
        setHoveredTooltip(id, true);
      }
    };

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
    const hasTooltip = item.tooltip && item.tooltip.length > 0;

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
    const madnessClasses = isMadness ? getMadnessClasses(item.value) : "";

    // Only apply pulse to items that have tooltips (effects or item.tooltip)
    const shouldPulse =
      (hasEffect &&
        (title === "Relics" ||
          title === "Tools" ||
          title === "Weapons" ||
          title === "Clothing" ||
          title === "Schematics" ||
          title === "Blessings")) ||
      (hasTooltip && (title === "Fortifications" || title === "Buildings")) ||
      item.tooltip;

    const newItemPulseClass =
      shouldPulse && !hoveredTooltips[item.id] ? "new-item-pulse" : "";

    // Check if this resource is highlighted
    const isHighlighted = highlightedResources.has(item.id);

    const labelContent = (
      <span
        className={cn(
          "text-xs text-gray-400 flex items-center gap-1",
          newItemPulseClass,
          isHighlighted && "!text-gray-100",
        )}
      >
        {item.icon !== undefined && (
          <span className={cn("mr-1", item.iconColor)}>{item.icon}</span>
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

    const itemContent = (
      <div
        data-testid={item.testId}
        className={`flex leading-tight justify-between items-center transition-all duration-300 ${
          isAnimated
            ? "text-green-400"
            : isDecreaseAnimated
              ? "text-red-400"
              : isMaxAnimated
                ? "text-yellow-400"
                : ""
        }`}
      >
        {labelContent}
        {![
          "Relics",
          "Tools",
          "Weapons",
          "Clothing",
          "Buildings",
          "Fortifications",
          "Blessings",
          "Schematics",
          "Fellowship",
        ].includes(title) && (
          <span
            className={cn(
              "font-mono text-gray-300",
              isAnimated && "text-green-800 font-bold",
              isDecreaseAnimated && "text-red-800 font-bold",
              isMaxAnimated && "text-yellow-800 font-bold",
              isMadness && madnessClasses,
              isHighlighted && "font-bold !text-gray-100",
            )}
          >
            {displayValue}
          </span>
        )}
      </div>
    );

    // If this item has effects, wrap it in a tooltip with item effects
    if (
      hasEffect &&
      (title === "Relics" ||
        title === "Tools" ||
        title === "Weapons" ||
        title === "Clothing" ||
        title === "Schematics" ||
        title === "Blessings")
    ) {
      return (
        <TooltipProvider key={item.id}>
          <Tooltip open={mobileTooltip.isTooltipOpen(item.id)}>
            <div
              data-testid={item.testId}
              className={`flex leading-tight justify-between items-center transition-all duration-300 ${
                isAnimated
                  ? "text-green-400"
                  : isDecreaseAnimated
                    ? "text-red-400"
                    : isAtMax
                      ? "text-yellow-400"
                      : "" // Changed to yellow for max resources
              }`}
            >
              <TooltipTrigger asChild>
                <span
                  onClick={(e) => handleMobileTooltipClick(item.id, e)}
                  onMouseEnter={() => handleTooltipHover(item.id)}
                  onMouseLeave={() => handleTooltipLeave(item.id)}
                  className={mobileTooltip.isMobile ? "cursor-pointer" : ""}
                >
                  {labelContent}
                </span>
              </TooltipTrigger>
            </div>
            <TooltipContent className="max-w-xs">
              {renderItemTooltip(
                item.id,
                title === "Weapons"
                  ? "weapon"
                  : title === "Blessings" ||
                      title === "Clothing" ||
                      title === "Relics" ||
                      title === "Schematics"
                    ? "blessing"
                    : "tool",
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // If this item is a fellowship member with a tooltip, use renderItemTooltip
    if (item.tooltip && title === "Fellowship") {
      console.log('[TOOLTIP] Fellowship item rendering:', {
        itemId: item.id,
        itemLabel: item.label,
        hasTooltip: !!item.tooltip,
        title,
      });
      
      return (
        <TooltipProvider key={item.id}>
          <Tooltip open={mobileTooltip.isTooltipOpen(item.id)}>
            <div
              data-testid={item.testId}
              className={`flex leading-tight justify-between items-center transition-all duration-300 ${
                isAnimated
                  ? "text-green-400"
                  : isDecreaseAnimated
                    ? "text-red-400"
                    : isMaxAnimated
                      ? "text-yellow-400"
                      : ""
              }`}
            >
              <TooltipTrigger asChild>
                <span
                  onClick={(e) => handleMobileTooltipClick(item.id, e)}
                  onMouseEnter={() => handleTooltipHover(item.id)}
                  onMouseLeave={() => handleTooltipLeave(item.id)}
                  className={mobileTooltip.isMobile ? "cursor-pointer" : ""}
                >
                  {labelContent}
                </span>
              </TooltipTrigger>
            </div>
            <TooltipContent className="max-w-xs">
              {renderItemTooltip(item.id, "fellowship")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // If this item is a building (not fortification) with a tooltip, use renderItemTooltip
    if (item.tooltip && title === "Buildings") {
      return (
        <TooltipProvider key={item.id}>
          <Tooltip open={mobileTooltip.isTooltipOpen(item.id)}>
            <div
              data-testid={item.testId}
              className={`flex leading-tight justify-between items-center transition-all duration-300 ${
                isAnimated
                  ? "text-green-400"
                  : isDecreaseAnimated
                    ? "text-red-400"
                    : isMaxAnimated
                      ? "text-yellow-400"
                      : ""
              }`}
            >
              <TooltipTrigger asChild>
                <span
                  onClick={(e) => handleMobileTooltipClick(item.id, e)}
                  onMouseEnter={() => handleTooltipHover(item.id)}
                  onMouseLeave={() => handleTooltipLeave(item.id)}
                  className={mobileTooltip.isMobile ? "cursor-pointer" : ""}
                >
                  {labelContent}
                </span>
              </TooltipTrigger>
            </div>
            <TooltipContent className="max-w-xs">
              {renderItemTooltip(item.id, "building")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // If this item has a tooltip, render with tooltip
    if (item.tooltip) {
      return (
        <TooltipProvider key={item.id}>
          <Tooltip open={mobileTooltip.isTooltipOpen(item.id)}>
            <div
              data-testid={item.testId}
              className={`flex leading-tight justify-between items-center transition-all duration-300 ${
                isAnimated
                  ? "text-green-400"
                  : isDecreaseAnimated
                    ? "text-red-400"
                    : isMaxAnimated
                      ? "text-yellow-400"
                      : ""
              }`}
            >
              <TooltipTrigger asChild>
                <span
                  onClick={(e) => handleMobileTooltipClick(item.id, e)}
                  onMouseEnter={() => handleTooltipHover(item.id)}
                  onMouseLeave={() => handleTooltipLeave(item.id)}
                  className={mobileTooltip.isMobile ? "cursor-pointer" : ""}
                >
                  {labelContent}
                </span>
              </TooltipTrigger>
              {![
                "Relics",
                "Tools",
                "Weapons",
                "Clothing",
                "Buildings",
                "Fortifications",
                "Blessings",
                "Schematics",
                "Books",
                "Fellowship",
                "Stats",
              ].includes(title) && (
                <span
                  className={`font-mono ${
                    isAnimated
                      ? "text-green-800 font-bold"
                      : isDecreaseAnimated
                        ? "text-red-800 font-bold"
                        : isMaxAnimated
                          ? "text-yellow-800 font-bold"
                          : isMadness
                            ? madnessClasses
                            : ""
                  }`}
                >
                  {displayValue}
                </span>
              )}
              {title === "Stats" && (
                <span
                  className={`font-mono ${
                    isAnimated
                      ? "text-green-800 font-bold"
                      : isDecreaseAnimated
                        ? "text-red-800 font-bold"
                        : isMaxAnimated
                          ? "text-yellow-800 font-bold"
                          : isMadness
                            ? madnessClasses
                            : ""
                  }`}
                >
                  {displayValue}
                </span>
              )}
            </div>
            <TooltipContent className="max-w-xs">
              {typeof item.tooltip === "string" ? (
                <>
                  {isMadnessTooltip && (
                    <p className="whitespace-pre-line">
                      {madnessTooltipContent}
                    </p>
                  )}
                  {item.tooltip}
                </>
              ) : (
                item.tooltip
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // For non-relic items without tooltips, return the content directly
    return <div key={item.id}>{itemContent}</div>;
  };

  // Extract base title without dynamic values for consistent tooltip key
  const titleString = typeof title === "string" ? title : "section-title";
  const baseTitleForKey = titleString.split(" ")[0];
  const tooltipKey = `section-title-${baseTitleForKey}`;

  return (
    <div className={`py-1.5 border-border ${className}`}>
      {titleTooltip ? (
        <TooltipProvider>
          <Tooltip open={mobileTooltip.isTooltipOpen(tooltipKey)}>
            <TooltipTrigger asChild>
              <h3
                className={cn(
                  "text-xs font-medium tracking-wide mb-0.5",
                  mobileTooltip.isMobile ? "cursor-pointer" : "",
                  !hoveredTooltips[tooltipKey] && "new-item-pulse",
                )}
                onClick={(e) => {
                  mobileTooltip.handleTooltipClick(tooltipKey, e);
                  if (!hoveredTooltips[tooltipKey]) {
                    setHoveredTooltip(tooltipKey, true);
                  }
                }}
                onMouseEnter={() => {
                  if (!hoveredTooltips[tooltipKey]) {
                    setHoveredTooltip(tooltipKey, true);
                  }
                }}
              >
                {title}
              </h3>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">{titleTooltip}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <h3 className="text-xs font-medium tracking-wide mb-0.5">{title}</h3>
      )}
      <div className="text-xs">
        {visibleItems.map((item) => (
          <div key={item.id} className="relative">
            {renderItemWithTooltip(item)}
            {onResourceChange && ( // Show notifications whenever onResourceChange callback is provided
              <ResourceChangeNotification
                resource={item.id}
                changes={resourceChanges}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
