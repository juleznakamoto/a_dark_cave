import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const recurringEvents: Record<string, GameEvent> = {
  foodGone: {
    id: "foodGone",
    condition: (state: GameState) => state.resources.food > 50,
    triggerType: "resource",
    timeProbability: 30,
    repeatable: true,
    message: [
      "Food is missing. Villagers speak of voices in the dark.",
      "By morning, the food stores are lighter. Something was here.",
    ],
    triggered: false,
    priority: 2,
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
    timeProbability: 30,
    message: [
      "One hut lies empty. Its occupant is gone.",
      "The wind moves through an empty hut. The villager is gone.",
      "A door of a hut stands ajar. Its occupant is gone.",
    ],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      villagers: {
        ...state.villagers,
        free: Math.max(0, state.villagers.free - 1),
      },
    }),
  },

  findWood: {
    id: "woodGift",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 1 && state.buildings.woodenHut < 5,
    triggerType: "resource",
    timeProbability: 12,
    repeatable: true,
    message: [
      "A pile of wood has been found near the village.",
      "A pile of wood has been left near a hut.",
    ],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 25 : 50;
      return {
        resources: {
          ...state.resources,
          wood: state.resources.wood + multiplier * state.buildings.woodenHut,
        },
      };
    },
  },

  ironGift: {
    id: "ironGift",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 1 && state.buildings.woodenHut < 8,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "By dawn, a heap of iron lies at the village edge. No tracks remain.",
      "A gift of iron gleams at dawn. No one knows its source.",
    ],
    triggered: false,
    priority: 2,
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
      "Villagers find steel bars at the village's edge.",
      "Someone has left gleaming steel ingots at the edge of the village.",
    ],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 10 : 20;
      return {
        resources: {
          ...state.resources,
          steel: state.resources.steel + multiplier * state.buildings.woodenHut,
        },
      };
    },
  },

  obsidianGift: {
    id: "obsidianGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 6,
    triggerType: "resource",
    timeProbability: 35,
    message: [
      "By dawn, obsidian shards have been found around the village.",
      "In the morning, villagers find obsidian shards nearby the village.",
    ],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 10 : 20;
      return {
        resources: {
          ...state.resources,
          obsidian:
            state.resources.obsidian + multiplier * state.buildings.woodenHut,
        },
      };
    },
  },

  adamantGift: {
    id: "adamantGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 8,
    triggerType: "resource",
    timeProbability: 35,
    message: [
      "By morning, adamant lies behind one of the huts of the village.",
      "When dawn breaks, a pile of adamant is found close to the village.",
    ],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 10 : 20;
      return {
        resources: {
          ...state.resources,
          adamant:
            state.resources.adamant + multiplier * state.buildings.woodenHut,
        },
      };
    },
  },

  fireStorm: {
    id: "fireStorm",
    condition: (state: GameState) => state.buildings.woodenHut >= 4,
    triggerType: "resource",
    timeProbability: 50,
    repeatable: true,
    message: [
      "A raging fire sweeps through the village in the night. By morning, wooden huts are reduced to ash.",
      "Flames consume the village. Screams pierce the night as fire devours wooden structures.",
      "A violent storm tears through the settlement. Thunder roars as wooden huts are ripped apart by the wind.",
      "The storm's fury is relentless. Wooden huts collapse under torrential rain and howling winds.",
    ],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => {
      const hutsDestroyed = Math.random() < 0.5 ? 1 : 2;
      const villagersKilled = hutsDestroyed * 2;
      
      // Kill villagers randomly
      const updatedVillagers = { ...state.villagers };
      let remainingDeaths = villagersKilled;
      
      // Create a pool of all available villagers with their types
      const villagerPool: string[] = [];
      Object.keys(updatedVillagers).forEach(type => {
        const count = updatedVillagers[type as keyof typeof updatedVillagers] || 0;
        for (let i = 0; i < count; i++) {
          villagerPool.push(type);
        }
      });
      
      // Randomly select villagers to kill
      const actualDeaths = Math.min(remainingDeaths, villagerPool.length);
      for (let i = 0; i < actualDeaths; i++) {
        if (villagerPool.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * villagerPool.length);
        const selectedType = villagerPool[randomIndex];
        
        villagerPool.splice(randomIndex, 1);
        updatedVillagers[selectedType as keyof typeof updatedVillagers]--;
      }
      
      return {
        buildings: {
          ...state.buildings,
          woodenHut: Math.max(0, state.buildings.woodenHut - hutsDestroyed),
        },
        villagers: updatedVillagers,
      };
    },
  },
};
