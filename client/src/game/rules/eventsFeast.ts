import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

interface FeastConfig {
  level: number;
  woodenHuts?: number;
  stoneHuts?: number;
  secondWaveVictory?: number;
  fourthWaveVictory?: number;
  foodCost: number;
}

const feastConfigs: FeastConfig[] = [
  { level: 1, woodenHuts: 2, foodCost: 100 },
  { level: 2, woodenHuts: 4, foodCost: 250 },
  { level: 3, woodenHuts: 6, foodCost: 500 },
  { level: 4, woodenHuts: 8, foodCost: 1000 },
  { level: 5, stoneHuts: 1, foodCost: 2500 },
  { level: 6, stoneHuts: 5, foodCost: 5000 },
  { level: 7, stoneHuts: 9, foodCost: 7500 },
  { level: 8, secondWaveVictory: 1, foodCost: 10000 },
  { level: 9, fourthWaveVictory: 1, foodCost: 15000 },
];

function createFeastEvent(config: FeastConfig): GameEvent {
  const {
    level,
    woodenHuts,
    stoneHuts,
    secondWaveVictory,
    fourthWaveVictory,
    foodCost,
  } = config;
  const eventId = `feast${level}`;
  const formattedFoodCost = formatNumber(foodCost);

  return {
    id: eventId,
    i18nKey: "feast",
    i18nVars: { foodCost: formattedFoodCost },
    condition: (state: GameState) => {
      if (!state.flags?.forestUnlocked) {
        return false;
      }

      if (state.feastState?.isActive && state.feastState.endTime > Date.now()) {
        return false;
      }

      if (
        state.greatFeastState?.isActive &&
        state.greatFeastState.endTime > Date.now()
      ) {
        return false;
      }

      if (state.feastState.lastAcceptedLevel < level - 1) {
        return false;
      }

      if (state.feastState.lastAcceptedLevel >= level) {
        return false;
      }

      if (woodenHuts !== undefined) {
        return state.buildings.woodenHut >= woodenHuts;
      }
      if (stoneHuts !== undefined) {
        return state.buildings.stoneHut >= stoneHuts;
      }
      if (secondWaveVictory !== undefined) {
        return state.story.seen.secondWaveVictory == true;
      }
      if (fourthWaveVictory !== undefined) {
        return state.story.seen.fourthWaveVictory == true;
      }

      return false;
    },

    timeProbability: 20,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000,
    choices: [
      {
        id: "makeFeast",
        effect: (state: GameState) => {
          const baseDuration = 10 * 60 * 1000;
          const btpBonus = state.BTP === 1 ? 5 * 60 * 1000 : 0;
          const feastDuration = baseDuration + btpBonus;
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
            triggeredEvents: {
              ...(state.triggeredEvents || {}),
              [eventId]: true,
            },
            _logMessageKey: "outcome1",
          };
        },
      },
      {
        id: "noFeast",
        effect: () => ({
          _logMessageKey: "outcome2",
        }),
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      effect: () => ({
        _logMessageKey: "outcome3",
      }),
    },
  };
}

export const feastEvents: Record<string, GameEvent> = {};
feastConfigs.forEach((config) => {
  const event = createFeastEvent(config);
  feastEvents[event.id] = event;
});
