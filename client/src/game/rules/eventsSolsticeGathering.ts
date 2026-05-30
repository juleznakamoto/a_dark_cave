import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

const MAX_TIER = 20;
const SOLSTICE_DURATION_MS = 10 * 60 * 1000;

function getGoldCost(tier: number): number {
  return Math.min(25 * tier, 25 * MAX_TIER);
}

function getFoodCost(tier: number): number {
  return 250 * tier;
}

export const solsticeGatheringEvent: GameEvent = {
  id: "solsticeGathering",
  i18nVars: (state: GameState) => {
    const tier = state.solsticeState?.tier ?? 1;
    return {
      goldCost: getGoldCost(tier),
      foodCost: getFoodCost(tier),
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

    return (state.buildings.woodenHut || 0) >= 3;
  },

  timeProbability: 40,
  cooldownPercent: 0.65,
  priority: 3,
  repeatable: true,
  showAsTimedTab: true,
  timedTabDuration: 3 * 60 * 1000,
  choices: [
    {
      id: "hostSolstice",
      effect: (state: GameState) => {
        const tier = state.solsticeState?.tier ?? 1;
        const goldCost = getGoldCost(tier);
        const foodCost = getFoodCost(tier);

        const nextTier = Math.min(tier + 1, MAX_TIER);
        const activationsCount =
          (state.solsticeState?.activationsCount ?? 0) + 1;
        const endTime = Date.now() + SOLSTICE_DURATION_MS;

        return {
          resources: {
            ...state.resources,
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
