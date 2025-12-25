
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
      const remaining = Math.max(0, expiryTime - Date.now());
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

    return () => clearInterval(interval);
  }, [timedEventTab.isActive, timedEventTab.event?.id, setTimedEventTab]);

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
    applyEventChoice(choiceId, eventId);
    setTimedEventTab(false);
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-auto">
      <div className="flex-1 space-y-6">
        {/* Timer */}
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-400 mb-2">
            {formatTime(timeRemaining)}
          </div>
          <div className="text-sm text-muted-foreground">Time Remaining</div>
        </div>

        {/* Event Title */}
        {event.title && (
          <h2 className="text-2xl font-semibold text-center">
            {event.title}
          </h2>
        )}

        {/* Event Message */}
        <div className="text-center text-muted-foreground max-w-2xl mx-auto">
          {event.message}
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
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
                className="w-full h-auto py-4"
                disabled={isDisabled}
              >
                <span className="text-lg">{labelText}</span>
              </Button>
            );

            return costText ? (
              <TooltipProvider key={choice.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onClick={(e) => {
                        mobileTooltip.handleWrapperClick(choice.id, isDisabled, false, e);
                      }}
                      onMouseDown={mobileTooltip.isMobile ? (e) => mobileTooltip.handleMouseDown(choice.id, isDisabled, false, e) : undefined}
                      onMouseUp={mobileTooltip.isMobile ? (e) => mobileTooltip.handleMouseUp(choice.id, isDisabled, () => handleChoice(choice.id), e) : undefined}
                      onTouchStart={mobileTooltip.isMobile ? (e) => mobileTooltip.handleTouchStart(choice.id, isDisabled, false, e) : undefined}
                      onTouchEnd={mobileTooltip.isMobile ? (e) => mobileTooltip.handleTouchEnd(choice.id, isDisabled, () => handleChoice(choice.id), e) : undefined}
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
                onMouseDown={mobileTooltip.isMobile ? (e) => mobileTooltip.handleMouseDown(choice.id, isDisabled, false, e) : undefined}
                onMouseUp={mobileTooltip.isMobile ? (e) => mobileTooltip.handleMouseUp(choice.id, isDisabled, () => handleChoice(choice.id), e) : undefined}
                onTouchStart={mobileTooltip.isMobile ? (e) => mobileTooltip.handleTouchStart(choice.id, isDisabled, false, e) : undefined}
                onTouchEnd={mobileTooltip.isMobile ? (e) => mobileTooltip.handleTouchEnd(choice.id, isDisabled, () => handleChoice(choice.id), e) : undefined}
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
