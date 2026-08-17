import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

const FOREST_FEAR_DURATION_MS = 20 * 60 * 1000;

export const forestFearEvent: GameEvent = {
  id: "forestFear",
  condition: (state: GameState) => {
    // endTime > 0 means it already fired (active or expired), including old saves
    // from when this event was repeatable.
    if ((state.forestFearState?.endTime ?? 0) > 0) {
      return false;
    }
    return (
      (state.buildings.woodenHut ?? 0) > 8 &&
      (state.villagers.hunter ?? 0) >= 2 &&
      (state.villagers.gatherer ?? 0) >= 2
    );
  },
  timeProbability: 15,
  priority: 3,
  repeatable: false,
  choices: [
    {
      id: "continue",
      effect: (state: GameState) => {
        const deathResult = killVillagers(state, 1);
        return {
          ...deathResult,
          forestFearState: {
            isActive: true,
            endTime: Date.now() + FOREST_FEAR_DURATION_MS,
          },
        };
      },
    },
  ],
};

export const forestFearEvents: Record<string, GameEvent> = {
  forestFear: forestFearEvent,
};

export { FOREST_FEAR_DURATION_MS };
