import React from "react";
import { LogEntry } from "@/game/rules/events";
import { GameState } from "@shared/schema";
import { eventChoiceCostTooltip } from "@/game/rules/tooltips";
import { getTotalKnowledge } from "@/game/rules/effectsCalculation";
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
import { useMobileButtonTooltip, useMobileTooltip } from "@/hooks/useMobileTooltip";

interface MerchantDialogProps {
  event: LogEntry;
  gameState: GameState;
  timeRemaining: number | null;
  totalTime: number;
  progress: number;
  purchasedItems: Set<string>;
  fallbackExecutedRef: React.MutableRefObject<boolean>;
  onChoice: (choiceId: string) => void;
  hasScriptorium: boolean;
}

export default function MerchantDialog({
  event,
  gameState,
  timeRemaining,
  progress,
  purchasedItems,
  fallbackExecutedRef,
  onChoice,
  hasScriptorium,
}: MerchantDialogProps) {
  const eventChoices = event.choices || [];
  const mobileTooltip = useMobileButtonTooltip();
  const discountTooltip = useMobileButtonTooltip();

  // Calculate discount based on knowledge
  const knowledge = getTotalKnowledge(gameState);
  let discount = 0;
  if (knowledge >= 10) discount = 5;
  if (knowledge >= 20) discount = 10;
  if (knowledge >= 30) discount = 15;
  if (knowledge >= 40) discount = 20;
  if (knowledge >= 50) discount = 25;

  const hasBookOfWar = gameState.books?.book_of_war;

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
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            {event.title || "Strange Encounter"}
            {hasBookOfWar && discount > 0 && (
              <TooltipProvider>
                <Tooltip open={discountTooltip.isMobile ? discountTooltip.isTooltipOpen('merchant-discount') : undefined}>
                  <TooltipTrigger asChild>
                    <span
                      className="text-blue-300/80 cursor-pointer hover:text-blue-300 transition-colors inline-block ml-1"
                      style={{ fontSize: '16px', lineHeight: '16px', width: '16px', height: '16px' }}
                      onClick={discountTooltip.isMobile ? (e) => {
                        e.stopPropagation();
                        discountTooltip.handleWrapperClick('merchant-discount', false, false, e);
                      } : undefined}
                      onMouseDown={discountTooltip.isMobile ? (e) => {
                        discountTooltip.handleMouseDown('merchant-discount', false, false, e);
                      } : undefined}
                      onMouseUp={discountTooltip.isMobile ? (e) => {
                        discountTooltip.handleMouseUp('merchant-discount', false, () => {}, e);
                      } : undefined}
                      onTouchStart={discountTooltip.isMobile ? (e) => {
                        discountTooltip.handleTouchStart('merchant-discount', false, false, e);
                      } : undefined}
                      onTouchEnd={discountTooltip.isMobile ? (e) => {
                        discountTooltip.handleTouchEnd('merchant-discount', false, () => {}, e);
                      } : undefined}
                    >
                      ✧
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs whitespace-nowrap">
                      {discount}% Discount due to Knowledge
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
                  choice.id.startsWith("trade_") &&
                  choice.id !== "say_goodbye",
              )
              .map((choice) => {
                // Check if choice can be afforded (for merchant trades)
                const testResult = choice.effect(gameState);
                const canAfford = Object.keys(testResult).length > 0;

                // Evaluate label if it's a function
                const labelText = typeof choice.label === 'function'
                  ? choice.label(gameState)
                  : choice.label;

                // Evaluate cost if it's a function
                const costText = typeof choice.cost === 'function'
                  ? choice.cost(gameState)
                  : choice.cost;

                const isPurchased = purchasedItems.has(choice.id);
                const isDisabled = (timeRemaining !== null && timeRemaining <= 0) ||
                                   fallbackExecutedRef.current ||
                                   isPurchased ||
                                   !canAfford;


                const buttonContent = (
                  <Button
                    key={choice.id}
                    onClick={!mobileTooltip.isMobile ? (e) => {
                      e.stopPropagation();
                      onChoice(choice.id);
                    } : undefined}
                    variant="outline"
                    className={`w-full justify-center text-xs h-10 ${isPurchased ? "opacity-30" : ""}`}
                    disabled={isDisabled}
                    button_id={`merchant-${choice.id}`}
                  >
                    <span className="block text-left leading-tight">
                      {isPurchased ? `✓ ${choice.label}` : choice.label}
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
                            onClick={(e) => mobileTooltip.handleWrapperClick(choice.id, isDisabled, false, e)}
                            onMouseDown={mobileTooltip.isMobile ? (e) => mobileTooltip.handleMouseDown(choice.id, isDisabled, false, e) : undefined}
                            onMouseUp={mobileTooltip.isMobile ? (e) => mobileTooltip.handleMouseUp(choice.id, isDisabled, () => onChoice(choice.id), e) : undefined}
                            onTouchStart={mobileTooltip.isMobile ? (e) => mobileTooltip.handleTouchStart(choice.id, isDisabled, false, e) : undefined}
                            onTouchEnd={mobileTooltip.isMobile ? (e) => mobileTooltip.handleTouchEnd(choice.id, isDisabled, () => onChoice(choice.id), e) : undefined}
                          >
                            {buttonContent}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs whitespace-nowrap">
                            {eventChoiceCostTooltip.getContent(choice.cost)}
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
                  onChoice("say_goodbye");
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
            <Progress
              value={progress}
              className="h-2 timer-progress"
            />
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}