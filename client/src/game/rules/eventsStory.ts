import { GameEvent } from "./events";

// Define a type for the villager counts in the state
type VillagerCounts = {
  free: number;
  gatherer: number;
  hunter: number;
  iron_miner: number;
  coal_miner: number;
  sulfur_miner: number;
  gold_miner: number;
  obsidian_miner: number;
  adamant_miner: number;
  moonstone_miner: number;
  steel_forger: number;
  [key: string]: number; // Allows for other villager types if added later
};

// Define a type for the game state
type GameState = {
  villagers: VillagerCounts;
  resources: {
    food: number;
    iron: number;
    wood?: number;
    stone?: number;
    gold?: number;
    silver?: number;
    bones?: number;
    fur?: number;
    steel?: number;
    obsidian?: number;
    adamant?: number;
    food?: number;
    [key: string]: number | undefined; // Allows for other resources
  };
  buildings: { woodenHut: number; hut: number; shrine?: number };
  stats: { strength?: number; luck?: number; knowledge?: number };
  relics: {
    ravenfeather_mantle?: boolean;
    whispering_amulet?: boolean;
    blackened_mirror?: boolean;
    wooden_figure?: boolean;
    alphas_hide?: boolean;
    elder_scroll?: boolean;
    ebony_ring?: boolean; // Added Ebony Ring
    cracked_crown?: boolean;
    murmuring_cube?: boolean; // Added Murmuring Cube
    blacksmith_hammer?: boolean; // Added Blacksmith Hammer as a relic for simplicity
  };
  events: {
    trinketDrunk?: boolean;
    dream_morrowind?: boolean;
    dream_oblivion?: boolean;
    dream_skyrim?: boolean;
    elder_scroll_found?: boolean;
    blacksmith_hammer_found?: boolean;
    trinket_found?: boolean;
  };
  flags: { trinketDrunk?: boolean; forestUnlocked?: boolean };
  tools: { blacksmith_hammer?: boolean; reinforced_rope?: boolean; alchemist_map?: boolean; giant_trap?: boolean };
  clothing?: { tarnished_amulet?: boolean }; // Added for potential luck bonus
  // Add other properties of GameState as needed
  current_population?: number; // Added current_population to GameState
};

// Helper function to get total luck from various sources
function getTotalLuck(state: GameState): number {
  return (
    (state.stats.luck || 0) +
    (state.relics?.ravenfeather_mantle ? 5 : 0) +
    (state.relics?.alphas_hide ? 3 : 0) +
    (state.relics?.old_trinket ? 2 : 0) + // Assuming old_trinket exists
    (state.relics?.elder_scroll ? 10 : 0) +
    (state.clothing?.tarnished_amulet ? 10 : 0)
  );
}

// Centralized function to kill villagers
function killVillagers(state: GameState, amount: number): Partial<GameState> {
  let updatedVillagers = { ...state.villagers };
  let remainingDeaths = amount;

  // Define all possible villager types that can be killed
  const villagerTypes: (keyof VillagerCounts)[] = [
    "free",
    "gatherer",
    "hunter",
    "iron_miner",
    "coal_miner",
    "sulfur_miner",
    "silver_miner",
    "gold_miner",
    "obsidian_miner",
    "adamant_miner",
    "moonstone_miner",
    "steel_forger",
  ];

  // Shuffle villager types to ensure random distribution of deaths
  for (let i = villagerTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [villagerTypes[i], villagerTypes[j]] = [villagerTypes[j], villagerTypes[i]];
  }

  for (const villagerType of villagerTypes) {
    if (remainingDeaths <= 0) break;

    const currentCount = updatedVillagers[villagerType] || 0;
    if (currentCount > 0) {
      const deaths = Math.min(remainingDeaths, currentCount);
      updatedVillagers[villagerType] = currentCount - deaths;
      remainingDeaths -= deaths;
    }
  }

  return { villagers: updatedVillagers };
}

export const storyEvents: Record<string, GameEvent> = {
  foodGone: {
    id: "foodGone",
    condition: (state: GameState) => state.resources.food > 50,
    triggerType: "resource",
    timeProbability: 20,
    message: [
      "Strange whispers were heard at night. At dawn, food stores are lighter.",
      "Villagers wake to find food missing. Some heard ancient tongues in the night.",
      "By morning, food stores are thinned. Some murmur of inhuman voices heard in the dark.",
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        food:
          state.resources.food -
          Math.min(
            state.resources.food,
            Math.ceil(Math.random() * 50 * state.buildings.woodenHut),
          ),
      },
    }),
  },

  villagerMissing: {
    id: "villagerMissing",
    condition: (state: GameState) => state.villagers.free > 0,
    triggerType: "resource",
    timeProbability: 10,
    message: [
      "One hut lies empty. Its occupant is gone.",
      "A villager is gone. Claw-like marks remain.",
      "A bed lies cold. The forest has claimed them.",
      "Mist shrouds an empty hut. The villager is gone.",
      "A hut stands silent. Meals lie untouched. They are gone.",
      "The wind moves through an empty hut. The villager is gone.",
      "A door of a hut stands ajar. Its occupant is gone.",
    ][Math.floor(Math.random() * 7)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      villagers: {
        ...state.villagers,
        free: Math.max(0, state.villagers.free - 1),
      },
    }),
  },

  ironGift: {
    id: "ironGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 1,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "In the night, something left a heap of iron at the village's edge. No tracks lead away.",
      "A gift of iron gleams in the morning mist. None know who or what brought it.",
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        iron: state.resources.iron + 25 * state.buildings.woodenHut,
      },
    }),
  },

  steelGift: {
    id: "steelGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 5,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "At dawn, refined steel bars lie stacked at the village gates. Nobody knows where they come from.",
      "A mysterious benefactor has left gleaming steel ingots at the edge of the village.",
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        steel: state.resources.steel + 15 * state.buildings.woodenHut,
      },
    }),
  },

  obsidianGift: {
    id: "obsidianGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 8,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "By dawn, obsidian shards have been placed in the earth around your village, like a silent message left behind.",
      "In the morning light, you notice obsidian laid carefully into the soil, surrounding your village.",
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        obsidian: state.resources.obsidian + 10 * state.buildings.woodenHut,
      },
    }),
  },

  adamantGift: {
    id: "adamantGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 10,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "By morning, raw adamant lies behind one of the huts of the village.",
      "When dawn breaks, fragments of adamant protrude from the earth around your settlement."
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        adamant: state.resources.adamant + 8 * state.buildings.woodenHut,
      },
    }),
  },

  paleFigure: {
    id: "paleFigure",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 2 && !state.relics.ravenfeather_mantle,
    triggerType: "resource",
    timeProbability: 25,
    title: "The Pale Figure",
    message: [
      "At dawn, men glimpse a pale, slender figure at the woods’ edge. It stands watching. What do you do?",
      "In the grey morning, a pale and slender shape lingers at the treeline, unmoving. What do you do?",
      "Villagers report of a pale, slender figure in the mist, silent at the forest’s edge. What do you do?",
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigate",
        label: "Investigate",
        effect: (state: GameState) => {
          const strength = state.stats.strength || 0;
          const luck = state.stats.luck || 0;
          // Base 50% chance
          const mantleChance = 0.2 + (strength + luck) * 0.005;

          const rand = Math.random();
          if (rand < mantleChance) {
            // Find the Ravenfeather Mantle (50% base + strength bonus)
            return {
              relics: {
                ...state.relics,
                ravenfeather_mantle: true,
              },
              _logMessage:
                "As your men near, the pale figure beckons and vanishes. In its place lies a raven-feather mantle, shimmering with otherworldly power.",
            };
          } else if (rand < 0.7) {
            return {
              ...killVillagers(state, 1),
              _logMessage:
                "The investigation goes horribly wrong. One man screams in the mist and is never seen again. The others flee in terror.",
            };
          } else {
            return {
              ...killVillagers(state, 2),
              _logMessage:
                "The pale figure moves with inhuman speed. Two men vanish into the mist, their screams echoing through the trees.",
            };
          }
        },
      },
      {
        id: "ignore",
        label: "Ignore it",
        effect: (state: GameState) => {
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
              ...killVillagers(state, 1),
              _logMessage:
                "At dawn, one of the men who claimed to have seen the figure is found dead in his bed, his face frozen in terror.",
            };
          }
        },
      },
    ],
  },

  whispersBeneathHut: {
    id: "whispersBeneathHut",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 4 && !state.relics.whispering_amulet,
    triggerType: "resource",
    timeProbability: 20,
    title: "Whispers Beneath the Hut",
    message:
      "At night, faint whispers seem to rise from under the floor of one of the huts. The villagers are uneasy. Do you investigate?",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigateHut",
        label: "Investigate the whispers",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              whispering_amulet: true,
            },
            _logMessage:
              "You lift the floorboards and find a strange amulet, faintly whispering. Its purpose is unclear...",
          };
        },
      },
      {
        id: "ignoreHut",
        label: "Leave it be",
        effect: (state: GameState) => {
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
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 5 &&
      state.resources.iron >= 200 &&
      !state.relics.blackened_mirror,
    triggerType: "resource",
    timeProbability: 30,
    title: "The Blackened Mirror",
    message:
      "A wandering tradesman offers a tall, cracked mirror framed in black iron. It radiates a cold, unnatural aura. He claims it can give glimpses of the future.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "buyMirror",
        label: "Buy for 200 iron",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              iron: state.resources.iron - 200,
            },
            relics: {
              ...state.relics,
              blackened_mirror: true,
            },
            _logMessage:
              "You purchase the mirror. Its dark surface shimmers with hidden truths, and glimpses of your own future are revealed, nudging your sanity toward the edge.",
          };
        },
      },
      {
        id: "refuseMirror",
        label: "Refuse the offer",
        effect: (state: GameState) => {
          return {
            _logMessage: "You decline the trader's offer. The mirror disappears into the night with him.",
          };
        },
      },
    ],
  },

  cthulhuFigure: {
    id: "cthulhuFigure",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 4 && !state.relics.wooden_figure,
    triggerType: "resource",
    timeProbability: 30,
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
        effect: (state: GameState) => {
          return {
            _logMessage: "You decide to keep the figure. Its strange aura makes the villagers uneasy...",
          };
        },
      },
      {
        id: "discardFigure",
        label: "Discard it",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              wooden_figure: true,
            },
            _logMessage: "You discard the figure. The forest seems to watch silently as it disappears.",
          };
        },
      },
    ],
  },

  wolfAttack: {
    id: "wolfAttack",
    condition: (state: GameState) => state.buildings.woodenHut >= 3,
    triggerType: "resource",
    timeProbability: 30,
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
        effect: (state: GameState) => {
          const currentPopulation = state.current_population || Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
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
              relics: {
                ...state.relics,
                alphas_hide: true,
              },
              _logMessage:
                "Against all odds, your village manages to defeat the wolf pack! In a fierce battle, you slay the alpha wolf and claim its hide as a trophy. The Alpha's Hide radiates with primal power, granting you both fortune and strength.",
            };
          }

          // Base chance of casualties (70%), reduced by 5% per strength point, minimum 20%
          const casualtyChance = Math.max(0.2, 0.7 - strength * 0.02);

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            50 + Math.floor(Math.random() * 251),
          ); // 50-300 food loss
          let hutDestroyed = false;

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
              hutDestroyed = true;
            }
          }

          // Apply deaths to villagers
          const deathResult = killVillagers(state, villagerDeaths);

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

          if (hutDestroyed) {
            message +=
              " In their rampage, the possessed wolves destroy one of your huts, leaving only splintered wood and claw marks.";
          }

          return {
            ...deathResult,
            resources: {
              ...state.resources,
              food: Math.max(0, state.resources.food - foodLoss),
            },
            buildings: hutDestroyed
              ? {
                  ...state.buildings,
                  woodenHut: Math.max(0, state.buildings.woodenHut - 1),
                }
              : state.buildings,
            _logMessage: message,
          };
        },
      },
      {
        id: "hideAndWait",
        label: "Hide and wait it out",
        effect: (state: GameState) => {
          const currentPopulation = state.current_population || Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
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
          let hutDestroyed = false;

          // Determine villager casualties (1-4 potential deaths)
          const maxPotentialDeaths = Math.min(4, currentPopulation);
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // Apply deaths to villagers
          const deathResult = killVillagers(state, villagerDeaths);

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
            ...deathResult,
            resources: {
              ...state.resources,
              food: Math.max(0, state.resources.food - foodLoss),
            },
            buildings: hutDestroyed
              ? {
                  ...state.buildings,
                  woodenHut: Math.max(0, state.buildings.woodenHut - 1),
                }
              : state.buildings,
            _logMessage: message,
          };
        },
      },
    ],
  },

  dreamMorrowind: {
    id: "dreamMorrowind",
    condition: (state: GameState) => state.buildings.woodenHut >= 3,
    triggerType: "time",
    timeProbability: 90,
    message:
      "Sleep drags you into a wasteland of ash and jagged stone. A red sky bleeds across the horizon, and enormous, insect-like shapes crawl in the distance. A low, ancient vibration hums through the ground. You wake with dust in your mouth and a lingering sense of unease.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        dream_morrowind: true,
      },
    }),
  },

  dreamOblivion: {
    id: "dreamOblivion",
    condition: (state: GameState) => state.buildings.woodenHut >= 4,
    triggerType: "time",
    timeProbability: 90,
    message:
      "You dream of a towering gate of brass and bone, weeping molten fire. Behind it, spiked towers and rivers of blood stretch into darkness. A voice calls from beyond the flames, hungry and silent. You wake in cold sweat, the echo of screaming still in your ears.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        dream_oblivion: true,
      },
    }),
  },

  dreamSkyrim: {
    id: "dreamSkyrim",
    condition: (state: GameState) => state.buildings.woodenHut >= 5,
    triggerType: "time",
    timeProbability: 90,
    message:
      "In sleep, cold winds lash your face. You stand atop a jagged cliff, snow and ash swirling around you. A colossal shadow passes overhead, scales glinting like iron in moonlight. A deep, ancient hum reverberates through your bones. You wake shivering, the chill lingering long after.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        dream_skyrim: true,
      },
    }),
  },

  findElderScroll: {
    id: "findElderScroll",
    condition: (state: GameState) =>
      state.events.dream_morrowind &&
      state.events.dream_oblivion &&
      state.events.dream_skyrim &&
      !state.relics.elder_scroll,
    triggerType: "time",
    timeProbability: 1,
    message:
      "Night drapes the village in an uneasy silence. As you pass a narrow path, something moves at the edge of your vision, like a shadow fleeing the firelight. You follow it, and there, upon the cold stones, lies an ancient scroll...",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => ({
      relics: {
        ...state.relics,
        elder_scroll: true,
      },
      events: {
        ...state.events,
        elder_scroll_found: true,
      },
    }),
  },

  blacksmithHammer: {
    id: "blacksmithHammer",
    condition: (state: GameState) => false, // Only triggered by hunting action
    triggerType: "action",
    message:
      "Deep in the forest, you discover ancient ruins dominated by a massive stone furnace. Skeletal remains lie scattered about - the bones of what must have been a giant. Among the debris, a magnificent hammer catches the light, its head still bearing traces of ancient forge-fire. You take the Blacksmith Hammer, feeling its power flow through you. (+2 Strength, -10% crafting costs)",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        relics: {
          ...state.relics,
          blacksmith_hammer: true,
        },
        events: {
          ...state.events,
          blacksmith_hammer_found: true,
        },
      };
    },
  },

  offerToTheForestGods: {
    id: "offerToTheForestGods",
    condition: (state: GameState) => state.current_population > 6 && !state.relics.ebony_ring && state.buildings.shrine == 1,
    triggerType: "resource",
    timeProbability: 40,
    title: "Offer to the Forest Gods",
    message: "While hunting, the villagers report unsettling figures in the forest. They are terrified. The village elders say the gods of the forest demand four villagers as sacrifice to restore peace.",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 3,
    choices: [
      {
        id: "sacrifice",
        label: "Sacrifice 4 villagers",
        effect: (state: GameState) => {
          const totalLuck = getTotalLuck(state);

          const successChance = 0.35 + (totalLuck * 0.01);
          const rand = Math.random();

          // Kill 4 villagers first
          const deathResult = killVillagers(state, 4);

          if (rand < successChance) {
            // Success: event resolved, get ebony ring
            return {
              ...deathResult,
              relics: {
                ...state.relics,
                ebony_ring: true,
              },
              _logMessage: "The forest accepts your sacrifice. The figures vanish, and an ebony ring is found on the altar where the villagers were offered. Peace returns to the woods.",
            };
          } else {
            // Failure: additional suicides
            const additionalDeaths = Math.floor(Math.random() * 5) + 2; // 2-6 additional deaths
            const totalDeathResult = killVillagers({
              ...state,
              villagers: deathResult.villagers || state.villagers
            }, additionalDeaths);

            return {
              villagers: totalDeathResult.villagers,
              relics: {
                ...state.relics,
                ebony_ring: true,
              },
              _logMessage: `The forest accepts your sacrifice. The figures vanish, and an ebony ring is found on the altar where the villagers were offered. But the horror of the sacrifice drives ${additionalDeaths} villagers to take their own lives in despair.`,
            };
          }
        },
      },
      {
        id: "refuse",
        label: "Do not make sacrifices",
        effect: (state: GameState) => {
          const totalLuck = getTotalLuck(state);

          const successChance = 0.10 + (totalLuck * 0.01);
          const nothingChance = 0.40;
          const rand = Math.random();

          if (rand < successChance) {
            // Best outcome: event resolved, get ebony ring
            return {
              relics: {
                ...state.relics,
                ebony_ring: true,
              },
              _logMessage: "Your refusal to sacrifice innocent lives somehow pleases the forest gods. The appearances vanish, and you find an ebony ring left as a gift. Your moral stand has been rewarded.",
            };
          } else if (rand < successChance + nothingChance) {
            // Nothing happens, event remains active
            return {
              _logMessage: "You refuse the sacrifice. The forest remains silent for now. The threat lingers...",
            };
          } else {
            // Villagers disappear
            const disappearances = Math.floor(Math.random() * 2) + 1; // 1-2 villagers
            const deathResult = killVillagers(state, disappearances);

            return {
              ...deathResult,
              _logMessage: `You refuse the sacrifice. During the night, ${disappearances} villager${disappearances > 1 ? 's' : ''} wander${disappearances === 1 ? 's' : ''} into the woods as if sleepwalking, drawn by a voice only they could hear. They are never seen again.`,
            };
          }
        },
      },
    ],
    fallbackChoice: {
      id: "noDecision",
      label: "No Decision Made",
      effect: (state: GameState) => {
        const departures = Math.floor(Math.random() * 3) + 2; // 2-4 villagers
        const deathResult = killVillagers(state, departures);

        return {
          ...deathResult,
          _logMessage: `Your indecision angers the villagers. ${departures} villagers, frustrated with your lack of leadership during this crisis, pack their belongings and leave the village in disgust.`,
        };
      },
    },
  },

  madBeduine: {
    id: "madBeduine",
    condition: (state: GameState) => state.buildings.woodenHut >= 6 && !state.relics.unnamed_book,
    triggerType: "resource",
    timeProbability: 35,
    title: "The Mad Beduine",
    message: "As evening falls, a robed figure approaches from the wilderness. His eyes burn with madness as he mutters in a foreign tongue, gestures sharp and unsettling. The villagers grow uneasy. Do you allow this Beduine to stay the night?",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "allowStay",
        label: "Allow him to stay",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              unnamed_book: true,
            },
            _logMessage: "You grant the stranger shelter. At dawn, he has vanished. Only his robes remain, and within them lies a book bound in human skin. Its pages whisper forbidden knowledge. The Unnamed Book grants you dark wisdom. (+10 Knowledge)",
          };
        },
      },
      {
        id: "turnAway",
        label: "Turn him away",
        effect: (state: GameState) => {
          const villagerDeaths = Math.floor(Math.random() * 5) + 1; // 1-5 villagers
          const hutDestruction = Math.floor(Math.random() * 2) + 1; // 1-2 huts

          const deathResult = killVillagers(state, villagerDeaths);

          return {
            ...deathResult,
            buildings: {
              ...state.buildings,
              woodenHut: Math.max(0, state.buildings.woodenHut - hutDestruction),
            },
            _logMessage: `You refuse the stranger entry. He leaves screaming curses in his alien tongue, echoing like the wailing of the damned. Before dawn, a tribe of cannibals descends as if summoned by his cries, killing ${villagerDeaths} and destroying ${hutDestruction} hut${hutDestruction > 1 ? 's' : ''} before vanishing into the wilds.`,
          };
        },
      },
    ],
  },

  // Create a merchant event:

  // A merchant approaches the village. He offers several trade options in the pop-up window.
  // As with the action button, if the user has not enough resources to purchase the button is inactive.
  // 4 resource trading options:
  // random choice of:
  // - buy 100 steel for random(750 wood, 1000 wood, 1250 wood, 1000 stone, 10 gold, 5 silver)
  // - buy 50 steel for random(400 bones, 500 wood, 600 wood, 300 fur, 400 fur, 500 fur, 500 stone, 5 gold, 10 silver)
  // - buy 50 obsidian for random(1500 wood, 1750 wood, 2000 wood, 20 silver, 10 gold)
  // - buy 25 obsidian for random(1000 bones, 1250 bones, 1500 bones, 1000 fur, 1250 fur, 1500 fur, 10 silver, 1500 stone)
  // - buy 25 adamant for random(10 gold, 15 gold, 30 silver, 100 steel, 2500 wood, 500 food)
  // - buy 500 wood for random(5 silver, 25 iron, 10 steel, 100 food)
  // - buy 1000 wood  for random(5 gold, 10 silver, 50 iron, 25 steel, 200 food)
  // - buy 500 food for random (5 gold, 10 silver)
  // - buy 1000 food for random(10 gold, 20 silver)
  // - buy 25 gold for random(200 steel, 2500 wood, 1500 stone, 2000 fur, 2500 food),
  // - buy 50 silver for random(200 steel, 2500 wood, 1500 stone, 2000 fur, 2500 food)
  // - buy 50 gold for random(500 steel, 5000 wood, 3000 stone, 5000 fur, 5000 food, 100 obsidian, 20 adamant),
  // - buy 100 silver for random(500 steel, 5000 wood, 3000 stone, 5000 fur, 5000 food, 100 obsidian, 20 adamant)

  // 2 relic/tool trading options:
  // - reinforced rope for random(50 silver, 25 gold)
  // - alchemist's map for random(100 silver, 50 gold)
  // - murmuring cube for random (150 silver, 75 gold)
  // - giant trap for random(20 silver, 10 gold)

  // create the tools:
  // - reinforced rope: add a new action under the cave explore area: low chamber, it is an event that can be executed once (it costs 500 food and 20 torches), create the event, the outcome will be defined later, when the tool is received event log should show a text explaining that the rope now allows access to a chamber in the cave that was inaccesibe without the rope.
  // - alchemist's map: after piurchasing from merchant the event log should say that an old alchemist, close to death hid his secrets and possessions within a part of the cave that he covered with door locking like rock, add an action under cave explore area (it costs 750 food), the action can be executed once, it gives the user resources and an item defined later.
  // -giant trap: add text to event log when bought that it can be used to trap something gigantic in the woods, add action to wood area called "lay trap", it cost 500 food, a gigantic black bear will be in the trap, the villagers fight it with all their strength (random(0-3) get killed) and kill it, player receives black bear fur

  // create the relics:
  // - murmuring cube, it's effects will be defined later
  // - black bear fur: + 10 strength

  // For each knowledge, the cost is 1 % lower (always round up to next int)

  hiddenLake: {
    id: "hiddenLake",
    condition: (state: GameState) => state.flags.forestUnlocked && !state.relics.cracked_crown,
    triggerType: "resource",
    timeProbability: 35,
    title: "The Hidden Lake",
    message: "While gathering wood deep in the forest, your villagers discover a pristine lake hidden among ancient trees. The water is eerily clear and still. One swears he saw a woman-like figure surface briefly, her gaze beautiful yet inhuman. What do you do?",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "investigate",
        label: "Investigate the lake",
        effect: (state: GameState) => {
          const strength = state.stats.strength || 0;
          const successChance = 0.25 + (strength * 0.01); // 25% + 1% per strength point
          const fleeChance = 0.20;
          const rand = Math.random();

          if (rand < successChance) {
            return {
              relics: {
                ...state.relics,
                cracked_crown: true,
              },
              _logMessage: "Your men approach cautiously. The creature emerges from the depths as they enter the lake and strikes with fury, but your villagers' strength prevails. At the bottom of the lake they uncover countless human bones and a cracked golden crown. The Cracked Crown radiates ancient power. (+5 Luck, +5 Knowledge)",
            };
          } else if (rand < successChance + fleeChance) {
            return {
              _logMessage: "Your men wade into the waters, but the creature bursts forth with inhuman speed. Her beauty twists into rows of teeth and glowing eyes. Terrified, your villagers flee and vow never to speak of it again.",
            };
          } else {
            const drownedCount = Math.floor(Math.random() * 4) + 1;
            const deathResult = killVillagers(state, drownedCount);

            return {
              ...deathResult,
              _logMessage: `The creature rises like a nightmare, beauty masking deadly intent. With unnatural strength, she drags ${drownedCount} villager${drownedCount > 1 ? 's' : ''} beneath the waters. Only ripples and faint screams remain as the rest flee in terror.`,
            };
          }
        },
      },
      {
        id: "avoidLake",
        label: "Avoid the lake",
        effect: (state: GameState) => {
          const luck = getTotalLuck(state);
          const successChance = 0.40 + (luck * 0.01);
          const rand = Math.random();

          if (rand < successChance) {
            return {
              _logMessage: "You order your villagers to avoid the lake. Some grumble about lost opportunities, but they obey. Its secrets remain hidden beneath still waters. Your caution might have spared lives.",
            };
          } else {
            const deathResult = killVillagers(state, 1);

            return {
              ...deathResult,
              _logMessage: "You forbid any approach, but the villager who claimed to have seen the creature cannot resist. One night he sneaks away, never to return. At dawn, only his clothes lie at the water's edge.",
            };
          }
        },
      },
    ],
  },

  
};