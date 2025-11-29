
import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";

export const fellowshipEvents: Record<string, GameEvent> = {
  wizardOffer: {
    id: "wizardOffer",
    condition: (state: GameState) =>
      state.buildings.wizardTower >= 1 && !state.fellowship.elder_wizard,
    triggerType: "resource",
    timeProbability: (state: GameState) => {
      return state.story.seen.wizardOfferDeclined ? 60 : 30;
    },
    title: "The Wizard's Offer",
    message: (state: GameState) =>
      state.story.seen.wizardOfferDeclined
        ? "The old wizard approaches again. 'I have reconsidered,' he says with a weary voice. 'The threat you face is dire. For a fair price, I will join you in the war against the foes that emerge from the depths.'"
        : "An old wizard emerges from the tower. 'I have lived long and seen much,' he says with a weary voice. 'The threat you face is dire. For a fair price, I will join you in the war against the foes that emerge from the depths.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "payGold",
        label: "Pay 500 Gold",
        cost: "500 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 500) {
            return {
              _logMessage: "You don't have enough gold.",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 500,
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
            _logMessage:
              "The wizard nods with satisfaction. 'A fair price for my services. I shall defend your people with arcane fire.' He removes his weathered hood, revealing ancient eyes that glow with power. The Elder Wizard has joined your fellowship.",
          };
        },
      },
      {
        id: "refuse",
        label: "Refuse",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                wizardOfferDeclined: true,
              },
            },
            _logMessage:
              "You decline the wizard's offer. He nods with understanding. 'I will remain in my tower, then. Perhaps our paths will cross again when the need is greater,' he says before departing.",
          };
        },
      },
    ],
  },
};
