import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

interface WoodcutterConfig {
  level: number;
  woodenHuts: number;
  foodCost: number;
  woodReward: number;
  betrayalChance?: number;
  isLastEvent?: boolean;
}

const woodcutterConfigs: WoodcutterConfig[] = [
  { level: 1, woodenHuts: 2, foodCost: 25, woodReward: 200 },
  { level: 2, woodenHuts: 3, foodCost: 50, woodReward: 500 },
  { level: 3, woodenHuts: 4, foodCost: 100, woodReward: 1000 },
  { level: 4, woodenHuts: 5, foodCost: 150, woodReward: 1500, betrayalChance: 0.3333 },
  { level: 5, woodenHuts: 6, foodCost: 200, woodReward: 2000, betrayalChance: 0.5 },
  { level: 6, woodenHuts: 7, foodCost: 250, woodReward: 0, betrayalChance: 1.0, isLastEvent: true },
];

function createWoodcutterEvent(config: WoodcutterConfig): GameEvent {
  const {
    level,
    woodenHuts,
    foodCost,
    woodReward,
    betrayalChance,
    isLastEvent,
  } = config;
  const eventId = `woodcutter${level}`;

  return {
    id: eventId,
    condition: (state: GameState) => {
      // Check if woodcutter event is currently active (timed tab is showing)
      if (state.woodcutterState?.isActive && state.woodcutterState.endTime > Date.now()) {
        return false;
      }

      // Check if woodcutter was betrayed
      if (state.story.seen.woodcutterBetrayed) {
        return false;
      }

      // Check if woodcutter storyline ended
      if (state.story.seen.woodcutterEnded) {
        return false;
      }

      // Check if this specific event was already accepted
      if (state.story.seen[`woodcutter${level}Accepted` as keyof typeof state.story.seen]) {
        return false;
      }

      // For first event, just check building requirement
      if (level === 1) {
        const canTrigger = state.buildings.woodenHut >= woodenHuts && state.resources.food > 25;
        return canTrigger;
      }

      // For subsequent events, check if previous event was met
      if (!state.story.seen[`woodcutter${level - 1}Met` as keyof typeof state.story.seen]) {
        return false;
      }

      // Check building requirements
      const canTrigger = state.buildings.woodenHut >= woodenHuts;
      return canTrigger;
    },

    timeProbability: 0.015,
    title: level === 1 ? "The Woodcutter" :
           level === 2 ? "The Woodcutter Returns" :
           level === 3 ? "The Woodcutter's Offer" :
           level === 4 ? "The Woodcutter's Ambitious Plan" :
           level === 5 ? "The Woodcutter's Grand Proposal" :
           "The Woodcutter's Offer",
    effect: (state: GameState) => {
      return {
        woodcutterState: {
          isActive: true,
          endTime: Date.now() + (3 * 60 * 1000),
        },
      };
    },
    message: level === 1 ?
      "A muscular man with a large axe approaches the village. He flexes his arms 'I can cut trees like no other,' he boasts. 'Give me food, and I'll bring wood.'" :
      level === 2 ?
      "The woodcutter returns, his axe gleaming in the sun. 'Your village grows well,' he observes. 'I can bring you more wood. What do you say?'" :
      level === 3 ?
      "The woodcutter approaches again 'I see your village continues to thrive,' he says with a grin. 'I can bring you more wood if you pay for it.'" :
      level === 4 ?
      "The woodcutter arrives once more, 'Do you want to use my services once more?,' he asks.'" :
      level === 5 ?
      "The woodcutter appears with a confident smile. 'How about we make one more deal?'" :
      "The woodcutter returns to the village, 'Do you want to use my services once more?,' he asks.'",
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    skipEventLog: true, // Don't add to event log, only show in timed tab
    choices: [
      {
        id: "acceptServices",
        label: "Pay food",
        cost: `${foodCost} food`,
        effect: (state: GameState) => {
          if (state.resources.food < foodCost) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          // Handle betrayal chance if it exists
          if (betrayalChance !== undefined) {
            const isBetrayedNow = Math.random() < betrayalChance;

            if (isBetrayedNow) {
              return {
                resources: {
                  ...state.resources,
                  food: state.resources.food - foodCost,
                },
                story: {
                  ...state.story,
                  seen: {
                    ...state.story.seen,
                    woodcutterBetrayed: true,
                    [`woodcutter${level}Accepted`]: true,
                  },
                },
                _logMessage: isLastEvent ?
                  "You hand over the food. The woodcutter grins as he leaves towards the forest. You wait, but he never returns. It seems you got betrayed." :
                  level === 5 ?
                  "You hand over the food. The woodcutter promises to return the same day. But he never does. It seems you got betrayed." :
                  "You hand over the food, but days pass with no sign of the woodcutter. It seems you got betrayed.",
              };
            }
          }

          // Successful transaction
          return {
            resources: {
              ...state.resources,
              food: state.resources.food - foodCost,
              wood: state.resources.wood + woodReward,
            },
            woodcutterState: {
              isActive: false,
              endTime: 0,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutterMet: true,
                [`woodcutter${level}Met`]: true,
                [`woodcutter${level}Accepted`]: true,
              },
            },
            _logMessage: level === 1 ?
              "The woodcutter takes the food and heads into the forest. By evening, he returns with the promised 100 wood stacked neatly at the village's edge." :
              level === 2 ?
              "The woodcutter takes the food and disappears into the forest. By nightfall, he returns with a large pile of 250 wood." :
              level === 3 ?
              "The woodcutter takes the food and ventures deep into the forest. He returns with an impressive haul of 750 wood." :
              level === 4 ?
              "The woodcutter takes the food and spends the afternoon in the forest. He returns with an enormous pile of 1500 wood." :
              `The woodcutter takes the food and within the same day he delivers a massive stockpile of 2500 wood to the village.`,
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          // Special handling for last event
          if (isLastEvent) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  woodcutterEnded: true,
                },
              },
              _logMessage:
                "Something about his demeanor makes you uneasy. You refuse the deal. The woodcutter's smile fades, and he leaves without a word.",
            };
          }

          return {
            woodcutterState: {
              isActive: false,
              endTime: 0,
            },
            _logMessage: level === 1 ?
              "You decline his offer. The woodcutter shrugs and walks away into the forest." :
              level === 2 ?
              "You decline his offer. The woodcutter nods and departs without complaint." :
              level === 3 ?
              "You turn down his offer. He shrugs and walks back into the woods." :
              level === 4 ?
              "You decline his ambitious offer. The woodcutter looks disappointed but accepts your decision." :
              "You refuse the deal. The woodcutter frowns but doesn't argue.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "denyServices",
      label: "Time Expired",
      effect: (state: GameState) => {
        console.log('[WOODCUTTER] Fallback choice (denyServices) triggered - timer expired for level:', level);
        
        // Special handling for last event
        if (isLastEvent) {
          return {
            woodcutterState: {
              isActive: false,
              endTime: 0,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutterEnded: true,
              },
            },
            _logMessage:
              "Your indecision frustrates the woodcutter. He shakes his head and walks away into the forest.",
          };
        }

        return {
          woodcutterState: {
            isActive: false,
            endTime: 0,
          },
          _logMessage: level === 1 ?
            "Your indecision frustrates the woodcutter. He shrugs and walks away into the forest." :
            level === 2 ?
            "Your indecision frustrates the woodcutter. He nods and departs without complaint." :
            level === 3 ?
            "Your indecision frustrates the woodcutter. He shrugs and walks back into the woods." :
            level === 4 ?
            "Your indecision frustrates the woodcutter. He looks disappointed but accepts and leaves." :
            "Your indecision frustrates the woodcutter. He frowns and walks away.",
        };
      },
    },
  };
}

// Generate all woodcutter events
export const woodcutterEvents: Record<string, GameEvent> = {};
woodcutterConfigs.forEach((config) => {
  const event = createWoodcutterEvent(config);
  woodcutterEvents[event.id] = event;
});