import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const shopItemEvents: Record<string, GameEvent> = {
  
  // Tarnished Compass Events

  compassTreasure: {
    id: "compassTreasure",
    condition: (state: GameState) =>
      state.relics.tarnished_compass && !state.story.seen.compassTreasureFound,
    timeProbability: 10,
    title: "The Stirring Needle",
    message:
      "You wake in the night to a strange sound. The tarnished compass needle spins wildly in the darkness. When you grasp it, the needle stops, pointing firmly in one direction.",
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "followCompass",
        label: "Follow compass",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              sealed_chest: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                compassTreasureFound: true,
              },
            },
            _logMessage:
              "You follow the compass deap into the woods, where you unearth a small chest extraordinarily sturdy construction. You cannot open it, so you cary it back with you.",
          };
        },
      },
    ],
  },

  monasteryMonk: {
    id: "monasteryMonk",
    condition: (state: GameState) =>
      state.story.seen.compassTreasureFound &&
      state.relics.sealed_chest &&
      !state.schematics.skeleton_key_schematic &&
      !state.story.seen.monasteryMonkAccepted,
    timeProbability: (state: GameState) => {
      const hasBeenSeen = state.triggeredEvents?.monasteryMonk;
      return hasBeenSeen ? 20 : 10;
    },
    title: "The Mountain Monk",
    message:
      "A monk from a mountain monastery arrives in the village. 'I hear you found a mysterious chest, he says softly. 'The monastery knows how to open it. Offer a tribute, and I will share the secret.'",
    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000, // 5 minutes
    fallbackChoice: {
      id: "sendAway",
      label: "Send away",
      effect: (state: GameState) => {
        return {
          _logMessage:
            "You decline the monk's offer. He bows respectfully and begins his journey back to the mountains.",
        };
      },
    },
    choices: [
      {
        id: "payTribute",
        label: "Pay tribute",
        cost: "5000 wood, 5000 stone, 5000 food, 500 leather, 500 steel",
        effect: (state: GameState) => {
          if (
            state.resources.wood < 5000 ||
            state.resources.stone < 5000 ||
            state.resources.food < 5000 ||
            state.resources.leather < 500 ||
            state.resources.steel < 500
          ) {
            return {
              _logMessage: "You don't have enough resources for the tribute.",
            };
          }

          return {
            resources: {
              ...state.resources,
              wood: state.resources.wood - 5000,
              stone: state.resources.stone - 5000,
              food: state.resources.food - 5000,
              leather: state.resources.leather - 500,
              steel: state.resources.steel - 500,
            },
            schematics: {
              ...state.schematics,
              skeleton_key_schematic: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                monasteryMonkAccepted: true,
              },
            },
            _logMessage:
              "The monk accepts your tribute with a solemn nod and reveals detailed plans for a skeleton key. “This key is said to open any lock,” he says, before departing.",
          };
        },
      },
      {
        id: "offerGold",
        label: "Offer 250 Gold",
        cost: "250 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessage: "You don't have enough gold.",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 250,
            },
            schematics: {
              ...state.schematics,
              skeleton_key_schematic: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                monasteryMonkAccepted: true,
              },
            },
            _logMessage:
              "The monk's eyes widen at the sight of gold. 'This will help the monastery greatly,' he says, drawing out detailed plans for a skeleton key. “This key is said to open any lock,” he says, before departing.",
          };
        },
      },
      {
        id: "sendAway",
        label: "Send away",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You decline the monk's offer. He bows respectfully and begins his journey back to the mountains.",
          };
        },
      },
    ],
  },

  mysteriousBell: {
    id: "mysteriousBell",
    condition: (state: GameState) =>
      state.tools.skeleton_key &&
      state.relics?.sealed_chest &&
      !state.story.seen.mysteriousChestOpened,
    timeProbability: 0.5,
    title: "The mysterious Bell",
    message:
      "You open the sealed chest with the skeleton key. Inside, resting on faded velvet, lies a golden bell covered in grotesque engravings and strange symbols written across its surface.",
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "ringBell",
        label: "Ring it",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              skeleton_key: false,
              sealed_chest: false,
            },
            blessings: {
              ...state.blessings,
              bell_blessing: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mysteriousChestOpened: true,
              },
            },
            _logMessage:
              "The moment you hear the first ring, darkness swallows you whole. You dream of a vast city of glass and steel, filled with strange lights and people who move with purpose you cannot understand. When you awake, the bell has vanished, but a bell-shaped mark burns on your forearm.",
          };
        },
      },
      {
        id: "doNotRing",
        label: "Do not ring it",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold + 500,
            },
            relics: {
              ...state.relics,
              skeleton_key: false,
              sealed_chest: false,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mysteriousChestOpened: true,
              },
            },
            _logMessage:
              "The risk is too great. That same day, a tradesman arrives and offers 500 gold for the bell. You accept immediately, relieved to be rid of the cursed object. The tradesman departs with a knowing smile.",
          };
        },
      },
    ],
  },

  // Skull Lantern Events

  undergroundLakeDiscovery: {
    id: "undergroundLakeDiscovery",
    condition: (state: GameState) =>
      state.tools.skull_lantern &&
      state.story.seen.descendedFurther &&
      !state.story.seen.undergroundLakeDiscovered,

    timeProbability: 3,
    title: "The Underground Lake",
    message:
      "After the last cave expedition, two men claim to have seen an underground lake. The darkness was too dense to see clearly. Perhaps the skull lantern could reveal those dark waters.",
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "unlockLake",
        label: "Prepare",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                undergroundLakeDiscovered: true,
              },
            },
            _logMessage:
              "You agree to investigate, but first the necessary preparations must be made for the descent to the lake.",
          };
        },
      },
    ],
  },

  undergroundLakeCreature: {
    id: "undergroundLakeCreature",
    condition: (state: GameState) =>
      state.story.seen.undergroundLakeExplored &&
      !state.story.seen.undergroundLakeCreatureDiscovered,
    timeProbability: 4,
    title: "Something Beneath",
    message:
      "While exploring the underground lake, you catch a huge shadow beneath the black waters, something vast and unseen. Perhaps a trap could lure it out of the waters.",
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "acknowledgeLakeCreature",
        label: "Prepare",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                undergroundLakeCreatureDiscovered: true,
              },
            },
          };
        },
      },
    ],
  },

  lakeCreatureFate: {
    id: "lakeCreatureFate",
    condition: (state: GameState) =>
      state.story.seen.lakeCreatureLured &&
      !state.story.seen.lakeCreatureFateDecided,
    timeProbability: 0.2,
    title: "The Creature's Fate",
    message:
      "The massive creature writhes in the trap, its tentacles thrashing against the steel bars. Its ancient eyes regard you with what might be intelligence. What will you do?",
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "killCreature",
        label: "Kill creature",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              bones: (state.resources.bones || 0) + 5000,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                lakeCreatureFateDecided: true,
                lakeCreatureKilled: true,
                ashenGreatshieldUnlocked: true,
              },
            },
            _logMessage:
              "The creature’s last violent thrashes shake the cavern as the men drive their spears into its writhing body. As the blacksmith eyes the creature's massive bones, he declares he can forge them into a mighty greatshield.",
          };
        },
      },
      {
        id: "spareCreature",
        label: "Spare life",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: (state.resources.gold || 0) + 500,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                lakeCreatureFateDecided: true,
                lakeCreatureSpared: true,
              },
            },
            _logMessage:
              "You open the trap and step back. The creature watches a moment, then dives deep, resurfacing to spit out a small rotten chest. Inside lie gleaming gold coins. It vanishes into the black depths, leaving only ripples.",
          };
        },
      },
    ],
  },
};
