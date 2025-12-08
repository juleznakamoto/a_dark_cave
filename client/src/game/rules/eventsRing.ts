// estate 1, stone hut 4, 5

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

  bloodiedAwakening: {
    id: "bloodiedAwakening",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.buildings.stoneHut >= 5 &&
      state.clothing.feeding_ring,
    triggerType: "resource",
    timeProbability: 15,
    title: "Bloodied Awakening",
    message:
      "You wake as dawn breaks, your clothes soaked in fresh blood. It is not yours. A villager arrives at the estate, face pale with horror. 'Eight are dead,' he whispers. 'Torn apart in the night.' The ring on your finger throbs with agonizing pain.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "investigateMurders",
        label: "Investigate Murders",
        effect: (state: GameState) => {
          const remainingVillagers = state.current_population - 18;
          const newFreeVillagers = Math.max(0, state.villagers.free - 18);
          
          return {
            current_population: Math.max(0, remainingVillagers),
            total_population: Math.max(0, remainingVillagers),
            villagers: {
              ...state.villagers,
              free: newFreeVillagers,
            },
            _logMessage:
              "As you follow muddy footprints through the village, they lead to each murder scene, one after another. The prints match your own boots. The horror dawns slowly - it was you, possessed by the ring's hunger. When the villagers discover the truth, eighteen flee, unwilling to remain near such a cursed creature.",
          };
        },
      },
      {
        id: "severFinger",
        label: "Sever the finger",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feeding_ring: false,
            },
            _logMessage:
              "With trembling hands, you raise your axe. The ring pulses as the blade falls. Agony tears through your arm as bone shatters. Lifting the severed finger, you see small black threads, like tentacles, sunk deep into its flesh.",
          };
        },
      },
    ],
  },

  desperateAmputation: {
    id: "desperateAmputation",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.clothing.feeding_ring &&
      state.events.bloodiedAwakening,
    triggerType: "resource",
    timeProbability: 5,
    title: "No Escape",
    message:
      "After the horrifying events, you try once more to remove the cursed ring. But the ring will not yield, as if it has become part of you. There is only one way to be free of it now.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "severFinger",
        label: "Sever the finger",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feeding_ring: false,
            },
            _logMessage:
              "With trembling hands, you raise your axe. The ring pulses as the blade falls. Agony tears through your arm as bone shatters. Lifting the severed finger, you see small black threads, like tentacles, sunk deep into its flesh.",
          };
        },
      },
    ],
  },
};
