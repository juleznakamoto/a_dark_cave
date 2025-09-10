import { GameState } from "@shared/schema";

export interface GameEvent {
  id: string;
  condition: (state: GameState) => boolean;
  triggerType: "time" | "resource" | "random" | "action";
  message: string;
  choices?: EventChoice[];
  triggered: boolean;
  repeatable?: boolean;
  priority?: number; // Higher priority events check first
}

export interface EventChoice {
  id: string;
  label: string;
  effect: (state: GameState) => Partial<GameState>;
  cooldown?: number; // Cooldown in seconds for choice buttons
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
  type: "event" | "action" | "system";
  choices?: EventChoice[];
}

// Define game events
export const gameEvents: Record<string, GameEvent> = {
  strangerApproaches: {
    id: "strangerApproaches",
    condition: (state) =>
      state.current_population < state.total_population,
    triggerType: "resource",
    message: [
      "A stranger approaches through the woods and joins your village.",
      "A traveler arrives and decides to stay.",
      "A wanderer appears from the woods and becomes part of your community.",
      "Someone approaches the village and settles in.",
      "A stranger joins your community, bringing skills and hope.",
      "A newcomer arrives and makes themselves at home.",
    ][Math.floor(Math.random() * 6)],
    triggered: false,
    priority: 1,
    effect: (state) => ({
      villagers: {
        ...state.villagers,
        free: state.villagers.free + 1,
      },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          hasVillagers: true,
        }
      }
    }),
  },
};

export class EventManager {
  static checkEvents(state: GameState): { newLogEntries: LogEntry[], stateChanges: Partial<GameState> } {
    const newLogEntries: LogEntry[] = [];
    let stateChanges: Partial<GameState> = {};
    const sortedEvents = Object.values(gameEvents).sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );

    for (const event of sortedEvents) {
      // Skip if already triggered and not repeatable
      if (event.triggered && !event.repeatable) continue;

      // Skip if event was already triggered this session (for non-repeatable events)
      if (state.events?.[event.id] && !event.repeatable) continue;

      // Check condition
      if (event.condition(state)) {
        const logEntry: LogEntry = {
          id: `${event.id}-${Date.now()}`,
          message: event.message,
          timestamp: Date.now(),
          type: "event",
          choices: event.choices,
        };

        newLogEntries.push(logEntry);

        // Apply effect if it exists
        if (event.effect) {
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
    const event = gameEvents[eventId];
    if (!event) return {};

    const choice = event.choices?.find((c) => c.id === choiceId);
    if (!choice) return {};

    return choice.effect(state);
  }
}