import { GameState } from "@shared/schema";
import { ACTION_TO_UPGRADE_KEY, getUpgradeLevel } from "@/game/buttonUpgrades";
import { getActionBonuses } from "./effectsCalculation";
import { getGameActions } from "./actionsRegistry";

const CRAFT_UPGRADE_ACTIONS = [
  "craftTorches",
  "craftBoneTotems",
  "craftLeatherTotems",
];

/** Get execution time in seconds for an action (0 = no execution time, instant) */
export function getExecutionTime(actionId: string, state: GameState): number {
  const action = getGameActions()[actionId];
  if (!action?.executionTime) return 0;
  let baseTime =
    typeof action.executionTime === "number"
      ? action.executionTime
      : action.executionTime(state);

  // Craft actions: at upgrade level 10 with book_of_ascension, execution time is halved
  if (
    CRAFT_UPGRADE_ACTIONS.includes(actionId) &&
    state.books?.book_of_ascension
  ) {
    const upgradeKey = ACTION_TO_UPGRADE_KEY[actionId];
    if (upgradeKey && getUpgradeLevel(upgradeKey, state) === 10) {
      return Math.max(1, baseTime * 0.5);
    }
  }

  const { executionTimeReduction } = getActionBonuses(actionId, state);
  return Math.max(1, baseTime - executionTimeReduction);
}
