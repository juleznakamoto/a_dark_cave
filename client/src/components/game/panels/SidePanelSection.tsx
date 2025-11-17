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
  title: string;
  items: SidePanelItem[];
  className?: string;
  onValueChange?: (itemId: string, oldValue: number, newValue: number) => void;
  resourceChanges?: ResourceChange[];
  showNotifications?: boolean;
  forceNotifications?: boolean; // Added prop
  onResourceChange?: (change: ResourceChange) => void;
  titleTooltip?: string;
}

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
  const hoverTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const mobileTooltip = useMobileTooltip();
  const [titleHovered, setTitleHovered] = useState(false);

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

  useEffect(() => {
    const newAnimatedItems = new Set<string>();
    const newDecreaseAnimatedItems = new Set<string>();

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

      // We have a previous value to compare against
      if (prevValue !== undefined) {
        if (currentValue > prevValue) {
          newAnimatedItems.add(item.id);

          // Add to resourceChanges for notifications - always trigger if onResourceChange is provided
          if (onResourceChange) {
            const changeAmount = currentValue - prevValue;
            const newChange = {
              resource: item.id,
              amount: changeAmount,
              timestamp: Date.now(),
            };
            onResourceChange(newChange);
          }

          // Remove animation after 2 seconds
          setTimeout(() => {
            setAnimatedItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(item.id);
              return newSet;
            });
          }, 2000);
        } else if (currentValue < prevValue) {
          newDecreaseAnimatedItems.add(item.id);

          // Add to resourceChanges for notifications - always trigger if onResourceChange is provided
          if (onResourceChange) {
            const changeAmount = currentValue - prevValue;
            const newChange = {
              resource: item.id,
              amount: changeAmount,
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
  }, [visibleItems, onResourceChange]); // Simplified dependencies

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
    const displayValue = formatValue(item.value);

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
      isMadnessTooltip ||
      item.tooltip;

    const newItemPulseClass =
      shouldPulse && !hoveredTooltips[item.id] ? "new-item-pulse" : "";

    const labelContent = (
      <span
        className={`text-xs text-gray-400 flex items-center gap-1 ${newItemPulseClass}`}
      >
        {item.icon !== undefined && (
          <span className={cn("mr-1", item.iconColor)}>{item.icon}</span>
        )}
        {item.label.includes("↓") ? (
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
        ].includes(title) && (
          <span
            className={`font-mono ${
              isAnimated
                ? "text-green-800 font-bold"
                : isDecreaseAnimated
                  ? "text-red-800 font-bold"
                  : isMadness
                    ? madnessClasses
                    : ""
            }`}
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
            <TooltipContent className="max-w-xs whitespace-pre-line">
              {renderItemTooltip(
                item.id,
                title === "Weapons"
                  ? "weapon"
                  : title === "Blessings" || title === "Clothing" || title === "Relics" || title === "Schematics"
                  ? "blessing"
                  : "tool"
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // If this is madness with events, show tooltip
    if (isMadnessTooltip) {
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
              ].includes(title) && (
                <span
                  className={`font-mono ${
                    isAnimated
                      ? "text-green-800 font-bold"
                      : isDecreaseAnimated
                        ? "text-red-800 font-bold"
                        : isMadness
                          ? madnessClasses
                          : ""
                  }`}
                >
                  {displayValue}
                </span>
              )}
            </div>
            <TooltipContent>
              <p className="whitespace-pre-line">{madnessTooltipContent}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // If this item has a tooltip, wrap it in a tooltip
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
              ].includes(title) && (
                <span
                  className={`font-mono ${
                    isAnimated
                      ? "text-green-800 font-bold"
                      : isDecreaseAnimated
                        ? "text-red-800 font-bold"
                        : isMadness
                          ? madnessClasses
                          : ""
                  }`}
                >
                  {displayValue}
                </span>
              )}
            </div>
            <TooltipContent className="max-w-xs whitespace-pre-line">
              {typeof item.tooltip === 'string' ? item.tooltip : item.tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // For non-relic items without tooltips, return the content directly
    return <div key={item.id}>{itemContent}</div>;
  };

  return (
    <div className={`py-1.5 border-border ${className}`}>
      {titleTooltip ? (
        <TooltipProvider>
          <Tooltip open={mobileTooltip.isTooltipOpen(`section-title-${title}`)}>
            <TooltipTrigger asChild>
              <h3
                className={cn(
                  "text-xs font-medium tracking-wide mb-0.5 cursor-pointer",
                  !titleHovered && "new-item-pulse"
                )}
                onClick={(e) => {
                  mobileTooltip.handleTooltipClick(`section-title-${title}`, e);
                  setTitleHovered(true);
                }}
                onMouseEnter={() => setTitleHovered(true)}
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