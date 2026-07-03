import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useGameStore,
  shouldFreezeTimedEventTabCountdown,
  syncTimedEventTabPauseTracking,
  getTimedEventTabEffectiveRemainingMs,
} from "@/game/state";
import { Button } from "@/components/ui/button";
import {
  gameActionButtonGridClassName,
  gameActionOutlineButtonClassName,
} from "@/components/CooldownButton";
import { cn } from "@/lib/utils";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { getMerchantTradeEffectTooltipLine } from "@/game/rules/eventsMerchant";
import { EventChoice, type LogEntry } from "@/game/rules/events";
import { logger } from "@/lib/logger";
import {
  calculateMerchantDiscount,
  getTotalMerchantDiscount,
  isKnowledgeBonusMaxed,
} from "@/game/rules/effectsStats";
import { bloodMoonSacrificeAmount } from "@/game/cruelMode";
import { getVillagersInVillage } from "@/game/population";
import { getGamblerLeaveAfterGamesMessage } from "@/game/rules/eventsGambler";
import GamblerDiceDialog from "@/components/game/GamblerDiceDialog";
import { getTotalLuck } from "@/game/rules/effectsCalculation";
import {
  createDefaultGamblerSession,
  getGamblerTutorialPlaysRemaining,
  GAMBLER_TUTORIAL_PLAYS,
  GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY,
} from "@/game/gamblerSession";
import { useTranslation } from "react-i18next";
import {
  getEventI18nVars,
  getEventRulesCatalogId,
  resolveEventDisplayMessage,
  resolveEventDisplayTitle,
  resolveTimedEventCatalogId,
} from "@/i18n/eventDisplay";
import { localizeEventChoices, resolveEventChoiceReward } from "@/i18n/eventText";
import { interpolateFallback } from "@/i18n/resolveGameText";
import {
  eventChoiceHasBlockingCost,
  getEventChoiceAffordance,
} from "@/i18n/eventAffordance";
import { getEventChoiceCostBreakdown } from "@/game/rules/index";
import type { MerchantTradeData } from "@/game/types";
import {
  EventChoiceSuccessTooltipContent,
  getEventChoiceSuccessPercent,
  hasDefinedSuccessChance,
  hasEventChoiceSuccessTooltip,
  RelevantStatIcon,
} from "@/components/game/EventChoiceSuccessTooltip";
import { ActionInsightBadge } from "@/components/game/ActionInsightBadge";

export default function TimedEventPanel() {
  const { t } = useTranslation(["ui", "common"]);
  const {
    timedEventTab,
    applyEventChoice,
    setTimedEventTab,
    setEventDialog,
    setHighlightedResources,
    setShopDialogOpen,
    setGamblerDiceDialogOpen,
  } = useGameStore();
  const gameState = useGameStore();

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const lastLoggedEventId = useRef<string | null>(null);

  // Gambler dialog state
  const [gamblerDialogOpen, setGamblerDialogOpen] = useState(false);
  /** Bumped when bone dice advances to the next round while the dialog stays open — remounts dialog so hydrate effect runs (isOpen alone does not change). */
  const [gamblerDialogRoundKey, setGamblerDialogRoundKey] = useState(0);

  /** Keep `gamblerDiceDialogOpen` in sync in the same turn as local state so `isModalDialogOpen` and the timed-tab timer do not race a frame behind the visible dice UI. */
  const openGamblerDiceDialog = useCallback(() => {
    setGamblerDialogOpen(true);
    setGamblerDiceDialogOpen(true);
  }, [setGamblerDiceDialogOpen]);

  const closeGamblerDiceDialog = useCallback(() => {
    setGamblerDialogOpen(false);
    setGamblerDiceDialogOpen(false);
  }, [setGamblerDiceDialogOpen]);

  useEffect(() => {
    return () => setGamblerDiceDialogOpen(false);
  }, [setGamblerDiceDialogOpen]);

  // Get merchant trades from state (generated once when event starts)
  const isMerchantEvent = timedEventTab.event?.id.split("-")[0] === "merchant";
  const isCollectorEvent =
    timedEventTab.event?.id.split("-")[0] === "wandering_collector";
  const isGamblerEvent = timedEventTab.event?.id.split("-")[0] === "gambler";

  /** After refresh, reopen gambler modal when save restored `gamblerDiceDialogOpen`. */
  useEffect(() => {
    if (!isGamblerEvent || !timedEventTab.isActive) return;
    if (gameState.gamblerDiceDialogOpen) {
      setGamblerDialogOpen(true);
    }
  }, [isGamblerEvent, timedEventTab.isActive, gameState.gamblerDiceDialogOpen]);
  const eventChoices: EventChoice[] = useMemo(() => {
    if (!timedEventTab.event) {
      lastLoggedEventId.current = null;
      return [];
    }

    const eventId = timedEventTab.event.id;
    const shouldLog = lastLoggedEventId.current !== eventId;

    if (isMerchantEvent) {
      // CRITICAL: Use state.merchantTrades as the single source of truth
      if (shouldLog) {
        logger.log(
          "[TIMED EVENT PANEL] Merchant event, using merchantTrades from state:",
          {
            eventId: eventId,
            choicesCount: gameState.merchantTrades?.choices?.length || 0,
            choices: gameState.merchantTrades?.choices,
          },
        );
        lastLoggedEventId.current = eventId;
      }
      return Array.isArray(gameState.merchantTrades?.choices)
        ? gameState.merchantTrades.choices
        : [];
    }

    const stored = Array.isArray(timedEventTab.event.choices)
      ? timedEventTab.event.choices
      : [];
    const ruleEventId =
      timedEventTab.event.eventId || getEventRulesCatalogId(timedEventTab.event.id);
    const catalogId = resolveTimedEventCatalogId(ruleEventId);
    const vars = getEventI18nVars(catalogId, gameState, ruleEventId);
    const choices =
      localizeEventChoices(catalogId, stored, gameState, vars) ?? stored;

    if (shouldLog) {
      logger.log("[TIMED EVENT PANEL] Non-merchant event, using event choices:", {
        eventId: eventId,
        choicesCount: choices.length,
      });
      lastLoggedEventId.current = eventId;
    }

    return choices;
  }, [
    isMerchantEvent,
    timedEventTab.event,
    gameState.merchantTrades,
    gameState,
  ]);

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
    /** Interval keeps firing at 0:00; expiry side-effects must run only once per event. */
    let expiryHandled = false;

    const updateTimer = () => {
      syncTimedEventTabPauseTracking();
      const st = useGameStore.getState();
      const isPaused = shouldFreezeTimedEventTabCountdown(st);
      if (isPaused) {
        return;
      }

      const remaining = getTimedEventTabEffectiveRemainingMs(st) ?? 0;

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        if (expiryHandled) return;
        expiryHandled = true;

        const currentState = useGameStore.getState();
        const gamblerPrefix = event.id.split("-")[0] === "gambler";
        const gg = currentState.gamblerGame;
        let gamblerMidRoundForfeitHandled = false;

        // Mid-round forfeit only when the dice dialog is not open (timer is frozen while open).
        if (
          gamblerPrefix &&
          gg &&
          gg.outcome == null &&
          !currentState.gamblerDiceDialogOpen
        ) {
          gamblerMidRoundForfeitHandled = true;
          setGamblerDialogOpen(false);
          useGameStore.getState().setGamblerDiceDialogOpen(false);
          useGameStore.setState((state) => {
            const w = gg.wager ?? 0;
            const gold = state.resources?.gold ?? 0;
            return {
              gamblerGame: null,
              resources:
                w > 0
                  ? { ...state.resources, gold: Math.max(0, gold - w) }
                  : state.resources,
              log: [
                ...state.log,
                {
                  id: `gambler-forfeit-${Date.now()}`,
                  message: "The obsessed gambler took your silence as forfeit.",
                  logKey: "gambler.forfeit",
                  timestamp: Date.now(),
                  type: "system" as const,
                },
              ],
            };
          });
        } else if (gamblerPrefix && gg?.outcome != null) {
          // Timer ran out on the outcome screen — close UI, clear marker (economics already done).
          setGamblerDialogOpen(false);
          useGameStore.getState().setGamblerDiceDialogOpen(false);
          useGameStore.setState({ gamblerGame: null });
        }

        // Execute fallback choice when timer expires
        if (event) {
          const timedEventId = event.eventId || event.id.split("-")[0];
          const skipGamblerFallback =
            gamblerMidRoundForfeitHandled ||
            (gamblerPrefix && gg != null && gg.outcome != null);

          // Use the event's defined fallbackChoice if available
          if (
            !skipGamblerFallback &&
            event.fallbackChoice &&
            typeof event.fallbackChoice.effect === "function"
          ) {
            applyEventChoice(event.fallbackChoice.id, timedEventId, event);
          } else {
            // Fallback to looking for "doNothing" choice
            // Choices are pre-computed when event triggers, so they're always an array
            const choices = Array.isArray(event.choices) ? event.choices : [];
            const fallbackChoice = choices.find((c) => c.id === "doNothing");
            if (
              !skipGamblerFallback &&
              fallbackChoice &&
              typeof fallbackChoice.effect === "function"
            ) {
              applyEventChoice(fallbackChoice.id, timedEventId, event);
            }
          }
        }

        // Clear highlights and auto-close the tab
        setHighlightedResources([]);
        setTimedEventTab(false);

        // GameContainer switches away from timedevent when the event is no longer active
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
  const ruleEventId = event.eventId || getEventRulesCatalogId(event.id);
  const catalogId = resolveTimedEventCatalogId(ruleEventId);
  const eventId = ruleEventId;
  const displayTitle = resolveEventDisplayTitle(
    catalogId,
    event.title,
    gameState,
    ruleEventId,
  );
  const displayMessage = resolveEventDisplayMessage(
    catalogId,
    event.message,
    gameState,
    ruleEventId,
  );

  const eventI18nVars = getEventI18nVars(catalogId, gameState, ruleEventId);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleChoice = (choiceId: string) => {
    if (gameState.isPaused) {
      return;
    }

    setHighlightedResources([]); // Clear highlights before closing

    logger.log("[TIMED EVENT PANEL] handleChoice called:", {
      choiceId,
      isMerchantEvent,
      eventChoices: eventChoices.map((c) => ({
        id: c.id,
        label: typeof c.label === "function" ? c.label(gameState) : c.label,
      })),
      merchantTrades: gameState.merchantTrades,
    });

    // Don't pre-emptively mark as purchased - let applyEventChoice handle it atomically
    const accepted = applyEventChoice(choiceId, eventId, event);
    if (!accepted) {
      return;
    }

    // For Trader's Gratitude: Accept opens the Shop (real-money) but event continues until time runs out or player declines
    if (eventId === "traders_gratitude" && choiceId === "accept_traders_gratitude") {
      setShopDialogOpen(true);
      return;
    }

    if (
      eventId === "traders_son_gratitude" &&
      choiceId === "accept_traders_son_gratitude"
    ) {
      setShopDialogOpen(true);
      return;
    }

    // For gambler events: accept opens the dialog, decline closes tab
    if (isGamblerEvent) {
      if (choiceId === "accept") {
        if (gameState.timedEventTab?.gamblerRoundsRemaining === 0) {
          return;
        }
        openGamblerDiceDialog();
      } else {
        setTimedEventTab(false);
      }
      return;
    }

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

  // Helper function to extract buy resource from label text
  const extractBuyResourceFromLabel = (labelText: string): string | null => {
    // Match patterns like "250 Food", "100 Wood", etc. (first resource in label)
    const match = labelText.match(/[\d']+\s+([a-zA-Z\s]+)/);
    if (match) {
      return match[1].trim().toLowerCase().replace(/\s+/g, "_");
    }
    return null;
  };

  return (
    <div className="w-full space-y-1 pt-2 md:pt-0 mt-0 md:mt-2 mb-2 pl-2 pr-2">
      {/* Event Title */}
      {displayTitle && (
        <h2 className="text-xs flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-wrap gap-x-1">
            <span className="font-semibold">{displayTitle}</span>
            <span
              className="inline-block w-[5ch] shrink-0 text-right text-muted-foreground tabular-nums"
              aria-live="polite"
            >
              {formatTime(timeRemaining)}
            </span>
            <ActionInsightBadge
              target="timedEvent"
              timeRemainingMs={timeRemaining}
            />
          </div>
        </h2>
      )}
      {/* Event Message */}
      {displayMessage && (
        <div className="text-xs text-muted-foreground">{displayMessage}</div>
      )}

      {/* Choices */}
      <div className="space-y-2 pt-1">
        {(isMerchantEvent || isCollectorEvent) && (
          <h3 className="text-xs font-medium inline-flex items-center gap-1.5">
            <span className="leading-none">
              {isMerchantEvent ? t("ui:timedEvent.buy") : t("ui:timedEvent.sell")}
            </span>
            {isMerchantEvent &&
              (() => {
                const knowledge = gameState.stats?.knowledge || 0;
                const totalDiscount = getTotalMerchantDiscount(gameState);
                const knowledgeDiscount = calculateMerchantDiscount(knowledge);
                const hasRingOfObedience =
                  gameState.clothing?.ring_of_obedience ?? false;

                if (totalDiscount > 0) {
                  return (
                    <TooltipWrapper
                      tooltip={
                        <div className="text-xs whitespace-nowrap">
                          {t("ui:timedEvent.discount", {
                            percent: Math.round(totalDiscount * 100),
                          })}
                          {(knowledgeDiscount > 0 || hasRingOfObedience) && (
                            <>
                              <br />
                              {knowledgeDiscount > 0 && (
                                <span className="text-gray-400/70">
                                  {t("ui:timedEvent.discountFromKnowledge", {
                                    percent: Math.round(knowledgeDiscount * 100),
                                    max: isKnowledgeBonusMaxed(knowledge)
                                      ? t("ui:timedEvent.knowledgeMax")
                                      : "",
                                  })}
                                </span>
                              )}
                              {knowledgeDiscount > 0 &&
                                hasRingOfObedience && <br />}
                              {hasRingOfObedience && (
                                <span className="text-gray-400/70">
                                  {t("ui:timedEvent.discountFromRing")}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      }
                      tooltipId="merchant-discount"
                      disabled
                    >
                      <span className="font-noto-symbols-2 text-blue-300/80 cursor-pointer hover:text-blue-300 transition-colors inline-flex shrink-0 items-center justify-center text-sm leading-none">
                        ✧
                      </span>
                    </TooltipWrapper>
                  );
                }
                return null;
              })()}
          </h3>
        )}
        <div className={gameActionButtonGridClassName("mt-2")}>
          {Array.isArray(eventChoices) &&
            eventChoices.map((choice) => {
              const tradeChoice = choice as EventChoice & Partial<MerchantTradeData>;
              const cost = choice.cost;
              // Evaluate cost if it's a function
              const costText =
                typeof cost === "function" ? cost(gameState) : cost;

              const affordance = getEventChoiceAffordance(choice, gameState, {
                catalogId,
                vars: eventI18nVars,
              });
              const hasBlockingCost = eventChoiceHasBlockingCost(
                choice,
                gameState,
                { catalogId, vars: eventI18nVars },
              );
              const canAfford = affordance.canAfford;
              const costBreakdown = getEventChoiceCostBreakdown(cost, gameState, {
                catalogId,
                choiceId: choice.id,
                vars: eventI18nVars,
                sellResource: tradeChoice.sellResource,
                sellAmount: tradeChoice.sellAmount,
              });

              // Evaluate label if it's a function
              const labelText =
                typeof choice.label === "string" ? choice.label : "";

              const isPurchased =
                isMerchantEvent &&
                gameState.merchantTrades?.purchasedIds?.includes(choice.id);

              // Check if this is the sacrifice choice in blood moon event
              let villagersCheckPassed = true;
              if (choice.id === 'sacrificeVillagers' && eventId === 'bloodMoonAttack') {
                const sacrificeAmount = bloodMoonSacrificeAmount(
                  gameState.cruelMode,
                  gameState.bloodMoonState?.occurrenceCount ?? 0,
                );
                const totalVillagers = getVillagersInVillage(gameState);
                if (totalVillagers < sacrificeAmount) {
                  villagersCheckPassed = false;
                }
              }

              // Disable if can't afford a paid choice, time is up, already purchased, or not enough villagers
              const isDisabled =
                (hasBlockingCost && !canAfford) ||
                timeRemaining <= 0 ||
                isPurchased ||
                !villagersCheckPassed;

              // Calculate success percentage if this choice has odds (Book of War)
              let successPercentage: string | null = null;
              if (
                hasDefinedSuccessChance(choice.success_chance) &&
                gameState.books?.book_of_war
              ) {
                const successPercent = getEventChoiceSuccessPercent(
                  choice,
                  gameState,
                );
                if (successPercent !== null) {
                  successPercentage = `${successPercent}%`;
                }
              }
              const showSuccessTooltip = hasEventChoiceSuccessTooltip(choice);

              const hasChoiceMeta =
                !!successPercentage ||
                !!(choice.relevant_stats && choice.relevant_stats.length > 0) ||
                isPurchased;

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
                  className={cn(
                    "h-auto min-h-7 w-fit max-w-full gap-2 py-1 text-left justify-start whitespace-normal",
                    gameActionOutlineButtonClassName(isDisabled),
                  )}
                >
                  <span>{labelText}</span>
                  {hasChoiceMeta && (
                    <span className="inline-flex items-center gap-1.5 flex-shrink-0">
                      {successPercentage && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {successPercentage}
                        </span>
                      )}
                      {choice.relevant_stats &&
                        choice.relevant_stats.length > 0 &&
                        choice.relevant_stats.map((stat) => (
                          <RelevantStatIcon key={stat} stat={stat} />
                        ))}
                      {isPurchased && (
                        <span className="inline-flex items-center justify-center text-[12px] leading-none">
                          ✓
                        </span>
                      )}
                    </span>
                  )}
                </Button>
              );

              const merchantEffectLine =
                isMerchantEvent && tradeChoice.buyItem
                  ? getMerchantTradeEffectTooltipLine(tradeChoice)
                  : null;

              const rewardText = catalogId
                ? resolveEventChoiceReward(catalogId, choice.id, eventI18nVars)
                : undefined;

              const tooltipContent =
                costText || rewardText || showSuccessTooltip || merchantEffectLine ? (
                  <div className="text-xs whitespace-nowrap">
                    {costText && (
                      <>
                        {costBreakdown.length > 0 ? (
                          <div>
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
                          </div>
                        ) : (
                          costText
                        )}
                      </>
                    )}
                    {costText && rewardText && (
                      <div className="border-t border-border my-1" />
                    )}
                    {rewardText && (
                      <div className="text-foreground">{rewardText}</div>
                    )}
                    {(costText || rewardText) &&
                      (showSuccessTooltip || merchantEffectLine) && (
                        <div className="border-t border-border my-1" />
                      )}
                    {merchantEffectLine && <div>{merchantEffectLine}</div>}
                    {showSuccessTooltip && (
                      <EventChoiceSuccessTooltipContent
                        choice={choice}
                        gameState={gameState}
                      />
                    )}
                  </div>
                ) : undefined;

              const highlightCostResources = () => {
                const costResources = affordance.costs.map(({ resource }) => resource);
                if (costResources.length > 0) {
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
              };

              return tooltipContent ? (
                <TooltipWrapper
                  key={choice.id}
                  className="relative inline-block w-fit max-w-full"
                  tooltipTriggerClassName="inline-block w-fit max-w-full"
                  tooltip={tooltipContent}
                  tooltipId={`timedevent-${choice.id}`}
                  disabled={isDisabled}
                  onClick={isDisabled ? undefined : () => handleChoice(choice.id)}
                  onMouseEnter={costText ? highlightCostResources : undefined}
                  onMouseLeave={costText ? () => setHighlightedResources([]) : undefined}
                >
                  {buttonContent}
                </TooltipWrapper>
              ) : (
                <div key={choice.id} className="w-fit max-w-full">
                  {buttonContent}
                </div>
              );
            })}

          {isMerchantEvent && (
            <div className="basis-full">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setHighlightedResources([]);
                  setTimedEventTab(false);
                }}
                variant="outline"
                size="xs"
                disabled={timeRemaining <= 0}
                className={gameActionOutlineButtonClassName(timeRemaining <= 0)}
                button_id="timedevent-say_goodbye"
              >
                {t("ui:timedEvent.sayGoodbye")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Gambler dice dialog */}
      {isGamblerEvent && (
        <GamblerDiceDialog
          key={gamblerDialogRoundKey}
          isOpen={gamblerDialogOpen}
          playerGold={gameState.resources?.gold ?? 0}
          playerLuck={getTotalLuck(gameState)}
          onWagerSelected={(wager) => {
            useGameStore.setState((s) => {
              const prev = s.gamblerGame;
              const isGamblerTab =
                s.timedEventTab?.event?.id?.split("-")[0] === "gambler";

              let roundsRemainingThisEvent: number;
              if (prev?.roundsRemainingThisEvent != null) {
                roundsRemainingThisEvent = prev.roundsRemainingThisEvent;
              } else {
                const tutorialLeft = getGamblerTutorialPlaysRemaining(
                  s.story?.seen,
                );
                if (wager === 0 && tutorialLeft > 0) {
                  roundsRemainingThisEvent = tutorialLeft;
                } else {
                  const tr = s.timedEventTab?.gamblerRoundsRemaining;
                  if (tr != null && tr >= 1) {
                    roundsRemainingThisEvent = tr;
                  } else {
                    roundsRemainingThisEvent = s.relics?.bone_dice ? 2 : 1;
                  }
                }
              }

              const lazyInitTab =
                isGamblerTab &&
                  s.timedEventTab.gamblerRoundsRemaining == null
                  ? {
                    timedEventTab: {
                      ...s.timedEventTab,
                      gamblerRoundsRemaining: roundsRemainingThisEvent,
                    },
                  }
                  : {};

              return {
                ...lazyInitTab,
                gamblerGame: {
                  wager,
                  stakeNotYetDeducted: true,
                  roundsRemainingThisEvent,
                  session: createDefaultGamblerSession("playerTurn"),
                },
              };
            });
          }}
          onOutcomeResolved={(outcome, wager, snapshot) => {
            const practice = wager === 0;
            if (outcome === "win") {
              useGameStore.setState((s) => {
                const gamblerWinsTotal =
                  (Number(s.story?.seen?.gamblerWinsTotal) || 0) +
                  (practice ? 0 : 1);
                const gold = (s.resources?.gold ?? 0) + (practice ? 0 : wager);
                const logEntry = {
                  id: `gambler-win-${Date.now()}`,
                  message: `You won ${wager} Gold from the obsessed gambler.`,
                  logKey: "gambler.win",
                  logVars: { amount: wager },
                  timestamp: Date.now(),
                  type: "system" as const,
                };
                return {
                  resources: {
                    ...s.resources,
                    gold,
                  },
                  gamblerGame: {
                    wager,
                    outcome: "win",
                    outcomeSnapshot: snapshot,
                    stakeNotYetDeducted: false,
                    roundsRemainingThisEvent:
                      s.gamblerGame?.roundsRemainingThisEvent,
                  },
                  ...(practice
                    ? {}
                    : {
                      story: {
                        ...s.story,
                        seen: {
                          ...s.story?.seen,
                          gamblerWinsTotal,
                        },
                      },
                    }),
                  ...(practice ? {} : { log: [...s.log, logEntry] }),
                };
              });
            } else {
              useGameStore.setState((s) => {
                const takeStake = !practice;
                const gold = s.resources?.gold ?? 0;
                return {
                  resources: {
                    ...s.resources,
                    gold: takeStake ? Math.max(0, gold - wager) : gold,
                  },
                  gamblerGame: {
                    wager,
                    outcome: "lose",
                    outcomeSnapshot: snapshot,
                    stakeNotYetDeducted: false,
                    roundsRemainingThisEvent:
                      s.gamblerGame?.roundsRemainingThisEvent,
                  },
                  ...(practice
                    ? {}
                    : {
                      log: [
                        ...s.log,
                        {
                          id: `gambler-lose-${Date.now()}`,
                          message: `You lost ${wager} Gold to the obsessed gambler.`,
                          logKey: "gambler.lose",
                          logVars: { amount: wager },
                          timestamp: Date.now(),
                          type: "system" as const,
                        },
                      ],
                    }),
                };
              });
            }
          }}
          onClose={() => {
            const st = useGameStore.getState();
            const gg = st.gamblerGame;
            const resolved = gg?.outcome != null;
            let showGamblerDepartureDialog = false;
            if (resolved) {
              const rem =
                gg.roundsRemainingThisEvent ??
                st.timedEventTab.gamblerRoundsRemaining ??
                1;
              const next = rem - 1;
              const practiceRound = gg.wager === 0;

              if (practiceRound) {
                const outcome = gg.outcome;
                const msgKey =
                  next > 0
                    ? outcome === "win"
                      ? "gambler.practiceWinRemaining"
                      : "gambler.practiceLoseRemaining"
                    : outcome === "win"
                      ? "gambler.practiceWinComplete"
                      : "gambler.practiceLoseComplete";
                const practiceFallbacks: Record<string, string> = {
                  "gambler.practiceWinRemaining":
                    "You won the practice round (no Gold at stake). {{remaining}} of {{total}} practice games remaining.",
                  "gambler.practiceLoseRemaining":
                    "You lost the practice round (no Gold at stake). {{remaining}} of {{total}} practice games remaining.",
                  "gambler.practiceWinComplete":
                    "You won the practice round (no Gold at stake). Practice complete — you may place a Gold wager.",
                  "gambler.practiceLoseComplete":
                    "You lost the practice round (no Gold at stake). Practice complete — you may place a Gold wager.",
                };
                const logVars = {
                  remaining: next,
                  total: GAMBLER_TUTORIAL_PLAYS,
                };
                const fallback = practiceFallbacks[msgKey];
                useGameStore.setState((s) => ({
                  log: [
                    ...s.log,
                    {
                      id: `gambler-practice-round-${Date.now()}`,
                      message: interpolateFallback(fallback, logVars),
                      logKey: msgKey,
                      logVars,
                      timestamp: Date.now(),
                      type: "system" as const,
                    },
                  ],
                }));
              }

              if (practiceRound && next > 0) {
                useGameStore.setState((s) => ({
                  gamblerGame: {
                    wager: 0,
                    roundsRemainingThisEvent: next,
                  },
                  timedEventTab:
                    s.timedEventTab.event?.id?.split("-")[0] === "gambler"
                      ? {
                        ...s.timedEventTab,
                        gamblerRoundsRemaining: next,
                      }
                      : s.timedEventTab,
                  story: {
                    ...s.story,
                    seen: {
                      ...s.story?.seen,
                      [GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY]: next,
                    },
                  },
                }));
                setGamblerDialogRoundKey((k) => k + 1);
                return;
              }

              if (practiceRound && next === 0) {
                const paidRounds = st.relics?.bone_dice ? 2 : 1;
                useGameStore.setState((s) => ({
                  gamblerGame: {
                    wager: 0,
                    roundsRemainingThisEvent: paidRounds,
                  },
                  timedEventTab:
                    s.timedEventTab.event?.id?.split("-")[0] === "gambler"
                      ? {
                        ...s.timedEventTab,
                        gamblerRoundsRemaining: paidRounds,
                      }
                      : s.timedEventTab,
                  story: {
                    ...s.story,
                    seen: {
                      ...s.story?.seen,
                      [GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY]: 0,
                    },
                  },
                }));
                setGamblerDialogRoundKey((k) => k + 1);
                return;
              }

              if (next > 0) {
                useGameStore.setState((s) => ({
                  gamblerGame: {
                    wager: 0,
                    roundsRemainingThisEvent: next,
                  },
                  timedEventTab:
                    s.timedEventTab.event?.id?.split("-")[0] === "gambler"
                      ? {
                        ...s.timedEventTab,
                        gamblerRoundsRemaining: next,
                      }
                      : s.timedEventTab,
                }));
                setGamblerDialogRoundKey((k) => k + 1);
                return;
              }

              showGamblerDepartureDialog = !practiceRound && next === 0;
            }
            closeGamblerDiceDialog();
            useGameStore.setState((s) =>
              s.gamblerGame ? { gamblerGame: null } : {},
            );
            if (resolved && isGamblerEvent) {
              const gamblerEventTitle =
                st.timedEventTab.event?.title ?? t("gambler.title");
              setHighlightedResources([]);
              setTimedEventTab(false);
              if (showGamblerDepartureDialog) {
                setEventDialog(false);
                setTimeout(() => {
                  const departureEntry: LogEntry = {
                    id: `gambler-depart-${Date.now()}`,
                    message: getGamblerLeaveAfterGamesMessage(),
                    timestamp: Date.now(),
                    type: "event",
                    title: gamblerEventTitle,
                    choices: [
                      {
                        id: "acknowledge",
                        label: t("common:buttons.continue"),
                        effect: () => ({}),
                      },
                    ],
                    skipSound: true,
                  };
                  setEventDialog(true, departureEntry);
                }, 200);
              }
            }
          }}
        />
      )}
    </div>
  );
}
