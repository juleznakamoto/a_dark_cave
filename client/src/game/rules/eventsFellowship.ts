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
    title: "The Wizard's Offer",
    message: (state: GameState) =>
      state.story.seen.wizardOfferDeclined
        ? "The old wizard approaches you again, 'My offer to join you in the fight against the foes from the depths still stands. For a fair price, I will join you.'"
        : "The old wizard approaches you, 'I have lived long and seen much,' he says with a weary voice. 'The threat you face is dire. For a fair price, I will join you in the fight against the foes that emerge from the depths.'",
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    skipEventLog: true,
    fallbackChoice: {
      id: "refuse",
      label: "Time Expired",
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
            "Your indecision frustrates the wizard. He shakes his head. 'I will remain in my tower, then. Perhaps our paths will cross again when the need is greater,' he says before departing.",
        };
      },
    },
    choices: [
      {
        id: "payGold",
        label: "Pay 250 Gold",
        cost: "250 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessage: "You don't have enough gold.",
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
            _logMessage:
              "The wizard nods with satisfaction. 'A fair price for my services. I shall defend your people with arcane fire.' He removes his weathered hood, revealing ancient eyes that glow with fading power. The Elder Wizard has joined your fellowship.",
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
