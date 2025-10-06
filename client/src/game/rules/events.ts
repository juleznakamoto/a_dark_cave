import { GameState } from "@shared/schema";
import { storyEvents } from "./eventsStory";
import { choiceEvents } from "./eventsChoices";
import { merchantEvents, generateMerchantChoices } from "./eventsMerchant";
import { madnessEvents } from "./eventsMadness";
import { caveEvents } from "./eventsCave";
import { huntEvents } from "./eventsHunt";
import { attackWaveEvents } from "./eventsAttackWaves";
import { cubeEvents } from "./eventsCube";

export interface GameEvent {
  id: string;
  condition: (state: GameState) => boolean;
  triggerType: "time" | "resource" | "random" | "action";
  title?: string;
  message: string;
  choices?: EventChoice[];
  triggered: boolean;
  repeatable?: boolean;
  priority?: number; // Higher priority events check first
  timeProbability?: number | ((state: GameState) => number); // Average minutes between triggers
  effect?: (state: GameState) => Partial<GameState>;
  // New timed choice properties
  isTimedChoice?: boolean;
  baseDecisionTime?: number; // Base decision time in seconds
  fallbackChoice?: EventChoice; // Choice to execute if time runs out
  relevant_stats?: ("strength" | "knowledge" | "luck" | "madness")[]; // Stats relevant to event odds
}

export interface EventChoice {
  id: string;
  label: string;
  relevant_stats?: ("strength" | "knowledge" | "luck" | "madness")[];
  cost?: string; // Optional cost information for hover display
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
  // New timed choice properties
  isTimedChoice?: boolean;
  baseDecisionTime?: number;
  fallbackChoice?: EventChoice;
  skipSound?: boolean; // Skip playing sound for this event
  relevant_stats?: ("strength" | "knowledge" | "luck" | "madness")[]; // Stats relevant to event odds
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

    for (const event of sortedEvents) {
      // Skip if already triggered and not repeatable
      if (event.triggered && !event.repeatable) continue;

      // Skip if event was already triggered this session (for non-repeatable events)
      if (state.triggeredEvents?.[event.id] && !event.repeatable) continue;

      // Check condition with probability if specified
      let shouldTrigger = event.condition(state);

      // Apply time-based probability if specified
      if (shouldTrigger && event.timeProbability) {
        // Game loop runs every 200ms (5 times per second)
        // Ticks per minute = 5 * 60 = 300
        // Average ticks between events = timeProbability * 300
        // Probability per tick = 1 / (timeProbability * 300)
        const ticksPerMinute = 300;

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

        const logEntry: LogEntry = {
          id: `${event.id}-${Date.now()}`,
          message: event.message,
          timestamp: Date.now(),
          type: "event",
          title: event.title,
          choices: eventChoices,
          isTimedChoice: event.isTimedChoice,
          baseDecisionTime: event.baseDecisionTime,
          fallbackChoice: event.fallbackChoice,
          relevant_stats: event.relevant_stats,
        };

        newLogEntries.push(logEntry);

        // Apply effect if it exists and there are no choices
        if (event.effect && !eventChoices?.length) {
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
    const eventDefinition = this.allEvents[eventId];
    if (!eventDefinition) {
      return {};
    }

    // For merchant events, use choices from the current log entry if available
    let choicesSource = eventDefinition.choices;
    if (eventId === "merchant" && currentLogEntry?.choices) {
      choicesSource = currentLogEntry.choices;
    }

    // First try to find the choice in the choices array
    let choice = choicesSource?.find((c) => c.id === choiceId);

    // If not found and this is a fallback choice, use the fallbackChoice directly
    if (
      !choice &&
      eventDefinition.fallbackChoice &&
      eventDefinition.fallbackChoice.id === choiceId
    ) {
      choice = eventDefinition.fallbackChoice;
    }

    if (!choice) {
      return {};
    }

    const choiceResult = choice.effect(state);

    const result = {
      ...choiceResult,
      log: currentLogEntry
        ? state.log.filter((entry) => entry.id !== currentLogEntry.id)
        : state.log,
    };

    return result;
  }
}
