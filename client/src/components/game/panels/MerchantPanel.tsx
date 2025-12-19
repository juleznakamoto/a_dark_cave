
import React, { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/game/state";
import { generateMerchantChoices } from "@/game/rules/eventsMerchant";
import { eventChoiceCostTooltip } from "@/game/rules/tooltips";
import { getTotalKnowledge } from "@/game/rules/effectsCalculation";
import { calculateMerchantDiscount, isKnowledgeBonusMaxed } from "@/game/rules/effectsStats";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useMobileButtonTooltip,
  useMobileTooltip,
} from "@/hooks/useMobileTooltip";
import { isResourceLimited, getResourceLimit } from "@/game/resourceLimits";

const MERCHANT_DURATION = 120; // 2 minutes in seconds

export default function MerchantPanel() {
  const gameState = useGameStore();
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number>(MERCHANT_DURATION);
  const [eventChoices, setEventChoices] = useState(() => generateMerchantChoices(gameState));
  
  const mobileTooltip = useMobileButtonTooltip();
  const discountTooltip = useMobileTooltip();

  // Auto-switch to merchant tab when panel mounts
  useEffect(() => {
    gameState.setActiveTab("merchant");
  }, []);

  const knowledge = getTotalKnowledge(gameState);
  const discount = calculateMerchantDiscount(knowledge);
  const hasBookOfWar = gameState.books?.book_of_war;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          // Close merchant tab
          gameState.setFlag('merchantActive', false);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleChoice = (choiceId: string) => {
    const isSayGoodbye = choiceId === "say_goodbye";

    if (isSayGoodbye) {
      gameState.setFlag('merchantActive', false);
      return;
    }

    const choice = eventChoices.find((c) => c.id === choiceId);
    if (choice) {
      const result = choice.effect(gameState);

      if (Object.keys(result).length > 0) {
        Object.entries(result).forEach(([key, value]) => {
          if (key === 'resources' && typeof value === 'object') {
            Object.entries(value).forEach(([resource, amount]) => {
              gameState.setResource(resource as any, amount as number);
            });
          } else if (key === 'tools' && typeof value === 'object') {
            Object.entries(value).forEach(([tool, owned]) => {
              if (owned) gameState.setTool(tool as any, true);
            });
          } else if (key === 'weapons' && typeof value === 'object') {
            Object.entries(value).forEach(([weapon, owned]) => {
              if (owned) gameState.setWeapon(weapon as any, true);
            });
          } else if (key === 'schematics' && typeof value === 'object') {
            Object.entries(value).forEach(([schematic, owned]) => {
              if (owned) gameState.setSchematic(schematic as any, true);
            });
          } else if (key === 'books' && typeof value === 'object') {
            Object.entries(value).forEach(([book, owned]) => {
              if (owned) gameState.setBook(book as any, true);
            });
          }
        });

        const currentCount = Number(gameState.story?.seen?.merchantPurchases) || 0;
        const newCount = currentCount + 1;
        gameState.setFlag('merchantPurchases' as any, newCount as any);

        const currentStory = gameState.story || { seen: {} };
        const updatedStory = {
          ...currentStory,
          seen: {
            ...currentStory.seen,
            merchantPurchases: newCount,
          },
        };
        
        useGameStore.setState({ story: updatedStory });

        setPurchasedItems(prev => new Set(prev).add(choiceId));
      }
    }
  };

  const progress = (timeRemaining / MERCHANT_DURATION) * 100;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Traveling Merchant</h2>
        {hasBookOfWar && discount > 0 && (
          <TooltipProvider>
            <Tooltip open={discountTooltip.isTooltipOpen("merchant-discount")}>
              <TooltipTrigger asChild>
                <span
                  className="text-blue-300/80 cursor-pointer hover:text-blue-300 transition-colors inline-block text-xl"
                  onClick={(e) => discountTooltip.handleTooltipClick("merchant-discount", e)}
                >
                  ✧
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs whitespace-nowrap">
                  {Math.round(discount * 100)}% discount due to Knowledge{isKnowledgeBonusMaxed(knowledge) ? " (max)" : ""}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Time remaining:</span>
          <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {eventChoices
          .filter((choice) => choice.id !== "say_goodbye")
          .map((choice) => {
            const testResult = choice.effect(gameState);
            const canAfford = Object.keys(testResult).length > 0;

            const labelText =
              typeof choice.label === "function"
                ? choice.label(gameState)
                : choice.label;

            const costText =
              typeof choice.cost === "function"
                ? choice.cost(gameState)
                : choice.cost;

            let hasSpace = true;
            if (canAfford && typeof labelText === 'string') {
              const labelMatch = labelText.match(/^\+(\d+)\s+(.+)$/);
              if (labelMatch) {
                const amount = parseInt(labelMatch[1]);
                const resourceName = labelMatch[2].toLowerCase().replace(/\s+/g, '_');

                if (isResourceLimited(resourceName, gameState)) {
                  const currentAmount = gameState.resources[resourceName as keyof typeof gameState.resources] || 0;
                  const limit = getResourceLimit(gameState);
                  hasSpace = currentAmount + amount <= limit;
                }
              }
            }

            const isPurchased = purchasedItems.has(choice.id);
            const isDisabled = isPurchased || !canAfford || !hasSpace || timeRemaining <= 0;

            const buttonContent = (
              <Button
                key={choice.id}
                onClick={
                  !mobileTooltip.isMobile
                    ? (e) => {
                        e.stopPropagation();
                        handleChoice(choice.id);
                      }
                    : undefined
                }
                variant="outline"
                className={`w-full justify-center text-xs h-10 ${isPurchased ? "opacity-30" : ""}`}
                disabled={isDisabled}
                button_id={`merchant-${choice.id}`}
              >
                <span className="block text-left leading-tight">
                  {isPurchased ? `✓ ${labelText}` : labelText}
                </span>
              </Button>
            );

            if (choice.cost && !isPurchased) {
              return (
                <TooltipProvider key={choice.id}>
                  <Tooltip open={mobileTooltip.isTooltipOpen(choice.id)}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={(e) =>
                          mobileTooltip.handleWrapperClick(choice.id, isDisabled, false, e)
                        }
                        onMouseDown={
                          mobileTooltip.isMobile
                            ? (e) => mobileTooltip.handleMouseDown(choice.id, isDisabled, false, e)
                            : undefined
                        }
                        onMouseUp={
                          mobileTooltip.isMobile
                            ? (e) => mobileTooltip.handleMouseUp(choice.id, isDisabled, () => handleChoice(choice.id), e)
                            : undefined
                        }
                        onTouchStart={
                          mobileTooltip.isMobile
                            ? (e) => mobileTooltip.handleTouchStart(choice.id, isDisabled, false, e)
                            : undefined
                        }
                        onTouchEnd={
                          mobileTooltip.isMobile
                            ? (e) => mobileTooltip.handleTouchEnd(choice.id, isDisabled, () => handleChoice(choice.id), e)
                            : undefined
                        }
                      >
                        {buttonContent}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs whitespace-nowrap">
                        {eventChoiceCostTooltip.getContent(costText)}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return buttonContent;
          })}

        {eventChoices.find((choice) => choice.id === "say_goodbye") && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleChoice("say_goodbye");
            }}
            variant="outline"
            className="text-xs h-10 px-4"
            disabled={timeRemaining <= 0}
            button_id="merchant-say-goodbye"
          >
            Say Goodbye
          </Button>
        )}
      </div>
    </div>
  );
}
