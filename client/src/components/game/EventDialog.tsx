import React, { useState, useEffect, useRef, useMemo } from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { getTotalKnowledge } from "@/game/rules/effectsCalculation";
import { calculateKnowledgeTimeBonus, isKnowledgeBonusMaxed } from "@/game/rules/effectsStats";
import { getEventChoiceCostBreakdown } from "@/game/rules/index";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import CubeDialog from "./CubeDialog";
import { bloodMoonSacrificeAmount } from "@/game/cruelMode";
import { getVillagersInVillage } from "@/game/population";
import { useTranslation } from "react-i18next";
import {
  getEventRulesCatalogId,
  getEventI18nVars,
  resolveEventDisplayMessage,
  resolveEventDisplayTitle,
  resolveTimedEventCatalogId,
} from "@/i18n/eventDisplay";
import { localizeEventChoices } from "@/i18n/eventText";
import { getEventChoiceAffordance } from "@/i18n/eventAffordance";
import type { MerchantTradeData } from "@/game/types";
import {
  EventChoiceSuccessTooltipContent,
  getEventChoiceSuccessPercent,
  hasEventChoiceSuccessTooltip,
} from "@/components/game/EventChoiceSuccessTooltip";

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: LogEntry
  | null;
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
  const { t } = useTranslation("ui");
  const { applyEventChoice } = useGameStore();
  const gameState = useGameStore();
  const hasScriptorium = gameState.buildings.scriptorium > 0;

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const fallbackExecutedRef = useRef(false);
  const pauseStartRef = useRef<number>(0);
  const totalPausedMsRef = useRef<number>(0);

  const ruleEventId =
    event?.eventId || (event?.id ? getEventRulesCatalogId(event.id) : "");
  const catalogId = event ? resolveTimedEventCatalogId(ruleEventId) : "";
  const eventI18nVars = event
    ? getEventI18nVars(catalogId, gameState, ruleEventId)
    : undefined;

  const eventChoices = useMemo(() => {
    if (!event) return [];
    const raw =
      typeof event.choices === "function"
        ? event.choices(gameState)
        : event.choices || [];
    if (!raw.length) return [];
    return localizeEventChoices(catalogId, raw, gameState, eventI18nVars) ?? raw;
  }, [event, catalogId, gameState, eventI18nVars]);

  // Reset purchased items when dialog opens
  useEffect(() => {
    if (isOpen) {
      // No longer need to reset purchased items as merchant dialog is removed
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
    const timeBonus = calculateKnowledgeTimeBonus(knowledge);
    const decisionTime = (event.baseDecisionTime || 15) + timeBonus;

    setTotalTime(decisionTime);
    setTimeRemaining(decisionTime);
    startTimeRef.current = Date.now();
    fallbackExecutedRef.current = false;
    pauseStartRef.current = 0;
    totalPausedMsRef.current = 0;

    const interval = setInterval(() => {
      if (fallbackExecutedRef.current) {
        return;
      }

      const isPaused = useGameStore.getState().isPaused;
      if (isPaused) {
        if (pauseStartRef.current === 0) {
          pauseStartRef.current = Date.now();
        }
        return;
      } else if (pauseStartRef.current > 0) {
        totalPausedMsRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = 0;
      }

      const elapsed = (Date.now() - startTimeRef.current - totalPausedMsRef.current) / 1000;
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
  }, [event?.id, event?.isTimedChoice, event?.baseDecisionTime, isOpen, eventChoices]); // Added eventChoices dependency

  // Merchant choices are now generated by the event definition itself
  // No need for useEffect since eventChoices is derived directly from event.choices

  // Add timer logic for timed events
  // This is already handled in the useEffect above, no changes needed here.

  if (!event || !eventChoices.length) return null;

  const handleChoice = (choiceId: string) => {
    if (fallbackExecutedRef.current) {
      return;
    }

    const eventId = event!.id.split("-")[0];
    const isMerchantEvent = event?.id.includes("merchant");
    const isSayGoodbye = choiceId === "say_goodbye";
    const isAcknowledge = choiceId === "acknowledge";

    // For "acknowledge" buttons (log messages), just close the dialog
    if (isAcknowledge) {
      fallbackExecutedRef.current = true;
      onClose();
      return;
    }

    // For merchant "say goodbye", just close the dialog without processing
    if (isMerchantEvent && isSayGoodbye) {
      fallbackExecutedRef.current = true;
      onClose();
      return;
    }

    // For merchant trades (not goodbye), mark item as purchased but don't close dialog
    // This logic is now handled by the specific merchant event's choice effects.
    // The general handling below will apply.

    // Handle special actions for mysterious note event
    if (eventId === "mysteriousNote") {
      const choice = eventChoices.find((c) => c.id === choiceId);
      if (choice) {
        const result = choice.effect(gameState);

        // Handle shop opening
        if ((result as any)._openShop) {
          fallbackExecutedRef.current = true;
          applyEventChoice(choiceId, eventId);
          onClose();
          gameState.setShopDialogOpen(true);
          return;
        }

        // Handle donation page opening
        if ((result as any)._openDonation) {
          fallbackExecutedRef.current = true;
          applyEventChoice(choiceId, eventId);
          onClose();
          window.open("https://buymeacoffee.com/julianbudev", "_blank");
          return;
        }
      }
    }

    // For non-merchant events, process normally
    fallbackExecutedRef.current = true;
    const accepted = applyEventChoice(choiceId, eventId);
    if (!accepted) {
      fallbackExecutedRef.current = false;
      return;
    }
    onClose();
  };

  const progress =
    event.isTimedChoice && timeRemaining !== null && totalTime > 0
      ? ((totalTime - timeRemaining) / totalTime) * 100
      : 0;

  const isCubeEvent = event?.id?.startsWith("cube");

  // Check if this is a madness event with choices (dialog)
  const madnessEventIds = [
    "villagerStares",
    "facesInWalls",
    "skinCrawling",
    "creatureInHut",
    "wrongReflections",
    "villagersStareAtSky"
  ];
  const isMadnessEvent = event?.id && madnessEventIds.some(id => event.id.startsWith(id));

  const displayTitle =
    resolveEventDisplayTitle(catalogId, event.title, gameState, ruleEventId) ||
    t("event.fallbackTitle");
  const displayMessage = resolveEventDisplayMessage(
    catalogId,
    event.message,
    gameState,
    ruleEventId,
  );

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
          <DialogContent className={`z-[60] [--adc-dialog-max-w:28rem] [&>button]:hidden ${isMadnessEvent ? 'border-2 border-violet-600 shadow-2xl p-6  max-h-[19rem] flex flex-col overflow-visible' : ''}`}>
            {isMadnessEvent && (
              <div className="absolute inset-0 -z-10 madness-dialog-glow pointer-events-none"></div>
            )}
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-lg font-semibold">
                  {displayTitle}
                </DialogTitle>
                <div className="flex gap-2 items-center flex-shrink-0">
                  {hasScriptorium && event.isTimedChoice && getTotalKnowledge(gameState) > 0 && (
                    <TooltipWrapper
                      tooltip={
                        <div className="text-xs whitespace-nowrap">
                          {t("event.knowledgeTimeBonus", {
                            seconds: calculateKnowledgeTimeBonus(
                              getTotalKnowledge(gameState),
                            ),
                            maxSuffix: isKnowledgeBonusMaxed(
                              getTotalKnowledge(gameState),
                            )
                              ? t("event.knowledgeTimeBonusMax")
                              : "",
                          })}
                        </div>
                      }
                      tooltipId="event-time-bonus"
                      disabled
                    >
                      <span className="font-noto-symbols-2 text-blue-300/80 cursor-pointer hover:text-blue-300 transition-colors inline-block text-xl">
                        ✧
                      </span>
                    </TooltipWrapper>
                  )}
                  {hasScriptorium && event.relevant_stats && event.relevant_stats.length > 0 && (
                    <div className="flex gap-1">
                      {event.relevant_stats.map((stat) => {
                        const statInfo = statIcons[stat.toLowerCase()];
                        if (!statInfo) return null;
                        return (
                          <span
                            key={stat}
                            className={`font-noto-symbols-2 text-xs ${statInfo.color}`}
                            title={stat}
                          >
                            {statInfo.icon}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <DialogDescription className="text-sm text-gray-400 mt-2">
                {displayMessage}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {eventChoices.map((choice) => {
                const tradeChoice = choice as typeof choice & Partial<MerchantTradeData>;
                const cost = choice.cost;
                let isDisabled = (timeRemaining !== null && timeRemaining <= 0) || fallbackExecutedRef.current;

                // Check if this is the sacrifice choice in blood moon event
                if (choice.id === 'sacrificeVillagers' && event.id === 'bloodMoonAttack') {
                  const sacrificeAmount = bloodMoonSacrificeAmount(
                    gameState.cruelMode,
                    gameState.bloodMoonState?.occurrenceCount ?? 0,
                  );
                  const totalVillagers = getVillagersInVillage(gameState);
                  if (totalVillagers < sacrificeAmount) {
                    isDisabled = true;
                  }
                }

                // Evaluate cost if it's a function
                const costText = typeof cost === 'function' ? cost(gameState) : cost;

                const affordance = getEventChoiceAffordance(choice, gameState, {
                  catalogId,
                  vars: eventI18nVars,
                });
                if (!affordance.canAfford) {
                  isDisabled = true;
                }

                const labelText =
                  typeof choice.label === "string" ? choice.label : "";

                // Calculate success percentage if available and book_of_war is owned
                let successPercentage: string | null = null;
                if (choice.success_chance !== undefined && gameState.books?.book_of_war) {
                  const percent = getEventChoiceSuccessPercent(choice, gameState);
                  if (percent !== null) {
                    successPercentage = `${percent}%`;
                  }
                }

                const showSuccessTooltip = hasEventChoiceSuccessTooltip(choice);

                const selectChoice = () => handleChoice(choice.id);
                const buttonContent = (
                  <Button
                    onClick={selectChoice}
                    variant="outline"
                    className="w-full flex items-center justify-between text-left"
                    disabled={isDisabled}
                    button_id={`event-choice-${choice.id}`}
                  >
                    <span className="whitespace-nowrap">{labelText}</span>
                    <div className="flex gap-1 items-center ml-2 flex-shrink-0">
                      {successPercentage && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {successPercentage}
                        </span>
                      )}
                      {hasScriptorium && choice.relevant_stats && choice.relevant_stats.length > 0 && (
                        <div className="flex gap-1">
                          {choice.relevant_stats.map((stat) => {
                            const statInfo = statIcons[stat.toLowerCase()];
                            if (!statInfo) return null;
                            return (
                              <span
                                key={stat}
                                className={`font-noto-symbols-2 text-xs ${statInfo.color}`}
                              >
                                {statInfo.icon}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Button>
                );

                const costBreakdown = getEventChoiceCostBreakdown(cost, gameState, {
                  catalogId,
                  choiceId: choice.id,
                  vars: eventI18nVars,
                  sellResource: tradeChoice.sellResource,
                  sellAmount: tradeChoice.sellAmount,
                });

                const tooltipContent =
                  costBreakdown.length > 0 || showSuccessTooltip ? (
                    <div className="text-xs whitespace-nowrap">
                      {costBreakdown.length > 0 && (
                        <>
                          {costBreakdown.map((costItem, index) => (
                            <div
                              key={index}
                              className={
                                costItem.satisfied
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }
                            >
                              {costItem.text}
                            </div>
                          ))}
                        </>
                      )}
                      {costBreakdown.length > 0 && showSuccessTooltip && (
                        <div className="border-t border-border my-1" />
                      )}
                      {showSuccessTooltip && (
                        <EventChoiceSuccessTooltipContent
                          choice={choice}
                          gameState={gameState}
                        />
                      )}
                    </div>
                  ) : undefined;

                return tooltipContent ? (
                  <TooltipWrapper
                    key={choice.id}
                    className="relative block w-full"
                    tooltip={tooltipContent}
                    tooltipId={choice.id}
                    disabled={isDisabled}
                    onClick={isDisabled ? undefined : selectChoice}
                  >
                    {buttonContent}
                  </TooltipWrapper>
                ) : (
                  <div key={choice.id} className="w-full">
                    {buttonContent}
                  </div>
                );
              })}
            </div>

            {/* Timer bar for timed events */}
            {event.isTimedChoice && timeRemaining !== null && (
              <div className="mt-1 mb-2 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                </div>
                <Progress value={progress} className="h-2 timer-progress" disableGlow />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}