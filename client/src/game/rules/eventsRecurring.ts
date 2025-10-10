
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const recurringEvents: Record<string, GameEvent> = {
  foodGone: {
    id: "foodGone",
    condition: (state: GameState) => state.resources.food > 50,
    triggerType: "resource",
    timeProbability: 20,
    repeatable: true,
    message: [
      "Food is missing. Villagers speak of voices in the dark.",
      "By morning, the stores are lighter. Something was here.",
    ],
    triggered: false,
    priority: 2,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        food:
          state.resources.food -
          Math.min(
            state.resources.food,
            Math.ceil(Math.random() * 50 * state.buildings.woodenHut),
          ),
      },
    }),
  },

  villagerMissing: {
    id: "villagerMissing",
    condition: (state: GameState) => state.villagers.free > 0,
    triggerType: "resource",
    timeProbability: 20,
    message: [
      "One hut lies empty. Its occupant is gone.",
      "A villager is gone. Claw-like marks remain.",
      "A hut stands silent. Meals lie untouched. They are gone.",
      "The wind moves through an empty hut. The villager is gone.",
      "A door of a hut stands ajar. Its occupant is gone.",
    ],
    triggered: false,
    priority: 2,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    effect: (state: GameState) => ({
      villagers: {
        ...state.villagers,
        free: Math.max(0, state.villagers.free - 1),
      },
    }),
  },

  ironGift: {
    id: "ironGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 1,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "By dawn, a heap of iron lies at the village edge. No tracks remain.",
      "A gift of iron gleams at dawn. No one knows its source.",
    ],
    triggered: false,
    priority: 2,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 50 : 100;
      return {
        resources: {
          ...state.resources,
          iron: state.resources.iron + multiplier * state.buildings.woodenHut,
        },
      };
    },
  },

  steelGift: {
    id: "steelGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 2,
    triggerType: "resource",
    timeProbability: 25,
    message: [
      "At dawn, steel bars lie stacked at the village's edge. Nobody knows where they come from.",
      "A mysterious benefactor has left gleaming steel ingots at the edge of the village.",
    ],
    triggered: false,
    priority: 2,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        steel: state.resources.steel + 10 * state.buildings.woodenHut,
      },
    }),
  },

  obsidianGift: {
    id: "obsidianGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 8,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "By dawn, obsidian shards have been placed around the village.",
      "In the morning light, villagers notice obsidian shards nearby the village.",
    ],
    triggered: false,
    priority: 2,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        obsidian: state.resources.obsidian + 10 * state.buildings.woodenHut,
      },
    }),
  },

  adamantGift: {
    id: "adamantGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 10,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "By morning, raw adamant lies behind one of the huts of the village.",
      "When dawn breaks, a pile of adamant is found close to the village.",
    ],
    triggered: false,
    priority: 2,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 4 : 8;
      return {
        resources: {
          ...state.resources,
          adamant: state.resources.adamant + multiplier * state.buildings.woodenHut,
        },
      };
    },
  },
};
