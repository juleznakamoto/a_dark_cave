// estate 1, stone hut 4, 5, 6

import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const ringEvents: Record<string, GameEvent> = {
  feedingRing: {
    id: "feedingRing",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.buildings.stoneHut >= 4 &&
      !state.clothing.feeding_ring,
    triggerType: "resource",
    timeProbability: 15,
    title: "The Night Terror",
    message:
      "You awaken in the dead of night, paralyzed. You sense a presence looming beside your bed, silent and unmoving. Before terror can take hold, sleep drags you back into the void. At dawn, you find an unfamiliar ring on one of your fingers.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "keepRing",
        label: "Keep the ring",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feeding_ring: true,
            },
            _logMessage:
              "Your finger aches softly, but you leave it be for now. It almost feels like a faint pulsing against your skin.",
          };
        },
      },
      {
        id: "removeRing",
        label: "Take it off",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feeding_ring: true,
            },
            _logMessage:
              "No matter how hard you try, the ring won’t come off. It almost seems fused to your flesh. Your finger aches softly, but you leave it be for now. It almost feels like a faint pulsing against your skin.",
          };
        },
      },
    ],
  },
};
