import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const huntEvents: Record<string, GameEvent> = {
  blacksmithHammerChoice: {
    id: "blacksmithHammerChoice",
    condition: (state: GameState) => false, // Only triggered by hunt action
    triggerType: "action",
    title: "The Giant's Forge",
    message:
      "Deep in the forest, you discover the ruin of a stone building with a massive furnace. You find skeletal remains of what must have been a giant, next to it a magnificent blacksmith hammer. Do you take it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "takeHammer",
        label: "Take hammer",
        effect: (state: GameState) => {
          return {
            tools: {
              ...state.tools,
              blacksmith_hammer: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                blacksmithHammerChoice: true,
              },
            },
            _logMessage:
              "You grasp the ancient hammer, feeling its weight and balance. Despite the ages that have passed, it remains a masterwork of smithing.",
          };
        },
      },
      {
        id: "leaveHammer",
        label: "Leave it",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                blacksmithHammerChoice: true,
              },
            },
            _logMessage:
              "You decide to leave the hammer where it lies, respecting the giant's final resting place.",
          };
        },
      },
    ],
  },

  redMaskChoice: {
    id: "redMaskChoice",
    condition: (state: GameState) => false, // Only triggered by hunt action
    triggerType: "action",
    title: "The Raven's Gift",
    message:
      "While hunting, you see an oddly large black raven staring at you from a broken tree. As you approach it, Suddenly it croaks, sounding like it's saying a word again and again. Then it flies away. In front of the tree lies a mask made of deep red leather. Do you take it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "takeMask",
        label: "Take red mask",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              red_mask: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                redMaskChoice: true,
              },
            },
            _logMessage:
              "You pick up the crimson leather mask. It feels warm to the touch.",
          };
        },
      },
      {
        id: "leaveMask",
        label: "Leave it",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                redMaskChoice: true,
              },
            },
            _logMessage:
              "You decide the raven's gift carries too much mystery. As you walk away, you hear the raven's call echoing through the trees.",
          };
        },
      },
    ],
  },
};