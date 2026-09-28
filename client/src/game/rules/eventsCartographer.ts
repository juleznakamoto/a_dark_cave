import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";

/** One-shot village visit. Accepting teaches map-drawing and opens the Map tab. */
export const cartographerEvents: Record<string, GameEvent> = {
  cartographer: {
    id: "cartographer",
    condition: (state: GameState) =>
      (state.buildings.woodenHut ?? 0) >= 1 &&
      state.flags.forestUnlocked === true &&
      state.flags.mapUnlocked !== true &&
      state.triggeredEvents?.cartographer !== true,
    timeProbability: 15,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "accept",
        effect: (state: GameState) => ({
          flags: {
            ...state.flags,
            mapUnlocked: true,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              cartographerAccepted: true,
            },
          },
          _logMessageKey: "outcome0",
        }),
      },
    ],
  },
};
