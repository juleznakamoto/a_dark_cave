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
  timeProbability?: number; // Average minutes between triggers
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
    condition: (state) => state.current_population < state.total_population,
    triggerType: "resource",
    timeProbability: 2, // Average 2 minutes between stranger arrivals
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
        },
      },
    }),
  },

  foodGone: {
    id: "foodGone",
    condition: (state) => state.resources.food > 50,
    triggerType: "resource",
    timeProbability: 15,
    message: [
      "At dawn, the food stores are lighter. Whispers lingered in the dark, voices that were never human.",
      "The villagers awaken to find food missing. Some claim they heard the susurrus of ancient tongues in the night.",
      "Half-seen shadows devoured what the stomachs of men should. Only the sound of faint chanting remained.",
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 2,
    effect: (state) => ({
      resources: {
        ...state.resources,
        food: state.resources.food - 50,
      },
    }),
  },

  villagerMissing: {
    id: "villagerMissing",
    condition: (state) => state.villagers.free > 0,
    triggerType: "resource",
    timeProbability: 10,
    message: [
      "One hut lies empty. Its occupant vanished as though swallowed by the void between worlds.",
      "A villager is gone, leaving only claw-like marks upon the earth and a silence that will not break.",
      "At sunrise, a bed is found unslept-in. The missing one’s name fades quickly from memory, as if the forest itself claimed them.",
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 2,
    effect: (state) => ({
      villagers: {
        ...state.villagers,
        free: Math.max(0, state.villagers.free - 1),
      },
    }),
  },

  ironGift: {
    id: "ironGift",
    condition: (state) => state.buildings.huts >= 1,
    triggerType: "resource",
    timeProbability: 15,
    message: [
      "In the night, something left a heap of iron at the village’s edge. No tracks lead away.",
      "A gift gleams in the morning mist. None know who or what brought it.",
      "Iron rests where once was bare earth, as though conjured from realms unseen.",
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 2,
    effect: (state) => ({
      resources: {
        ...state.resources,
        iron: state.resources.iron + 50,
      },
    }),
  },
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
      if (state.events?.[event.id] && !event.repeatable) continue;

      // Check condition with probability if specified
      let shouldTrigger = event.condition(state);

      // Apply time-based probability if specified
      if (shouldTrigger && event.timeProbability) {
        // Game loop runs every 200ms (5 times per second)
        // Ticks per minute = 5 * 60 = 300
        // Average ticks between events = timeProbability * 300
        // Probability per tick = 1 / (timeProbability * 300)
        const ticksPerMinute = 300;
        const averageTicksBetweenEvents =
          event.timeProbability * ticksPerMinute;
        const probabilityPerTick = 1 / averageTicksBetweenEvents;
        shouldTrigger = Math.random() < probabilityPerTick;
      }

      if (shouldTrigger) {
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
