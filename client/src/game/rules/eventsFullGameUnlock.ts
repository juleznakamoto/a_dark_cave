import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

/**
 * Check if the full game has been purchased
 */
export const hasFullGamePurchase = (state: GameState): boolean => {
  return Object.keys(state.activatedPurchases || {}).some(
    (key) =>
      (key === "full_game" || key.startsWith("purchase-full_game-")) &&
      state.activatedPurchases?.[key],
  );
};

export const fullGameUnlockEvents: Record<string, GameEvent> = {
  firstElderWarning: {
    id: "firstElderWarning",
    condition: (state: GameState) => {
      return (
        state.BTP === 1 &&
        state.buildings.woodenHut >= 2 &&
        state.current_population >= 1 &&
        !state.story.seen.firstElderWarning &&
        !hasFullGamePurchase(state)
      );
    },
    
    timeProbability: 1,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "nod",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                firstElderWarning: true,
              },
            },
          };
        },
      },
    ],
  },

  villageElderNotice: {
    id: "villageElderNotice",
    condition: (state: GameState) => {
      return (
        state.BTP === 1 &&
        state.buildings.darkEstate >= 1 &&
        state.story.seen.firstElderWarning &&
        !state.story.seen.villageElderNotice &&
        !hasFullGamePurchase(state)
      );
    },
    
    timeProbability: 2,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "nod",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                villageElderNotice: true,
              },
            },
          };
        },
      },
    ],
  },

  villageElderDecision: {
    id: "villageElderDecision",
    condition: (state: GameState) => {
      return (
        state.BTP === 1 &&
        state.story.seen.villageElderNotice &&
        state.books.book_of_trials &&
        state.books.book_of_ascension &&
        !state.story.seen.villageElderDecision &&
        !hasFullGamePurchase(state)
      );
    },
    
    timeProbability: 3,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "nod",
        effect: (state: GameState) => {
          // Open the full game purchase dialog
          setTimeout(() => {
            const { useGameStore } = require("@/game/state");
            useGameStore.getState().setFullGamePurchaseDialogOpen(true);
          }, 500);

          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                villageElderDecision: true,
              },
            },
          };
        },
      },
    ],
  },
};
