import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

const MAX_TIER = 20;
const SOLSTICE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function getGoldCost(tier: number): number {
  return Math.min(25 * tier, 25 * MAX_TIER);
}

function getFoodCost(tier: number): number {
  return 250 * tier;
}

export const solsticeGatheringEvent: GameEvent = {
  id: "solsticeGathering",
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

  timeProbability: 0.045,
  cooldownPercent: 0.75,
  title: "Solstice Gathering",
  message:
    "The villagers propose a gathering to mark the longest night of the year. Fires will be lit, food prepared, and games held. Travelers may come, drawn by the light.",
  priority: 3,
  repeatable: true,
  showAsTimedTab: true,
  timedTabDuration: 3 * 60 * 1000, // 3 minutes
  choices: [
    {
      id: "hostSolstice",
      label: "Host gathering",
      cost: (state: GameState) => {
        const tier = state.solsticeState?.tier ?? 1;
        const goldCost = getGoldCost(tier);
        const foodCost = getFoodCost(tier);
        return `${goldCost} gold, ${foodCost} food`;
      },
      effect: (
        state: GameState,
      ): Partial<GameState> & { _logMessage?: string } => {
        const tier = state.solsticeState?.tier ?? 1;
        const goldCost = getGoldCost(tier);
        const foodCost = getFoodCost(tier);

        if (state.resources.gold < goldCost) {
          return {
            _logMessage: "You don't have enough gold for the gathering.",
          };
        }

        if (state.resources.food < foodCost) {
          return {
            _logMessage: "You don't have enough food for the gathering.",
          };
        }

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
          _logMessage:
            "The fires burn and laughter breaks the darkness for a time. By dawn, many visitors linger, considering staying.",
        };
      },
    },
    {
      id: "refuseSolstice",
      label: "Refuse",
      effect: (
        state: GameState,
      ): Partial<GameState> & { _logMessage?: string } => {
        return {
          _logMessage:
            "You decline. The night passes without cheer, warmth, or laughter.",
        };
      },
    },
  ],
  fallbackChoice: {
    id: "doNothing",
    label: "No Decision Made",
    effect: (
      state: GameState,
    ): Partial<GameState> & { _logMessage?: string } => {
      return {
        _logMessage:
          "You decline. The night passes without cheer, warmth, or laughter.",
      };
    },
  },
};

export const solsticeGatheringEvents: Record<string, GameEvent> = {
  solsticeGathering: solsticeGatheringEvent,
};
