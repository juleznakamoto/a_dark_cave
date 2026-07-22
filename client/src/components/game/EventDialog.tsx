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
import { gameActionButtonGridClassName, gameActionOutlineButtonClassName } from "@/components/CooldownButton";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import CubeDialog from "./CubeDialog";
import { useTranslation } from "react-i18next";
import {
  getEventRulesCatalogId,
  getEventI18nVars,
  resolveEventDisplayMessage,
  resolveEventDisplayTitle,
  resolveTimedEventCatalogId,
} from "@/i18n/eventDisplay";
import { localizeEventChoices, resolveEventChoiceReward } from "@/i18n/eventText";
import {
  eventChoiceHasBlockingCost,
  getEventChoiceAffordance,
} from "@/i18n/eventAffordance";
import type { MerchantTradeData } from "@/game/types";
import {
  EventChoiceSuccessTooltipContent,
  getEventChoiceSuccessPercent,
  hasDefinedSuccessChance,
  hasEventChoiceSuccessTooltip,
  RelevantStatIcon,
} from "@/components/game/EventChoiceSuccessTooltip";

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: LogEntry
  | null;
}

export default function EventDialog({
  isOpen,
  onClose,
  event,
}: EventDialogProps) {
  const { t } = useTranslation("ui");
  const { applyEventChoice } = useGameStore();
  const gameState = useGameStore();
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
          gameState.setShopDialogOpen(true, "event");
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
          <DialogContent className={`z-[60] gap-4 [--adc-dialog-max-w:28rem] [&>button]:hidden ${isMadnessEvent ? 'border-2 border-violet-600 shadow-2xl p-6  max-h-[19rem] flex flex-col overflow-visible' : ''}`}>
            {isMadnessEvent && (
              <div className="absolute inset-0 -z-10 madness-dialog-glow pointer-events-none"></div>
            )}
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-lg font-semibold">
                  {displayTitle}
                </DialogTitle>
                <div className="flex gap-2 items-center flex-shrink-0">
                  {event.isTimedChoice &&
                    calculateKnowledgeTimeBonus(getTotalKnowledge(gameState)) >
                    0 && (
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
                  {event.relevant_stats && event.relevant_stats.length > 0 && (
                    <div className="flex gap-1">
                      {event.relevant_stats.map((stat) => (
                        <RelevantStatIcon key={stat} stat={stat} title={stat} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogDescription className="text-sm text-gray-400 mt-2">
                {displayMessage}
              </DialogDescription>
            </DialogHeader>

            <div className={gameActionButtonGridClassName()}>
              {eventChoices.map((choice) => {
                const tradeChoice = choice as typeof choice & Partial<MerchantTradeData>;
                const cost = choice.cost;
                let isDisabled = (timeRemaining !== null && timeRemaining <= 0) || fallbackExecutedRef.current;

                // Evaluate cost if it's a function
                const costText = typeof cost === 'function' ? cost(gameState) : cost;

                const affordance = getEventChoiceAffordance(choice, gameState, {
                  catalogId,
                  vars: eventI18nVars,
                });
                const hasBlockingCost = eventChoiceHasBlockingCost(
                  choice,
                  gameState,
                  { catalogId, vars: eventI18nVars },
                );
                if (hasBlockingCost && !affordance.canAfford) {
                  isDisabled = true;
                }

                const labelText =
                  typeof choice.label === "string" ? choice.label : "";

                // Calculate success percentage if this choice has odds (Book of War)
                let successPercentage: string | null = null;
                if (
                  hasDefinedSuccessChance(choice.success_chance) &&
                  gameState.books?.book_of_war
                ) {
                  const percent = getEventChoiceSuccessPercent(choice, gameState);
                  if (percent !== null) {
                    successPercentage = `${percent}%`;
                  }
                }

                const showSuccessTooltip = hasEventChoiceSuccessTooltip(choice);

                const selectChoice = () => {
                  if (isDisabled) return;
                  handleChoice(choice.id);
                };
                const buttonContent = (
                  <Button
                    onClick={selectChoice}
                    variant="outline"
                    size="xs"
                    aria-disabled={isDisabled || undefined}
                    className={cn(
                      "h-auto min-h-7 w-fit max-w-full flex items-center justify-start gap-2 py-1 text-left whitespace-normal",
                      isDisabled && "pointer-events-none opacity-50",
                      gameActionOutlineButtonClassName(isDisabled),
                    )}
                    button_id={`event-choice-${choice.id}`}
                  >
                    <span>{labelText}</span>
                    {(successPercentage ||
                      (choice.relevant_stats && choice.relevant_stats.length > 0)) && (
                        <span className="inline-flex items-center gap-1.5 flex-shrink-0">
                          {successPercentage && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {successPercentage}
                            </span>
                          )}
                          {choice.relevant_stats && choice.relevant_stats.length > 0 && (
                            <>
                              {choice.relevant_stats.map((stat) => (
                                <RelevantStatIcon key={stat} stat={stat} />
                              ))}
                            </>
                          )}
                        </span>
                      )}
                  </Button>
                );

                const costBreakdown = getEventChoiceCostBreakdown(cost, gameState, {
                  catalogId,
                  choiceId: choice.id,
                  vars: eventI18nVars,
                  sellResource: tradeChoice.sellResource,
                  sellAmount: tradeChoice.sellAmount,
                });

                const rewardText = catalogId
                  ? resolveEventChoiceReward(catalogId, choice.id, eventI18nVars)
                  : undefined;

                const tooltipContent =
                  costText || costBreakdown.length > 0 || rewardText || showSuccessTooltip ? (
                    <div className="text-xs whitespace-nowrap">
                      {costBreakdown.length > 0 ? (
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
                      ) : (
                        costText && <div>{costText}</div>
                      )}
                      {(costText || costBreakdown.length > 0) && rewardText && (
                        <div className="border-t border-border my-1" />
                      )}
                      {rewardText && (
                        <div className="text-foreground">{rewardText}</div>
                      )}
                      {(costText || costBreakdown.length > 0 || rewardText) &&
                        showSuccessTooltip && (
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
                    className="relative inline-block w-fit max-w-full"
                    tooltipTriggerClassName="inline-block w-fit max-w-full"
                    tooltip={tooltipContent}
                    tooltipId={choice.id}
                    disabled={isDisabled}
                    onClick={isDisabled ? undefined : selectChoice}
                  >
                    {buttonContent}
                  </TooltipWrapper>
                ) : (
                  <div key={choice.id} className="w-fit max-w-full">
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