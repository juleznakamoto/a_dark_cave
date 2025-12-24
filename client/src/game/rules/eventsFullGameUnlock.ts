import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const fullGameUnlockEvents: Record<string, GameEvent> = {
  firstElderWarning: {
    id: "firstElderWarning",
    condition: (state: GameState) => {
      return (
        state.BTP === 1 &&
        state.buildings.woodenHut >= 2 &&
        state.current_population >= 1 &&
        !state.story.seen.firstElderWarning
      );
    },
    
    timeProbability: 1,
    title: "The Village Elder",
    message:
      "An older villager approaches you, his eyes heavy with knowledge. 'You have taken your first steps in this cruel world,' he says quietly. 'Soon, you will have to decide whether you are willing to face what lies ahead.'",
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
      // Check if full_game has been purchased
      const hasFullGame = Object.keys(state.activatedPurchases || {}).some(
        (key) =>
          (key === "full_game" || key.startsWith("purchase-full_game-")) &&
          state.activatedPurchases?.[key],
      );
      return (
        state.BTP === 1 &&
        state.buildings.darkEstate >= 1 &&
        state.story.seen.firstElderWarning &&
        !state.story.seen.villageElderNotice &&
        !hasFullGame
      );
    },
    
    timeProbability: 1,
    title: "The Elder's Notice",
    message:
      "A village elder approaches you. He speaks quietly. 'You stand at the beginning of a long path filled with trials. Very soon, you must choose whether you will continue this journey.'",
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
          };
        },
      },
    ],
  },

  villageElderDecision: {
    id: "villageElderDecision",
    condition: (state: GameState) => {
      // Check if full_game has been purchased
      const hasFullGame = Object.keys(state.activatedPurchases || {}).some(
        (key) =>
          (key === "full_game" || key.startsWith("purchase-full_game-")) &&
          state.activatedPurchases?.[key],
      );
      return (
        state.BTP === 1 &&
        state.story.seen.villageElderNotice &&
        state.books.book_of_trials &&
        state.books.book_of_ascension &&
        !state.story.seen.villageElderDecision &&
        !hasFullGame
      );
    },
    
    timeProbability: 5,
    title: "The Time Has Come",
    message:
      "The village elder returns, his expression grave. 'The time has come,' he says. 'You have taken your first steps on a long and unforgiving path. What lies ahead is deeper, darker, and more demanding. Decide now whether you will continue this journey.'",
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
