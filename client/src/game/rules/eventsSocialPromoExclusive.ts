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
    title: "An Expected Gift",
    message:
      "One morning, on a tree stump beside the cave entrance, you find a ring, as though someone left it there for you.",
    choices: [
      {
        id: "takeGiftedRing",
        label: "Take ring",
        effect: (state: GameState) => ({
          clothing: {
            ...state.clothing,
            gifted_ring: true,
          },
          socialPromoExclusiveRewardPending: false,
          _logMessage:
            "You hold the ring in your hand. It feels soft, faintly warm and welcoming.",
        }),
      },
    ],
  },
};
