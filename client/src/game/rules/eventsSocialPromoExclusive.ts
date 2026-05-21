import type { GameEvent } from "./events";
import type { GameState } from "@shared/schema";

/** Exclusive-item track: after tasks complete, `socialPromoExclusiveRewardPending` is set; same choice-event flow as other narrative events. */
export const socialPromoExclusiveEvents: Record<string, GameEvent> = {
  giftedRingDiscovery: {
    id: "giftedRingDiscovery",
    condition: (state: GameState) =>
      state.socialPromoExclusiveRewardPending === true &&
      !state.clothing.gifted_ring,
    timeProbability: 0.5,
    priority: 10,
    repeatable: true,
    choices: [
      {
        id: "takeGiftedRing",
        effect: (state: GameState) => ({
          clothing: {
            ...state.clothing,
            gifted_ring: true,
          },
          socialPromoExclusiveRewardPending: false,
          _logMessageKey: "outcome0",
        }),
      },
    ],
  },
};
