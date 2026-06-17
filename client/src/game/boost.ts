import type { GameState } from "@shared/schema";
import type { LogEntry } from "@/game/rules/events";

export const BOOST_RESOURCE_BONUS = {
  wood: 5000,
  stone: 5000,
  food: 2000,
  torch: 100,
  iron: 1000,
  steel: 500,
  gold: 5000,
} as const;

export const BOOST_APPLIED_LOG_KEY = "boostApplied";
export const BOOST_APPLIED_LOG_MESSAGE = "Boost has been applied";

export function canApplySaveBoost(state: GameState): boolean {
  return state.flags.gameStarted && !state.boostApplied;
}

export function applySaveBoost(state: GameState): {
  resources: GameState["resources"];
  logEntry: LogEntry;
} {
  const resources = { ...state.resources };
  for (const [key, amount] of Object.entries(BOOST_RESOURCE_BONUS)) {
    const resourceKey = key as keyof typeof BOOST_RESOURCE_BONUS;
    resources[resourceKey] = (resources[resourceKey] || 0) + amount;
  }

  return {
    resources,
    logEntry: {
      id: `boost-applied-${Date.now()}`,
      logKey: BOOST_APPLIED_LOG_KEY,
      message: BOOST_APPLIED_LOG_MESSAGE,
      timestamp: Date.now(),
      type: "system",
    },
  };
}
