
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const fullGameUnlockEvents: Record<string, GameEvent> = {
  villageElderNotice: {
    id: "villageElderNotice",
    condition: (state: GameState) =>
      state.BTP === 1 &&
      state.buildings.darkEstate >= 1 &&
      !state.story.seen.villageElderNotice,
    triggerType: "time",
    timeProbability: 5,
    title: "The Elder's Notice",
    message: "A village elder approaches you. He speaks quietly. 'You stand at the beginning of a long path filled with trials. Soon, you must choose whether you will continue this journey.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 3,
    },
    repeatable: false,
    choices: [
      {
        id: "nod",
        label: "Nod silently",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                villageElderNotice: true,
              },
            },
            _logMessage:
              "You nod solemnly at the elder's words. His words echo in your mind as he walks away into the shadows.",
          };
        },
      },
    ],
  },

  villageElderDecision: {
    id: "villageElderDecision",
    condition: (state: GameState) =>
      state.BTP === 1 &&
      state.story.seen.villageElderNotice &&
      state.books.book_of_trials &&
      !state.story.seen.villageElderDecision,
    triggerType: "time",
    timeProbability: 5,
    title: "The Time Has Come",
    message:
      "The village elder returns, his expression grave. 'The time has come,' he says. 'You have taken your first steps on a long and unforgiving path. What lies ahead is deeper, darker, and more demanding. Decide now whether you will continue this journey.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 3,
    },
    repeatable: false,
    choices: [
      {
        id: "nod",
        label: "Nod silently",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                villageElderDecision: true,
              },
            },
            _logMessage:
              "The elder looks at you, understanding the weight of the choice before you, then departs into the gathering dusk.",
          };
        },
      },
    ],
  },
};
