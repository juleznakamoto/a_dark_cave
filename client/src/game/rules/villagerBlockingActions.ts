import type { GameState } from "@shared/schema";
import { getGameActions } from "./actionsRegistry";
import { shouldShowAction } from "./index";

/**
 * Saved game state plus the live execution timer. That timer is not part of
 * the persisted schema, so a bare `GameState` cannot show an expedition that
 * is already running.
 */
export type VillagerBlockingState = GameState & {
  executionStartTimes: Record<string, number>;
};

/**
 * True when a button that locks free villagers for its duration is on screen
 * or already running. The village "on a mission" row stays hidden until that
 * mechanic exists. The free-villager ("available") row is always shown.
 */
export function hasVisibleVillagerBlockingAction(
  state: VillagerBlockingState,
): boolean {
  const actions = getGameActions();
  const locked = state.expeditionVillagers ?? {};
  const running = state.executionStartTimes;
  for (const actionId in actions) {
    const required = actions[actionId]?.expeditionVillagersRequired?.(state) ?? 0;
    if (!(required > 0)) continue;
    const inProgress =
      (locked[actionId] ?? 0) > 0 || running[actionId] != null;
    if (shouldShowAction(actionId, state) || inProgress) {
      return true;
    }
  }
  return false;
}
