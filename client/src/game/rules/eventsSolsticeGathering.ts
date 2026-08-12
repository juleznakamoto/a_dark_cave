import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";

const MAX_TIER = 20;
const SOLSTICE_DURATION_MS = 10 * 60 * 1000;
const FIRST_TIER_WOOD_COST = 250;

function getWoodCost(tier: number): number {
  return tier === 1 ? FIRST_TIER_WOOD_COST : 0;
}

function getGoldCost(tier: number): number {
  if (tier <= 1) return 0;
  return Math.min(25 * tier, 25 * MAX_TIER);
}

function getFoodCost(tier: number): number {
  return 250 * tier;
}

export const solsticeGatheringEvent: GameEvent = {
  id: "solsticeGathering",
  i18nVars: (state: GameState) => {
    const tier = state.solsticeState?.tier ?? 1;
    const foodCost = getFoodCost(tier);
    if (tier === 1) {
      return {
        costVariant: "wood",
        woodCost: getWoodCost(tier),
        foodCost,
      };
    }
    return {
      costVariant: "gold",
      goldCost: getGoldCost(tier),
      foodCost,
    };
  },
  condition: (state: GameState) => {
    if (!state.flags?.forestUnlocked) {
      return false;
    }

    if (
      state.solsticeState?.isActive &&
      state.solsticeState.endTime > Date.now()
    ) {
      return false;
    }

    return (state.buildings.woodenHut || 0) >= 4;
  },

  timeProbability: (state: GameState) =>
    (state.solsticeState?.activationsCount ?? 0) === 0 ? 10 : 45,
  cooldownPercent: 0.65,
  priority: 3,
  repeatable: true,
  showAsTimedTab: true,
  timedTabDuration: 4 * 60 * 1000,
  choices: [
    {
      id: "hostSolstice",
      effect: (state: GameState) => {
        const tier = state.solsticeState?.tier ?? 1;
        const woodCost = getWoodCost(tier);
        const goldCost = getGoldCost(tier);
        const foodCost = getFoodCost(tier);

        const nextTier = Math.min(tier + 1, MAX_TIER);
        const activationsCount =
          (state.solsticeState?.activationsCount ?? 0) + 1;
        const endTime = Date.now() + SOLSTICE_DURATION_MS;

        return {
          resources: {
            ...state.resources,
            wood: state.resources.wood - woodCost,
            gold: state.resources.gold - goldCost,
            food: state.resources.food - foodCost,
          },
          solsticeState: {
            isActive: true,
            endTime,
            tier: nextTier,
            activationsCount,
          },
          triggeredEvents: {
            ...(state.triggeredEvents || {}),
            solsticeGathering: true,
          },
          _logMessageKey: "outcome2",
        };
      },
    },
    {
      id: "refuseSolstice",
      effect: () => ({
        _logMessageKey: "outcome3",
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

export const solsticeGatheringEvents: Record<string, GameEvent> = {
  solsticeGathering: solsticeGatheringEvent,
};
