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

  // Memoize merchant choices to prevent constant re-renders while keeping effect functions
  const isMerchantEvent = timedEventTab.event?.id.split("-")[0] === "merchant";
  const eventChoices: EventChoice[] = useMemo(() => {
    if (!timedEventTab.event) return [];
    
    console.log('[TIMED EVENT PANEL] Generating choices:', {
      isMerchantEvent,
      eventId: timedEventTab.event.id,
      hasChoices: !!timedEventTab.event.choices
    });
    
    if (isMerchantEvent) {
      const choices = generateMerchantChoices(gameState);
      console.log('[TIMED EVENT PANEL] Generated merchant choices:', choices.length);
      return choices;
    }
    console.log('[TIMED EVENT PANEL] Using event choices:', timedEventTab.event.choices?.length || 0);
    return timedEventTab.event.choices || [];
  }, [isMerchantEvent, timedEventTab.event?.id]);

  console.log('[TIMED EVENT PANEL] Render state:', {
    hasEvent: !!timedEventTab.event,
    isActive: timedEventTab.isActive,
    expiryTime: timedEventTab.expiryTime,
    eventId: timedEventTab.event?.id,
    eventTitle: timedEventTab.event?.title
  });

  useEffect(() => {
    console.log('[TIMED EVENT PANEL] useEffect triggered:', {
      hasEvent: !!timedEventTab.event,
      isActive: timedEventTab.isActive,
      expiryTime: timedEventTab.expiryTime,
      eventId: timedEventTab.event?.id
    });

    if (!timedEventTab.isActive || !timedEventTab.expiryTime || !timedEventTab.event) {
      console.log('[TIMED EVENT PANEL] Clearing timer - conditions not met');
      setTimeRemaining(0);
      return;
    }

    const event = timedEventTab.event;

    const expiryTime = timedEventTab.expiryTime;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiryTime - now);
      
      console.log('[TIMED EVENT PANEL] Timer update:', {
        now,
        expiryTime,
        remaining,
        remainingSeconds: Math.floor(remaining / 1000)
      });
      
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        console.log('[TIMED EVENT PANEL] Timer expired! Processing fallback...', {
          hasEvent: !!event,
          eventId: event?.id,
          hasFallbackChoice: !!event?.fallbackChoice,
          fallbackChoiceId: event?.fallbackChoice?.id,
          hasEffect: typeof event?.fallbackChoice?.effect === 'function'
        });

        // Execute fallback choice when timer expires
        if (event) {
          const timedEventId = event.eventId || event.id.split("-")[0];

          // Use the event's defined fallbackChoice if available
          if (event.fallbackChoice && typeof event.fallbackChoice.effect === 'function') {
            console.log('[TIMED EVENT PANEL] Executing fallback choice:', {
              choiceId: event.fallbackChoice.id,
              eventId: timedEventId,
              eventTitle: event.title
            });
            applyEventChoice(event.fallbackChoice.id, timedEventId, event);
          } else if (event.fallbackChoice) {
            console.error('[TIMED EVENT PANEL] Fallback choice exists but has no effect function:', event.fallbackChoice);
          } else {
            // Fallback to looking for "doNothing" choice
            const fallbackChoice = event.choices?.find(
              (c) => c.id === "doNothing",
            );
            if (fallbackChoice && typeof fallbackChoice.effect === 'function') {
              console.log('[TIMED EVENT PANEL] Executing doNothing choice for event:', timedEventId);
              applyEventChoice(fallbackChoice.id, timedEventId, event);
            } else {
              console.error('[TIMED EVENT PANEL] Timer expired but no valid fallback choice found for event:', timedEventId);
            }
          }
        }
        
        console.log('[TIMED EVENT PANEL] Clearing highlights and closing tab');
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
    console.log('[TIMED EVENT PANEL] No event - returning null');
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
    console.log('[TIMED EVENT PANEL] handleChoice called:', {
      choiceId,
      eventId,
      eventTitle: event.title,
      timeRemaining,
      isActive: timedEventTab.isActive
    });
    
    console.log('[TIMED EVENT PANEL] Available choices:', 
      eventChoices.map(c => ({
        id: c.id,
        label: typeof c.label === 'function' ? c.label(gameState) : c.label,
        hasEffect: typeof c.effect === 'function',
        effectType: typeof c.effect
      }))
    );
    
    console.log('[TIMED EVENT PANEL] Clearing highlights and applying choice');
    setHighlightedResources([]); // Clear highlights before closing
    
    console.log('[TIMED EVENT PANEL] Calling applyEventChoice');
    applyEventChoice(choiceId, eventId, event);
    
    console.log('[TIMED EVENT PANEL] Closing timed event tab');
    setTimedEventTab(false);
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

            // Disable if can't afford or time is up
            const isDisabled = !canAfford || timeRemaining <= 0;

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

          
        </div>
      </div>
    </div>
  );
}