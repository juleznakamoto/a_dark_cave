import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";

const MAX_OCCURRENCES = 6;
const STARING_DEER_DURATION_MS = 10 * 60 * 1000;

function getOccurrenceCount(state: GameState): number {
  return (state.story?.seen?.staringDeerCount as number) || 0;
}

function getStaringDeerTimeProbability(state: GameState): number {
  const stoneHuts = state.buildings.stoneHut ?? 0;
  const woodenHuts = state.buildings.woodenHut ?? 0;

  if (stoneHuts >= 10) return 25;
  if (stoneHuts >= 7) return 20;
  if (stoneHuts >= 4) return 20;
  if (woodenHuts >= 10) return 15;
  if (woodenHuts >= 7) return 15;
  if (woodenHuts >= 4) return 10;
  return 10;
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
    return (state.buildings.woodenHut ?? 0) >= 4;
  },
  timeProbability: getStaringDeerTimeProbability,
  priority: 3,
  repeatable: true,
  choices: [
    {
      id: "continue",
      effect: (state: GameState) => {
        const timesOccurred = getOccurrenceCount(state);
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
