import React, { useState, useEffect, useMemo } from "react";
import { useGameStore } from "@/game/state";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileButtonTooltip } from "@/hooks/useMobileTooltip";
import { eventChoiceCostTooltip } from "@/game/rules/tooltips";
import { generateMerchantChoices } from "@/game/rules/eventsMerchant";
import { EventChoice } from "@/game/rules/events";
import { logger } from "@/lib/logger";

export default function TimedEventPanel() {
  const {
    timedEventTab,
    applyEventChoice,
    setTimedEventTab,
    setHighlightedResources,
  } = useGameStore();
  const gameState = useGameStore();

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const mobileTooltip = useMobileButtonTooltip();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Get merchant trades from state (generated once when event starts)
  const isMerchantEvent = timedEventTab.event?.id.split("-")[0] === "merchant";
  const eventChoices: EventChoice[] = useMemo(() => {
    if (!timedEventTab.event) {
      logger.log("[TIMED EVENT PANEL] No event, returning empty choices");
      return [];
    }

    if (isMerchantEvent) {
      // Use the merchant trades that were generated and stored when the event was created
      // These trades already have their effect functions intact
      logger.log("[TIMED EVENT PANEL] Merchant event, using stored choices:", {
        eventId: timedEventTab.event.id,
        choicesCount: timedEventTab.event.choices?.length || 0,
        choices: timedEventTab.event.choices,
      });
      return timedEventTab.event.choices || [];
    }

    logger.log("[TIMED EVENT PANEL] Non-merchant event, using event choices:", {
      eventId: timedEventTab.event.id,
      choicesCount: timedEventTab.event.choices?.length || 0,
    });
    return timedEventTab.event.choices || [];
  }, [isMerchantEvent, timedEventTab.event]);

  useEffect(() => {
    if (
      !timedEventTab.isActive ||
      !timedEventTab.expiryTime ||
      !timedEventTab.event
    ) {
      setTimeRemaining(0);
      return;
    }

    const event = timedEventTab.event;
    const expiryTime = timedEventTab.expiryTime;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiryTime - now);

      setTimeRemaining(remaining);

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
            const fallbackChoice = event.choices?.find(
              (c) => c.id === "doNothing",
            );
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

    // If it's a merchant trade (not "say_goodbye"), track the purchase
    if (isMerchantEvent && choiceId !== "say_goodbye") {
      // Log the creation of a merchant trade
      logger.log(`[MERCHANT TRADE] Creating merchant trade: ${choiceId}`);

      // Update merchantTrades state to mark this item as purchased
      useGameStore.setState((state) => {
        logger.log("[MERCHANT TRADE] Current state before update:", {
          merchantTrades: state.merchantTrades,
          purchasedIds: state.merchantTrades?.purchasedIds,
        });

        return {
          merchantTrades: {
            ...state.merchantTrades,
            purchasedIds: [
              ...(state.merchantTrades?.purchasedIds || []),
              choiceId,
            ],
          },
        };
      });
    }

    applyEventChoice(choiceId, eventId, event);

    // Only close tab if it's "say_goodbye"
    if (choiceId === "say_goodbye") {
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

  return (
    <div className="w-80 space-y-1 mt-2 mb-2 pr-4 pl-[3px]">
      {/* Event Title */}
      {event.title && (
        <h2 className="text-xs">
          <span className="font-semibold">{event.title} </span>
          <span className="text-muted-foreground">
            {formatTime(timeRemaining)}
          </span>
        </h2>
      )}
      {/* Event Message */}
      <div className="text-xs text-muted-foreground">{event.message}</div>

      {/* Choices */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 mt-3">
          {eventChoices
            .filter((choice) => choice.id !== "say_goodbye")
            .map((choice) => {
              const cost = choice.cost;
              // Evaluate cost if it's a function
              const costText =
                typeof cost === "function" ? cost(gameState) : cost;

              // Check if player can afford the cost
              let canAfford = true;
              if (costText) {
                const resourceKeys = Object.keys(gameState.resources) as Array<
                  keyof typeof gameState.resources
                >;
                for (const resourceKey of resourceKeys) {
                  if (costText.includes(resourceKey)) {
                    const match = costText.match(
                      new RegExp(`(\\d+)\\s*${resourceKey}`),
                    );
                    if (match) {
                      const costAmount = parseInt(match[1]);
                      if (gameState.resources[resourceKey] < costAmount) {
                        canAfford = false;
                        break;
                      }
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

              // Disable if can't afford, time is up, or already purchased
              const isDisabled =
                !canAfford || timeRemaining <= 0 || isPurchased;

              const buttonContent = (
                <Button
                  onClick={
                    !mobileTooltip.isMobile
                      ? (e) => {
                          e.stopPropagation();
                          handleChoice(choice.id);
                        }
                      : undefined
                  }
                  variant="outline"
                  size="xs"
                  disabled={isDisabled}
                  button_id={`timedevent-${choice.id}`}
                >
                  {labelText}
                </Button>
              );

              return costText ? (
                <TooltipProvider key={choice.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        onClick={(e) => {
                          mobileTooltip.handleWrapperClick(
                            `timedevent-${choice.id}`,
                            isDisabled,
                            false,
                            e,
                          );
                        }}
                        onMouseDown={
                          mobileTooltip.isMobile
                            ? (e) =>
                                mobileTooltip.handleMouseDown(
                                  `timedevent-${choice.id}`,
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
                                  `timedevent-${choice.id}`,
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
                                  `timedevent-${choice.id}`,
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
                                  `timedevent-${choice.id}`,
                                  isDisabled,
                                  () => handleChoice(choice.id),
                                  e,
                                )
                            : undefined
                        }
                        onMouseEnter={() => {
                          if (costText) {
                            const resources =
                              extractResourcesFromCost(costText);
                            setHighlightedResources(resources);
                          }
                        }}
                        onMouseLeave={() => {
                          setHighlightedResources([]);
                        }}
                      >
                        {buttonContent}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-xs">
                        {eventChoiceCostTooltip.getContent(costText, gameState)}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div
                  key={choice.id}
                  onMouseDown={
                    mobileTooltip.isMobile
                      ? (e) =>
                          mobileTooltip.handleMouseDown(
                            `timedevent-${choice.id}`,
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
                            `timedevent-${choice.id}`,
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
                            `timedevent-${choice.id}`,
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
                            `timedevent-${choice.id}`,
                            isDisabled,
                            () => handleChoice(choice.id),
                            e,
                          )
                      : undefined
                  }
                >
                  {buttonContent}
                </div>
              );
            })}

          {/* Say Goodbye button - always visible and hardcoded */}
          <div
            onMouseDown={
              mobileTooltip.isMobile
                ? (e) =>
                    mobileTooltip.handleMouseDown(
                      `timedevent-say_goodbye`,
                      timeRemaining <= 0,
                      false,
                      e,
                    )
                : undefined
            }
            onMouseUp={
              mobileTooltip.isMobile
                ? (e) =>
                    mobileTooltip.handleMouseUp(
                      `timedevent-say_goodbye`,
                      timeRemaining <= 0,
                      () => {
                        setHighlightedResources([]);
                        setTimedEventTab(false);
                      },
                      e,
                    )
                : undefined
            }
            onTouchStart={
              mobileTooltip.isMobile
                ? (e) =>
                    mobileTooltip.handleTouchStart(
                      `timedevent-say_goodbye`,
                      timeRemaining <= 0,
                      false,
                      e,
                    )
                : undefined
            }
            onTouchEnd={
              mobileTooltip.isMobile
                ? (e) =>
                    mobileTooltip.handleTouchEnd(
                      `timedevent-say_goodbye`,
                      timeRemaining <= 0,
                      () => {
                        setHighlightedResources([]);
                        setTimedEventTab(false);
                      },
                      e,
                    )
                : undefined
            }
          >
            <Button
              onClick={
                !mobileTooltip.isMobile
                  ? (e) => {
                      e.stopPropagation();
                      setHighlightedResources([]);
                      setTimedEventTab(false);
                    }
                  : undefined
              }
              variant="outline"
              size="xs"
              disabled={timeRemaining <= 0}
              button_id="timedevent-say_goodbye"
            >
              Say Goodbye
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
