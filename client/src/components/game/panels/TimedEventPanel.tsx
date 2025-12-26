import React, { useState, useEffect } from "react";
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

export default function TimedEventPanel() {
  const {
    timedEventTab,
    applyEventChoice,
    setTimedEventTab,
    setHighlightedResources,
  } = useGameStore();
  const gameState = useGameStore();
  const mobileTooltip = useMobileButtonTooltip();

  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!timedEventTab.isActive || !timedEventTab.expiryTime) {
      setTimeRemaining(0);
      return;
    }

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
          if (event.fallbackChoice) {
            console.log('[TIMED EVENT] Timer expired, executing fallback choice:', event.fallbackChoice.id, 'for event:', timedEventId);
            applyEventChoice(event.fallbackChoice.id, timedEventId, event);
          } else {
            // Fallback to looking for "doNothing" choice
            const fallbackChoice = event.choices?.find(
              (c) => c.id === "doNothing",
            );
            if (fallbackChoice) {
              console.log('[TIMED EVENT] Timer expired, executing doNothing choice for event:', timedEventId);
              applyEventChoice(fallbackChoice.id, timedEventId, event);
            } else {
              console.warn('[TIMED EVENT] Timer expired but no fallback choice found for event:', timedEventId);
            }
          }
        }
        // Auto-close the tab
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

  if (!timedEventTab.event) {
    return null;
  }

  const event = timedEventTab.event;
  const eventChoices = event.choices || [];
  const eventId = event.eventId || event.id.split("-")[0];

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleChoice = (choiceId: string) => {
    applyEventChoice(choiceId, eventId, event);
    setTimedEventTab(false);
  };

  // Helper function to extract resource names from cost text
  const extractResourcesFromCost = (costText: string): string[] => {
    const resources: string[] = [];
    // Match patterns like "25 food", "1000 wood, 500 food", etc.
    // Handle both single and comma-separated resource costs
    const matches = costText.matchAll(/(\d+(?:,\d+)*)\s+([a-zA-Z_]+)/g);

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
            let isDisabled = false;

            // Evaluate cost if it's a function
            const costText =
              typeof cost === "function" ? cost(gameState) : cost;

            // Check if player can afford the cost
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
                      isDisabled = true;
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

            const buttonContent = (
              <Button
                onClick={() => handleChoice(choice.id)}
                variant="outline"
                size="xs"
                className="hover:bg-transparent hover:text-foreground"
                disabled={isDisabled}
                button_id={`timedevent-${choice.id}`}
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
