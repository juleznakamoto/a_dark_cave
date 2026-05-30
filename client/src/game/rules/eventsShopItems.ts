import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const shopItemEvents: Record<string, GameEvent> = {
  // Tarnished Compass Events

  compassTreasure: {
    id: "compassTreasure",
    condition: (state: GameState) =>
      state.relics.tarnished_compass && !state.story.seen.compassTreasureFound,
    timeProbability: 10,

    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "followCompass",
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
            _logMessageKey: "outcome0",
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

    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000, // 5 minutes
    fallbackChoice: {
      id: "sendAway",
      effect: (state: GameState) => {
        return {
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "payTribute",
        cost: "5000 wood, 5000 stone, 5000 food, 500 leather, 500 steel",
        effect: (state: GameState) => ({
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
            _logMessageKey: "outcome2",
        }),
      },
      {
        id: "offerGold",
        cost: "250 gold",
        effect: (state: GameState) => ({
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
            _logMessageKey: "outcome4",
        }),
      },
      {
        id: "sendAway",
        effect: (state: GameState) => {
          return {
            _logMessageKey: "outcome5",
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

    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "ringBell",
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
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "doNotRing",
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
            _logMessageKey: "outcome1",
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

    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "unlockLake",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                undergroundLakeDiscovered: true,
              },
            },
            _logMessageKey: "outcome0",
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

    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "acknowledgeLakeCreature",
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

    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "killCreature",
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
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "spareCreature",
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
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  lakeCreatureDead: {
    id: "lakeCreatureDead",
    condition: (state: GameState) =>
      state.story.seen.lakeCreatureSpared && !state.story.seen.lakeCreatureDead,
    timeProbability: 15,

    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "forge",
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
                lakeCreatureDead: true,
                ashenGreatshieldUnlocked: true,
              },
            },
          };
        },
      },
    ],
  },
};
