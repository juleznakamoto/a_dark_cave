import React, { useState, useEffect, useMemo } from "react";
import { useGameStore } from "@/game/state";
import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { merchantTooltip } from "@/game/rules/tooltips";
import { EventChoice } from "@/game/rules/events";
import { logger } from "@/lib/logger";
import { isKnowledgeBonusMaxed } from "@/game/rules/eventsMerchant";
import { calculateMerchantDiscount } from "@/game/rules/effectsStats";

// Stat icon mapping
const statIcons: Record<string, { icon: string; color: string }> = {
  luck: { icon: "☆", color: "text-green-300/80" },
  strength: { icon: "⬡", color: "text-red-300/80" },
  knowledge: { icon: "✧", color: "text-blue-300/80" },
};

export default function TimedEventPanel() {
  const {
    timedEventTab,
    applyEventChoice,
    setTimedEventTab,
    setHighlightedResources,
  } = useGameStore();
  const gameState = useGameStore();

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [safetyTimeRemaining, setSafetyTimeRemaining] = useState<number>(0);

  // Get merchant trades from state (generated once when event starts)
  const isMerchantEvent = timedEventTab.event?.id.split("-")[0] === "merchant";
  const eventChoices: EventChoice[] = useMemo(() => {
    if (!timedEventTab.event) {
      logger.log("[TIMED EVENT PANEL] No event, returning empty choices");
      return [];
    }

    if (isMerchantEvent) {
      // CRITICAL: Use state.merchantTrades as the single source of truth
      logger.log("[TIMED EVENT PANEL] Merchant event, using merchantTrades from state:", {
        eventId: timedEventTab.event.id,
        choicesCount: gameState.merchantTrades?.choices?.length || 0,
        choices: gameState.merchantTrades?.choices,
      });
      return Array.isArray(gameState.merchantTrades?.choices) ? gameState.merchantTrades.choices : [];
    }

    logger.log("[TIMED EVENT PANEL] Non-merchant event, using event choices:", {
      eventId: timedEventTab.event.id,
      choicesCount: typeof timedEventTab.event.choices === 'function' ? 'dynamic' : timedEventTab.event.choices?.length || 0,
    });
    const choicesRaw = typeof timedEventTab.event.choices === 'function' 
      ? timedEventTab.event.choices(gameState)
      : timedEventTab.event.choices;
    const choices = Array.isArray(choicesRaw) ? choicesRaw : [];
    return choices;
  }, [isMerchantEvent, timedEventTab.event, gameState.merchantTrades, gameState]);

  useEffect(() => {
    if (
      !timedEventTab.isActive ||
      !timedEventTab.expiryTime ||
      !timedEventTab.event
    ) {
      setTimeRemaining(0);
      setSafetyTimeRemaining(0);
      return;
    }

    const event = timedEventTab.event;
    const expiryTime = timedEventTab.expiryTime;
    const startTime = timedEventTab.startTime || Date.now();
    const safetyEndTime = startTime + 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiryTime - now);
      const safetyRemaining = Math.max(0, safetyEndTime - now);

      setTimeRemaining(remaining);
      setSafetyTimeRemaining(safetyRemaining);

      if (remaining <= 0) {
        // Execute fallback choice when timer expires
        if (event) {
          const timedEventId = event.eventId || event.id.split("-")[0];

          // Use the event's defined fallbackChoice if available
          if (
            event.fallbackChoice &&
            typeof event.fallbackChoice.effect === "function"
          ) {
            applyEventChoice(event.fallbackChoice.id, timedEventId, event);
          } else {
            // Fallback to looking for "doNothing" choice
            const choices = typeof event.choices === "function"
              ? event.choices(gameState)
              : event.choices;
            const fallbackChoice = Array.isArray(choices)
              ? choices.find((c) => c.id === "doNothing")
              : undefined;
            if (fallbackChoice && typeof fallbackChoice.effect === "function") {
              applyEventChoice(fallbackChoice.id, timedEventId, event);
            }
          }
        }

        // Clear highlights and auto-close the tab
        setHighlightedResources([]);
        setTimedEventTab(false);

        // The useEffect in GameContainer will automatically switch to cave tab
        // when it detects timedevent tab is active but event is no longer active
        // when it detects timedevent tab is active but event is no longer active
      }
    };

    // Initial update
    updateTimer();

    // Update every 100ms for smooth countdown
    const interval = setInterval(updateTimer, 100);

    return () => {
      clearInterval(interval);
    };
  }, [
    timedEventTab.isActive,
    timedEventTab.event?.id,
    timedEventTab.expiryTime,
    setTimedEventTab,
    applyEventChoice,
  ]);

  // Early return AFTER all hooks have been called
  if (!timedEventTab.event) {
    return null;
  }

  const event = timedEventTab.event;
  const eventId = event.eventId || event.id.split("-")[0];

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleChoice = (choiceId: string) => {
    setHighlightedResources([]); // Clear highlights before closing

    logger.log('[TIMED EVENT PANEL] handleChoice called:', {
      choiceId,
      isMerchantEvent,
      eventChoices: eventChoices.map(c => ({ id: c.id, label: typeof c.label === 'function' ? c.label(gameState) : c.label })),
      merchantTrades: gameState.merchantTrades,
    });

    // Don't pre-emptively mark as purchased - let applyEventChoice handle it atomically
    applyEventChoice(choiceId, eventId, event);

    // For merchant events, only close on "say_goodbye"
    // For other timed events (feast, master archer, etc.), close after any choice
    if (isMerchantEvent) {
      if (choiceId === "say_goodbye") {
        setTimedEventTab(false);
      }
    } else {
      // Non-merchant timed events close after any choice
      setTimedEventTab(false);
    }
  };

  // Helper function to extract resource names from cost text
  const extractResourcesFromCost = (costText: string): string[] => {
    const resources: string[] = [];
    // Match patterns like "25 food", "100 wood", etc.
    const matches = costText.matchAll(/(\d+)\s+([a-zA-Z_]+)/g);

    for (const match of matches) {
      const resourceName = match[2].toLowerCase();
      resources.push(resourceName);
    }

    return resources;
  };

  // Helper function to extract buy resource from label text
  const extractBuyResourceFromLabel = (labelText: string): string | null => {
    // Match patterns like "250 Food", "100 Wood", etc. (first resource in label)
    const match = labelText.match(/\d+\s+([a-zA-Z\s]+)/);
    if (match) {
      return match[1].trim().toLowerCase().replace(/\s+/g, '_');
    }
    return null;
  };


  return (
    <div className="w-80 space-y-1 mt-2 mb-2 pr-4 pl-[3px]">
      {/* Event Title */}
      {event.title && (
        <h2 className="text-xs flex items-center justify-between">
          <div>
            <span className="font-semibold">{event.title} </span>
            <span className="text-muted-foreground">
              &nbsp;{formatTime(timeRemaining)}
            </span>
          </div>
        </h2>
      )}
      {/* Event Message */}
      <div className="text-xs text-muted-foreground">{event.message}</div>

      {/* Choices */}
      <div className="space-y-2 pt-1">
        {isMerchantEvent && (
          <h3 className="text-xs font-semibold flex items-center">
            <span>Buy</span>
            {(() => {
              const knowledge = gameState.stats?.knowledge || 0;
              const discount = calculateMerchantDiscount(knowledge);

              if (discount > 0) {
                return (
                  <TooltipWrapper
                    tooltip={
                      <div className="text-xs whitespace-nowrap">
                        {Math.round(discount * 100)}% discount due to Knowledge{isKnowledgeBonusMaxed(knowledge) ? " (max)" : ""}
                      </div>
                    }
                    tooltipId="merchant-discount"
                  >
                    <span className="text-blue-300/80 cursor-pointer hover:text-blue-300 transition-colors inline-block text-xl pl-2">
                      ✧
                    </span>
                  </TooltipWrapper>
                );
              }
              return null;
            })()}
          </h3>
        )}
      <div className="flex flex-wrap gap-2 mt-2">
        {Array.isArray(eventChoices) && eventChoices
          .map((choice) => {
            const cost = choice.cost;
            // Evaluate cost if it's a function
            const costText =
              typeof cost === "function" ? cost(gameState) : cost;

              // Check if player can afford the cost (for all timed tab events)
              let canAfford = true;
              if (costText) {
                // Extract all resource requirements from cost string
                const costMatches = costText.matchAll(/(\d+)\s+([a-zA-Z_]+)/g);
                for (const match of costMatches) {
                  const costAmount = parseInt(match[1]);
                  const resourceName = match[2].toLowerCase();

                  // Check if this resource exists in gameState.resources
                  const resourceKey = resourceName as keyof typeof gameState.resources;
                  if (resourceKey in gameState.resources) {
                    if (gameState.resources[resourceKey] < costAmount) {
                      canAfford = false;
                      break;
                    }
                  }
                }
              }

              // Evaluate label if it's a function
              const labelText =
                typeof choice.label === "function"
                  ? choice.label(gameState)
                  : choice.label;

              const isPurchased =
                isMerchantEvent &&
                gameState.merchantTrades?.purchasedIds?.includes(choice.id);

              // Disable if can't afford, time is up, already purchased, or in safety period
              const isDisabled =
                !canAfford || timeRemaining <= 0 || isPurchased || safetyTimeRemaining > 0;

              // Calculate success percentage if available
              let successPercentage: string | null = null;
              if (choice.success_chance && typeof choice.success_chance === "function") {
                const chance = choice.success_chance(gameState);
                successPercentage = `${Math.round(chance * 100)}%`;
              }

              // Check if we have a Scriptorium to show stat icons
              const hasScriptorium = gameState.buildings.scriptorium >= 1;

              const buttonContent = (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoice(choice.id);
                  }}
                  variant="outline"
                  size="xs"
                  disabled={isDisabled}
                  button_id={`timedevent-${choice.id}`}
                  className="gap-0 w-full text-left justify-between"
                >
                  <span>{labelText}</span>
                  <div className="flex items-center">
                    {successPercentage && (
                      <span className="ml-2 mr-1 text-xs text-muted-foreground">
                        {successPercentage}
                      </span>
                    )}
                    {hasScriptorium && choice.relevant_stats && choice.relevant_stats.length > 0 && (
                      <div className="flex">
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
                    {isPurchased && <span className="ml-1">✓</span>}
                  </div>
                </Button>
              );

              return costText ? (
                <TooltipWrapper
                  key={choice.id}
                  tooltip={
                    <div className={`text-xs whitespace-nowrap ${isDisabled ? "text-muted-foreground" : ""}`}>
                      {costText && (
                        <div>
                          {/* Always use merchantTooltip (cost-only) for timed events - never show current amounts */}
                          {merchantTooltip.getContent(costText)}
                        </div>
                      )}
                      {costText && successPercentage && (
                        <div className="border-t border-border my-1" />
                      )}
                      {successPercentage && (
                        <div>Success Chance: {successPercentage}</div>
                      )}
                    </div>
                  }
                  tooltipId={`timedevent-${choice.id}`}
                  disabled={isDisabled}
                  onClick={() => handleChoice(choice.id)}
                  onMouseEnter={() => {
                    if (costText) {
                      const costResources = extractResourcesFromCost(costText);

                      // For merchant trades, always highlight both buy and sell resources
                      if (isMerchantEvent) {
                        const buyResource = extractBuyResourceFromLabel(labelText);
                        const highlightResources = buyResource
                          ? [...costResources, buyResource]
                          : costResources;
                        setHighlightedResources(highlightResources);
                      } else {
                        // Standard: only highlight cost resources
                        setHighlightedResources(costResources);
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    setHighlightedResources([]);
                  }}
                >
                  {buttonContent}
                </TooltipWrapper>
              ) : (
                <div
                  key={choice.id}
                  onMouseEnter={() => {
                    if (costText) {
                      const costResources = extractResourcesFromCost(costText);
                      if (isMerchantEvent) {
                        const buyResource = extractBuyResourceFromLabel(labelText);
                        const highlightResources = buyResource
                          ? [...costResources, buyResource]
                          : costResources;
                        setHighlightedResources(highlightResources);
                      } else {
                        setHighlightedResources(costResources);
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    setHighlightedResources([]);
                  }}
                >
                  {buttonContent}
                </div>
              );
            })}
        </div>

        {/* Say Goodbye button - only for merchant events */}
        {isMerchantEvent && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setHighlightedResources([]);
              setTimedEventTab(false);
            }}
            variant="outline"
            size="xs"
            disabled={timeRemaining <= 0 || safetyTimeRemaining > 0}
            button_id="timedevent-say_goodbye"
          >
            Say Goodbye
          </Button>
        )}
      </div>
    </div>
  );
}