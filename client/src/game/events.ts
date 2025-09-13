import { GameState } from "@shared/schema";

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
  title?: string;
  choices?: EventChoice[];
}

// Define game events
export const gameEvents: Record<string, GameEvent> = {
  strangerApproaches: {
    id: "strangerApproaches",
    condition: (state) => state.current_population < state.total_population,
    triggerType: "resource",
    timeProbability: 0.2, // Average 2 minutes between stranger arrivals
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
    condition: (state) => state.buildings.hut >= 1,
    triggerType: "resource",
    timeProbability: 15,
    message: [
      "In the night, something left a heap of iron at the village's edge. No tracks lead away.",
      "A gift gleams in the morning mist. None know who or what brought it.",
      "Iron rests where once was bare earth, as though conjured from realms unseen.",
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 2,
    effect: (state) => ({
      resources: {
        ...state.resources,
        iron: state.resources.iron + 50 * state.buildings.hut,
      },
    }),
  },

  paleFigure: {
    id: "paleFigure",
    condition: (state) =>
      state.buildings.hut >= 2 && !state.relics.ravenfeather_mantle,
    triggerType: "resource",
    timeProbability: 15,
    title: "The Pale Figure",
    message:
      "In the misty morning several men claim to have seen a pale figure at the edge of the woods. The figure stands motionless, watching. What do you do?",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigate",
        label: "Investigate",
        effect: (state) => {
          const rand = Math.random();
          if (rand < 0.5) {
            // Find the Ravenfeather Mantle (50% chance)
            return {
              relics: {
                ...state.relics,
                ravenfeather_mantle: true,
              },
              _logMessage:
                "As your men approach, the pale figure beckons and vanishes. In its place lies a magnificent mantle woven from raven feathers, shimmering with an otherworldly power. When worn, it fills you with both fortune and strength.",
            };
          } else if (rand < 0.8) {
            // 1 man killed (30% chance)
            return {
              villagers: {
                ...state.villagers,
                free: Math.max(0, state.villagers.free - 1),
              },
              _logMessage:
                "The investigation goes horribly wrong. One man screams in the mist and is never seen again. The others flee in terror.",
            };
          } else {
            // 2 men killed (20% chance)
            return {
              villagers: {
                ...state.villagers,
                free: Math.max(0, state.villagers.free - 2),
              },
              _logMessage:
                "The pale figure moves with inhuman speed. Two men vanish into the mist, their screams echoing through the trees.",
            };
          }
        },
      },
      {
        id: "ignore",
        label: "Ignore it",
        effect: (state) => {
          const rand = Math.random();
          if (rand < 0.6) {
            // Nothing happens
            return {
              _logMessage:
                "The men stay close to the village. By evening, the figure is gone, and nothing more comes of it.",
            };
          } else {
            // 1 man found dead
            return {
              villagers: {
                ...state.villagers,
                free: Math.max(0, state.villagers.free - 1),
              },
              _logMessage:
                "At dawn, one of the men who claimed to see the figure is found dead in his bed, his face frozen in terror.",
            };
          }
        },
      },
    ],
  },
  
  whispersBeneathHut : {
    id: "whispersBeneathHut",
    condition: (state) => state.buildings.hut >= 4 && !state.relics.whispering_amulet,
    triggerType: "resource",
    timeProbability: 20,
    title: "Whispers Beneath the Hut",
    message:
      "At night, faint whispers seem to rise from under the floor of one of your hut. The villagers are uneasy. Do you investigate?",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigateHut",
        label: "Investigate the whispers",
        effect: (state) => {
          // Open for custom effects
          return {
            relics: {
              ...state.relics,
              whispering_amulet: true,
            },
            _logMessage:
              "You lift the floorboards and find a strange amulet, faintly whispering. Its purpose is unclear...",
            // e.g., add relic to state: relics: {...state.relics, whisperingAmulet: true}
          };
        },
      },
      {
        id: "ignoreHut",
        label: "Leave it be",
        effect: (state) => {
          return {
            _logMessage:
              "You choose to leave the hut alone. The whispers fade by morning, but a chill remains in the air.",
          };
        },
      },
    ],
  },

  blackenedMirror: {
    id: "blackenedMirror",
    condition: (state) => state.buildings.hut >= 5 && state.resources.iron >= 200 && !state.relics.blackened_mirror,
    triggerType: "resource",
    timeProbability: 25,
    title: "The Blackened Mirror",
    message:
      "A wandering trader offers a tall, cracked mirror framed in black iron. It radiates a cold, unnatural aura. He claims it can give glimpses of the future.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "buyMirror",
        label: "Buy the mirror for 200 iron",
        effect: (state) => {
          return {
            resources: {
              ...state.resources,
              iron: state.resources.iron - 200,
            },
            stats: {
              ...state.stats,
              knowledge: (state.stats.knowledge || 0) + 10,
            },
            relics: {
              ...state.relics,
              blackened_mirror: true,
            },
            _logMessage:
              "You purchase the mirror. Its purpose and effects remain a mystery, but you feel your understanding of hidden things deepen (+10 Knowledge).",
          };
        },
      },
      {
        id: "refuseMirror",
        label: "Refuse the offer",
        effect: (state) => {
          return {
            _logMessage:
              "You decline the trader's offer. The mirror disappears into the night with him.",
          };
        },
      },
    ],
  },

  cthulhuFigure : {
    id: "cthulhuFigure",
    condition: (state) => state.buildings.hut >= 4 && !state.relics.wooden_figure,
    triggerType: "resource",
    timeProbability: 20,
    title: "A Strange Wooden Figure",
    message:
      "Near the edge of the village, a small wooden figure is discovered, carved with tentacled features. It emanates a strange aura. Do you keep it or discard it?",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "keepFigure",
        label: "Keep the figure",
        effect: (state) => {
          return {
            _logMessage:
              "You decide to keep the figure. Its strange aura makes the villagers uneasy...",
            // e.g., add figure to state: items: {...state.items, tentacledFigure: true}
          };
        },
      },
      {
        id: "discardFigure",
        label: "Discard it",
        effect: (state) => {
          return {
            relics: {
              ...state.relics,
              wooden_figure: true,
            },
            _logMessage:
              "You discard the figure. The forest seems to watch silently as it disappears.",
          };
        },
      },
    ],
  }
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
          title: event.title,
          choices: event.choices,
        };

        newLogEntries.push(logEntry);

        // Apply effect if it exists and there are no choices
        if (event.effect && !event.choices) {
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
