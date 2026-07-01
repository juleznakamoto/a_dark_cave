import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { isSteamEditionActive } from "@/lib/edition";

export const tradersSonEvents: Record<string, GameEvent> = {
  traders_son: {
    id: "traders_son",
    condition: (state: GameState) =>
      !isSteamEditionActive() &&
      ((state.traderDialogOpens ?? 0) >= 10 ||
        (state.completePurchaseDialogOpens ?? 0) >= 1 ||
        state.hasMadeNonFreePurchase === true) &&
      state.flags.forestUnlocked === true &&
      !state.triggeredEvents?.traders_son_intro_resolved &&
      state.triggeredEvents?.traders_daughter_helped !== true,
    timeProbability: 0.5,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "agree_recover_dagger",
        effect: (state: GameState) => ({
          triggeredEvents: {
            ...(state.triggeredEvents || {}),
            traders_son_intro_resolved: true,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              tradersSonQuestActive: true,
            },
          },
        }),
      },
      {
        id: "traders_son_refuse",
        effect: (state: GameState) => ({
          triggeredEvents: {
            ...(state.triggeredEvents || {}),
            traders_son_intro_resolved: true,
          },
        }),
      },
    ],
    fallbackChoice: {
      id: "traders_son_refuse",
      effect: (state: GameState) => ({
        triggeredEvents: {
          ...(state.triggeredEvents || {}),
          traders_son_intro_resolved: true,
        },
      }),
    },
  },

  traders_son_gratitude: {
    id: "traders_son_gratitude",
    condition: (state: GameState) =>
      !isSteamEditionActive() &&
      state.story?.seen?.tradersSonLairComplete === true &&
      state.triggeredEvents?.traders_son_gratitude_used !== true,
    timeProbability: 0.5,
    priority: 3,
    repeatable: false,
    showAsTimedTab: true,
    timedTabDuration: 10 * 60 * 1000, // 10 minutes
    choices: [
      {
        id: "accept_traders_son_gratitude",
        effect: (state: GameState) => ({
          tradersSonGratitudeState: {
            accepted: true,
          },
        }),
      },
      {
        id: "decline_traders_son_gratitude",
        effect: (state: GameState) => ({
          tradersSonGratitudeState: { accepted: false },
          triggeredEvents: {
            ...(state.triggeredEvents || {}),
            traders_son_gratitude_used: true,
          },
          _logMessageKey: "outcome0",
        }),
      },
    ],
    fallbackChoice: {
      id: "decline_traders_son_gratitude",
      effect: (state: GameState) => ({
        tradersSonGratitudeState: { accepted: false },
        triggeredEvents: {
          ...(state.triggeredEvents || {}),
          traders_son_gratitude_used: true,
        },
        _logMessageKey: "outcome1",
      }),
    },
  },
};
