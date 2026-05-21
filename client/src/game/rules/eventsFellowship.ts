import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const fellowshipEvents: Record<string, GameEvent> = {
  wizardOffer: {
    id: "wizardOffer",
    condition: (state: GameState) =>
      state.buildings.wizardTower >= 1 && !state.fellowship.elder_wizard,
    timeProbability: (state: GameState) => {
      return state.story.seen.wizardOfferDeclined ? 45 : 30;
    },
    message: (state: GameState) =>
      state.story.seen.wizardOfferDeclined ? "repeat" : "firstVisit",
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    skipEventLog: true,
    fallbackChoice: {
      id: "refuse",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              wizardOfferDeclined: true,
            },
          },
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "payGold",
        cost: "250 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessageKey: "outcome1",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 250,
            },
            fellowship: {
              ...state.fellowship,
              elder_wizard: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                wizardOfferAccepted: true,
              },
            },
            _logMessageKey: "outcome2",
          };
        },
      },
      {
        id: "refuse",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                wizardOfferDeclined: true,
              },
            },
            _logMessageKey: "outcome3",
          };
        },
      },
    ],
  },
};
