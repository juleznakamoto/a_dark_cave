import type { EventChoice, GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";
import { isSteamDesktopEditionActive } from "@/lib/edition";
import { createJugglerGreatFeastActivation } from "@shared/shopItems";

interface FeastConfig {
  level: number;
  woodenHuts?: number;
  stoneHuts?: number;
  secondWaveVictory?: boolean;
  fourthWaveVictory?: boolean;
  sixthWaveVictory?: boolean;
  eighthWaveVictory?: boolean;
  foodCost: number;
  /** When set, Steam uses the juggler Great Feast for this ladder step. */
  goldCost?: number;
  /** Message variant for the juggler visit (`first` / `return`). */
  jugglerVisit?: "first" | "return";
}

const FEAST_DURATION_MS = 10 * 60 * 1000;
const BTP_FEAST_BONUS_MS = 5 * 60 * 1000;
const RECURRING_FEAST_LEVEL = 11;
const RECURRING_FEAST_FOOD_COST = 20000;
/** Average minutes between recurring feast offers after the ladder is complete. */
const RECURRING_FEAST_TIME_PROBABILITY = 90;
const FEAST_COOLDOWN_PERCENT = 0.4;

const feastConfigs: FeastConfig[] = [
  { level: 1, woodenHuts: 2, foodCost: 100 },
  { level: 2, woodenHuts: 4, foodCost: 250 },
  { level: 3, woodenHuts: 6, foodCost: 500 },
  {
    level: 4,
    woodenHuts: 8,
    foodCost: 1000,
    goldCost: 100,
    jugglerVisit: "first",
  },
  { level: 5, stoneHuts: 1, foodCost: 2500 },
  { level: 6, stoneHuts: 5, foodCost: 5000 },
  { level: 7, stoneHuts: 9, foodCost: 7500 },
  {
    level: 8,
    secondWaveVictory: true,
    foodCost: 10000,
    goldCost: 1000,
    jugglerVisit: "return",
  },
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

function feastLadderCondition(config: FeastConfig, state: GameState): boolean {
  if (!state.flags?.forestUnlocked) {
    return false;
  }
  if (isFeastBlockedByActiveBuff(state)) {
    return false;
  }
  if (state.feastState.lastAcceptedLevel < config.level - 1) {
    return false;
  }
  if (state.feastState.lastAcceptedLevel >= config.level) {
    return false;
  }
  return meetsFeastUnlock(config, state);
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

function buildJugglerGreatFeastActivation(
  state: GameState,
  foodCost: number,
  goldCost: number,
  lastAcceptedLevel: number,
  eventId: string,
) {
  return {
    resources: {
      ...state.resources,
      food: state.resources.food - foodCost,
      gold: state.resources.gold - goldCost,
    },
    feastState: {
      ...state.feastState,
      lastAcceptedLevel,
    },
    greatFeastState: createJugglerGreatFeastActivation(),
    triggeredEvents: {
      ...(state.triggeredEvents || {}),
      [eventId]: true,
    },
    _logMessageKey: "outcome1",
  };
}

function villageFeastChoices(
  foodCost: number,
  level: number,
  eventId: string,
): EventChoice[] {
  return [
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
  ];
}

function jugglerGreatFeastChoices(
  foodCost: number,
  goldCost: number,
  level: number,
  eventId: string,
): EventChoice[] {
  return [
    {
      id: "makeGreatFeast",
      effect: (state: GameState) =>
        buildJugglerGreatFeastActivation(
          state,
          foodCost,
          goldCost,
          level,
          eventId,
        ),
    },
    {
      id: "noFeast",
      effect: () => ({
        _logMessageKey: "outcome2",
      }),
    },
  ];
}

function createVillageFeastEvent(config: FeastConfig): GameEvent {
  const { level, foodCost } = config;
  const eventId = `feast${level}`;
  const formattedFoodCost = formatNumber(foodCost);

  return {
    id: eventId,
    i18nKey: "feast",
    i18nVars: { foodCost: formattedFoodCost },
    condition: (state: GameState) => feastLadderCondition(config, state),
    timeProbability: 20,
    cooldownPercent: FEAST_COOLDOWN_PERCENT,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    choices: villageFeastChoices(foodCost, level, eventId),
    fallbackChoice: {
      id: "doNothing",
      effect: () => ({
        _logMessageKey: "outcome3",
      }),
    },
  };
}

/**
 * Ladder slots 4 and 8: Steam desktop uses the juggler Great Feast (food + gold);
 * web and portal builds use a normal Village Feast (food only).
 */
function createFeastSlotEvent(config: FeastConfig): GameEvent {
  const { level, foodCost, goldCost = 0, jugglerVisit = "first" } = config;
  const eventId = `feast${level}`;
  const formattedFoodCost = formatNumber(foodCost);
  const formattedGoldCost = formatNumber(goldCost);

  return {
    id: eventId,
    i18nKey: () =>
      isSteamDesktopEditionActive() ? "jugglerGreatFeast" : "feast",
    i18nVars: () =>
      isSteamDesktopEditionActive()
        ? { foodCost: formattedFoodCost, goldCost: formattedGoldCost }
        : { foodCost: formattedFoodCost },
    message: () =>
      isSteamDesktopEditionActive() ? jugglerVisit : "default",
    condition: (state: GameState) => feastLadderCondition(config, state),
    timeProbability: 20,
    cooldownPercent: FEAST_COOLDOWN_PERCENT,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    choices: () =>
      isSteamDesktopEditionActive()
        ? jugglerGreatFeastChoices(foodCost, goldCost, level, eventId)
        : villageFeastChoices(foodCost, level, eventId),
    fallbackChoice: {
      id: "doNothing",
      effect: () => ({
        _logMessageKey: "outcome3",
      }),
    },
  };
}

function createFeastEvent(config: FeastConfig): GameEvent {
  if (config.jugglerVisit !== undefined) {
    return createFeastSlotEvent(config);
  }
  return createVillageFeastEvent(config);
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
  cooldownPercent: FEAST_COOLDOWN_PERCENT,
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
