
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
      "Near the entrance of the cave you find a perfectly polished cube out of metal. From time to time it seems to very subtly vibrate. You pick it up—it's warm to the touch and the vibrations pulse rhythmically, almost like a heartbeat.",
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

  cubeWhispers: {
    id: "cubeWhispers",
    condition: (state: GameState) =>
      state.relics.murmuring_cube && !state.events.cubeWhispers,
    triggerType: "resource",
    timeProbability: 5,
    title: "Whispers from the Cube",
    message:
      "The cube begins to hum louder than usual. As you hold it, visions flood your mind: You see the cave as it once was—not a dark refuge, but a threshold. Beyond it lay a vast city of towering spires and impossible geometry, built by beings who shaped reality itself. They didn't fear the darkness; they revered it, drawing power from the void between worlds. But their ambition grew too great. They opened a gateway to something ancient and hungry, something that should have remained sealed. The city fell in a single night, consumed by the very darkness they sought to control. The cube grows cold in your hands as the vision fades, leaving only the echo of a warning: 'The seal weakens. The hungry ones stir.'",
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
              cubeWhispers: true,
            },
            stats: {
              ...state.stats,
              knowledge: (state.stats.knowledge || 0) + 2,
              madness: (state.stats.madness || 0) + 1,
            },
          };
        },
      },
    ],
  },
};
