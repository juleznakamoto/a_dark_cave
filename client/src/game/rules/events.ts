import { GameState } from "@shared/schema";
import { logger } from "../../lib/logger";
import { isGameTabHidden } from "../../lib/tabVisibility";
import type {
  EventChoiceEffectResult,
  GameEvent,
  LogEntry,
} from "./eventTypes";
import { storyEvents } from "./eventsStory";
import { choiceEvents } from "./eventsChoices";
import { woodcutterEvents } from "./eventsWoodcutter";
import { shopItemEvents } from "./eventsShopItems";
import {
  merchantEvents,
  generateMerchantChoices,
  isMerchantTradeCurrentlyAvailable,
  CLARITY_ELIXIR_MADNESS_REDUCTION,
} from "./eventsMerchant";
import { madnessEvents } from "./eventsMadness";
import { caveEvents } from "./eventsCave";
import { huntEvents } from "./eventsHunt";
import { attackWaveEvents } from "./eventsAttackWaves";
import { cubeEvents } from "./eventsCube";
import { recurringEvents } from "./eventsRecurring";
import { noChoiceEvents } from "./eventsNoChoices";
import { feastEvents } from "./eventsFeast";
import { solsticeGatheringEvents } from "./eventsSolsticeGathering";
import { staringDeerEvents } from "./eventsStaringDeer";
import { forestFearEvents } from "./eventsForestFear";
import { boneDevourerEvents } from "./eventsBoneDevourer";
import { villageAttackEvents } from "./eventsVillageAttacks";
import { bloodMoonEvents } from "./eventsBloodMoon";
import { loreEvents } from "./eventsLore";
import { fellowshipEvents } from "./eventsFellowship";
import { riddleEvents } from "./eventsRiddles";
import { ringEvents } from "./eventsRing";
import { crowEvents } from "./eventsCrow";
import { wanderingCollectorEvents } from "./eventsWanderingCollector";
import { exiledScholarEvents } from "./eventsExiledScholar";
import { obsidianOrbEvents } from "./eventsObsidianOrb";
import { tradersDaughterEvents } from "./eventsTradersDaughter";
import { tradersSonEvents } from "./eventsTradersSon";
import { disgracedPriorEvents } from "./eventsDisgracedPrior";
import { socialPromoExclusiveEvents } from "./eventsSocialPromoExclusive";
import { gamblerEvents } from "./eventsGambler";
import { theDamnedEvents } from "./eventsTheDamned";
import { scholarResearchEvents } from "./eventsScholarResearch";
import { chainmasterEvents } from "./eventsChainmaster";
import { insightBlessingEvents } from "./eventsInsightBlessings";
import { ladyMountainsEvents } from "./eventsLadyMountains";
import { GAME_CONSTANTS } from "../constants";
import {
  getEventCatalogId,
  localizeEventChoices,
  localizeFallbackChoice,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
import { getEventChoiceAffordance } from "@/i18n/eventAffordance";

// Re-export types so existing `@/game/rules/events` imports keep working.
export type {
  EventChoice,
  EventChoiceEffectResult,
  GameEvent,
  LogEntry,
} from "./eventTypes";

export const gameEvents: Record<string, GameEvent> = {
  ...storyEvents,
  ...woodcutterEvents,
  ...loreEvents,
  ...shopItemEvents,
  ...choiceEvents,
  ...merchantEvents,
  ...madnessEvents,
  ...caveEvents,
  ...huntEvents,
  ...attackWaveEvents,
  ...cubeEvents,
  ...recurringEvents,
  ...noChoiceEvents,
  ...feastEvents,
  ...solsticeGatheringEvents,
  ...staringDeerEvents,
  ...forestFearEvents,
  ...boneDevourerEvents,
  ...villageAttackEvents,
  ...bloodMoonEvents,
  ...fellowshipEvents,
  ...riddleEvents,
  ...ringEvents,
  ...crowEvents,
  ...wanderingCollectorEvents,
  ...exiledScholarEvents,
  ...obsidianOrbEvents,
  ...tradersDaughterEvents,
  ...tradersSonEvents,
  ...disgracedPriorEvents,
  ...socialPromoExclusiveEvents,
  ...gamblerEvents,
  ...theDamnedEvents,
  ...scholarResearchEvents,
  ...chainmasterEvents,
  ...insightBlessingEvents,
  ...ladyMountainsEvents,
};

/** Priority order for event rolls (higher first). Static priorities — sorted once at module load. */
const sortedEventsByPriority = Object.values(gameEvents).sort(
  (a, b) => (b.priority || 0) - (a.priority || 0),
);

/** Game state plus UI-only flags (from GameStore, not on persisted GameState). */
export type EventRollState = GameState & {
  timedEventTab?: { isActive: boolean; lastEndedAt?: number };
  eventDialog?: { isOpen?: boolean; lastEndedAt?: number };
};

export function getEventCatalogIdByEventId(eventId: string): string {
  const event = gameEvents[eventId];
  return event ? getEventCatalogId(event) : eventId;
}

export function getEventI18nVars(
  eventId: string,
  state?: GameState,
): Record<string, string | number> | undefined {
  const vars = gameEvents[eventId]?.i18nVars;
  if (!vars) return undefined;
  if (typeof vars === "function") {
    return state ? vars(state) : undefined;
  }
  return vars;
}

export class EventManager {
  static checkEvents(state: EventRollState): {
    newLogEntries: LogEntry[];
    stateChanges: Partial<GameState>;
  } {
    const newLogEntries: LogEntry[] = [];
    let stateChanges: Partial<GameState> = {};

    // Initialize event cooldowns if not present
    const eventCooldowns = state.eventCooldowns || {};
    const currentTime = Date.now();

    const isTimedTabActive = state.timedEventTab?.isActive || false;
    const lastTimedTabEndedAt = state.timedEventTab?.lastEndedAt ?? 0;
    const isTimedTabGapActive =
      lastTimedTabEndedAt > 0 &&
      currentTime - lastTimedTabEndedAt < GAME_CONSTANTS.TIMED_TAB_MIN_GAP_MS;

    const lastEventDialogEndedAt = state.eventDialog?.lastEndedAt ?? 0;
    const isEventDialogGapActive =
      lastEventDialogEndedAt > 0 &&
      currentTime - lastEventDialogEndedAt < GAME_CONSTANTS.EVENT_DIALOG_MIN_GAP_MS;

    for (const event of sortedEventsByPriority) {
      // Skip if already triggered and not repeatable
      if (event.triggered && !event.repeatable) continue;

      // Skip if event was already triggered this session (for non-repeatable events)
      if (state.triggeredEvents?.[event.id] && !event.repeatable) continue;

      // Active visit, recent close, or backgrounded tab: only block another timed-tab spawn,
      // not random/log events. Hidden tabs must not start a timed visit the player cannot see.
      if (
        event.showAsTimedTab &&
        (isTimedTabActive || isTimedTabGapActive || isGameTabHidden())
      ) {
        continue;
      }

      // Recent EventDialog close: only block another modal/log event, not timed tabs.
      // Intentional follow-ups bypass this by calling setEventDialog directly.
      if (!event.showAsTimedTab && isEventDialogGapActive) continue;

      // Check if event is on cooldown (cooldownPercent of its time probability must pass)
      if (event.timeProbability && eventCooldowns[event.id]) {
        const timeProbability =
          typeof event.timeProbability === "function"
            ? event.timeProbability(state)
            : event.timeProbability;

        const cooldownFraction = event.cooldownPercent ?? 0.25;
        const cooldownPeriod = timeProbability * cooldownFraction * 60 * 1000; // in milliseconds
        const timeSinceLastTrigger = currentTime - eventCooldowns[event.id];

        if (timeSinceLastTrigger < cooldownPeriod) {
          continue; // Skip this event, it's still on cooldown
        }
      }

      const conditionMet = event.condition(state);

      if (!conditionMet) {
        continue;
      }

      // Check condition with probability if specified
      let shouldTrigger = true;

      // Apply time-based probability if specified
      if (event.timeProbability) {
        // `checkEvents` is rolled once per EVENT_CHECK_INTERVAL (not per simulation tick), so the
        // per-roll probability is derived from how many event checks happen per minute. This keeps
        // `timeProbability` meaning "average minutes between triggers" regardless of EVENT_CHECK_INTERVAL.
        const checksPerSecond = 1000 / GAME_CONSTANTS.EVENT_CHECK_INTERVAL;
        const checksPerMinute = checksPerSecond * 60;

        // Get timeProbability - can be number or function
        const timeProbability =
          typeof event.timeProbability === "function"
            ? event.timeProbability(state)
            : event.timeProbability;

        const averageChecksBetweenEvents = timeProbability * checksPerMinute;
        const probabilityPerCheck = 1 / averageChecksBetweenEvents;

        shouldTrigger = Math.random() < probabilityPerCheck;
      }

      if (shouldTrigger) {
        // Generate/evaluate choices
        let eventChoicesRaw = event.choices;
        let eventChoices = typeof eventChoicesRaw === 'function' ? eventChoicesRaw(state) : eventChoicesRaw;
        if (event.id === "merchant") {
          eventChoices = generateMerchantChoices(state);
        }

        // Select random message if message is an array, or evaluate if it's a function
        const catalogId = getEventCatalogId(event);
        const i18nVars =
          typeof event.i18nVars === "function"
            ? event.i18nVars(state)
            : event.i18nVars;
        let message = resolveEventMessage(
          catalogId,
          event.message,
          state,
          i18nVars,
        );

        const title = resolveEventTitle(
          catalogId,
          event.title,
          state,
          i18nVars,
        );

        // Localize choice labels, then pre-evaluate other dynamic choice fields
        if (Array.isArray(eventChoices)) {
          eventChoices = localizeEventChoices(
            catalogId,
            eventChoices,
            state,
            i18nVars,
          )!;
          eventChoices = eventChoices.map((c) => {
            const evaluatedSuccessChance =
              typeof c.success_chance === "function"
                ? c.success_chance(state)
                : c.success_chance;
            return {
              ...c,
              cost: typeof c.cost === "function" ? c.cost(state) : c.cost,
              ...(evaluatedSuccessChance != null &&
                !Number.isNaN(evaluatedSuccessChance) && {
                success_chance: evaluatedSuccessChance,
              }),
            };
          });
        }

        const localizedFallback = localizeFallbackChoice(
          catalogId,
          event.fallbackChoice,
          state,
          i18nVars,
        );

        // Only create and add log entry if it's NOT a timed tab event
        if (!event.showAsTimedTab) {
          const logEntry: LogEntry = {
            id: `${event.id}-${Date.now()}`,
            eventId: event.id,
            message: message,
            timestamp: Date.now(),
            type: "event",
            title,
            choices: eventChoices,
            isTimedChoice: event.isTimedChoice,
            baseDecisionTime: event.baseDecisionTime,
            fallbackChoice: localizedFallback,
            relevant_stats: event.relevant_stats,
            showAsTimedTab: event.showAsTimedTab,
            timedTabDuration: event.timedTabDuration,
            skipEventLog: event.skipEventLog || (eventChoices && eventChoices.length > 0),
          };
          newLogEntries.push(logEntry);
        } else {
          // For timed tab events, pass event data directly without creating a LogEntry
          stateChanges._timedTabEvent = {
            id: event.id,
            eventId: event.id,
            timestamp: Date.now(),
            message: message,
            title,
            choices: eventChoices,
            fallbackChoice: localizedFallback,
            timedTabDuration: event.timedTabDuration,
            _playSound: true, // Signal to play sound
          };
        }

        // Apply effect if it exists
        // For timed tab events, always apply the effect to set up the timer state
        // For other events, only apply if there are no choices (choices will apply effects when selected)
        if (event.effect && (!eventChoices?.length || event.showAsTimedTab)) {
          // If the effect returns combat data, ensure it's handled correctly
          const effectResult = event.effect(state);

          stateChanges = { ...stateChanges, ...effectResult };
        }

        const hasPlayerChoices =
          Array.isArray(eventChoices) && eventChoices.length > 0;

        // Non-repeatable events with choices must NOT write `triggeredEvents` here.
        // `eventDialog` is runtime-only (cleared on load); marking seen on open would
        // permanently suppress the beat if the player refreshes before choosing.
        // No-choice events apply their effect immediately, so mark them at trigger.
        if (!hasPlayerChoices) {
          event.triggered = true;
          if (!event.repeatable) {
            stateChanges.triggeredEvents = {
              ...(state.triggeredEvents || {}),
              [event.id]: true,
            };
          }
        }

        // Record trigger time for cooldown tracking
        stateChanges.eventCooldowns = {
          ...(state.eventCooldowns || {}),
          [event.id]: currentTime,
        };

        break; // Only trigger one event per tick
      }
    }

    return { newLogEntries, stateChanges };
  }

  /**
   * Persist non-repeatable completion only after a real choice result.
   * Skips no-ops (`{}`) and affordance rejects so a failed click cannot eat the event.
   */
  private static withNonRepeatableSeen(
    state: GameState,
    eventId: string,
    result: EventChoiceEffectResult,
  ): EventChoiceEffectResult {
    if (result._choiceRejected) return result;
    if (Object.keys(result).length === 0) return result;

    const eventDefinition = gameEvents[eventId];
    if (!eventDefinition || eventDefinition.repeatable) return result;

    eventDefinition.triggered = true;
    return {
      ...result,
      triggeredEvents: {
        ...(state.triggeredEvents || {}),
        ...((result.triggeredEvents as Record<string, boolean> | undefined) ||
          {}),
        [eventId]: true,
      },
    };
  }

  static applyEventChoice(
    state: GameState,
    choiceId: string,
    eventId: string,
    currentLogEntry?: LogEntry,
  ): EventChoiceEffectResult {
    return this.withNonRepeatableSeen(
      state,
      eventId,
      this.resolveEventChoice(state, choiceId, eventId, currentLogEntry),
    );
  }

  private static resolveEventChoice(
    state: GameState,
    choiceId: string,
    eventId: string,
    currentLogEntry?: LogEntry,
  ): EventChoiceEffectResult {
    logger.log('[EVENT MANAGER] applyEventChoice called:', {
      choiceId,
      eventId,
      hasCurrentLogEntry: !!currentLogEntry,
      stateKeys: Object.keys(state),
      hasMerchantTrades: !!(state as any).merchantTrades,
      merchantTradesKeys: (state as any).merchantTrades ? Object.keys((state as any).merchantTrades) : [],
    });

    const eventDefinition = gameEvents[eventId];
    if (!eventDefinition) {
      logger.error('[EVENT MANAGER] No event definition found for:', eventId);
      return {};
    }

    logger.log('[EVENT MANAGER] Found event definition:', {
      eventId,
      hasChoices: !!eventDefinition.choices,
      choicesCount: eventDefinition.choices?.length || 0,
      hasFallback: !!eventDefinition.fallbackChoice,
    });

    // Handle merchant event specially
    if (eventId === 'merchant') {
      // CRITICAL: state.merchantTrades is the ONLY source of truth for merchant trades
      const merchantTrades = state.merchantTrades?.choices;
      const merchantTradesState = state.merchantTrades;

      logger.log('[EVENT MANAGER] Processing merchant event:', {
        choiceId,
        hasMerchantTrades: !!merchantTrades,
        merchantTradesCount: merchantTrades?.length || 0,
        allTradeIds: merchantTrades?.map((t: any) => t.id) || [],
        purchasedIds: merchantTradesState?.purchasedIds || [],
      });

      // Check if this trade was already purchased (should not happen with atomic updates)
      if (merchantTradesState?.purchasedIds?.includes(choiceId)) {
        logger.log('[EVENT MANAGER] Trade already purchased - this should not happen:', { choiceId });
        return {};
      }

      // Find the trade data from state.merchantTrades (SSOT)
      if (merchantTrades && Array.isArray(merchantTrades)) {
        const trade = merchantTrades.find((t: any) => t.id === choiceId);

        logger.log('[EVENT MANAGER] Trade lookup result:', {
          choiceId,
          foundTrade: !!trade,
          tradeData: trade,
          allAvailableIds: merchantTrades.map((t: any) => t.id),
          allTrades: merchantTrades,
        });

        if (trade && trade.buyResource && trade.sellResource) {
          const currentSellAmount = state.resources[trade.sellResource as keyof typeof state.resources] || 0;

          logger.log('[EVENT MANAGER] Executing merchant trade:', {
            choiceId,
            buyResource: trade.buyResource,
            buyAmount: trade.buyAmount,
            sellResource: trade.sellResource,
            sellAmount: trade.sellAmount,
          });

          if (!isMerchantTradeCurrentlyAvailable(choiceId, state)) {
            logger.log('[EVENT MANAGER] Trade is no longer available:', {
              choiceId,
              currentState: {
                schematics: state.schematics,
                tools: state.tools,
                weapons: state.weapons,
                books: state.books,
                relics: state.relics,
              },
            });
            return {};
          }

          // Check if player can afford
          if (currentSellAmount < trade.sellAmount) {
            logger.log('[EVENT MANAGER] Trade failed - insufficient resources:', {
              required: trade.sellAmount,
              available: currentSellAmount,
              resource: trade.sellResource,
            });
            return {};
          }

          const stateChanges: any = {
            resources: {
              ...state.resources,
              [trade.sellResource]: currentSellAmount - trade.sellAmount,
            },
            log: currentLogEntry
              ? state.log.filter((entry) => entry.id !== currentLogEntry.id)
              : state.log,
            merchantTrades: {
              choices: merchantTrades,
              purchasedIds: [...(merchantTradesState?.purchasedIds || []), choiceId],
            },
            story: {
              ...state.story,
              merchantPurchases: (state.story?.merchantPurchases || 0) + 1,
            },
          };

          // Handle special buy types (books, tools, schematics, consumables) or regular resources
          if (trade.buyItem === "clarity_elixir") {
            const currentPurchases =
              (state.story?.seen?.clarityElixirPurchases as number) ?? 0;
            stateChanges.stats = {
              ...state.stats,
              madnessFromEvents:
                (state.stats.madnessFromEvents || 0) -
                CLARITY_ELIXIR_MADNESS_REDUCTION,
            };
            stateChanges.story = {
              ...stateChanges.story,
              seen: {
                ...state.story.seen,
                clarityElixirPurchases: currentPurchases + 1,
                clarityElixirsUsed:
                  (Number(state.story?.seen?.clarityElixirsUsed) || 0) + 1,
              },
            };
            stateChanges._logMessageI18nKey =
              "merchant.toolTrades.trade_clarity_elixir.message";
          } else if (trade.buyResource === "book") {
            stateChanges.books = {
              ...(state.books || {}),
              [trade.buyItem]: true,
            };
          } else if (trade.buyResource === "tool") {
            stateChanges.tools = {
              ...(state.tools || {}),
              [trade.buyItem]: true,
            };
          } else if (trade.buyResource === "schematic") {
            stateChanges.schematics = {
              ...(state.schematics || {}),
              [trade.buyItem]: true,
            };
          } else if (trade.buyResource === "weapon") {
            stateChanges.weapons = {
              ...(state.weapons || {}),
              [trade.buyItem]: true,
            };
          } else if (trade.buyResource === "relic") {
            if (trade.buyItem === "map_fragment") {
              stateChanges.story = {
                ...stateChanges.story,
                seen: {
                  ...state.story.seen,
                  ...(choiceId === "trade_map_fragment_wooden"
                    ? { mapFragmentMerchantWoodenBought: true }
                    : choiceId === "trade_map_fragment_stone"
                      ? { mapFragmentMerchantStoneBought: true }
                      : {}),
                },
              };
            } else if (trade.buyItem) {
              stateChanges.relics = {
                ...(state.relics || {}),
                [trade.buyItem]: true,
              };
            }
          } else if (trade.buyResource && trade.buyAmount !== undefined) {
            // Regular resource - ensure we don't pollute resources with item IDs
            // The buyResource for item trades is "book", "tool", etc. but the actual item ID is in buyItem
            // For regular resources, buyResource is the resource name (e.g. "food", "gold")
            if (
              ![
                "book",
                "tool",
                "schematic",
                "weapon",
                "consumable",
                "relic",
              ].includes(trade.buyResource)
            ) {
              if (!stateChanges.resources) {
                stateChanges.resources = { ...state.resources };
              }
              stateChanges.resources[trade.buyResource] = (state.resources[trade.buyResource as keyof typeof state.resources] || 0) + trade.buyAmount;
            }
          }

          return stateChanges;
        }
      }

      // If not a trade choice, check for fallback (say_goodbye)
      if (eventDefinition.fallbackChoice && eventDefinition.fallbackChoice.id === choiceId) {
        logger.log('[EVENT MANAGER] Using fallback choice for merchant');
        const fallbackChoice = eventDefinition.fallbackChoice;
        const choiceResult = fallbackChoice.effect(state);
        return {
          ...choiceResult,
          log: currentLogEntry
            ? state.log.filter((entry) => entry.id !== currentLogEntry.id)
            : state.log,
        };
      }

      logger.log('[EVENT MANAGER] Merchant trade not found:', {
        choiceId,
        availableTrades: merchantTrades?.map((t: any) => t.id) || [],
      });
      return {};
    }

    // For non-merchant events, use the standard choice execution
    const choices = typeof eventDefinition.choices === 'function'
      ? eventDefinition.choices(state)
      : eventDefinition.choices || [];
    const choice = Array.isArray(choices) ? choices.find((c) => c.id === choiceId) : null;

    if (!choice) {
      // If not found and this is a fallback choice, use the fallbackChoice directly
      if (
        eventDefinition.fallbackChoice &&
        eventDefinition.fallbackChoice.id === choiceId
      ) {
        logger.log('[EVENT MANAGER] Using fallback choice');
        const fallbackChoice = eventDefinition.fallbackChoice;
        const choiceResult = fallbackChoice.effect(state);
        logger.log('[EVENT MANAGER] Fallback choice result:', {
          hasLogMessage: !!choiceResult._logMessage,
          keys: Object.keys(choiceResult),
        });
        const result = {
          ...choiceResult,
          log: currentLogEntry
            ? state.log.filter((entry) => entry.id !== currentLogEntry.id)
            : state.log,
        };
        return result;
      }
      logger.error('[EVENT MANAGER] Choice not found:', { choiceId, eventId, availableChoices: choices.map(c => c.id) });
      return {};
    }

    logger.log('[EVENT MANAGER] Found choice:', {
      id: choice.id,
      label: choice.label,
      hasEffect: typeof choice.effect === 'function',
    });

    const catalogId = eventDefinition.i18nKey ?? eventId;
    const i18nVars =
      typeof eventDefinition.i18nVars === "function"
        ? eventDefinition.i18nVars(state)
        : eventDefinition.i18nVars;
    const affordance = getEventChoiceAffordance(choice, state, {
      catalogId,
      vars: i18nVars,
    });
    if (!affordance.canAfford) {
      logger.log("[EVENT MANAGER] Choice rejected - cannot afford:", {
        choiceId,
        eventId,
      });
      return { _choiceRejected: true };
    }

    const choiceResult = choice.effect(state);

    logger.log('[EVENT MANAGER] Choice effect result:', {
      hasLogMessage: !!choiceResult._logMessage,
      keys: Object.keys(choiceResult),
      schematics: choiceResult.schematics,
      story: choiceResult.story,
    });

    const result = {
      ...choiceResult,
      log: currentLogEntry
        ? state.log.filter((entry) => entry.id !== currentLogEntry.id)
        : state.log,
    };

    logger.log('[EVENT MANAGER] Final result being returned:', {
      keys: Object.keys(result),
      hasSchematics: !!result.schematics,
      hasStory: !!result.story,
    });

    return result;
  }
}