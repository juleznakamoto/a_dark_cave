import React, { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { getTotalKnowledge } from "@/game/rules/effectsCalculation";
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
import CubeDialog from "./CubeDialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// Helper function to extract cost from choice effect
function extractCostFromChoice(choice: any, gameState: any): string | null {
  // For woodcutter events, check if the choice has a cost property
  if (choice.cost) {
    return choice.cost;
  }

  // Try to extract cost from the effect function by testing it
  try {
    const testResult = choice.effect(gameState);
    
    // Check if the result contains a _cost property (some events use this)
    if (testResult._cost) {
      return testResult._cost;
    }
    
    // Check for resource costs in the test result
    const costs: string[] = [];
    if (testResult.resources) {
      Object.entries(testResult.resources).forEach(([resource, value]) => {
        const currentValue = gameState.resources[resource as keyof typeof gameState.resources] || 0;
        const cost = currentValue - (value as number);
        if (cost > 0) {
          costs.push(`${cost} ${resource}`);
        }
      });
    }
    
    if (costs.length > 0) {
      return costs.join(", ");
    }
  } catch (e) {
    // If effect execution fails, ignore
  }

  return null;
}

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
    const isMerchantEvent = event?.id.includes("merchant");
    const isSayGoodbye = choiceId === "say_goodbye";

    // For merchant "say goodbye", just close the dialog without processing
    if (isMerchantEvent && isSayGoodbye) {
      fallbackExecutedRef.current = true;
      onClose();
      return;
    }

    // For merchant trades (not goodbye), mark item as purchased but don't close dialog
    if (isMerchantEvent && !isSayGoodbye) {
      const choice = eventChoices.find((c) => c.id === choiceId);
      if (choice) {
        const result = choice.effect(gameState);

        // Apply state changes directly to avoid triggering new dialogs
        if (result.resources) {
          Object.entries(result.resources).forEach(([resource, value]) => {
            gameState.updateResource(resource as keyof typeof gameState.resources, value - (gameState.resources[resource as keyof typeof gameState.resources] || 0));
          });
        }
        if (result.tools) {
          Object.entries(result.tools).forEach(([tool, value]) => {
            if (value) {
              gameState.tools[tool as keyof typeof gameState.tools] = true;
            }
          });
        }
        if (result.relics) {
          Object.entries(result.relics).forEach(([relic, value]) => {
            if (value) {
              gameState.relics[relic as keyof typeof gameState.relics] = true;
            }
          });
        }
        if (result.schematics) {
          Object.entries(result.schematics).forEach(([schematic, value]) => {
            if (value) {
              gameState.schematics[schematic as keyof typeof gameState.schematics] = true;
            }
          });
        }

        // Don't add _logMessage to the log - it's only for dialog feedback
        // The message will be shown in the dialog UI instead

        setPurchasedItems(prev => new Set(prev).add(choiceId));
      }
      return;
    }

    // For non-merchant events, process normally
    fallbackExecutedRef.current = true;
    applyEventChoice(choiceId, eventId);
    onClose();
  };

  const progress =
    event.isTimedChoice && timeRemaining !== null && totalTime > 0
      ? ((totalTime - timeRemaining) / totalTime) * 100
      : 0;

  const isMerchantEvent = event?.id.includes("merchant");
  const isCubeEvent = event?.id.includes("cube");
  const isWoodcutterEvent = event?.id.includes("woodcutter");

  return (
    <>
      {isCubeEvent ? (
        <CubeDialog
          isOpen={isOpen}
          event={event}
          onChoice={handleChoice}
          fallbackExecutedRef={fallbackExecutedRef}
        />
      ) : (
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
            <DialogContent className="sm:max-w-md [&>button]:hidden">
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
            <DialogDescription className="text-sm text-gray-400 mt-2">
              {event.message}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {eventChoices.map((choice) => {
              const cost = isWoodcutterEvent ? extractCostFromChoice(choice, gameState) : null;
              
              // Check if choice can be afforded (same logic as merchant events)
              const testResult = choice.effect(gameState);
              const canAfford = Object.keys(testResult).length > 0;
              
              const isDisabled = !canAfford ||
                (timeRemaining !== null && timeRemaining <= 0) ||
                fallbackExecutedRef.current;
              
              const buttonContent = (
                <Button
                  onClick={() => handleChoice(choice.id)}
                  variant="outline"
                  className="w-full text-left justify-between"
                  disabled={isDisabled}
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
              );
              
              return cost ? (
                <HoverCard key={choice.id} openDelay={100} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div>{buttonContent}</div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-auto p-2">
                    <div className="text-xs whitespace-nowrap">
                      -{cost}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ) : (
                <div key={choice.id}>{buttonContent}</div>
              );
            })}
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
      )}
    </>
  );
}