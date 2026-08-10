import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

interface FeastConfig {
  level: number;
  woodenHuts?: number;
  stoneHuts?: number;
  secondWaveVictory?: boolean;
  fourthWaveVictory?: boolean;
  sixthWaveVictory?: boolean;
  eighthWaveVictory?: boolean;
  foodCost: number;
}

const FEAST_DURATION_MS = 10 * 60 * 1000;
const BTP_FEAST_BONUS_MS = 5 * 60 * 1000;
const RECURRING_FEAST_LEVEL = 11;
const RECURRING_FEAST_FOOD_COST = 20000;
/** Average minutes between recurring feast offers after the ladder is complete. */
const RECURRING_FEAST_TIME_PROBABILITY = 90;

const feastConfigs: FeastConfig[] = [
  { level: 1, woodenHuts: 2, foodCost: 100 },
  { level: 2, woodenHuts: 4, foodCost: 250 },
  { level: 3, woodenHuts: 6, foodCost: 500 },
  { level: 4, woodenHuts: 8, foodCost: 1000 },
  { level: 5, stoneHuts: 1, foodCost: 2500 },
  { level: 6, stoneHuts: 5, foodCost: 5000 },
  { level: 7, stoneHuts: 9, foodCost: 7500 },
  { level: 8, secondWaveVictory: true, foodCost: 10000 },
  { level: 9, fourthWaveVictory: true, foodCost: 12500 },
  { level: 10, sixthWaveVictory: true, foodCost: 15000 },
  { level: 11, eighthWaveVictory: true, foodCost: 20000 },
];

function isFeastBlockedByActiveBuff(state: GameState): boolean {
  if (state.feastState?.isActive && state.feastState.endTime > Date.now()) {
    return true;
  }
  if (
    state.greatFeastState?.isActive &&
    state.greatFeastState.endTime > Date.now()
  ) {
    return true;
  }
  return false;
}

function meetsFeastUnlock(config: FeastConfig, state: GameState): boolean {
  if (config.woodenHuts !== undefined) {
    return state.buildings.woodenHut >= config.woodenHuts;
  }
  if (config.stoneHuts !== undefined) {
    return state.buildings.stoneHut >= config.stoneHuts;
  }
  if (config.secondWaveVictory) {
    return state.story.seen.secondWaveVictory === true;
  }
  if (config.fourthWaveVictory) {
    return state.story.seen.fourthWaveVictory === true;
  }
  if (config.sixthWaveVictory) {
    return state.story.seen.sixthWaveVictory === true;
  }
  if (config.eighthWaveVictory) {
    return state.story.seen.eighthWaveVictory === true;
  }
  return false;
}

function buildFeastActivation(
  state: GameState,
  foodCost: number,
  lastAcceptedLevel: number,
  eventId: string,
) {
  const btpBonus = state.BTP === 1 ? BTP_FEAST_BONUS_MS : 0;
  const endTime = Date.now() + FEAST_DURATION_MS + btpBonus;

  return {
    resources: {
      ...state.resources,
      food: state.resources.food - foodCost,
    },
    feastState: {
      isActive: true,
      endTime,
      lastAcceptedLevel,
    },
    triggeredEvents: {
      ...(state.triggeredEvents || {}),
      [eventId]: true,
    },
    _logMessageKey: "outcome1",
  };
}

function createFeastEvent(config: FeastConfig): GameEvent {
  const { level, foodCost } = config;
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
      if (isFeastBlockedByActiveBuff(state)) {
        return false;
      }
      if (state.feastState.lastAcceptedLevel < level - 1) {
        return false;
      }
      if (state.feastState.lastAcceptedLevel >= level) {
        return false;
      }
      return meetsFeastUnlock(config, state);
    },
    timeProbability: 20,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    choices: [
      {
        id: "makeFeast",
        effect: (state: GameState) =>
          buildFeastActivation(state, foodCost, level, eventId),
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

/** After ladder level 11, feast offers keep returning at a fixed cost. */
const feastRecurringEvent: GameEvent = {
  id: "feastRecurring",
  i18nKey: "feast",
  i18nVars: { foodCost: formatNumber(RECURRING_FEAST_FOOD_COST) },
  condition: (state: GameState) => {
    if (!state.flags?.forestUnlocked) {
      return false;
    }
    if (isFeastBlockedByActiveBuff(state)) {
      return false;
    }
    return state.feastState.lastAcceptedLevel >= RECURRING_FEAST_LEVEL;
  },
  timeProbability: RECURRING_FEAST_TIME_PROBABILITY,
  priority: 3,
  repeatable: true,
  showAsTimedTab: true,
  timedTabDuration: 4 * 60 * 1000,
  choices: [
    {
      id: "makeFeast",
      effect: (state: GameState) =>
        buildFeastActivation(
          state,
          RECURRING_FEAST_FOOD_COST,
          state.feastState.lastAcceptedLevel,
          "feastRecurring",
        ),
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

export const feastEvents: Record<string, GameEvent> = {};
feastConfigs.forEach((config) => {
  const event = createFeastEvent(config);
  feastEvents[event.id] = event;
});
feastEvents[feastRecurringEvent.id] = feastRecurringEvent;
