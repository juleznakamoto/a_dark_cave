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
  timeProbability?: number | ((state: GameState) => number); // Average minutes between triggers
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
    timeProbability: (state) => {
      let baseProbability = 1.5; // Base 1.5 minutes between stranger arrivals

      // If population is 0, multiply by 0.25 (faster arrivals)
      if (state.if === 0) {
        baseProbability *= 0.25;
      }

      // For each hut, multiply by 0.9 (faster arrivals with more huts)
      baseProbability *= Math.pow(0.9, state.buildings.hut);

      return baseProbability;
    },
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
        food:
          state.resources.food -
          Math.ceil(Math.random() * 50 * state.buildings.hut),
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
      "At sunrise, a bed is found unslept-in. The missing one's name fades quickly from memory, as if the forest itself claimed them.",
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
    timeProbability: 0.0015,
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
          const strength = state.stats.strength || 0;
          const luck = state.stats.luck || 0;
          // Base 50% chance
          const mantleChance = 0.5 + (strength + luck) * 0.005;

          const rand = Math.random();
          if (rand < mantleChance) {
            // Find the Ravenfeather Mantle (50% base + strength bonus)
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
            const updatedVillagers = {
              ...state.villagers,
              free: Math.max(0, state.villagers.free - 1),
            };
            return {
              villagers: updatedVillagers,
              current_population:
                updatedVillagers.free +
                updatedVillagers.gatherer +
                updatedVillagers.hunter,
              _logMessage:
                "The investigation goes horribly wrong. One man screams in the mist and is never seen again. The others flee in terror.",
            };
          } else {
            // 2 men killed (20% chance)
            const updatedVillagers = {
              ...state.villagers,
              free: Math.max(0, state.villagers.free - 2),
            };
            return {
              villagers: updatedVillagers,
              current_population:
                updatedVillagers.free +
                updatedVillagers.gatherer +
                updatedVillagers.hunter,
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
            const updatedVillagers = {
              ...state.villagers,
              free: Math.max(0, state.villagers.free - 1),
            };
            return {
              villagers: updatedVillagers,
              current_population:
                updatedVillagers.free +
                updatedVillagers.gatherer +
                updatedVillagers.hunter,
              _logMessage:
                "At dawn, one of the men who claimed to see the figure is found dead in his bed, his face frozen in terror.",
            };
          }
        },
      },
    ],
  },

  whispersBeneathHut: {
    id: "whispersBeneathHut",
    condition: (state) =>
      state.buildings.hut >= 4 && !state.relics.whispering_amulet,
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
    condition: (state) =>
      state.buildings.hut >= 5 &&
      state.resources.iron >= 200 &&
      !state.relics.blackened_mirror,
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

  cthulhuFigure: {
    id: "cthulhuFigure",
    condition: (state) =>
      state.buildings.hut >= 4 && !state.relics.wooden_figure,
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
  },

  wolfAttack: {
    id: "wolfAttack",
    condition: (state) => state.buildings.hut >= 3,
    triggerType: "resource",
    timeProbability: 25,
    title: "Wolf Attack",
    message:
      "In the dead of night, wolves emerge from the darkness, their eyes glowing with an unnatural hunger. Their howls echo with otherworldly malice as they circle your village.",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "defendVillage",
        label: "Defend the village",
        effect: (state) => {
          const currentPopulation =
            state.villagers.free +
            state.villagers.gatherer +
            state.villagers.hunter;
          if (currentPopulation === 0) {
            return {
              _logMessage:
                "The wolves find an empty village and move on, disappointed by the lack of prey.",
            };
          }

          const strength = state.stats.strength || 0;

          // Check for victory: 10% base chance + 1% per strength point
          const victoryChance = 0.1 + strength * 0.01;

          if (Math.random() < victoryChance) {
            // Victory! Get Alpha's Hide
            return {
              clothing: {
                ...state.clothing,
                alphas_hide: true,
              },
              _logMessage:
                "Against all odds, your village manages to defeat the wolf pack! In a fierce battle, you slay the alpha wolf and claim its hide as a trophy. The Alpha's Hide radiates with primal power, granting you both fortune and strength.",
            };
          }

          // Base chance of casualties (70%), reduced by 5% per strength point, minimum 20%
          const casualtyChance = Math.max(0.2, 0.7 - strength * 0.02);

          let villagerDeaths = 0;
          let foodLoss = Math.floor(Math.random() * 201); // 0-200 food loss
          let lodgeDestroyed = false;

          // Determine villager casualties (1-6 potential deaths)
          const maxPotentialDeaths = Math.min(6, currentPopulation);
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // If 2+ villagers die and there's a hut, 50% chance to destroy it
          if (villagerDeaths >= 2 && state.buildings.hut > 0) {
            if (Math.random() < 0.5) {
              lodgeDestroyed = true;
            }
          }

          // Apply deaths to villagers
          let updatedVillagers = { ...state.villagers };
          let remainingDeaths = villagerDeaths;

          // Remove villagers starting with free, then gatherers, then hunters
          if (remainingDeaths > 0 && updatedVillagers.free > 0) {
            const freeDeaths = Math.min(remainingDeaths, updatedVillagers.free);
            updatedVillagers.free -= freeDeaths;
            remainingDeaths -= freeDeaths;
          }

          if (remainingDeaths > 0 && updatedVillagers.gatherer > 0) {
            const gathererDeaths = Math.min(
              remainingDeaths,
              updatedVillagers.gatherer,
            );
            updatedVillagers.gatherer -= gathererDeaths;
            remainingDeaths -= gathererDeaths;
          }

          if (remainingDeaths > 0 && updatedVillagers.hunter > 0) {
            const hunterDeaths = Math.min(
              remainingDeaths,
              updatedVillagers.hunter,
            );
            updatedVillagers.hunter -= hunterDeaths;
            remainingDeaths -= hunterDeaths;
          }

          // Construct result message
          let message =
            "The village fights desperately against the possessed wolves. ";

          if (villagerDeaths === 0) {
            message +=
              "Miraculously, all villagers survive the attack, though shaken by the encounter.";
          } else if (villagerDeaths === 1) {
            message += "One villager falls to the wolves' supernatural fury.";
          } else {
            message += `${villagerDeaths} villagers are claimed by the wolves' unnatural hunger.`;
          }

          if (foodLoss > 0) {
            message += ` The wolves also devour ${foodLoss} units of food from your stores.`;
          }

          if (lodgeDestroyed) {
            message +=
              " In their rampage, the possessed wolves destroy one of your huts, leaving only splintered wood and claw marks.";
          }

          return {
            villagers: updatedVillagers,
            resources: {
              ...state.resources,
              food: Math.max(0, state.resources.food - foodLoss),
            },
            buildings: lodgeDestroyed
              ? {
                  ...state.buildings,
                  hut: Math.max(0, state.buildings.hut - 1),
                }
              : state.buildings,
            _logMessage: message,
          };
        },
      },
      {
        id: "hideAndWait",
        label: "Hide and wait it out",
        effect: (state) => {
          const currentPopulation =
            state.villagers.free +
            state.villagers.gatherer +
            state.villagers.hunter;
          if (currentPopulation === 0) {
            return {
              _logMessage:
                "The wolves find an empty village and move on, their supernatural hunger unsated.",
            };
          }

          // Hiding is more effective, lower casualty rate (60%)
          const strength = state.stats.strength || 0;
          const casualtyChance = Math.max(0.1, 0.6 - strength * 0.02);

          let villagerDeaths = 0;
          let foodLoss = Math.floor(Math.random() * 501) + 50; // 50-500 food loss (more than defending)
          let lodgeDestroyed = false;

          // Determine villager casualties (1-4 potential deaths)
          const maxPotentialDeaths = Math.min(4, currentPopulation);
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // Apply deaths to villagers
          let updatedVillagers = { ...state.villagers };
          let remainingDeaths = villagerDeaths;

          // Remove villagers starting with free, then gatherers, then hunters
          if (remainingDeaths > 0 && updatedVillagers.free > 0) {
            const freeDeaths = Math.min(remainingDeaths, updatedVillagers.free);
            updatedVillagers.free -= freeDeaths;
            remainingDeaths -= freeDeaths;
          }

          if (remainingDeaths > 0 && updatedVillagers.gatherer > 0) {
            const gathererDeaths = Math.min(
              remainingDeaths,
              updatedVillagers.gatherer,
            );
            updatedVillagers.gatherer -= gathererDeaths;
            remainingDeaths -= gathererDeaths;
          }

          if (remainingDeaths > 0 && updatedVillagers.hunter > 0) {
            const hunterDeaths = Math.min(
              remainingDeaths,
              updatedVillagers.hunter,
            );
            updatedVillagers.hunter -= hunterDeaths;
            remainingDeaths -= hunterDeaths;
          }

          // Construct result message
          let message =
            "The villagers huddle in their huts as the wolves prowl outside, their claws scraping against doors and walls. ";

          if (villagerDeaths === 0) {
            message +=
              "By dawn, the wolves have departed, leaving only scratches and terror behind.";
          } else if (villagerDeaths === 1) {
            message +=
              "One villager who ventured out is found torn apart at sunrise.";
          } else {
            message += `${villagerDeaths} villagers are dragged from their hiding places, their screams echoing through the night.`;
          }

          message += ` The wolves ransack your food stores, consuming ${foodLoss} units.`;

          return {
            villagers: updatedVillagers,
            resources: {
              ...state.resources,
              food: Math.max(0, state.resources.food - foodLoss),
            },
            buildings: lodgeDestroyed
              ? {
                  ...state.buildings,
                  hut: Math.max(0, state.buildings.hut - 1),
                }
              : state.buildings,
            _logMessage: message,
          };
        },
      },
    ],
  },

  trinketFound: {
    id: "trinketFound",
    condition: (state) => false, // Only triggered by action effect
    triggerType: "action",
    title: "Old Trinket",
    message:
      "While gathering wood, you find an old trinket with glowing amber liquid inside. Do you dare drink it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "drinkTrinket",
        label: "Drink the glowing liquid",
        effect: (state) => {
          return {
            flags: {
              ...state.flags,
              trinketDrunk: true,
            },
            events: {
              ...state.events,
              trinket_found: true,
            },
            stats: {
              ...state.stats,
              strength: (state.stats.strength || 0) + 5,
            },
            _logMessage:
              "You drink the amber liquid. It burns as it goes down, but you feel stronger than before. (+5 Strength)",
          };
        },
      },
      {
        id: "ignoreTrinket",
        label: "Leave it be",
        effect: (state) => {
          return {
            events: {
              ...state.events,
              trinket_found: true,
            },
            _logMessage:
              "You decide not to risk drinking the mysterious liquid. You carefully bury the trinket back where you found it and continue gathering wood.",
          };
        },
      },
    ],
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
