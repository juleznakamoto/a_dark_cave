
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const cubeEvents: Record<string, GameEvent> = {
  cubeDiscovery: {
    id: "cubeDiscovery",
    condition: (state: GameState) =>
      state.flags.hasVillagers && !state.relics.murmuring_cube,
    triggerType: "resource",
    timeProbability: 2,
    title: "The Murmuring Cube",
    message:
      "Near the cave’s entrance, you discover a perfectly polished metal cube. At first it seems still, but then you feel a faint vibration beneath your fingers — a slow, rhythmic pulse, almost like a heartbeat.",
    triggered: false,
    priority: 3,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        relics: {
          ...state.relics,
          murmuring_cube: true,
        },
      };
    },
  },

  cube01: {
    id: "cube01",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 2 && !state.events.cube01,
    triggerType: "resource",
    timeProbability: 2,
    title: "The Cube awakens",
    message:
      "You wake up in the middle of the night. The cube hums softly beside you. A gentle, melodic voice emerges from within, whispering: 'Once there was a great civilization, but something caused it to fall apart. Ancient knowledge has long since been lost.",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
                cube01: true,
            },
          };
        },
      },
    ],
  },

  cube02: {
    id: "cube02",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 3 && state.events.cube01 && !state.events.cube02,
    triggerType: "resource",
    timeProbability: 2,
    title: "The warrior tribe",
    message:
      "The cube continues its tale: 'Long ago, a tribe of fierce warriors was chosen to dwell deep within the caves. Their purpose was to guard something of great importance.'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
                cube01: true,
            },
          };
        },
      },
    ],
  },
};
