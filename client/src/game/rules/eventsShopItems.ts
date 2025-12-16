
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
        label: "Acknowledge",
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
    timeProbability: 5,
    title: "Something Beneath",
    message:
      "During the exploration of the underground lake, you think you saw something under the surface, something very big. Maybe you can lure it out with a trap.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "acknowledgeLakeCreature",
        label: "Acknowledge",
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
              "You decide to prepare a trap to lure out whatever lurks in the depths of the underground lake.",
          };
        },
      },
    ],
  },
};
