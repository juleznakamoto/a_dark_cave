import React, { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { getTotalKnowledge } from "@/game/rules/effects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import MerchantDialog from "./MerchantDialog";

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: LogEntry | null;
}

export default function EventDialog({
  isOpen,
  onClose,
  event,
}: EventDialogProps) {
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
    const decisionTime = (event.baseDecisionTime || 15) + 0.25 * knowledge;

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

        const eventId = event.id.split("-")[0];

        if (event.fallbackChoice) {
          // Use defined fallback choice
          applyEventChoice(event.fallbackChoice.id, eventId);
        } else if (eventChoices.length > 0) {
          // No fallback defined, choose randomly from available choices
          const randomChoice =
            eventChoices[Math.floor(Math.random() * eventChoices.length)];
          applyEventChoice(randomChoice.id, eventId);
        }

        onClose();
      }
    }, 100);

    return () => {
      clearInterval(interval);
      fallbackExecutedRef.current = false;
    };
  }, [event?.id, event?.isTimedChoice, event?.baseDecisionTime, isOpen]);

  // Use choices directly from the event (they're already generated fresh for merchant events)
  const eventChoices = event?.choices || [];

  if (!event || !eventChoices.length) return null;

  const handleChoice = (choiceId: string) => {
    if (fallbackExecutedRef.current) {
      return;
    }

    const eventId = event!.id.split("-")[0];
    
    // Mark as executed to prevent further choices
    fallbackExecutedRef.current = true;

    // Apply the choice through the store (it will handle dialog state)
    applyEventChoice(choiceId, eventId);
  };

  const progress =
    event.isTimedChoice && timeRemaining !== null && totalTime > 0
      ? ((totalTime - timeRemaining) / totalTime) * 100
      : 0;

  const isMerchantEvent = event?.id.includes("merchant");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        // Empty handler - we don't want automatic closing
        // All closing should be handled explicitly through handleChoice
      }}
    >
      {isMerchantEvent ? (
        <MerchantDialog
          event={event}
          gameState={gameState}
          timeRemaining={timeRemaining}
          totalTime={totalTime}
          progress={progress}
          purchasedItems={purchasedItems}
          fallbackExecutedRef={fallbackExecutedRef}
          onChoice={handleChoice}
        />
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
            {eventChoices.map((choice) => (
              <Button
                key={choice.id}
                onClick={() => handleChoice(choice.id)}
                variant="outline"
                className="w-full text-left justify-start"
                disabled={
                  (timeRemaining !== null && timeRemaining <= 0) ||
                  fallbackExecutedRef.current
                }
              >
                {choice.label}
              </Button>
            ))}
          </div>

          {/* Timer bar for timed choices */}
          {event.isTimedChoice && timeRemaining !== null && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
              </div>
              <Progress value={progress} className="h-2 timer-progress" />
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}