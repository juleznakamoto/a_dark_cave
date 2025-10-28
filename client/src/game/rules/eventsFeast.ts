
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

interface FeastConfig {
  level: number;
  woodenHuts?: number;
  stoneHuts?: number;
  foodCost: number;
}

const feastConfigs: FeastConfig[] = [
  { level: 1, woodenHuts: 3, foodCost: 100 },
  { level: 2, woodenHuts: 5, foodCost: 250 },
  { level: 3, woodenHuts: 7, foodCost: 500 },
  { level: 4, woodenHuts: 9, foodCost: 1000 },
  { level: 5, stoneHuts: 1, foodCost: 1500 },
  { level: 6, stoneHuts: 3, foodCost: 2000 },
  { level: 7, stoneHuts: 5, foodCost: 2500 },
  { level: 8, stoneHuts: 7, foodCost: 2500 },
  { level: 9, stoneHuts: 9, foodCost: 5000 },
];

function createFeastEvent(config: FeastConfig): GameEvent {
  const { level, woodenHuts, stoneHuts, foodCost } = config;
  const eventId = `feast${level}`;

  return {
    id: eventId,
    condition: (state: GameState) => {
      // Check if previous feast was accepted (or if this is the first feast)
      if (state.feastState.lastAcceptedLevel < level - 1) {
        return false;
      }

      // Check if this feast was already triggered
      if (state.triggeredEvents?.[eventId]) {
        return false;
      }

      // Check building requirements
      if (woodenHuts !== undefined) {
        return state.buildings.woodenHut >= woodenHuts;
      }
      if (stoneHuts !== undefined) {
        return state.buildings.stoneHut >= stoneHuts;
      }
      return false;
    },
    triggerType: "resource",
    timeProbability: 0.08,
    title: "Village Feast",
    message: `The villagers propose organizing a grand feast to celebrate recent prosperity and boost morale. They believe it will heighten productivity for days to come. The feast will require ${foodCost} food.`,
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "makeFeast",
        label: `Make feast (${foodCost} food)`,
        effect: (state: GameState) => {
          if (state.resources.food < foodCost) {
            return {
              _logMessage: "You don't have enough food for the feast.",
            };
          }

          const feastDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
          const endTime = Date.now() + feastDuration;

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - foodCost,
            },
            feastState: {
              isActive: true,
              endTime: endTime,
              lastAcceptedLevel: level,
            },
            _logMessage: `The village erupts in celebration! A magnificent feast is held, bringing joy and renewed vigor to all. For the next 10 minutes, all production from villagers is doubled.`,
          };
        },
      },
      {
        id: "noFeast",
        label: "Make no feast",
        effect: (state: GameState) => {
          return {
            _logMessage: "You decline the feast proposal. The villagers accept your decision with understanding, though some look disappointed.",
          };
        },
      },
    ],
  };
}

// Generate all feast events
export const feastEvents: Record<string, GameEvent> = {};
feastConfigs.forEach(config => {
  const event = createFeastEvent(config);
  feastEvents[event.id] = event;
});
