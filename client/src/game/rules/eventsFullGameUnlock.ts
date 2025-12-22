
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
      "The village elder returns, his expression grave and resolute. 'The time has come,' he says, his voice carrying the weight of destiny. 'You have walked far on this path, and now you must decide: will you continue this journey into the unknown?'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 3,
    },
    repeatable: false,
    choices: [
      {
        id: "consider",
        label: "I will consider it",
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
              "You tell the elder you will consider his words carefully. He nods slowly, understanding the weight of the choice before you, and departs into the gathering dusk.",
          };
        },
      },
    ],
  },
};
