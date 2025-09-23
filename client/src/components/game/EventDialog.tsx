import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/game/state';
import { LogEntry } from '@/game/rules/events';
import { getTotalKnowledge } from '@/game/rules/effects';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from "@/lib/utils";

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: LogEntry | null;
}

export default function EventDialog({ isOpen, onClose, event }: EventDialogProps) {
  const { applyEventChoice } = useGameStore();
  const gameState = useGameStore();

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const fallbackExecutedRef = useRef(false);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());

  // Reset purchased items when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPurchasedItems(new Set());
    }
  }, [isOpen, event?.id]);

  // Initialize timer for timed choices
  useEffect(() => {
    if (!event || !event.isTimedChoice || !isOpen) {
      setTimeRemaining(null);
      setTotalTime(0);
      fallbackExecutedRef.current = false;
      return;
    }

    const knowledge = getTotalKnowledge(gameState);
    const decisionTime = (event.baseDecisionTime || 15) + (0.5 * knowledge);

    setTotalTime(decisionTime);
    setTimeRemaining(decisionTime);
    startTimeRef.current = Date.now();
    fallbackExecutedRef.current = false;

    const interval = setInterval(() => {
      if (fallbackExecutedRef.current) {
        return;
      }

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, decisionTime - elapsed);

      setTimeRemaining(remaining);

      if (remaining <= 0 && !fallbackExecutedRef.current) {
        fallbackExecutedRef.current = true;
        clearInterval(interval);

        // Time expired, execute fallback choice
        if (event.fallbackChoice) {
          const eventId = event.id.split('-')[0];
          applyEventChoice(event.fallbackChoice.id, eventId);
          onClose();
        }
      }
    }, 100);

    return () => {
      clearInterval(interval);
      fallbackExecutedRef.current = false;
    };
  }, [event?.id, event?.isTimedChoice, event?.baseDecisionTime, isOpen]);

  if (!event || !event.choices) return null;

  const handleChoice = (choiceId: string) => {
    if (fallbackExecutedRef.current) {
      return;
    }

    const eventId = event!.id.split('-')[0];
    applyEventChoice(choiceId, eventId);

    // For merchant trades, mark as purchased but don't close dialog
    if (choiceId.startsWith('trade_')) {
      setPurchasedItems(prev => {
        const newPurchasedItems = new Set([...prev, choiceId]);
        
        // Check if all trade choices are now purchased
        const allTradeChoices = event.choices.filter(choice => choice.id.startsWith('trade_'));
        const allPurchased = allTradeChoices.every(choice => newPurchasedItems.has(choice.id));
        
        // If all trades are purchased, close the dialog
        if (allPurchased) {
          setTimeout(() => {
            fallbackExecutedRef.current = true;
            onClose();
          }, 500); // Small delay to show the purchased state
        }
        
        return newPurchasedItems;
      });
      return; // Don't close dialog immediately for trade purchases
    }

    // Close dialog for fallback choices
    if (choiceId === event?.fallbackChoice?.id) {
      fallbackExecutedRef.current = true;
      onClose();
    }
  };

  const progress = event.isTimedChoice && timeRemaining !== null && totalTime > 0
    ? ((totalTime - timeRemaining) / totalTime) * 100
    : 0;

  const isMerchantEvent = event?.id.includes('merchant');

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      {isMerchantEvent ? (
        <DialogPortal>
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-black/0 animate-[fade-to-black_8s_ease-in-out_forwards]"
            )}
          />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-md [&>button]:hidden"
            )}
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {event.title || "Strange Encounter"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-2">
                {event.message}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              {/* Trade buttons in 2-column grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {event.choices.filter(choice => 
                  choice.id.startsWith('trade_') && 
                  choice.id !== 'say_goodbye' && 
                  !purchasedItems.has(choice.id)
                ).map((choice) => {
                  // Check if choice can be afforded (for merchant trades)
                  const testResult = choice.effect(gameState);
                  const canAfford = Object.keys(testResult).length > 0;
                  const isPurchased = purchasedItems.has(choice.id);

                  // Use the original label from the trade object
                  const displayLabel = choice.label;

                  // Extract cost from the choice label (format: "Buy X for Y resource")
                  // Extract cost by examining what the effect would consume
                  const getCostDisplay = () => {
                    try {
                      // Create a test state to see what resources would be consumed
                      const testResult = choice.effect(gameState);
                      if (testResult.resources) {
                        // Find resources that would be decreased (negative values in the effect)
                        const consumedResources = Object.entries(testResult.resources)
                          .filter(([resource, newAmount]) => {
                            const currentAmount = gameState.resources[resource] || 0;
                            return typeof newAmount === 'number' && newAmount < currentAmount;
                          })
                          .map(([resource, newAmount]) => {
                            const currentAmount = gameState.resources[resource] || 0;
                            const cost = currentAmount - (newAmount as number);
                            return `${cost} ${resource}`;
                          });

                        return consumedResources[0] || 'Unknown cost';
                      }
                    } catch (error) {
                      // Fallback to parsing the label if effect fails
                      const costMatch = choice.label.match(/for (\d+) (\w+)$/);
                      return costMatch ? `${costMatch[1]} ${costMatch[2]}` : 'Unknown cost';
                    }
                    return 'Unknown cost';
                  };

                  const costDisplay = getCostDisplay();

                  const buttonContent = (
                    <Button
                      key={choice.id}
                      onClick={() => handleChoice(choice.id)}
                      variant={isPurchased ? "secondary" : "outline"}
                      className="text-left justify-start text-xs h-auto py-3 px-2 min-h-[3rem]"
                      disabled={(timeRemaining !== null && timeRemaining <= 0) || fallbackExecutedRef.current || !canAfford || isPurchased}
                    >
                      <span className="block text-left leading-tight">
                        {isPurchased ? '✓ Purchased' : displayLabel}
                      </span>
                    </Button>
                  );

                  // Only show hover for non-purchased items
                  if (isPurchased) {
                    return buttonContent;
                  }

                  return (
                    <HoverCard key={choice.id} openDelay={200} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        {buttonContent}
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto p-2">
                        <div className="text-xs whitespace-nowrap">
                          {costDisplay}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            </div>

            

            {/* Timer bar for timed choices */}
            {event.isTimedChoice && timeRemaining !== null && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{Math.ceil(Math.max(0, timeRemaining))}s</span>
                </div>
                <Progress
                  value={progress}
                  className="h-2"
                />
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPortal>
      ) : (
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {event.title || "Strange Encounter"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {event.message}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            {event.choices.map((choice) => {
              // Check if choice can be afforded (for merchant trades)
              let canAfford = true;
              if (choice.id.startsWith('trade_') && choice.id !== 'say_goodbye') {
                // Check affordability for merchant trades
                const testResult = choice.effect(gameState);
                canAfford = Object.keys(testResult).length > 0;
              }

              const isPurchased = purchasedItems.has(choice.id);

              return (
                <Button
                  key={choice.id}
                  onClick={() => handleChoice(choice.id)}
                  variant={isPurchased ? "secondary" : "outline"}
                  className="w-full text-left justify-start"
                  disabled={(timeRemaining !== null && timeRemaining <= 0) || fallbackExecutedRef.current || !canAfford || isPurchased}
                >
                  {isPurchased ? '✓ Purchased' : choice.label}
                </Button>
              );
            })}
          </div>

          {/* Timer bar for timed choices */}
          {event.isTimedChoice && timeRemaining !== null && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{Math.ceil(Math.max(0, timeRemaining))}s</span>
              </div>
              <Progress
                value={progress}
                className="h-2"
              />
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}