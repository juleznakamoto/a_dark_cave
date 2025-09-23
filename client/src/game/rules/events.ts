
import { GameState } from "@shared/schema";
import { baseEvents } from "./eventsBase";
import { storyEvents } from "./eventsStory";
import { merchantEvents, generateMerchantChoices } from "./eventsMerchant";

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
}

export interface EventChoice {
  id: string;
  label: string;
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
}

// Merge all events from separate files
export const gameEvents: Record<string, GameEvent> = {
  ...baseEvents,
  ...storyEvents,
  ...merchantEvents,
};

export class EventManager {
  static checkEvents(state: GameState): {
    newLogEntries: LogEntry[];
    stateChanges: Partial<GameState>;
  } {
    const newLogEntries: LogEntry[] = [];
    let stateChanges: Partial<GameState> = {};
    const sortedEvents = Object.values(gameEvents).sort(
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
        };

        newLogEntries.push(logEntry);

        // Apply effect if it exists and there are no choices
        if (event.effect && !eventChoices?.length) {
          stateChanges = event.effect(state);
        }

        // Mark as triggered
        event.triggered = true;
        break; // Only trigger one event per tick
      }
    }

    return { newLogEntries, stateChanges };
  }

  static applyEventChoice(
    state: GameState,
    choiceId: string,
    eventId: string,
  ): Partial<GameState> {
    console.log(`[EventManager] Applying choice: ${choiceId} for event: ${eventId}`);
    console.log(`[EventManager] Available game events:`, Object.keys(gameEvents));
    
    const event = gameEvents[eventId];
    if (!event) {
      console.log(`[EventManager] Event not found: ${eventId}`);
      return {};
    }

    console.log(`[EventManager] Found event:`, event.id, `with choices:`, event.choices?.map(c => c.id));

    // First try to find the choice in the main choices array
    let choice = event.choices?.find((c) => c.id === choiceId);
    
    // If not found and this is a fallback choice, use the fallbackChoice directly
    if (!choice && event.fallbackChoice && event.fallbackChoice.id === choiceId) {
      choice = event.fallbackChoice;
      console.log(`[EventManager] Using fallback choice: ${choiceId}`);
    }
    
    if (!choice) {
      console.log(`[EventManager] Choice not found: ${choiceId} in event: ${eventId}`);
      return {};
    }

    console.log(`[EventManager] Executing choice effect for: ${choiceId}`);
    const result = choice.effect(state);
    console.log(`[EventManager] Choice effect result:`, result);
    
    return result;
  }
}
