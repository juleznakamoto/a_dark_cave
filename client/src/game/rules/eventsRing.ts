
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
    title: "The Night Visitor",
    message:
      "You awaken in the dead of night, paralyzed. Your eyes strain in the darkness as you sense a presence looming beside your bed, silent and unmoving. Before terror can take hold, sleep drags you back into the void. At dawn, you find an unfamiliar ring wrapped tight around your finger.",
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
              "The ring burns with a dull ache, but you leave it be. Its presence feels almost alive, pulsing faintly against your skin.",
          };
        },
      },
      {
        id: "removeRing",
        label: "Tear it from your finger",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feeding_ring: true,
            },
            _logMessage:
              "You wrench and twist, your finger screaming in agony, but the ring will not budge. It has fused to your flesh as if it were always part of you. Blood wells beneath the metal, yet it remains.",
          };
        },
      },
    ],
  },
};
