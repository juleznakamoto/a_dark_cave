import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { CRUEL_MODE } from "../cruelMode";

export const recurringEvents: Record<string, GameEvent> = {
  fireStorm: {
    id: "fireStorm",
    condition: (state: GameState) => {
      const fireStormCount = (state.story.seen.fireStormCount as number) || 0;
      const maxOccurrences = state.cruelMode
        ? CRUEL_MODE.fireStorm.maxOccurrencesCruel
        : 0;
      return (
        state.buildings.woodenHut >= 4 &&
        state.buildings.stoneHut <= 5 &&
        fireStormCount < maxOccurrences
      );
    },
    timeProbability: 120,
    repeatable: true,
    message:
      "A fire sweeps through the village in the night, destroying one wooden hut and killing its occupants.",
    priority: 2,
    effect: (state: GameState) => {
      // Use the centralized killVillagers function
      const deathResult = killVillagers(state, 2);

      const currentCount = (state.story.seen.fireStormCount as number) || 0;

      return {
        ...deathResult,
        buildings: {
          ...state.buildings,
          woodenHut: Math.max(0, state.buildings.woodenHut - 1),
        },
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            fireStormCount: currentCount + 1,
          },
        },
      };
    },
  },
};