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
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());

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

  // Use choices directly from the event - they were pre-generated when event was created
  const eventChoices: EventChoice[] = timedEventTab.event?.choices || [];

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
    const choice = eventChoices.find(c => c.id === choiceId);
    const isSayGoodbye = choiceId === 'say_goodbye';
    
    console.log('[TIMED EVENT] ========================================');
    console.log('[TIMED EVENT] Button clicked:', {
      choiceId,
      choiceLabel: choice ? (typeof choice.label === 'function' ? choice.label(gameState) : choice.label) : 'NOT FOUND',
      eventId,
      eventTitle: event.title,
      timeRemaining: Math.floor(timeRemaining / 1000) + 's',
      isSayGoodbye,
      isPurchased: purchasedItems.has(choiceId),
    });
    
    if (!choice) {
      console.error('[TIMED EVENT] ERROR: Choice not found in eventChoices!');
      console.log('[TIMED EVENT] Available choices:', 
        eventChoices.map(c => ({
          id: c.id,
          label: typeof c.label === 'function' ? c.label(gameState) : c.label,
        }))
      );
      return;
    }

    // Check if already purchased (shouldn't happen due to disabled state, but double-check)
    if (!isSayGoodbye && purchasedItems.has(choiceId)) {
      console.warn('[TIMED EVENT] Item already purchased, ignoring click:', choiceId);
      return;
    }
    
    console.log('[TIMED EVENT] Clearing highlights and applying choice');
    setHighlightedResources([]); // Clear highlights before closing
    
    console.log('[TIMED EVENT] Calling applyEventChoice with:', {
      choiceId,
      eventId,
      hasEvent: !!event
    });
    applyEventChoice(choiceId, eventId, event);

    // If it's a trade button (not say goodbye), mark as purchased
    if (!isSayGoodbye) {
      console.log('[TIMED EVENT] Marking item as purchased:', choiceId);
      setPurchasedItems(prev => new Set([...prev, choiceId]));
    } else {
      // If saying goodbye, close the tab
      console.log('[TIMED EVENT] Closing timed event tab (goodbye)');
      setTimedEventTab(false).catch(console.error);
    }
    
    console.log('[TIMED EVENT] ========================================');
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
          {eventChoices.map((choice) => {
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
            
            // Check if this item has been purchased
            const isPurchased = purchasedItems.has(choice.id);

            // Disable if can't afford, time is up, or already purchased (except goodbye)
            const isDisabled = !canAfford || timeRemaining <= 0 || (!isGoodbyeButton && isPurchased);
            
            console.log('[TIMED EVENT] Rendering button:', {
              id: choice.id,
              label: labelText,
              canAfford,
              isPurchased,
              isDisabled,
              isGoodbye: isGoodbyeButton,
            });

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

          
        </div>
      </div>
    </div>
  );
}