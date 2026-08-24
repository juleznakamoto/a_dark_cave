import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";

const MAX_OCCURRENCES = 6;
const STARING_DEER_DURATION_MS = 10 * 60 * 1000;

/** Average minutes between rolls at each hut stage (wooden 4/7/10, then stone 4/7/10). */
const STAGE_TIME_PROBABILITY = [10, 15, 15, 20, 20, 25] as const;

function getOccurrenceCount(state: GameState): number {
  return (state.story?.seen?.staringDeerCount as number) || 0;
}

/** Hut-progress stage, or null before 4 wooden huts. */
export function getStaringDeerStage(state: GameState): number | null {
  const stoneHuts = state.buildings.stoneHut ?? 0;
  const woodenHuts = state.buildings.woodenHut ?? 0;

  if (stoneHuts >= 10) return 5;
  if (stoneHuts >= 7) return 4;
  if (stoneHuts >= 4) return 3;
  if (woodenHuts >= 10) return 2;
  if (woodenHuts >= 7) return 1;
  if (woodenHuts >= 4) return 0;
  return null;
}

function getLastStaringDeerStage(state: GameState): number {
  const stored = state.story?.seen?.staringDeerLastStage;
  if (typeof stored === "number") return stored;
  // Old saves only stored a fire count and could repeat the same hut stage.
  return getOccurrenceCount(state) > 0 ? 0 : -1;
}

function getStaringDeerTimeProbability(state: GameState): number {
  const stage = getStaringDeerStage(state);
  return stage == null ? STAGE_TIME_PROBABILITY[0] : STAGE_TIME_PROBABILITY[stage];
}

export const staringDeerEvent: GameEvent = {
  id: "staringDeer",
  condition: (state: GameState) => {
    if (
      state.staringDeerState?.isActive &&
      state.staringDeerState.endTime > Date.now()
    ) {
      return false;
    }
    if (getOccurrenceCount(state) >= MAX_OCCURRENCES) {
      return false;
    }
    const stage = getStaringDeerStage(state);
    if (stage == null) {
      return false;
    }
    return stage > getLastStaringDeerStage(state);
  },
  timeProbability: getStaringDeerTimeProbability,
  priority: 3,
  repeatable: true,
  choices: [
    {
      id: "continue",
      effect: (state: GameState) => {
        const timesOccurred = getOccurrenceCount(state);
        const stage = getStaringDeerStage(state) ?? 0;
        return {
          staringDeerState: {
            isActive: true,
            endTime: Date.now() + STARING_DEER_DURATION_MS,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              staringDeerCount: timesOccurred + 1,
              staringDeerLastStage: stage,
            },
          },
        };
      },
    },
  ],
};

export const staringDeerEvents: Record<string, GameEvent> = {
  staringDeer: staringDeerEvent,
};

export { STARING_DEER_DURATION_MS };
