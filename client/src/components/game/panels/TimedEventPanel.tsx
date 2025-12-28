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
import { generateMerchantChoices, tradeToChoice } from "@/game/rules/eventsMerchant";
import { EventChoice } from "@/game/rules/events";
import { logger } from "@/lib/logger";

// Assuming LogEntry and setEventDialog are defined elsewhere and imported if necessary
// For this example, we'll define dummy types if they are not provided
interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
  type: "event";
  title: string;
  choices: Array<{
    id: string;
    label: string;
    effect: () => any;
  }>;
  skipSound?: boolean;
}

// Dummy function for setEventDialog, replace with actual import if available
const setEventDialog = (show: boolean, entry?: LogEntry) => {
  console.log(`[setEventDialog] Called with show: ${show}, entry:`, entry);
};

export default function TimedEventPanel() {
  const {
    timedEventTab,
    applyEventChoice,
    setTimedEventTab,
    setHighlightedResources,
    merchantPurchases,
    addMerchantPurchase,
  } = useGameStore();
  const gameState = useGameStore();

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const mobileTooltip = useMobileButtonTooltip();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // useEffect MUST be called before any early returns
  useEffect(() => {
    if (!timedEventTab.isActive || !timedEventTab.expiryTime || !timedEventTab.event) {
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
          if (event.fallbackChoice && typeof event.fallbackChoice.effect === 'function') {
            console.log('[TIMED EVENT] Timer expired, executing fallback for:', event.title);
            applyEventChoice(event.fallbackChoice.id, timedEventId, event);
          } else if (event.fallbackChoice) {
            console.error('[TIMED EVENT] Fallback choice exists but has no effect function:', event.fallbackChoice);
          } else {
            // Fallback to looking for "doNothing" choice
            const fallbackChoice = event.choices?.find(
              (c) => c.id === "doNothing",
            );
            if (fallbackChoice && typeof fallbackChoice.effect === 'function') {
              console.log('[TIMED EVENT] Timer expired, executing doNothing for:', timedEventId);
              applyEventChoice(fallbackChoice.id, timedEventId, event);
            } else {
              console.error('[TIMED EVENT] Timer expired but no valid fallback choice found for event:', timedEventId);
            }
          }
        }

        // Clear highlights and auto-close the tab
        setHighlightedResources([]);
        setTimedEventTab(false).catch(console.error);

        // Switch to cave tab when merchant expires
        setTimeout(() => {
          useGameStore.getState().setActiveTab('cave');
        }, 100);
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
  ]);

  // Convert saved merchant trades to choices with effect functions
  const eventChoices = useMemo(() => {
    const event = timedEventTab.event;
    if (!event) return [];

    // For merchant events, convert saved trades to choices
    if (event.id === 'merchant' || event.eventId === 'merchant') {
      // Get saved trades from event (or generate if not present)
      const savedTrades = (event as any).merchantTrades;

      if (!savedTrades) {
        logger.log('[MERCHANT] No saved trades, this should not happen');
        return [];
      }

      logger.log('[MERCHANT LOAD] Converting saved trades to choices:', {
        tradesCount: savedTrades.length,
      });

      // Convert trades to choices
      const choices = savedTrades.map((trade: any) => tradeToChoice(trade));

      return choices;
    }

    return event.choices || [];
  }, [timedEventTab.event?.id, timedEventTab.event?.eventId, (timedEventTab.event as any)?.merchantTrades, gameState.resources, gameState.buildings]);

  // Convert merchantPurchases array to Set for efficient lookup
  const merchantPurchasesSet = useMemo(() => {
    const purchasesArray = Array.isArray(merchantPurchases) ? merchantPurchases : Array.from(merchantPurchases instanceof Set ? merchantPurchases : []);

    logger.log('[MERCHANT RENDER] 🎨 Converting purchases for rendering:', {
      merchantPurchases,
      isArray: Array.isArray(merchantPurchases),
      isSet: merchantPurchases instanceof Set,
      purchasesArray,
      purchaseCount: purchasesArray.length,
    });

    return new Set(purchasesArray);
  }, [merchantPurchases]);

  // Early return AFTER ALL hooks (including useEffect and useMemo) have been called
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
    console.log('[TIMED EVENT TRADE] ===== handleChoice START =====');
    console.log('[TIMED EVENT TRADE] choiceId:', choiceId);
    console.log('[TIMED EVENT TRADE] eventId:', eventId);
    console.log('[TIMED EVENT TRADE] event:', event);

    const isSayGoodbye = choiceId === 'say_goodbye';

    // Handle goodbye button separately - it doesn't need a choice object
    if (isSayGoodbye) {
      console.log('[TIMED EVENT TRADE] Goodbye button - closing tab and switching to cave');
      setHighlightedResources([]);
      setTimedEventTab(false).catch(console.error);

      // Switch to cave tab
      setTimeout(() => {
        useGameStore.getState().setActiveTab('cave');
      }, 100);

      // Show farewell dialog
      const farewellEntry: LogEntry = {
        id: `merchant-goodbye-${Date.now()}`,
        message: "The merchant nods respectfully and continues on their way.",
        timestamp: Date.now(),
        type: "event",
        title: "Farewell",
        choices: [
          {
            id: "acknowledge",
            label: "Continue",
            effect: () => ({}),
          },
        ],
        skipSound: true,
      };

      setTimeout(() => {
        setEventDialog(true, farewellEntry);
      }, 200);
      
      return;
    }

    // For trade buttons, find the choice
    const choice = eventChoices.find(c => c.id === choiceId);

    console.log('[TIMED EVENT TRADE] Button clicked:', {
      choiceId,
      eventId,
      choiceFound: !!choice,
      isSayGoodbye,
      choiceLabel: choice?.label,
      choiceCost: choice?.cost,
      effectType: typeof choice?.effect,
      effectFunction: choice?.effect?.toString().substring(0, 200)
    });

    if (!choice) {
      console.error('[TIMED EVENT TRADE] No choice found for:', choiceId);
      console.log('[TIMED EVENT TRADE] Available choices:', eventChoices.map(c => ({ id: c.id, label: c.label })));
      return;
    }

    // Check if already purchased (shouldn't happen due to disabled state, but double-check)
    if (!isSayGoodbye && merchantPurchasesSet.has(choiceId)) {
      console.log('[TIMED EVENT TRADE] Item already purchased:', choiceId);
      return;
    }

    // Log the current resources BEFORE the trade
    console.log('[TIMED EVENT TRADE] Resources BEFORE trade:', {
      food: gameState.resources.food,
      wood: gameState.resources.wood,
      stone: gameState.resources.stone,
      iron: gameState.resources.iron,
      leather: gameState.resources.leather,
      steel: gameState.resources.steel,
      gold: gameState.resources.gold,
      silver: gameState.resources.silver
    });

    // Test the effect function directly
    console.log('[TIMED EVENT TRADE] Choice object:', choice);
    console.log('[TIMED EVENT TRADE] Has effect?', typeof choice.effect === 'function');

    if (typeof choice.effect !== 'function') {
      console.error('[TIMED EVENT TRADE] Effect is not a function!', choice);
      return;
    }

    console.log('[TIMED EVENT TRADE] Calling effect function...');
    const result = choice.effect(gameState);
    console.log('[TIMED EVENT TRADE] Effect result:', result);

    if (result && Object.keys(result).length > 0) {
      console.log('[TIMED EVENT TRADE] Applying event choice via applyEventChoice');
      // Pass the current log entry to applyEventChoice
      applyEventChoice(choiceId, eventId, event);
    } else {
      console.log('[TIMED EVENT TRADE] Effect returned empty result (insufficient resources?)');
    }


    setHighlightedResources([]); // Clear highlights before closing

    // Log resources AFTER trade (with slight delay to allow state to update)
    setTimeout(() => {
      const state = useGameStore.getState();
      console.log('[TIMED EVENT TRADE] Resources AFTER trade:', {
        food: state.resources.food,
        wood: state.resources.wood,
        stone: state.resources.stone,
        iron: state.resources.iron,
        leather: state.resources.leather,
        steel: state.resources.steel,
        gold: state.resources.gold,
        silver: state.resources.silver
      });
      console.log('[TIMED EVENT TRADE] ===== handleChoice END =====');
    }, 100);

    // Mark as purchased
    addMerchantPurchase(choiceId);
    console.log('[TIMED EVENT TRADE] Marked as purchased:', choiceId);
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
          {eventChoices.filter(c => c.id !== 'say_goodbye').map((choice) => {
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

            // Check if this is the goodbye button
            const isGoodbyeButton = choice.id === 'say_goodbye';

            // Check if this item has been purchased (using global state)
            const isPurchased = !isGoodbyeButton && merchantPurchasesSet.has(choice.id);

            // Disable if can't afford, time is up, or already purchased (except goodbye)
            const isDisabled = !canAfford || timeRemaining <= 0 || isPurchased;

            const buttonContent = (
              <Button
                onClick={
                  !mobileTooltip.isMobile
                    ? (e) => {
                        console.log('[TIMED EVENT] Button clicked:', {
                          id: choice.id,
                          label: labelText,
                          isGoodbye: isGoodbyeButton
                        });
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
                                () => {
                                  console.log('[TIMED EVENT] Mobile button fired:', {
                                    id: choice.id,
                                    label: labelText,
                                    isGoodbye: isGoodbyeButton
                                  });
                                  handleChoice(choice.id);
                                },
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
                                () => {
                                  console.log('[TIMED EVENT] Mobile button touchEnd:', {
                                    id: choice.id,
                                    label: labelText,
                                    isGoodbye: isGoodbyeButton
                                  });
                                  handleChoice(choice.id);
                                },
                                e,
                              )
                          : undefined
                      }
                      onMouseEnter={() => {
                        if (costText) {
                          const resources = extractResourcesFromCost(costText);
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
                          () => {
                            console.log('[TIMED EVENT] Mobile button (no tooltip) fired:', {
                              id: choice.id,
                              label: labelText,
                              isGoodbye: isGoodbyeButton
                            });
                            handleChoice(choice.id);
                          },
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
                          () => {
                            console.log('[TIMED EVENT] Mobile button touchEnd (no tooltip):', {
                              id: choice.id,
                              label: labelText,
                              isGoodbye: isGoodbyeButton
                            });
                            handleChoice(choice.id);
                          },
                          e,
                        )
                    : undefined
                }
              >
                {buttonContent}
              </div>
            );
          })}

          {/* Say Goodbye button - always present, not from state */}
          <Button
            onClick={
              !mobileTooltip.isMobile
                ? (e) => {
                    console.log('[TIMED EVENT] Goodbye button clicked');
                    e.stopPropagation();
                    handleChoice("say_goodbye");
                  }
                : undefined
            }
            variant="outline"
            size="xs"
            disabled={timeRemaining <= 0}
            button_id="timedevent-say-goodbye"
            onMouseDown={
              mobileTooltip.isMobile
                ? (e) =>
                    mobileTooltip.handleMouseDown(
                      "timedevent-say-goodbye",
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
                      "timedevent-say-goodbye",
                      timeRemaining <= 0,
                      () => {
                        console.log('[TIMED EVENT] Mobile goodbye button fired');
                        handleChoice("say_goodbye");
                      },
                      e,
                    )
                : undefined
            }
            onTouchStart={
              mobileTooltip.isMobile
                ? (e) =>
                    mobileTooltip.handleTouchStart(
                      "timedevent-say-goodbye",
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
                      "timedevent-say-goodbye",
                      timeRemaining <= 0,
                      () => {
                        console.log('[TIMED EVENT] Mobile goodbye touchEnd');
                        handleChoice("say_goodbye");
                      },
                      e,
                    )
                : undefined
            }
          >
            Say goodbye
          </Button>
        </div>
      </div>
    </div>
  );
}