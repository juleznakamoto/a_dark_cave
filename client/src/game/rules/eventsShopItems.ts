
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const shopItemEvents: Record<string, GameEvent> = {
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
    triggerType: "resource",
    timeProbability: 0.05,
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
            _logMessage:
              "You decide to craft a trap, daring to draw whatever unseen horror stirs in the black depths of the underground lake into the light.",
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
    triggerType: "resource",
    timeProbability: 1,
    title: "The Creature's Fate",
    message:
      "The massive creature writhes in the trap, its tentacles thrashing against the iron bars. Its ancient eyes regard you with what might be intelligence. The blacksmith steps forward, his eyes gleaming with greed. 'Those bones would forge the mightiest shield ever made.' But something in the creature's gaze makes you hesitate.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "killCreature",
        label: "Kill the creature",
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
              "The creature's death throes echo through the cavern as your men drive spears into its flesh. The blacksmith harvests its massive bones, each one harder than steel. 'With these,' he says reverently, 'I can forge the Ashen Greatshield, a bulwark that will protect us from all harm.'",
          };
        },
      },
      {
        id: "spareCreature",
        label: "Spare its life",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: (state.resources.gold || 0) + 1000,
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
              "You open the trap and step back. The creature regards you for a long moment before diving deep. Just as you turn to leave, it resurfaces and spits out an ancient chest encrusted with centuries of lake sediment. Inside gleams 1000 gold coins, untarnished by time. The creature vanishes into the black depths, leaving only ripples.",
          };
        },
      },
    ],
  },
};
