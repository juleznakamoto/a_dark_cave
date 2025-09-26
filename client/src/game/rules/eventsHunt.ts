import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

export const huntEvents: Record<string, GameEvent> = {
  blacksmithHammerChoice: {
    id: "blacksmithHammerChoice",
    condition: (state: GameState) => false, // Only triggered by hunt action
    triggerType: "action",
    title: "The Giant's Forge",
    message:
      "Deep in the forest, you discover the ruin of an old stone building dominated by a massive stone furnace. Skeletal remains lie scattered about - the bones of what must have been a giant. Among the debris, a magnificent blacksmith hammer catches the light, its head still bearing traces of ancient forge-fire. Do you take it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "takeHammer",
        label: "Take the hammer",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
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
              "You grasp the ancient hammer, feeling its weight and balance. Despite the ages that have passed, it remains a masterwork of smithing. The giant's spirit seems to approve of your choice.",
          };
        },
      },
      {
        id: "leaveHammer",
        label: "Leave it undisturbed",
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
              "You decide to leave the hammer where it lies, respecting the giant's final resting place. As you turn away, you feel a sense of peace settling over the ancient forge.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveHammer",
      label: "Leave it undisturbed",
      effect: (state: GameState) => {
        const deathResult = killVillagers(state, 1);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              blacksmithHammerChoice: true,
            },
          },
          _logMessage:
            "Your hesitation awakens the giant's restless spirit. In a fit of ancient rage, spectral flames burst from the forge, consuming one of your hunters before you can react. The hammer remains where it lies, forever guarded by its creator's wrath.",
        };
      },
    },
  },

  redMaskChoice: {
    id: "redMaskChoice",
    condition: (state: GameState) => false, // Only triggered by hunt action
    triggerType: "action",
    title: "The Raven's Gift",
    message:
      "While hunting, you see an oddly large black raven staring at you from a broken tree. Even when you come nearer it keeps staring. Suddenly it croaks, sounding like it's saying a word you don't understand, again and again. As you come closer it flies away. On the ground in front of the tree lies a mask made of deep red leather. Do you take it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "takeMask",
        label: "Take the red mask",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
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
              "You pick up the crimson leather mask. It feels warm to the touch, and when you hold it up to your face, the world seems to shift slightly, revealing hidden truths in the shadows of the forest.",
          };
        },
      },
      {
        id: "leaveMask",
        label: "Leave it behind",
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
              "You decide the raven's gift carries too much mystery. As you walk away, you hear the raven's call echoing through the trees, neither angry nor pleased, but somehow... patient.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveMask",
      label: "Leave it behind",
      effect: (state: GameState) => {
        const deathResult = killVillagers(state, 1);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              redMaskChoice: true,
            },
          },
          _logMessage:
            "Your indecision angers the forest spirits. The raven's call becomes a harsh shriek that seems to summon dark shapes from between the trees. One of your hunters is pulled into the shadows and never returns. The red mask vanishes with the wind.",
        };
      },
    },
  },
};