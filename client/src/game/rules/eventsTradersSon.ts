import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const tradersSonEvents: Record<string, GameEvent> = {
  traders_son: {
    id: "traders_son",
    condition: (state: GameState) =>
      ((state.traderDialogOpens ?? 0) >= 10 ||
        (state.completePurchaseDialogOpens ?? 0) >= 1) &&
      state.flags.forestUnlocked === true &&
      !state.triggeredEvents?.traders_son_intro_resolved &&
      state.triggeredEvents?.traders_daughter_helped !== true,
    timeProbability: 0.5,
    title: "The Trader's Son",
    message:
      "The village trader's son approaches you. He wore his father's prized dagger to impress a woman, but a nearby bandit mugged him. He asks you to retrieve it.",
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "agree_recover_dagger",
        label: "Help him",
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
        label: "Refuse",
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
      label: "Refuse",
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
      state.story?.seen?.tradersSonLairComplete === true &&
      state.triggeredEvents?.traders_son_gratitude_used !== true,
    timeProbability: 0.5,
    title: "The Trader's Son's Gratitude",
    message:
      "The trader's son returns, holding his father's dagger. He is full of gratitude andoffers you a great discount on your next purchase of his father's goods.",
    priority: 3,
    repeatable: false,
    showAsTimedTab: true,
    timedTabDuration: 10 * 60 * 1000, // 10 minutes
    choices: [
      {
        id: "accept_traders_son_gratitude",
        label: "Accept",
        effect: (state: GameState) => ({
          tradersSonGratitudeState: {
            accepted: true,
          },
        }),
      },
      {
        id: "decline_traders_son_gratitude",
        label: "Decline offer",
        effect: (state: GameState) => ({
          tradersSonGratitudeState: { accepted: false },
          triggeredEvents: {
            ...(state.triggeredEvents || {}),
            traders_son_gratitude_used: true,
          },
          _logMessage:
            "You decline the offer. The young trader nods, relieved perhaps that no debt remains.",
        }),
      },
    ],
    fallbackChoice: {
      id: "decline_traders_son_gratitude",
      label: "Decline offer",
      effect: (state: GameState) => ({
        tradersSonGratitudeState: { accepted: false },
        triggeredEvents: {
          ...(state.triggeredEvents || {}),
          traders_son_gratitude_used: true,
        },
        _logMessage:
          "You decline the offer. The young trader nods, relieved perhaps that no debt remains.",
      }),
    },
  },
};
