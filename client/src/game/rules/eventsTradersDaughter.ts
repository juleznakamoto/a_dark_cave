import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const tradersDaughterEvents: Record<string, GameEvent> = {
  traders_daughter: {
    id: "traders_daughter",
    condition: (state: GameState) =>
      (state.resources.food ?? 0) > 500 &&
      (state.buildings.tradePost ?? 0) >= 1 &&
      !state.triggeredEvents.traders_daughter_helped,
    timeProbability: 30,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 6 * 60 * 1000, // 6 minutes
    choices: [
      {
        id: "send_search_party",
        cost: "500 food, 50 torch",
        effect: (state: GameState) => {
          const food = state.resources.food ?? 0;
          const torch = state.resources.torch ?? 0;
          if (food < 500 || torch < 50) {
            return {
              _logMessageKey: "outcome0",
            };
          }
          return {
            resources: {
              ...state.resources,
              food: food - 500,
              torch: torch - 50,
              silver: (state.resources.silver ?? 0) + 250,
            },
            triggeredEvents: {
              ...(state.triggeredEvents || {}),
              traders_daughter_helped: true,
            },
            _logMessageKey: "outcome1",
          };
        },
      },
      {
        id: "do_not_help",
        effect: (_state: GameState) => ({
          _logMessageKey: "outcome2",
        }),
      },
    ],
    fallbackChoice: {
      id: "do_not_help",
      effect: (_state: GameState) => ({
        _logMessageKey: "outcome3",
      }),
    },
  },

  traders_gratitude: {
    id: "traders_gratitude",
    condition: (state: GameState) =>
      state.triggeredEvents?.traders_daughter_helped === true &&
      state.triggeredEvents?.traders_gratitude_used !== true,
    timeProbability: 2,
    priority: 3,
    repeatable: false,
    showAsTimedTab: true,
    timedTabDuration: 10 * 60 * 1000, // 10 minutes
    choices: [
      {
        id: "accept_traders_gratitude",
        effect: (state: GameState) => ({
          tradersGratitudeState: {
            accepted: true,
          },
        }),
      },
      {
        id: "decline_traders_gratitude",
        effect: (state: GameState) => ({
          tradersGratitudeState: { accepted: false },
          triggeredEvents: {
            ...(state.triggeredEvents || {}),
            traders_gratitude_used: true,
          },
          _logMessageKey: "outcome0",
        }),
      },
    ],
    fallbackChoice: {
      id: "decline_traders_gratitude",
      effect: (state: GameState) => ({
        tradersGratitudeState: { accepted: false },
        triggeredEvents: {
          ...(state.triggeredEvents || {}),
          traders_gratitude_used: true,
        },
        _logMessageKey: "outcome1",
      }),
    },
  },
};
