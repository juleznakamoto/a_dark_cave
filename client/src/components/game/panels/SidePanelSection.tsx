import { useEffect, useRef, useState } from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { clothingEffects } from '@/game/effects';

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
  className = "" 
}: SidePanelSectionProps) {
  const visibleItems = (items || []).filter(item => item.visible !== false);
  const [animatedItems, setAnimatedItems] = useState<Set<string>>(new Set());
  const [decreaseAnimatedItems, setDecreaseAnimatedItems] = useState<Set<string>>(new Set());
  const prevValuesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const newAnimatedItems = new Set<string>();
    const newDecreaseAnimatedItems = new Set<string>();

    visibleItems.forEach((item) => {
      const currentValue = typeof item.value === 'number' ? item.value : parseInt(item.value.toString()) || 0;
      const prevValue = prevValuesRef.current.get(item.id) || 0;

      if (currentValue > prevValue) {
        newAnimatedItems.add(item.id);
        // Remove animation after 2 seconds
        setTimeout(() => {
          setAnimatedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(item.id);
            return newSet;
          });
        }, 2000);
      } else if (currentValue < prevValue) {
        newDecreaseAnimatedItems.add(item.id);
        // Remove animation after 2 seconds
        setTimeout(() => {
          setDecreaseAnimatedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(item.id);
            return newSet;
          });
        }, 2000);
      }

      prevValuesRef.current.set(item.id, currentValue);
    });

    if (newAnimatedItems.size > 0) {
      setAnimatedItems(prev => new Set([...prev, ...newAnimatedItems]));
    }
    if (newDecreaseAnimatedItems.size > 0) {
      setDecreaseAnimatedItems(prev => new Set([...prev, ...newDecreaseAnimatedItems]));
    }
  }, [visibleItems]);

  if (!visible || visibleItems.length === 0) {
    return null;
  }

  const renderItemWithTooltip = (item: SidePanelItem) => {
    const isAnimated = animatedItems.has(item.id);
    const isDecreaseAnimated = decreaseAnimatedItems.has(item.id);

    // Check if this is a relic that has effect information
    const relicEffect = clothingEffects[item.id];

    const itemContent = (
      <div 
        data-testid={item.testId}
        className={`flex justify-between items-center transition-all duration-300 ${
          isAnimated ? 'text-green-400' : isDecreaseAnimated ? 'text-red-400' : ''
        } ${relicEffect && title === "Relics" ? 'cursor-help' : ''}`}
      >
        <span className="text-muted-foreground">{item.label}</span>
        <span 
          className={`font-medium transition-all duration-300 ${
            isAnimated ? 'scale-110 text-green-800' : 
            isDecreaseAnimated ? 'scale-110 text-red-800' : ''
          }`}
        >
          {item.value}
        </span>
      </div>
    );

    // If this item has relic effects, wrap it in a hover card
    if (relicEffect && title === "Relics") {
      return (
        <HoverCard key={item.id}>
          <HoverCardTrigger asChild>
            {itemContent}
          </HoverCardTrigger>
          <HoverCardContent className="w-auto p-2">
            <div className="text-xs whitespace-nowrap">
              {relicEffect.bonuses.generalBonuses && (
                <>
                  {relicEffect.bonuses.generalBonuses.luck && (
                    <div>+{relicEffect.bonuses.generalBonuses.luck} Luck</div>
                  )}
                  {relicEffect.bonuses.generalBonuses.strength && (
                    <div>+{relicEffect.bonuses.generalBonuses.strength} Strength</div>
                  )}
                  {relicEffect.bonuses.generalBonuses.gatheringSpeed && (
                    <div>+{Math.round((relicEffect.bonuses.generalBonuses.gatheringSpeed - 1) * 100)}% Gathering Speed</div>
                  )}
                  {relicEffect.bonuses.generalBonuses.craftingSpeed && (
                    <div>+{Math.round((relicEffect.bonuses.generalBonuses.craftingSpeed - 1) * 100)}% Crafting Speed</div>
                  )}
                  {relicEffect.bonuses.generalBonuses.explorationBonus && (
                    <div>+{relicEffect.bonuses.generalBonuses.explorationBonus} Exploration Bonus</div>
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
    <div className={`px-4 py-3 border-t border-border ${className}`}>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="space-y-1 text-sm">
        {visibleItems.map(renderItemWithTooltip)}
      </div>
    </div>
  );
}