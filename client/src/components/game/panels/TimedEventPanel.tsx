
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
  const { timedEventTab, applyEventChoice, setTimedEventTab } = useGameStore();
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
        // Auto-close the tab when timer expires
        setTimedEventTab(false);
      }
    };

    // Initial update
    updateTimer();

    // Update every 100ms for smooth countdown
    const interval = setInterval(updateTimer, 100);

    return () => {
      clearInterval(interval);
    };
  }, [timedEventTab.isActive, timedEventTab.event?.id, timedEventTab.expiryTime, setTimedEventTab]);

  if (!timedEventTab.event) {
    return null;
  }

  const event = timedEventTab.event;
  const eventChoices = event.choices || [];

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleChoice = (choiceId: string) => {
    const eventId = event.id.split("-")[0];
    applyEventChoice(choiceId, eventId, event);
    setTimedEventTab(false);
  };

  return (
    <div className="w-80 space-y-1 mt-1 mb-2 pr-4 pl-[3px]">

      {/* Event Title */}
      {event.title && (
        <h2 className="text-sm font-semibold">
          {event.title} {formatTime(timeRemaining)}
        </h2>
      )}
      {/* Event Message */}
      <div className="text-sm text-muted-foreground">
        {event.message}
      </div>

      {/* Choices */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 mt-3">
          {eventChoices.map((choice) => {
            const cost = choice.cost;
            let isDisabled = false;

            // Evaluate cost if it's a function
            const costText = typeof cost === 'function' ? cost(gameState) : cost;

            // Check if player can afford the cost
            if (costText) {
              const resourceKeys = Object.keys(gameState.resources) as Array<keyof typeof gameState.resources>;
              for (const resourceKey of resourceKeys) {
                if (costText.includes(resourceKey)) {
                  const match = costText.match(new RegExp(`(\\d+)\\s*${resourceKey}`));
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
            const labelText = typeof choice.label === 'function'
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
                        mobileTooltip.handleWrapperClick(`timedevent-${choice.id}`, isDisabled, false, e);
                      }}
                      onMouseDown={mobileTooltip.isMobile ? (e) => mobileTooltip.handleMouseDown(`timedevent-${choice.id}`, isDisabled, false, e) : undefined}
                      onMouseUp={mobileTooltip.isMobile ? (e) => mobileTooltip.handleMouseUp(`timedevent-${choice.id}`, isDisabled, () => handleChoice(choice.id), e) : undefined}
                      onTouchStart={mobileTooltip.isMobile ? (e) => mobileTooltip.handleTouchStart(`timedevent-${choice.id}`, isDisabled, false, e) : undefined}
                      onTouchEnd={mobileTooltip.isMobile ? (e) => mobileTooltip.handleTouchEnd(`timedevent-${choice.id}`, isDisabled, () => handleChoice(choice.id), e) : undefined}
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
                onMouseDown={mobileTooltip.isMobile ? (e) => mobileTooltip.handleMouseDown(`timedevent-${choice.id}`, isDisabled, false, e) : undefined}
                onMouseUp={mobileTooltip.isMobile ? (e) => mobileTooltip.handleMouseUp(`timedevent-${choice.id}`, isDisabled, () => handleChoice(choice.id), e) : undefined}
                onTouchStart={mobileTooltip.isMobile ? (e) => mobileTooltip.handleTouchStart(`timedevent-${choice.id}`, isDisabled, false, e) : undefined}
                onTouchEnd={mobileTooltip.isMobile ? (e) => mobileTooltip.handleTouchEnd(`timedevent-${choice.id}`, isDisabled, () => handleChoice(choice.id), e) : undefined}
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
