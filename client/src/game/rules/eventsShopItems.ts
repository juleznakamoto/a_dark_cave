
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const shopItemEvents: Record<string, GameEvent> = {
    compassTreasure: {
    id: "compassTreasure",
    condition: (state: GameState) =>
      state.relics.tarnished_compass &&
      !state.story.seen.compassTreasureFound,
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
              "You follow the compass deap into the woods, where ou unearth a small chest extraordinarily sturdy construction. You cannot open it, so you cary it back with you.",
          };
        },
      },
    ],
  },

  compassTreasure: {
    id: "compassTreasure",
    condition: (state: GameState) =>
      state.story.seen.compassActivated &&
      !state.story.seen.compassTreasureFound,
    timeProbability: 1,
    title: "The Buried Chest",
    message:
      "The compass leads you deep into the woods to an unremarkable patch of earth. Following its insistent pull, you dig. Your shovel strikes metal - a small chest of extraordinarily sturdy construction. No matter how you try, you cannot open it.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "takeChest",
        label: "Take the chest",
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
              "You carry the sealed chest back to the village. Whatever secrets lie within remain locked away.",
          };
        },
      },
    ],
  },

  undergroundLakeDiscovery: {
    id: "undergroundLakeDiscovery",
    condition: (state: GameState) =>
      state.tools.skull_lantern &&
      state.story.seen.descendedFurther &&
      !state.story.seen.undergroundLakeDiscovered,
    triggerType: "resource",
    timeProbability: 3,
    title: "The Underground Lake",
    message:
      "After the last cave expedition, two men claim to have seen an underground lake. The darkness was too dense to see clearly. Perhaps the skull lantern could reveal those dark waters.",
    triggered: false,
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
    triggered: false,
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
    timeProbability: 1,
    title: "The Creature's Fate",
    message:
      "The massive creature writhes in the trap, its tentacles thrashing against the steel bars. Its ancient eyes regard you with what might be intelligence. What will you do?",
    triggered: false,
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
