import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGameStore } from "@/game/state";
import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { merchantTooltip } from "@/game/rules/tooltips";
import { EventChoice, type LogEntry } from "@/game/rules/events";
import { logger } from "@/lib/logger";
import { formatNumber } from "@/lib/utils";
import {
  calculateMerchantDiscount,
  getTotalMerchantDiscount,
  isKnowledgeBonusMaxed,
} from "@/game/rules/effectsStats";
import { bloodMoonSacrificeAmount } from "@/game/cruelMode";
import { GAMBLER_LEAVE_AFTER_GAMES_MESSAGE } from "@/game/rules/eventsGambler";
import GamblerDiceDialog from "@/components/game/GamblerDiceDialog";
import { getTotalLuck } from "@/game/rules/effectsCalculation";
import {
  createDefaultGamblerSession,
  getGamblerTutorialPlaysRemaining,
  GAMBLER_TUTORIAL_PLAYS,
  GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY,
} from "@/game/gamblerSession";

// Stat icon mapping
const statIcons: Record<string, { icon: string; color: string }> = {
  luck: { icon: "☆", color: "text-green-300/80" },
  strength: { icon: "⬡", color: "text-red-300/80" },
  knowledge: { icon: "✧", color: "text-blue-300/80" },
};

export default function TimedEventPanel() {
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
  const [safetyTimeRemaining, setSafetyTimeRemaining] = useState<number>(0);
  const lastLoggedEventId = useRef<string | null>(null);
  const pauseStartRef = useRef<number>(0);
  const totalPausedMsRef = useRef<number>(0);

  // Gambler dialog state
  const [gamblerDialogOpen, setGamblerDialogOpen] = useState(false);
  /** Bumped when bone dice advances to the next round while the dialog stays open — remounts dialog so hydrate effect runs (isOpen alone does not change). */
  const [gamblerDialogRoundKey, setGamblerDialogRoundKey] = useState(0);

  useEffect(() => {
    setGamblerDiceDialogOpen(gamblerDialogOpen);
    return () => setGamblerDiceDialogOpen(false);
  }, [gamblerDialogOpen, setGamblerDiceDialogOpen]);

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

    // Choices are pre-computed when the event triggers, so they're always an array
    const choices = Array.isArray(timedEventTab.event.choices)
      ? timedEventTab.event.choices
      : [];

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
  ]);

  useEffect(() => {
    if (
      !timedEventTab.isActive ||
      !timedEventTab.expiryTime ||
      !timedEventTab.event
    ) {
      setTimeRemaining(0);
      setSafetyTimeRemaining(0);
      return;
    }

    const event = timedEventTab.event;
    const expiryTime = timedEventTab.expiryTime;
    const startTime = timedEventTab.startTime || Date.now();
    const safetyEndTime = startTime + 1000;
    pauseStartRef.current = 0;
    totalPausedMsRef.current = 0;
    /** Interval keeps firing at 0:00; expiry side-effects must run only once per event. */
    let expiryHandled = false;

    const updateTimer = () => {
      const st = useGameStore.getState();
      const gamblerDialogPausesTimer =
        event.id.split("-")[0] === "gambler" && st.gamblerDiceDialogOpen;
      const isPaused = st.isPaused || gamblerDialogPausesTimer;
      if (isPaused) {
        if (pauseStartRef.current === 0) {
          pauseStartRef.current = Date.now();
        }
        return;
      } else if (pauseStartRef.current > 0) {
        totalPausedMsRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = 0;
      }

      const now = Date.now();
      const remaining = Math.max(0, expiryTime + totalPausedMsRef.current - now);
      const safetyRemaining = Math.max(0, safetyEndTime - now);

      setTimeRemaining(remaining);
      setSafetyTimeRemaining(safetyRemaining);

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
                  timestamp: Date.now(),
                  type: "system" as const,
                },
              ],
            };
          });
        } else if (gamblerPrefix && gg?.outcome != null) {
          // Timer ran out on the outcome screen — close UI, clear marker (economics already done).
          setGamblerDialogOpen(false);
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

        // The useEffect in GameContainer will automatically switch to cave tab
        // when it detects timedevent tab is active but event is no longer active
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
    applyEventChoice(choiceId, eventId, event);

    // For Trader's Gratitude: Accept opens the Shop (real-money) but event continues until time runs out or player declines
    if (eventId === "traders_gratitude" && choiceId === "accept_traders_gratitude") {
      setShopDialogOpen(true);
      return;
    }

    // For gambler events: accept opens the dialog, decline closes tab
    if (isGamblerEvent) {
      if (choiceId === "accept") {
        if (gameState.timedEventTab?.gamblerRoundsRemaining === 0) {
          return;
        }
        setGamblerDialogOpen(true);
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

  // Helper function to extract resource names from cost text
  const extractResourcesFromCost = (costText: string): string[] => {
    const resources: string[] = [];
    // Match patterns like "25 food", "100 wood", etc.
    const matches = costText.matchAll(/([\d']+)\s+([a-zA-Z_]+)/g);

    for (const match of matches) {
      const resourceName = match[2].toLowerCase();
      resources.push(resourceName);
    }

    return resources;
  };

  // Helper function to extract buy resource from label text
  const extractBuyResourceFromLabel = (labelText: string): string | null => {
    // Match patterns like "250 Food", "100 Wood", etc. (first resource in label)
    const match = labelText.match(/\d+\s+([a-zA-Z\s]+)/);
    if (match) {
      return match[1].trim().toLowerCase().replace(/\s+/g, "_");
    }
    return null;
  };

  return (
    <div className="w-full md:max-w-96 space-y-1 mt-2 mb-2 pl-[3px] pr-[3px]">
      {/* Event Title */}
      {event.title && (
        <h2 className="text-xs flex items-center justify-between">
          <div>
            <span className="font-semibold">{event.title} </span>
            <span className="text-muted-foreground">
              &nbsp;{formatTime(timeRemaining)}
            </span>
          </div>
        </h2>
      )}
      {/* Event Message */}
      <div className="text-xs text-muted-foreground">{event.message}</div>

      {/* Choices */}
      <div className="space-y-2 pt-1">
        {(isMerchantEvent || isCollectorEvent) && (
          <h3 className="text-xs font-medium flex items-center">
            <span>{isMerchantEvent ? "Buy" : "Sell"}</span>
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
                          {Math.round(totalDiscount * 100)}% discount
                          {(knowledgeDiscount > 0 || hasRingOfObedience) && (
                            <>
                              <br />
                              {knowledgeDiscount > 0 && (
                                <span className="text-gray-400/70">
                                  {Math.round(knowledgeDiscount * 100)}% from
                                  Knowledge
                                  {isKnowledgeBonusMaxed(knowledge)
                                    ? " (max)"
                                    : ""}
                                </span>
                              )}
                              {knowledgeDiscount > 0 &&
                                hasRingOfObedience && <br />}
                              {hasRingOfObedience && (
                                <span className="text-gray-400/70">
                                  5% from Ring of Obedience
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      }
                      tooltipId="merchant-discount"
                    >
                      <span className="text-blue-300/80 cursor-pointer hover:text-blue-300 transition-colors inline-block text-lg pl-2">
                        ✧
                      </span>
                    </TooltipWrapper>
                  );
                }
                return null;
              })()}
          </h3>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {Array.isArray(eventChoices) &&
            eventChoices.map((choice) => {
              const cost = choice.cost;
              // Evaluate cost if it's a function
              const costText =
                typeof cost === "function" ? cost(gameState) : cost;

              // Check if player can afford the cost (for all timed tab events)
              let canAfford = true;
              let individualAffordance: Record<string, boolean> = {};

              if (costText) {
                // Extract all resource requirements from cost string
                const costMatches = costText.matchAll(/([\d']+)\s+([a-zA-Z_]+)/g);
                for (const match of costMatches) {
                  const costAmount = parseInt(match[1].replace(/'/g, ""), 10);
                  const resourceName = match[2].toLowerCase();

                  // Check if this resource exists in gameState.resources
                  const resourceKey =
                    resourceName as keyof typeof gameState.resources;
                  const currentAmount = gameState.resources[resourceKey] ?? 0;
                  const hasEnough = currentAmount >= costAmount;

                  individualAffordance[resourceName] = hasEnough;

                  if (!hasEnough) {
                    canAfford = false;
                  }
                }
              }

              // Evaluate label if it's a function
              let labelText =
                typeof choice.label === "function"
                  ? choice.label(gameState)
                  : choice.label;

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
                const totalVillagers = Object.values(gameState.villagers).reduce((sum, count) => sum + count, 0);
                if (totalVillagers < sacrificeAmount) {
                  villagersCheckPassed = false;
                }
              }

              // Disable if can't afford, time is up, already purchased, in safety period, or not enough villagers
              const isDisabled =
                !canAfford ||
                timeRemaining <= 0 ||
                isPurchased ||
                safetyTimeRemaining > 0 ||
                !villagersCheckPassed;

              // Calculate success percentage if available
              let successPercentage: string | null = null;
              if (
                choice.success_chance &&
                typeof choice.success_chance === "function"
              ) {
                const chance = Math.min(1, Math.max(0, choice.success_chance(gameState)));
                successPercentage = `${Math.round(chance * 100)}%`;
              } else if (typeof choice.success_chance === "number") {
                successPercentage = `${Math.round(Math.min(1, Math.max(0, choice.success_chance)) * 100)}%`;
              }

              // Check if we have a Scriptorium to show stat icons
              const hasScriptorium = gameState.buildings.scriptorium >= 1;

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
                  className="gap-0 w-full text-left justify-between"
                >
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <span className="whitespace-nowrap">{labelText}</span>
                    {hasScriptorium &&
                      successPercentage &&
                      choice.relevant_stats &&
                      choice.relevant_stats.length > 0 && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {successPercentage}
                          </span>
                          {choice.relevant_stats.map((stat) => {
                            const statInfo = statIcons[stat.toLowerCase()];
                            if (!statInfo) return null;
                            return (
                              <span
                                key={stat}
                                className={`text-xs ${statInfo.color}`}
                                title={stat}
                              >
                                {statInfo.icon}
                              </span>
                            );
                          })}
                        </div>
                      )}
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    {isPurchased && <span className="ml-1">✓</span>}
                  </div>
                </Button>
              );

              return costText ? (
                <TooltipWrapper
                  key={choice.id}
                  tooltip={
                    <div
                      className="text-xs whitespace-nowrap"
                    >
                      {costText && (
                        <div>
                          {/* Parse cost segments and apply individual coloring */}
                          {costText.split(",").map((part, i) => {
                            const trimmedPart = part.trim();
                            const match = trimmedPart.match(/([\d']+)\s+([a-zA-Z_]+)/);
                            if (match) {
                              const amount = parseInt(match[1].replace(/'/g, ""), 10);
                              const resName = match[2].toLowerCase();
                              const formattedResourceName = resName
                                .split("_")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() + word.slice(1),
                                )
                                .join(" ");
                              const hasEnough = individualAffordance[resName] !== false;
                              return (
                                <div
                                  key={i}
                                  className={hasEnough ? "text-foreground" : "text-muted-foreground"}
                                >
                                  -{formatNumber(amount)} {formattedResourceName}
                                </div>
                              );
                            }
                            return <div key={i}>-{trimmedPart}</div>;
                          })}
                        </div>
                      )}
                      {costText && successPercentage && (
                        <div className="border-t border-border my-1" />
                      )}
                      {successPercentage && (
                        <div>Success Chance: {successPercentage}</div>
                      )}
                    </div>
                  }
                  tooltipId={`timedevent-${choice.id}`}
                  disabled={isDisabled}
                  onClick={() => handleChoice(choice.id)}
                  onMouseEnter={() => {
                    if (costText) {
                      const costResources = extractResourcesFromCost(costText);

                      // For merchant trades, always highlight both buy and sell resources
                      if (isMerchantEvent) {
                        const buyResource =
                          extractBuyResourceFromLabel(labelText);
                        const highlightResources = buyResource
                          ? [...costResources, buyResource]
                          : costResources;
                        setHighlightedResources(highlightResources);
                      } else {
                        // Standard: only highlight cost resources
                        setHighlightedResources(costResources);
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    setHighlightedResources([]);
                  }}
                >
                  {buttonContent}
                </TooltipWrapper>
              ) : (
                <div
                  key={choice.id}
                  onMouseEnter={() => {
                    if (costText) {
                      const costResources = extractResourcesFromCost(costText);
                      if (isMerchantEvent) {
                        const buyResource =
                          extractBuyResourceFromLabel(labelText);
                        const highlightResources = buyResource
                          ? [...costResources, buyResource]
                          : costResources;
                        setHighlightedResources(highlightResources);
                      } else {
                        setHighlightedResources(costResources);
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    setHighlightedResources([]);
                  }}
                >
                  {buttonContent}
                </div>
              );
            })}
        </div>

        {/* Say Goodbye button - only for merchant events */}
        {isMerchantEvent && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setHighlightedResources([]);
              setTimedEventTab(false);
            }}
            variant="outline"
            size="xs"
            disabled={timeRemaining <= 0 || safetyTimeRemaining > 0}
            button_id="timedevent-say_goodbye"
          >
            Say Goodbye
          </Button>
        )}
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
                  message: `You won ${wager} gold from the obsessed gambler.`,
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
                          message: `You lost ${wager} gold to the obsessed gambler.`,
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
                const msg =
                  next > 0
                    ? `${outcome === "win" ? "You won" : "You lost"} the practice round (no gold at stake). ${next} of ${GAMBLER_TUTORIAL_PLAYS} practice games remaining.`
                    : `${outcome === "win" ? "You won" : "You lost"} the practice round (no gold at stake). Practice complete — you may place a gold wager.`;
                useGameStore.setState((s) => ({
                  log: [
                    ...s.log,
                    {
                      id: `gambler-practice-round-${Date.now()}`,
                      message: msg,
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
            setGamblerDialogOpen(false);
            useGameStore.setState((s) =>
              s.gamblerGame ? { gamblerGame: null } : {},
            );
            if (resolved && isGamblerEvent) {
              const gamblerEventTitle =
                st.timedEventTab.event?.title ?? "The Obsessed Gambler";
              setHighlightedResources([]);
              setTimedEventTab(false);
              if (showGamblerDepartureDialog) {
                setEventDialog(false);
                setTimeout(() => {
                  const departureEntry: LogEntry = {
                    id: `gambler-depart-${Date.now()}`,
                    message: GAMBLER_LEAVE_AFTER_GAMES_MESSAGE,
                    timestamp: Date.now(),
                    type: "event",
                    title: gamblerEventTitle,
                    choices: [
                      {
                        id: "acknowledge",
                        label: "Continue",
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
