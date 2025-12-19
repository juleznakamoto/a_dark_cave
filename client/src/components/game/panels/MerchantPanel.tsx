
import { useGameStore } from "@/game/state";
import { useEffect, useState, useRef } from "react";
import { LogEntry } from "@/game/rules/events";
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

export default function MerchantPanel() {
  const { gameState, eventDialog, setEventDialog, addLog } = useGameStore();
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const totalTime = 120; // 2 minutes in seconds
  const mobileTooltip = useMobileButtonTooltip();
  const discountTooltip = useMobileTooltip();
  const fallbackExecutedRef = useRef(false);

  const event = eventDialog.currentEvent;

  // Initialize timer when merchant appears
  useEffect(() => {
    if (event?.id.includes("merchant")) {
      setTimeRemaining(totalTime);
      setPurchasedItems(new Set());
      fallbackExecutedRef.current = false;
    }
  }, [event?.id]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Auto-close when time runs out
  useEffect(() => {
    if (timeRemaining === 0 && !fallbackExecutedRef.current) {
      fallbackExecutedRef.current = true;
      addLog({
        id: `merchant-leaves-${Date.now()}`,
        message: "The merchant packs up his wares and departs.",
        timestamp: Date.now(),
      });
      setEventDialog(false);
    }
  }, [timeRemaining, addLog, setEventDialog]);

  if (!event || !event.id.includes("merchant")) {
    return null;
  }

  const eventChoices = event.choices || [];
  const knowledge = getTotalKnowledge(gameState);
  const discount = calculateMerchantDiscount(knowledge);
  const hasBookOfWar = gameState.books?.book_of_war;
  const progress = timeRemaining !== null ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;

  const handleChoice = (choiceId: string) => {
    if (fallbackExecutedRef.current) return;

    const isSayGoodbye = choiceId === "say_goodbye";

    if (isSayGoodbye) {
      fallbackExecutedRef.current = true;
      addLog({
        id: `merchant-goodbye-${Date.now()}`,
        message: "You bid the merchant farewell. He tips his hat and mutters about the road ahead.",
        timestamp: Date.now(),
      });
      setEventDialog(false);
      return;
    }

    const choice = eventChoices.find((c) => c.id === choiceId);
    if (choice) {
      const result = choice.effect(gameState);
      if (Object.keys(result).length > 0) {
        useGameStore.setState(result);

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

  return (
    <div className="space-y-4 pr-4">
      {/* Timer display */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            Merchant departs in: {Math.floor((timeRemaining || 0) / 60)}:{String((timeRemaining || 0) % 60).padStart(2, '0')}
          </span>
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
        <Progress value={progress} className="h-2 timer-progress" />
      </div>

      {/* Trade buttons */}
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
            const isDisabled =
              (timeRemaining !== null && timeRemaining <= 0) ||
              fallbackExecutedRef.current ||
              isPurchased ||
              !canAfford ||
              !hasSpace;

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
        {eventChoices.find((choice) => choice.id === "say_goodbye") && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleChoice("say_goodbye");
            }}
            variant="outline"
            className="text-xs h-10 px-4"
            disabled={
              (timeRemaining !== null && timeRemaining <= 0) ||
              fallbackExecutedRef.current
            }
            button_id="merchant-say-goodbye"
          >
            Say Goodbye
          </Button>
        )}
      </div>
    </div>
  );
}
