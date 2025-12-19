
import React, { useEffect, useState } from "react";
import { useGameStore } from "@/game/state";
import { Button } from "@/components/ui/button";
import { generateMerchantChoices } from "@/game/rules/eventsMerchant";
import { getTotalKnowledge } from "@/game/rules/effectsCalculation";
import { calculateMerchantDiscount, isKnowledgeBonusMaxed } from "@/game/rules/effectsStats";
import { eventChoiceCostTooltip } from "@/game/rules/tooltips";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileButtonTooltip, useMobileTooltip } from "@/hooks/useMobileTooltip";
import { isResourceLimited, getResourceLimit } from "@/game/resourceLimits";
import { Progress } from "@/components/ui/progress";

export default function MerchantPanel() {
  const {
    merchantTab,
    setMerchantTab,
    addMerchantPurchase,
    addLogEntry,
    ...gameState
  } = useGameStore();
  const mobileTooltip = useMobileButtonTooltip();
  const discountTooltip = useMobileTooltip();

  const [choices, setChoices] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Calculate discount based on knowledge
  const knowledge = getTotalKnowledge(gameState);
  const discount = calculateMerchantDiscount(knowledge);
  const hasBookOfWar = gameState.books?.book_of_war;

  // Generate merchant choices when tab opens
  useEffect(() => {
    if (merchantTab.isOpen) {
      const merchantChoices = generateMerchantChoices(gameState);
      setChoices(merchantChoices.filter(c => c.id !== "say_goodbye"));
    }
  }, [merchantTab.isOpen]);

  // Timer countdown
  useEffect(() => {
    if (!merchantTab.isOpen || !merchantTab.expiresAt) return;

    const interval = setInterval(() => {
      const remaining = merchantTab.expiresAt! - Date.now();
      if (remaining <= 0) {
        setTimeRemaining(0);
        setMerchantTab(false);
        addLogEntry({
          message: "The merchant packs up his wares and departs into the wilderness.",
        });
      } else {
        setTimeRemaining(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [merchantTab.isOpen, merchantTab.expiresAt]);

  const handleChoice = (choiceId: string) => {
    const choice = choices.find((c) => c.id === choiceId);
    if (!choice) return;

    const result = choice.effect(gameState);
    if (Object.keys(result).length > 0) {
      // Apply the effect
      useGameStore.setState(result);

      // Log message if present
      if (result._logMessage) {
        addLogEntry({ message: result._logMessage });
      }

      // Track purchase
      addMerchantPurchase(choiceId);

      // Increment merchant purchase counter
      const currentCount = Number(gameState.story?.seen?.merchantPurchases) || 0;
      const newCount = currentCount + 1;
      
      const currentStory = gameState.story || { seen: {} };
      const updatedStory = {
        ...currentStory,
        seen: {
          ...currentStory.seen,
          merchantPurchases: newCount,
        },
      };
      
      useGameStore.setState({ story: updatedStory });
    }
  };

  const handleSayGoodbye = () => {
    setMerchantTab(false);
    addLogEntry({
      message: "You bid the merchant farewell. He tips his hat and mutters about the road ahead.",
    });
  };

  if (!merchantTab.isOpen) return null;

  const progress = timeRemaining !== null && merchantTab.expiresAt
    ? ((120000 - timeRemaining) / 120000) * 100
    : 0;

  const minutes = timeRemaining ? Math.floor(timeRemaining / 60000) : 0;
  const seconds = timeRemaining ? Math.floor((timeRemaining % 60000) / 1000) : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Traveling Merchant</h2>
        {hasBookOfWar && discount > 0 && (
          <TooltipProvider>
            <Tooltip open={discountTooltip.isTooltipOpen("merchant-discount")}>
              <TooltipTrigger asChild>
                <span
                  className="text-blue-300/80 cursor-pointer hover:text-blue-300 transition-colors inline-block text-xl"
                  onClick={(e) =>
                    discountTooltip.handleTooltipClick("merchant-discount", e)
                  }
                >
                  ✧
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs whitespace-nowrap">
                  {Math.round(discount * 100)}% discount due to Knowledge
                  {isKnowledgeBonusMaxed(knowledge) ? " (max)" : ""}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Timer */}
      {timeRemaining !== null && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Time remaining</span>
            <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Trade buttons */}
      <div className="grid grid-cols-2 gap-2">
        {choices.map((choice) => {
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

          const isPurchased = merchantTab.purchasedItems.has(choice.id);
          const isDisabled = isPurchased || !canAfford || !hasSpace;

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
                        mobileTooltip.handleWrapperClick(
                          choice.id,
                          isDisabled,
                          false,
                          e,
                        )
                      }
                      onMouseDown={
                        mobileTooltip.isMobile
                          ? (e) =>
                              mobileTooltip.handleMouseDown(
                                choice.id,
                                isDisabled,
                                false,
                                e,
                              )
                          : undefined
                      }
                      onMouseUp={
                        mobileTooltip.isMobile
                          ? (e) =>
                              mobileTooltip.handleMouseUp(
                                choice.id,
                                isDisabled,
                                () => handleChoice(choice.id),
                                e,
                              )
                          : undefined
                      }
                      onTouchStart={
                        mobileTooltip.isMobile
                          ? (e) =>
                              mobileTooltip.handleTouchStart(
                                choice.id,
                                isDisabled,
                                false,
                                e,
                              )
                          : undefined
                      }
                      onTouchEnd={
                        mobileTooltip.isMobile
                          ? (e) =>
                              mobileTooltip.handleTouchEnd(
                                choice.id,
                                isDisabled,
                                () => handleChoice(choice.id),
                                e,
                              )
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

        {/* Say Goodbye button */}
        <Button
          onClick={handleSayGoodbye}
          variant="outline"
          className="text-xs h-10 px-4"
          button_id="merchant-say-goodbye"
        >
          Say Goodbye
        </Button>
      </div>
    </div>
  );
}
