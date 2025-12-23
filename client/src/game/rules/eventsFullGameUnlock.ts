
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const fullGameUnlockEvents: Record<string, GameEvent> = {
  firstElderWarning: {
    id: "firstElderWarning",
    condition: (state: GameState) => {
      return state.BTP === 1 &&
        state.buildings.woodenHut >= 2 &&
        state.current_population >= 4 &&
        !state.story.seen.firstElderWarning;
    },
    triggerType: "time",
    timeProbability: 5,
    title: "The Elder's Words",
    message: "An older villager approaches you with a weathered face and knowing eyes. 'You have made your first experiences in this cruel world,' he says quietly. 'At some point, you will have to decide if you want to face what will come.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 3,
    },
    repeatable: false,
    choices: [
      {
        id: "listen",
        label: "Listen carefully",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                firstElderWarning: true,
              },
            },
            _logMessage:
              "You listen to the elder's words. There is a weight to them that settles in your chest. He nods gravely and walks away, leaving you with the echo of his warning.",
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
        key => (key === 'full_game' || key.startsWith('purchase-full_game-')) && state.activatedPurchases?.[key]
      );
      return state.BTP === 1 &&
        state.buildings.darkEstate >= 1 &&
        !state.story.seen.villageElderNotice &&
        !hasFullGame;
    },
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
    condition: (state: GameState) => {
      // Check if full_game has been purchased
      const hasFullGame = Object.keys(state.activatedPurchases || {}).some(
        key => (key === 'full_game' || key.startsWith('purchase-full_game-')) && state.activatedPurchases?.[key]
      );
      return state.BTP === 1 &&
        state.story.seen.villageElderNotice &&
        state.books.book_of_trials &&
        state.books.book_of_ascension &&
        !state.story.seen.villageElderDecision &&
        !hasFullGame;
    },
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
          // Open the full game purchase dialog
          setTimeout(() => {
            const { useGameStore } = require('@/game/state');
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
            _logMessage:
              "The elder looks at you, understanding the weight of the choice before you, then departs into the gathering dusk.",
          };
        },
      },
    ],
  },
};
