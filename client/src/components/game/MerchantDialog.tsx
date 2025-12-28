import React from "react";
import { LogEntry } from "@/game/rules/events";
import { GameState } from "@shared/schema";
import { getMerchantTooltip } from "@/game/rules/tooltips";
import { getTotalKnowledge } from "@/game/rules/effectsCalculation";
import { calculateMerchantDiscount, isKnowledgeBonusMaxed } from "@/game/rules/effectsStats";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useMobileButtonTooltip,
  useMobileTooltip,
} from "@/hooks/useMobileTooltip";
import { isResourceLimited, getResourceLimit } from "@/game/resourceLimits";
import { logger } from "@/lib/logger";

interface MerchantDialogProps {
  event: LogEntry;
  gameState: GameState;
  timeRemaining: number | null;
  totalTime: number;
  progress: number;
  purchasedItems: Set<string>;
  fallbackExecutedRef: React.MutableRefObject<boolean>;
  onChoice: (choiceId: string) => void;
}

export default function MerchantDialog({
  event,
  gameState,
  timeRemaining,
  progress,
  purchasedItems,
  fallbackExecutedRef,
  onChoice,
}: MerchantDialogProps) {
  // Guard against null event
  if (!event) {
    return null;
  }

  const eventChoices = event.choices || [];
  const mobileTooltip = useMobileButtonTooltip();
  const discountTooltip = useMobileTooltip();

  // Calculate discount based on knowledge
  const knowledge = getTotalKnowledge(gameState);
  const discount = calculateMerchantDiscount(knowledge);
  const hasBookOfWar = gameState.books?.book_of_war;

  const handleChoice = (choiceId: string) => {
    const isSayGoodbye = choiceId === "say_goodbye";

    if (isSayGoodbye) {
      logger.log('[MERCHANT TRADES] User said goodbye to merchant');
      onChoice(choiceId);
      return;
    }

    // Execute the trade directly based on merchant trade data
    logger.log('[MERCHANT TRADES] Purchase completed:', {
      choiceId,
    });
    onChoice(choiceId);
  };


  return (
    <DialogPortal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-black/0 animate-[fade-to-black_8s_ease-in-out_forwards]",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-[95vw] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-md [&>button]:hidden",
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center justify-between">
            <span>{event.title || "Strange Encounter"}</span>
            {hasBookOfWar && discount > 0 && (
              <TooltipProvider>
                <Tooltip
                  open={discountTooltip.isTooltipOpen("merchant-discount")}
                >
                  <TooltipTrigger asChild>
                    <span
                      className="text-blue-300/80 cursor-pointer hover:text-blue-300 transition-colors inline-block text-xl"
                      onClick={(e) =>
                        discountTooltip.handleTooltipClick(
                          "merchant-discount",
                          e,
                        )
                      }
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
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 mt-2">
            {event.message}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Trade buttons and Say Goodbye button in 2-column grid */}
          <div className="grid grid-cols-2 gap-2">
            {eventChoices
              .filter(
                (choice) =>
                  choice.id !== "say_goodbye",
              )
              .map((choice) => {
                const labelText =
                  typeof choice.label === "function"
                    ? choice.label(gameState)
                    : choice.label;

                const costText =
                  typeof choice.cost === "function"
                    ? choice.cost(gameState)
                    : choice.cost;

                // Parse trade info from label/cost to check affordability
                const labelMatch = labelText.match(/^\+(\d+)\s+(.+)$/);
                const costMatch = costText.match(/^(\d+)\s+(.+)$/);
                
                let canAfford = false;
                let hasSpace = true;
                
                if (labelMatch && costMatch) {
                  const buyAmount = parseInt(labelMatch[1]);
                  const buyResource = labelMatch[2].toLowerCase().replace(/\s+/g, '_');
                  const sellAmount = parseInt(costMatch[1]);
                  const sellResource = costMatch[2].toLowerCase().replace(/\s+/g, '_');
                  
                  // Check if player can afford
                  canAfford = (gameState.resources[sellResource as keyof typeof gameState.resources] || 0) >= sellAmount;
                  
                  // Check if there's space for the resource being bought
                  if (isResourceLimited(buyResource, gameState)) {
                    const currentAmount = gameState.resources[buyResource as keyof typeof gameState.resources] || 0;
                    const limit = getResourceLimit(gameState);
                    hasSpace = currentAmount + buyAmount <= limit;
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

                // If there's cost info, wrap in Tooltip
                if (choice.cost && !isPurchased) {
                  return (
                    <TooltipProvider key={choice.id}>
                      <Tooltip open={mobileTooltip.isTooltipOpen(choice.id)}>
                        <TooltipTrigger asChild>
                          <div
                            onClick={(e) => {
                              logger.log(`[MERCHANT TOOLTIP] Showing tooltips for choice: ${choice.id}, label: ${labelText}, cost: ${costText}`);
                              mobileTooltip.handleTooltipClick(
                                choice.id,
                                isDisabled,
                                false,
                                e,
                              );
                            }}
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
                        <TooltipContent side="top">
                          <div className="text-xs">
                            {getMerchantTooltip.getContent(labelText, costText, gameState)}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return buttonContent;
              })}

            {/* Say Goodbye button in the same grid */}
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

        {/* Timer bar for timed choices */}
        {event.isTimedChoice && timeRemaining !== null && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground"></div>
            <Progress value={progress} className="h-2 timer-progress" />
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}