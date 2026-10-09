import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";

/** Silver he asks for before he will teach map-drawing. */
export const CARTOGRAPHER_SILVER_COST = 50;

/** Average minutes until the first visit. */
const CARTOGRAPHER_FIRST_VISIT_MINUTES = 15;

/**
 * After a refusal he keeps returning until paid.
 * Average minutes between those return rolls.
 */
const CARTOGRAPHER_RETURN_MINUTES = 30;

/** Cooldown before a return roll, as a fraction of the return interval. */
const CARTOGRAPHER_RETURN_COOLDOWN = 0.6;

function cartographerWasTurnedAway(state: GameState): boolean {
  return state.story?.seen?.cartographerDeclined === true;
}

/**
 * Village visit that opens the Map tab.
 * He asks for silver. Turning him away does not end the visit for good:
 * he comes back on the return timer until the player pays.
 */
export const cartographerEvents: Record<string, GameEvent> = {
  cartographer: {
    id: "cartographer",
    i18nVars: { silverCost: CARTOGRAPHER_SILVER_COST },
    condition: (state: GameState) =>
      (state.buildings.woodenHut ?? 0) >= 1 &&
      state.flags.forestUnlocked === true &&
      state.flags.mapUnlocked !== true &&
      state.story?.seen?.cartographerAccepted !== true &&
      state.triggeredEvents?.cartographer !== true,
    timeProbability: (state: GameState) =>
      cartographerWasTurnedAway(state)
        ? CARTOGRAPHER_RETURN_MINUTES
        : CARTOGRAPHER_FIRST_VISIT_MINUTES,
    cooldownPercent: CARTOGRAPHER_RETURN_COOLDOWN,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "accept",
        cost: `${CARTOGRAPHER_SILVER_COST} silver`,
        effect: (state: GameState) => {
          const silver = state.resources.silver ?? 0;
          if (silver < CARTOGRAPHER_SILVER_COST) {
            return { _choiceRejected: true };
          }
          return {
            resources: {
              ...state.resources,
              silver: silver - CARTOGRAPHER_SILVER_COST,
            },
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
            triggeredEvents: {
              ...(state.triggeredEvents || {}),
              cartographer: true,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "refuse",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              cartographerDeclined: true,
            },
          },
          _logMessageKey: "outcome1",
        }),
      },
    ],
  },
};
