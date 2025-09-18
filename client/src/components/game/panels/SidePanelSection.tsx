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

interface SidePanelItem {
  id: string;
  label: string;
  value: string | number;
  testId?: string;
  visible?: boolean;
}

interface SidePanelSectionProps {
  title: string;
  items: SidePanelItem[];
  visible?: boolean;
  className?: string;
}

export default function SidePanelSection({
  title,
  items,
  visible = true,
  className = "",
}: SidePanelSectionProps) {
  const visibleItems = (items || []).filter((item) => item.visible !== false);
  const [animatedItems, setAnimatedItems] = useState<Set<string>>(new Set());
  const [decreaseAnimatedItems, setDecreaseAnimatedItems] = useState<
    Set<string>
  >(new Set());
  const prevValuesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const newAnimatedItems = new Set<string>();
    const newDecreaseAnimatedItems = new Set<string>();

    visibleItems.forEach((item) => {
      const currentValue =
        typeof item.value === "number"
          ? item.value
          : parseInt(item.value.toString()) || 0;
      const prevValue = prevValuesRef.current.get(item.id);

      // Only animate if we have a previous value to compare against
      if (prevValue !== undefined) {
        if (currentValue > prevValue) {
          newAnimatedItems.add(item.id);
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

      prevValuesRef.current.set(item.id, currentValue);
    });

    if (newAnimatedItems.size > 0) {
      setAnimatedItems((prev) => new Set([...prev, ...newAnimatedItems]));
    }
    if (newDecreaseAnimatedItems.size > 0) {
      setDecreaseAnimatedItems(
        (prev) => new Set([...prev, ...newDecreaseAnimatedItems]),
      );
    }
  }, [visibleItems]);

  if (!visible || visibleItems.length === 0) {
    return null;
  }

  const renderItemWithTooltip = (item: SidePanelItem) => {
    const isAnimated = animatedItems.has(item.id);
    const isDecreaseAnimated = decreaseAnimatedItems.has(item.id);

    // Check if this is a relic, weapon, or tool that has effect information
    const relicEffect = clothingEffects[item.id];
    const weaponEffect = weaponEffects[item.id];
    const toolEffect = toolEffects[item.id];
    const effect = relicEffect || weaponEffect || toolEffect;
    
    // Check if the effect has actual content to display
    const hasEffectContent = effect?.bonuses?.generalBonuses && 
      Object.keys(effect.bonuses.generalBonuses).length > 0;
    const hasEffect = effect && hasEffectContent;

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
                : ""
          }`}
        >
          {item.value}
        </span>
      </div>
    );

    // If this item has effects, wrap it in a hover card
    if (hasEffect && (title === "Relics" || title === "Tools" || title === "Weapons")) {

      return (
        <HoverCard key={item.id} openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>{itemContent}</HoverCardTrigger>
          <HoverCardContent className="w-auto p-2">
            <div className="text-xs whitespace-nowrap">
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
                </>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    }

    // For non-relic items, return the content directly
    return <div key={item.id}>{itemContent}</div>;
  };

  return (
    <div className={`px-4 py-3 border-border ${className}`}>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="space-y-1 text-sm">
        {visibleItems.map(renderItemWithTooltip)}
      </div>
    </div>
  );
}
