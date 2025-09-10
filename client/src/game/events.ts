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
      state.resources.wood >= 10 &&
      state.flags.caveExplored == true &&
      !state.events?.strangerApproaches,
    triggerType: "resource",
    message: "A stranger approaches through the woods, carrying a large pack.",
    triggered: false,
    priority: 1,
    choices: [
      {
        id: "tradeWithStranger",
        label: "Trade Wood for Supplies",
        effect: (state) => ({
          resources: {
            ...state.resources,
            wood: Math.max(0, state.resources.wood - 5),
            meat: state.resources.meat + 3,
          },
        }),
        cooldown: 2,
      },
      {
        id: "ignoreStranger",
        label: "Ignore the Stranger",
        effect: () => ({}),
        cooldown: 1,
      },
    ],
  },

  mysterousSound: {
    id: "mysterousSound",
    condition: (state) =>
      state.resources.wood >= 20 && !state.events?.mysterousSound,
    triggerType: "resource",
    message: "A low, rumbling sound echoes from deeper in the cave.",
    triggered: false,
    choices: [
      {
        id: "investigate",
        label: "Investigate the Sound",
        effect: (state) => ({
          flags: {
            ...state.flags,
            villageUnlocked: true,
          },
        }),
        cooldown: 3,
      },
      {
        id: "stayPut",
        label: "Stay by the Fire",
        effect: () => ({}),
        cooldown: 1,
      },
    ],
  },
};

export class EventManager {
  static checkEvents(state: GameState): LogEntry[] {
    const newLogEntries: LogEntry[] = [];
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

        // Mark as triggered
        event.triggered = true;
        break; // Only trigger one event per tick
      }
    }

    return newLogEntries;
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
