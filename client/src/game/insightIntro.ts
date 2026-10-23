import type { GameState } from "@shared/schema";
import type { GameStore } from "@/game/store/types";
import { scheduleInsightIntroDialogWhenClear } from "@/game/store/dialogScheduling";

/** Persisted `story.seen` key: intro already shown (or skipped for legacy saves). */
export const INSIGHT_INTRO_SEEN_KEY = "insightIntroShown";

export function isInsightIntroSeen(state: Pick<GameState, "story">): boolean {
  return Boolean(state.story?.seen?.[INSIGHT_INTRO_SEEN_KEY]);
}

/** True when this save already had Insight before the intro existed. */
export function hasPriorInsightExposure(
  state: Pick<GameState, "resources" | "seenResources">,
): boolean {
  if ((state.resources?.insight ?? 0) > 0) return true;
  return (state.seenResources ?? []).includes("insight");
}

/**
 * Mark legacy / mid-run saves so the intro does not fire the first time they
 * load after this feature ships.
 */
export function migrateInsightIntroSeenOnLoad(
  state: GameState,
): Partial<GameState> | null {
  if (isInsightIntroSeen(state)) return null;
  if (!hasPriorInsightExposure(state)) return null;
  return {
    story: {
      ...state.story,
      seen: {
        ...state.story?.seen,
        [INSIGHT_INTRO_SEEN_KEY]: true,
      },
    },
  };
}

function markInsightIntroSeenPatch(
  state: GameState,
): Pick<GameState, "story"> {
  return {
    story: {
      ...state.story,
      seen: {
        ...state.story?.seen,
        [INSIGHT_INTRO_SEEN_KEY]: true,
      },
    },
  };
}

/**
 * When Insight is held for the first time this run (and never before on this
 * save), mark the seen flag and queue the scholar intro dialog.
 */
export function maybeScheduleInsightIntroDialog(
  get: () => GameStore,
  set: (
    partial:
      | Partial<GameStore>
      | ((state: GameStore) => Partial<GameStore>),
  ) => void,
  initialDelayMs = 500,
): void {
  const state = get();
  if (isInsightIntroSeen(state)) return;
  if ((state.resources.insight ?? 0) <= 0) return;

  let claimed = false;
  set((prev) => {
    if (isInsightIntroSeen(prev)) return {};
    if ((prev.resources.insight ?? 0) <= 0) return {};
    claimed = true;
    return markInsightIntroSeenPatch(prev);
  });
  if (!claimed) return;

  scheduleInsightIntroDialogWhenClear(get, initialDelayMs);
}
