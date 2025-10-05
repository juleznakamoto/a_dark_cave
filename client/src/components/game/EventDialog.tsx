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

// Stat icon mapping
const statIcons: Record<string, { icon: string; color: string }> = {
  luck: { icon: '☆', color: 'text-green-300/80' },
  strength: { icon: '⬡', color: 'text-red-300/80' },
  knowledge: { icon: '✧', color: 'text-blue-300/80' },
  madness: { icon: '✺', color: 'text-violet-300/80' },
};

export default function EventDialog({
  isOpen,
  onClose,
  event,
}: EventDialogProps) {
  const { applyEventChoice } = useGameStore();
  const gameState = useGameStore();
  const hasScriptorium = gameState.buildings.scriptorium > 0;

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
    
    // Apply the choice through the store
    applyEventChoice(choiceId, eventId);

    // Mark as executed to prevent further choices
    fallbackExecutedRef.current = true;
  };

  const progress =
    event.isTimedChoice && timeRemaining !== null && totalTime > 0
      ? ((totalTime - timeRemaining) / totalTime) * 100
      : 0;

  const isMerchantEvent = event?.id.includes("merchant");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
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
          hasScriptorium={hasScriptorium}
        />
      ) : (
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-start justify-between">
              <DialogTitle className="text-lg font-semibold flex-1">
                {event.title || "Strange Encounter"}
              </DialogTitle>
              {hasScriptorium && event.relevant_stats && event.relevant_stats.length > 0 && (
                <div className="flex gap-1 ml-2">
                  {event.relevant_stats.map((stat) => {
                    const statInfo = statIcons[stat.toLowerCase()];
                    if (!statInfo) return null;
                    return (
                      <span
                        key={stat}
                        className={`text-xs ${statInfo.color}`}
                        title={stat}
                      >
                        {statInfo.icon}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
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
                className="w-full text-left justify-between"
                disabled={
                  (timeRemaining !== null && timeRemaining <= 0) ||
                  fallbackExecutedRef.current
                }
              >
                <span>{choice.label}</span>
                {hasScriptorium && choice.relevant_stats && choice.relevant_stats.length > 0 && (
                  <div className="flex gap-1 ml-2">
                    {choice.relevant_stats.map((stat) => {
                      const statInfo = statIcons[stat.toLowerCase()];
                      if (!statInfo) return null;
                      return (
                        <span
                          key={stat}
                          className={`text-xs ${statInfo.color}`}
                          title={stat}
                        >
                          {statInfo.icon}
                        </span>
                      );
                    })}
                  </div>
                )}
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