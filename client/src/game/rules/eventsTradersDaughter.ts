import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const tradersDaughterEvents: Record<string, GameEvent> = {
  traders_daughter: {
    id: "traders_daughter",
    condition: (state: GameState) =>
      (state.resources.food ?? 0) > 500 &&
      (state.buildings.tradePost ?? 0) >= 1,
    timeProbability: 30,
    title: "The Trader's Daughter",
    message:
      "One evening, the trader approaches you in distress. His youngest daughter has gone missing near the forest’s edge, and he begs for your help.",
    priority: 3,
    repeatable: false,
    showAsTimedTab: true,
    timedTabDuration: 6 * 60 * 1000, // 6 minutes
    choices: [
      {
        id: "send_search_party",
        label: "Send search party",
        cost: "500 food, 50 torch",
        effect: (state: GameState) => {
          const food = state.resources.food ?? 0;
          const torch = state.resources.torch ?? 0;
          if (food < 500 || torch < 50) {
            return {
              _logMessage: "You don't have enough food and torches for the search party.",
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
            _logMessage:
              "The search party finds the girl unharmed. She had discovered a small cave strewn with silver trinkets and was quietly playing among them. You find 250 Silver in the cave.",
          };
        },
      },
      {
        id: "do_not_help",
        label: "Do not help",
        effect: () => ({
          _logMessage: "You decline. The trader nods sadly and leaves to search on his own.",
        }),
      },
    ],
    fallbackChoice: {
      id: "do_not_help",
      label: "Do not help",
      effect: () => ({
        _logMessage: "You decline. The trader nods sadly and leaves to search on his own.",
      }),
    },
  },

  traders_gratitude: {
    id: "traders_gratitude",
    condition: (state: GameState) =>
      state.triggeredEvents?.traders_daughter_helped === true &&
      state.triggeredEvents?.traders_gratitude_used !== true,
    timeProbability: 0.5,
    title: "The Trader's Gratitude",
    message:
      "The trader returns, eyes filled with relief and gratitude. To repay your kindness, he promises a generous discount on your next purchase.",
    priority: 3,
    repeatable: false,
    showAsTimedTab: true,
    timedTabDuration: 10 * 60 * 1000, // 10 minutes
    choices: [
      {
        id: "accept_traders_gratitude",
        label: "Accept",
        effect: (state: GameState) => ({
          tradersGratitudeState: {
            accepted: true,
          },
        }),
      },
      {
        id: "decline_traders_gratitude",
        label: "Decline offer",
        effect: (state: GameState) => ({
          triggeredEvents: {
            ...(state.triggeredEvents || {}),
            traders_gratitude_used: true,
          },
          _logMessage: "ou decline the offer. The trader thanks you once more and departs quietly.",
        }),
      },
    ],
    fallbackChoice: {
      id: "decline_traders_gratitude",
      label: "Decline offer",
      effect: (state: GameState) => ({
        triggeredEvents: {
          ...(state.triggeredEvents || {}),
          traders_gratitude_used: true,
        },
        _logMessage: "ou decline the offer. The trader thanks you once more and departs quietly.",
      }),
    },
  },
};
