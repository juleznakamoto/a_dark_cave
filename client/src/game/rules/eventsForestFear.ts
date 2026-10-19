import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

const FOREST_FEAR_DURATION_MS = 20 * 60 * 1000;
const BTP_FOREST_FEAR_DURATION_MS = 15 * 60 * 1000;

/** 20 minutes, or 15 minutes when buy-to-play (Steam) is active. */
export function getForestFearDurationMs(btp?: number): number {
  return btp === 1 ? BTP_FOREST_FEAR_DURATION_MS : FOREST_FEAR_DURATION_MS;
}

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
            endTime: Date.now() + getForestFearDurationMs(state.BTP),
          },
        };
      },
    },
  ],
};

export const forestFearEvents: Record<string, GameEvent> = {
  forestFear: forestFearEvent,
};
