import type { GameState } from "@shared/schema";
import type { LogEntry } from "@/game/rules/eventTypes";
import { isVillagerFoodUpkeepActive } from "@/game/population";

export const VILLAGERS_FREEZING_LOG_KEY = "villagersFreezing";
export const VILLAGERS_STARVING_LOG_KEY = "villagersStarving";
export const VILLAGERS_FREEZING_LOG_EN = "The villagers are freezing.";
export const VILLAGERS_STARVING_LOG_EN = "The villagers are starving.";

type ScarcityState = Pick<GameState, "current_population" | "resources" | "story">;

/**
 * One system log per empty survival resource, after a production cycle has settled.
 * Food only counts once villagers eat (first hunt). Wood matches the freezing death check.
 */
export function buildVillagerScarcityLogEntries(
  state: ScarcityState,
  now = Date.now(),
): LogEntry[] {
  if ((state.current_population ?? 0) <= 0) return [];

  const entries: LogEntry[] = [];
  const wood = state.resources?.wood ?? 0;
  const food = state.resources?.food ?? 0;

  if (wood <= 0) {
    entries.push({
      id: `villagers-freezing-${now}`,
      message: VILLAGERS_FREEZING_LOG_EN,
      logKey: VILLAGERS_FREEZING_LOG_KEY,
      timestamp: now,
      type: "system",
    });
  }

  if (isVillagerFoodUpkeepActive(state) && food <= 0) {
    entries.push({
      id: `villagers-starving-${now}`,
      message: VILLAGERS_STARVING_LOG_EN,
      logKey: VILLAGERS_STARVING_LOG_KEY,
      timestamp: now,
      type: "system",
    });
  }

  return entries;
}
