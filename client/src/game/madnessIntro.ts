import type { GameState } from "@shared/schema";
import { getTotalMadness } from "@/game/rules/effectsCalculation";

/** First Madness band where work slows and the warning should land. */
export const MADNESS_WARNING_MIN = 10;

/**
 * Ladder beats that already mean this save met Madness before the warning
 * existed. A later climb back to 10 should not introduce it again.
 */
const PRIOR_MADNESS_LADDER_FLAGS = [
  "whisperingVoices",
  "watchingChildren",
  "shadowsMove",
  "villagerStares",
  "bloodInWater",
  "facesInWalls",
  "wrongVillagers",
  "skinCrawling",
  "creatureInHut",
  "wrongReflections",
  "villagersStareAtSky",
  "monolithDemand",
  "humanSacrificeDemand",
] as const;

export function isMadnessWarningSeen(
  state: Pick<GameState, "events">,
): boolean {
  return Boolean(state.events?.madnessWarning);
}

/** True when this save was already in the Madness ladder before the warning existed. */
export function hasPriorMadnessWarningExposure(state: GameState): boolean {
  if (getTotalMadness(state) >= MADNESS_WARNING_MIN) return true;
  const events = state.events;
  if (!events) return false;
  return PRIOR_MADNESS_LADDER_FLAGS.some((flag) => Boolean(events[flag]));
}

/**
 * Mark legacy / mid-run saves so the warning does not fire the first time
 * they load after this feature ships.
 */
export function migrateMadnessWarningSeenOnLoad(
  state: GameState,
): Partial<GameState> | null {
  if (isMadnessWarningSeen(state)) return null;
  if (!hasPriorMadnessWarningExposure(state)) return null;
  return {
    events: {
      ...state.events,
      madnessWarning: true,
    },
  };
}
