import { GameState } from "@shared/schema";
import {
  getTotalStrength,
  getTotalLuck,
  getTotalKnowledge,
} from "./effectsCalculation";

/**
 * Helper function to calculate success chance for event choices
 * @param state - Current game state
 * @param baseChance - Base success probability (0-1)
 * @param stat0 - First stat type and its multiplier (e.g., { type: 'strength', multiplier: 0.01 })
 * @param stat1 - Second stat type and its multiplier (optional)
 * @param cmMultiplier - Cruel mode multiplier (default: -0.05)
 * @returns Calculated success chance (0-1)
 */
export function calculateSuccessChance(
  state: GameState,
  baseChance: number,
  stat0?: { type: 'strength' | 'knowledge' | 'luck'; multiplier: number },
  stat1?: { type: 'strength' | 'knowledge' | 'luck'; multiplier: number },
  cmMultiplier: number = -0.05
): number {
  let chance = baseChance;

  // Add first stat bonus
  if (stat0) {
    const statValue = stat0.type === 'strength'
      ? getTotalStrength(state)
      : stat0.type === 'knowledge'
      ? getTotalKnowledge(state)
      : getTotalLuck(state);
    chance += statValue * stat0.multiplier;
  }

  // Add second stat bonus
  if (stat1) {
    const statValue = stat1.type === 'strength'
      ? getTotalStrength(state)
      : stat1.type === 'knowledge'
      ? getTotalKnowledge(state)
      : getTotalLuck(state);
    chance += statValue * stat1.multiplier;
  }

  // Apply cruel mode modifier
  chance += state.CM * cmMultiplier;

  // Cap at 100% (1.0)
  return Math.min(chance, 1.0);
}


import { storyEvents } from "./eventsStory";
import { choiceEvents } from "./eventsChoices";
import { merchantEvents, generateMerchantChoices } from "./eventsMerchant";
import { madnessEvents } from "./eventsMadness";
import { caveEvents } from "./eventsCave";
import { huntEvents } from "./eventsHunt";
import { attackWaveEvents } from "./eventsAttackWaves";
import { cubeEvents } from "./eventsCube";
import { recurringEvents } from "./eventsRecurring";
import { noChoiceEvents } from "./eventsNoChoices";
import { feastEvents } from "./eventsFeast";
import { boneDevourerEvents } from "./eventsBoneDevourer";
import { villageAttackEvents } from "./eventsVillageAttacks";
import { loreEvents } from "./eventsLore";
import { fellowshipEvents } from "./eventsFellowship";
import { riddleEvents } from "./eventsRiddles";
import { ringEvents } from "./eventsRing";
import { fullGameUnlockEvents } from "./eventsFullGameUnlock";
import { GAME_CONSTANTS } from "../constants";

export interface GameEvent {
  id: string;
  condition: (state: GameState) => boolean;
  title?: string;
  message: string | string[] | ((state: GameState) => string); // Support array of messages for random selection or function
  choices?: EventChoice[];
  triggered?: boolean;
  repeatable?: boolean;
  priority?: number; // Higher priority events check first
  timeProbability?: number | ((state: GameState) => number); // Average minutes between triggers
  effect?: (state: GameState) => Partial<GameState>;
  // New timed choice properties
  isTimedChoice?: boolean;
  baseDecisionTime?: number; // Base decision time in seconds
  fallbackChoice?: EventChoice; // Choice to execute if time runs out
  relevant_stats?: ("strength" | "knowledge" | "luck" | "madness")[]; // Stats relevant to event odds
  // Visual effect properties
  visualEffect?: {
    type: 'glow' | 'pulse';
    duration: number; // in seconds
  };
  // Timed tab properties
  showAsTimedTab?: boolean;
  timedTabDuration?: number; // Duration in milliseconds
  skipEventLog?: boolean; // Skip adding to visible event log
}

export interface EventChoice {
  id: string;
  label: string | ((state: GameState) => string);
  relevant_stats?: ("strength" | "knowledge" | "luck" | "madness")[];
  success_chance?: number | ((state: GameState) => number); // Success probability for this choice
  cost?: string | ((state: GameState) => string); // Optional cost information for hover display
  effect: (state: GameState) => Partial<GameState>;
  cooldown?: number; // Cooldown in seconds for choice buttons
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
  type: "event" | "action" | "system";
  title?: string;
  choices?: EventChoice[];
  isTimedChoice?: boolean;
  baseDecisionTime?: number;
  fallbackChoice?: EventChoice;
  skipSound?: boolean; // Skip playing sound for this event
  skipEventLog?: boolean; // Skip adding to visible event log
  relevant_stats?: ("strength" | "knowledge" | "luck" | "madness")[]; // Stats relevant to event odds
  // Visual effect properties
  visualEffect?: {
    type: 'glow' | 'pulse';
    duration: number; // in seconds
  };
  // Timed tab properties
  showAsTimedTab?: boolean;
  timedTabDuration?: number; // Duration in milliseconds
}

// Merge all events from separate files
export const gameEvents: Record<string, GameEvent> = {
  ...storyEvents,
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
  ...boneDevourerEvents,
  ...villageAttackEvents,
  ...loreEvents,
  ...fellowshipEvents,
  ...riddleEvents,
  ...ringEvents,
  ...fullGameUnlockEvents,
};

export class EventManager {
  // Assuming `allEvents` is intended to be `gameEvents` based on context
  private static allEvents: Record<string, GameEvent> = gameEvents;

  static checkEvents(state: GameState): {
    newLogEntries: LogEntry[];
    stateChanges: Partial<GameState>;
  } {
    const newLogEntries: LogEntry[] = [];
    let stateChanges: Partial<GameState> = {};
    const sortedEvents = Object.values(this.allEvents).sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );

    // Initialize event cooldowns if not present
    const eventCooldowns = state.eventCooldowns || {};
    const currentTime = Date.now();

    // Check if a timed tab event is currently active (from UI state)
    // We'll check if the state indicates an active timed tab
    const isTimedTabActive = state.timedEventTab?.isActive || false;

    for (const event of sortedEvents) {
      // Skip if already triggered and not repeatable
      if (event.triggered && !event.repeatable) continue;

      // Skip if event was already triggered this session (for non-repeatable events)
      if (state.triggeredEvents?.[event.id] && !event.repeatable) continue;

      // Skip timed tab events if another timed tab event is already active
      if (event.showAsTimedTab && isTimedTabActive) continue;

      // Check if event is on cooldown (25% of its time probability must pass)
      if (event.timeProbability && eventCooldowns[event.id]) {
        const timeProbability =
          typeof event.timeProbability === "function"
            ? event.timeProbability(state)
            : event.timeProbability;

        const cooldownPeriod = timeProbability * 0.25 * 60 * 1000; // 25% in milliseconds
        const timeSinceLastTrigger = currentTime - eventCooldowns[event.id];

        if (timeSinceLastTrigger < cooldownPeriod) {
          continue; // Skip this event, it's still on cooldown
        }
      }

      // Check condition with probability if specified
      let shouldTrigger = event.condition(state);

      // Apply time-based probability if specified
      if (shouldTrigger && event.timeProbability) {
        // Calculate ticks per minute dynamically based on TICK_INTERVAL from constants
        // TICK_INTERVAL is in milliseconds, so: (1000ms / TICK_INTERVAL) * 60 seconds
        const ticksPerSecond = 1000 / GAME_CONSTANTS.TICK_INTERVAL;
        const ticksPerMinute = ticksPerSecond * 60;

        // Get timeProbability - can be number or function
        const timeProbability =
          typeof event.timeProbability === "function"
            ? event.timeProbability(state)
            : event.timeProbability;

        const averageTicksBetweenEvents = timeProbability * ticksPerMinute;
        const probabilityPerTick = 1 / averageTicksBetweenEvents;

        shouldTrigger = Math.random() < probabilityPerTick;
      }

      if (shouldTrigger) {
        // Generate fresh choices for merchant events
        let eventChoices = event.choices;
        if (event.id === "merchant") {
          eventChoices = generateMerchantChoices(state);
        }

        // Select random message if message is an array, or evaluate if it's a function
        let message: string;
        if (typeof event.message === 'function') {
          message = event.message(state);
        } else if (Array.isArray(event.message)) {
          message = event.message[Math.floor(Math.random() * event.message.length)];
        } else {
          message = event.message;
        }

        // Only create and add log entry if it's NOT a timed tab event
        if (!event.showAsTimedTab) {
          const logEntry: LogEntry = {
            id: `${event.id}-${Date.now()}`,
            message: message,
            timestamp: Date.now(),
            type: "event",
            title: event.title,
            choices: eventChoices,
            isTimedChoice: event.isTimedChoice,
            baseDecisionTime: event.baseDecisionTime,
            fallbackChoice: event.fallbackChoice,
            relevant_stats: event.relevant_stats,
            visualEffect: event.visualEffect,
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
            title: event.title,
            choices: eventChoices,
            fallbackChoice: event.fallbackChoice,
            timedTabDuration: event.timedTabDuration,
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

        // Mark as triggered
        event.triggered = true;
        // For non-repeatable events, record in state
        if (!event.repeatable) {
          stateChanges.triggeredEvents = {
            ...(state.triggeredEvents || {}),
            [event.id]: true,
          };
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

  static applyEventChoice(
    state: GameState,
    choiceId: string,
    eventId: string,
    currentLogEntry?: LogEntry,
  ): Partial<GameState> {
    console.log('[EVENT MANAGER] ===== applyEventChoice START =====');
    console.log('[EVENT MANAGER] choiceId:', choiceId);
    console.log('[EVENT MANAGER] eventId:', eventId);
    console.log('[EVENT MANAGER] currentLogEntry:', {
      hasEntry: !!currentLogEntry,
      entryId: currentLogEntry?.id,
      hasChoices: !!currentLogEntry?.choices,
      choicesCount: currentLogEntry?.choices?.length
    });

    const eventDefinition = this.allEvents[eventId];
    if (!eventDefinition) {
      console.error('[EVENT MANAGER] No event definition found for:', eventId);
      return {};
    }

    // For merchant events, use the choices from currentLogEntry (they were pre-generated with effects)
    if (eventId === 'merchant' && currentLogEntry?.choices) {
      console.log('[EVENT MANAGER] Using pre-generated merchant choices from currentLogEntry');
      console.log('[EVENT MANAGER] Available choices:', currentLogEntry.choices.map(c => ({ id: c.id, label: c.label })));

      const choice = currentLogEntry.choices.find((c) => c.id === choiceId);
      console.log('[EVENT MANAGER] Found merchant choice:', {
        found: !!choice,
        id: choice?.id,
        hasEffect: !!(choice?.effect),
        effectType: typeof choice?.effect,
        effectString: choice?.effect?.toString().substring(0, 300)
      });

      if (choice && typeof choice.effect === "function") {
        console.log('[EVENT MANAGER] Calling merchant effect function...');
        console.log('[EVENT MANAGER] State before effect:', {
          food: state.resources.food,
          wood: state.resources.wood,
          stone: state.resources.stone,
          leather: state.resources.leather,
          steel: state.resources.steel,
          gold: state.resources.gold
        });

        const result = choice.effect(state);

        console.log('[EVENT MANAGER] Merchant effect result:', {
          hasResources: !!result.resources,
          resourceChanges: result.resources,
          fullResult: result
        });
        console.log('[EVENT MANAGER] ===== applyEventChoice END (merchant) =====');
        return result;
      } else {
        console.error('[EVENT MANAGER] Merchant choice not found or effect is not a function');
        console.log('[EVENT MANAGER] ===== applyEventChoice END (error) =====');
        return {};
      }
    }

    // First try to find the choice in the choices array
    let choice = eventDefinition.choices?.find((c) => c.id === choiceId);

    // If not found and this is a fallback choice, use the fallbackChoice directly
    if (
      !choice &&
      eventDefinition.fallbackChoice &&
      eventDefinition.fallbackChoice.id === choiceId
    ) {
      console.log('[EVENT MANAGER] Using fallback choice');
      choice = eventDefinition.fallbackChoice;
    }

    if (!choice) {
      console.error('[EVENT MANAGER] No choice found for:', choiceId);
      return {};
    }

    console.log('[EVENT MANAGER] Found choice:', {
      id: choice.id,
      hasEffect: typeof choice.effect === 'function',
      effectType: typeof choice.effect,
      effectValue: choice.effect
    });

    const choiceResult = choice.effect(state);

    const result = {
      ...choiceResult,
      log: currentLogEntry
        ? state.log.filter((entry) => entry.id !== currentLogEntry.id)
        : state.log,
    };

    console.log('[EVENT MANAGER] ===== applyEventChoice END =====');
    return result;
  }
}