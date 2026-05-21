import { formatNumber } from "@/lib/utils";
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
  {
    level: 4,
    woodenHuts: 5,
    foodCost: 150,
    woodReward: 1500,
    betrayalChance: 0.3333,
  },
  {
    level: 5,
    woodenHuts: 6,
    foodCost: 200,
    woodReward: 2000,
    betrayalChance: 0.5,
  },
  {
    level: 6,
    woodenHuts: 7,
    foodCost: 250,
    woodReward: 2500,
    betrayalChance: 1.0,
    isLastEvent: true,
  },
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
    i18nKey: "woodcutter",
    i18nVars: {
      level,
      foodCost: formatNumber(foodCost),
      woodReward: formatNumber(woodReward),
    },
    condition: (state: GameState) => {
      // Check if woodcutter event is currently active (timed tab is showing)
      if (
        state.woodcutterState?.isActive &&
        state.woodcutterState.endTime > Date.now()
      ) {
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
      if (
        state.story.seen[
          `woodcutter${level}Accepted` as keyof typeof state.story.seen
        ]
      ) {
        return false;
      }

      // For first event, just check building requirement
      if (level === 1) {
        const canTrigger =
          state.buildings.woodenHut >= woodenHuts && state.resources.food > 25;
        return canTrigger;
      }

      // For subsequent events, check if previous event was met
      if (
        !state.story.seen[
          `woodcutter${level - 1}Met` as keyof typeof state.story.seen
        ]
      ) {
        return false;
      }

      // Check building requirements
      const canTrigger = state.buildings.woodenHut >= woodenHuts;
      return canTrigger;
    },

    timeProbability: 20,
    effect: (state: GameState) => {
      return {
        woodcutterState: {
          isActive: true,
          endTime: Date.now() + 3 * 60 * 1000,
        },
      };
    },
    message: `level${level}`,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    skipEventLog: true, // Don't add to event log, only show in timed tab
    choices: [
      {
        id: "acceptServices",
        effect: (state: GameState) => {
          if (state.resources.food < foodCost) {
            return {
              _logMessageKey: "outcome0",
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
                _logMessageKey: isLastEvent
                  ? "betrayLast"
                  : level === 5
                    ? "betrayLevel5"
                    : "betray",
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
            _logMessageKey: `successLevel${level}`,
          };
        },
      },
      {
        id: "denyServices",
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
              _logMessageKey: "denyLastUneasy",
            };
          }

          return {
            woodcutterState: {
              isActive: false,
              endTime: 0,
            },
            _logMessageKey: `denyLevel${level}`,
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeExpired",
      effect: (state: GameState) => {
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
            _logMessageKey: "timeoutLast",
          };
        }

        return {
          woodcutterState: {
            isActive: false,
            endTime: 0,
          },
          _logMessageKey: `timeoutLevel${level}`,
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
