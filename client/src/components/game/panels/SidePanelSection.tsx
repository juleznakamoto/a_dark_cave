import { useEffect, useRef, useState } from "react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  clothingEffects,
  weaponEffects,
  toolEffects,
} from "@/game/rules/effects";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { capitalizeWords } from "@/lib/utils";
import ResourceChangeNotification from "./ResourceChangeNotification";
import { useGameStore } from "@/game/state";

interface SidePanelItem {
  id: string;
  label: string;
  value: number;
  testId?: string;
  visible?: boolean;
  tooltip?: string;
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
}




export default function SidePanelSection({
  title,
  items,
  className = "",
  resourceChanges = [],
  showNotifications = false,
  forceNotifications = false, // Default value for the new prop
  onResourceChange,
}: SidePanelSectionProps) {
  const visibleItems = (items || []).filter((item) => item.visible !== false);
  const [animatedItems, setAnimatedItems] = useState<Set<string>>(new Set());
  const [decreaseAnimatedItems, setDecreaseAnimatedItems] = useState<
    Set<string>
  >(new Set());
  const prevValuesRef = useRef<Map<string, number>>(new Map());
  const isInitialRender = useRef(true);

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
              timestamp: Date.now()
            };
            onResourceChange(newChange);
          }

          // Remove animation after 2.5 seconds
          setTimeout(() => {
            setAnimatedItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(item.id);
              return newSet;
            });
          }, 2500);
        } else if (currentValue < prevValue) {
          newDecreaseAnimatedItems.add(item.id);

          // Add to resourceChanges for notifications - always trigger if onResourceChange is provided
          if (onResourceChange) {
            const changeAmount = currentValue - prevValue;
            const newChange = {
              resource: item.id,
              amount: changeAmount,
              timestamp: Date.now()
            };
            onResourceChange(newChange);
          }

          // Remove animation after 2.5 seconds
          setTimeout(() => {
            setDecreaseAnimatedItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(item.id);
              return newSet;
            });
          }, 2500);
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

  const formatValue = (value: number) => {
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

    // Check if this is a relic, weapon, or tool that has effect information
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
    const hasEffect = effect && (hasGeneralBonuses || hasActionBonuses || effect.name || effect.description);

    // Determine madness intensity classes
    const getMadnessClasses = (value: number) => {
      if (value >= 40) {
        return "madness-extreme madness-pulse-fast-extreme text-red-800";
      } else if (value >= 30) {
        return "madness-intense madness-pulse-intense text-red-600";
      } else if (value >= 20) {
        return "madness-medium madness-pulse-medium text-red-400";
      } else if (value >= 10) {
        return "madness-light madness-pulse-light text-red-300";
      }
      return "";
    };

    // Check if the item is 'madness' and if there's any madness from events to display
    const gameState = useGameStore.getState();
    const eventMadness = item.id === 'madness' ? (gameState.stats.madnessFromEvents || 0) : 0;
    const isMadnessTooltip = item.id === 'madness' && eventMadness > 0;

    const isMadness = item.id === 'madness';
    const madnessClasses = isMadness ? getMadnessClasses(item.value) : "";

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
        <span className="text-muted-foreground">{item.label}</span>
        <span
          className={`transition-all duration-300 font-mono ${
            isAnimated
              ? "scale-100 text-green-800 font-bold"
              : isDecreaseAnimated
                ? "scale-100 text-red-800 font-bold"
                : isMadness
                  ? madnessClasses
                  : ""
          }`}
        >
          {displayValue}
        </span>
      </div>
    );

    // If this item has effects, wrap it in a hover card
    if (
      hasEffect &&
      (title === "Relics" || title === "Tools" || title === "Weapons" || title === "Clothing")
    ) {
      return (
        <HoverCard key={item.id} openDelay={100} closeDelay={100}>
          <HoverCardTrigger asChild>{itemContent}</HoverCardTrigger>
          <HoverCardContent className="w-auto p-2">
            <div className="text-xs whitespace-nowrap">
              {effect.name && (
                <div className="font-bold mb-1">{effect.name}</div>
              )}
              {effect.description && (
                <div className="text-gray-400 mb-1 max-w-xs whitespace-normal text-wrap">{effect.description}</div>
              )}
              {effect.bonuses.generalBonuses && (
                <>
                  {effect.bonuses.generalBonuses.luck && (
                    <div>+{effect.bonuses.generalBonuses.luck} Luck</div>
                  )}
                  {effect.bonuses.generalBonuses.strength && (
                    <div>
                      +{effect.bonuses.generalBonuses.strength} Strength
                    </div>
                  )}
                  {effect.bonuses.generalBonuses.gatheringSpeed && (
                    <div>
                      +
                      {Math.round(
                        (effect.bonuses.generalBonuses.gatheringSpeed - 1) *
                          100,
                      )}
                      % Gathering Speed
                    </div>
                  )}
                  {effect.bonuses.generalBonuses.craftingSpeed && (
                    <div>
                      +
                      {Math.round(
                        (effect.bonuses.generalBonuses.craftingSpeed - 1) * 100,
                      )}
                      % Crafting Speed
                    </div>
                  )}
                  {effect.bonuses.generalBonuses.explorationBonus && (
                    <div>
                      +{effect.bonuses.generalBonuses.explorationBonus}{" "}
                      Exploration Bonus
                    </div>
                  )}
                  {effect.bonuses.generalBonuses.knowledge && (
                    <div>
                      +{effect.bonuses.generalBonuses.knowledge} Knowledge
                    </div>
                  )}
                  {effect.bonuses.generalBonuses.madness && (
                    <div>+{effect.bonuses.generalBonuses.madness} Madness</div>
                  )}
                  {effect.bonuses.generalBonuses.craftingCostReduction && (
                    <div>
                      {Math.round(
                        effect.bonuses.generalBonuses.craftingCostReduction *
                          100,
                      )}
                      % Craft Discount
                    </div>
                  )}

                </>
              )}
              {effect.bonuses.actionBonuses &&
              (() => {
                // Special case for seeker pack - show simplified tooltip
                if (effect.id === 'seeker_pack') {
                  return <div>+20% Explore Bonus</div>;
                }

                return Object.entries(effect.bonuses.actionBonuses).map(
                  ([actionId, bonus]) => (
                    <div key={actionId}>
                      {bonus.resourceMultiplier &&
                        bonus.resourceMultiplier !== 1 && (
                          <div>
                            +{Math.round((bonus.resourceMultiplier - 1) * 100)}%{" "}{capitalizeWords(actionId).replace('Mining', 'Mine')}{" "}Bonus
                          </div>
                        )}
                      {bonus.resourceBonus &&
                        Object.entries(bonus.resourceBonus).map(
                          ([resource, amount]) => (
                            <div key={resource}>
                              {capitalizeWords(actionId)}: +{amount} {capitalizeWords(resource)}
                            </div>
                          ),
                        )}
                    </div>
                  ),
                );
              })()}
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    }

    // If this is madness with events, show tooltip
    if (isMadnessTooltip) {
      return (
        <TooltipProvider key={item.id}>
          <Tooltip>
            <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
            <TooltipContent>
              <p>+{eventMadness} Madness from Events</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // If this item has a tooltip, wrap it in a tooltip
    if (item.tooltip) {
      return (
        <TooltipProvider key={item.id}>
          <Tooltip>
            <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
            <TooltipContent>
              <p>{item.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // For non-relic items without tooltips, return the content directly
    return <div key={item.id}>{itemContent}</div>;
  };

  return (
    <div className={`px-3 py-3 border-border ${className}`}>
      <h3 className="text-xs font-medium tracking-wide mb-1">
        {title}
      </h3>
      <div className="space-y-0.5 text-sm">
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