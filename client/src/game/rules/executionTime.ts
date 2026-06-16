import { GameState } from "@shared/schema";
import { ACTION_TO_UPGRADE_KEY, getUpgradeLevel } from "@/game/buttonUpgrades";
import {
  getBuilderBuildTimeReduction,
  getBuilderLevel,
  isConstructionQueueEnabled,
} from "@/game/constructionQueueSlots";
import { getActionBonuses } from "./effectsCalculation";
import { getGameActions } from "./actionsRegistry";
import { getNextBuildingLevel } from "./villageBuildActions";

const CRAFT_UPGRADE_ACTIONS = [
  "craftTorches",
  "craftBoneTotems",
  "craftLeatherTotems",
];

type ExecutionTimeDefinition =
  | number
  | Record<number, number>
  | ((state: GameState) => number);

/**
 * Resolve the base (pre-reduction) execution time for an action. Supports a
 * fixed number, a `(state) => number` function, or a per-level record keyed by
 * building level (same convention as `cost`, resolved via `getNextBuildingLevel`).
 */
function resolveBaseExecutionTime(
  executionTime: ExecutionTimeDefinition,
  actionId: string,
  state: GameState,
): number {
  if (typeof executionTime === "number") return executionTime;
  if (typeof executionTime === "function") return executionTime(state);

  const level = getNextBuildingLevel(actionId, state);
  if (executionTime[level] != null) return executionTime[level];

  // Fallback for out-of-range levels (e.g. maxed): closest defined level <=
  // target, otherwise the lowest defined level.
  const levels = Object.keys(executionTime)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  if (levels.length === 0) return 0;
  const fallbackLevel =
    [...levels].reverse().find((l) => l <= level) ?? levels[0];
  return executionTime[fallbackLevel] ?? 0;
}

/** Get execution time in seconds for an action (0 = no execution time, instant) */
export function getExecutionTime(actionId: string, state: GameState): number {
  const action = getGameActions()[actionId];
  if (!action?.executionTime) return 0;
  let baseTime = resolveBaseExecutionTime(
    action.executionTime as ExecutionTimeDefinition,
    actionId,
    state,
  );

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
  let adjustedTime = baseTime - executionTimeReduction;

  if (actionId.startsWith("build") && isConstructionQueueEnabled(state)) {
    const builderReduction = getBuilderBuildTimeReduction(getBuilderLevel(state));
    adjustedTime = baseTime * (1 - builderReduction) - executionTimeReduction;
  }

  let finalTime = Math.max(1, adjustedTime);

  if (state.devMode && actionId.startsWith("build")) {
    finalTime = Math.max(1, finalTime * 0.1);
  }

  return finalTime;
}
