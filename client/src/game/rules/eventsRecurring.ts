import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

export const recurringEvents: Record<string, GameEvent> = {
  foodGone: {
    id: "foodGone",
    condition: (state: GameState) =>
      state.resources.food > 100 &&
      state.buildings.woodenHut >= 4 &&
      state.buildings.stoneHut <= 5,

    timeProbability: 30,
    repeatable: true,
    message: [
      "Food is missing. Villagers speak of voices in the dark.",
      "By morning, the food stores are lighter. Something was here.",
    ],
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        food:
          state.resources.food -
          Math.min(
            state.resources.food,
            Math.ceil(Math.random() * state.buildings.woodenHut) * 25 +
              state.CM * 100,
          ),
      },
    }),
  },

  villagerMissing: {
    id: "villagerMissing",
    condition: (state: GameState) =>
      state.villagers.free > 0 && state.buildings.stoneHut <= 10,

    timeProbability: 30,
    message: [
      "One hut lies empty. Its occupant is gone.",
      "The wind moves through an empty hut. The villager is gone.",
      "A door of a hut stands ajar. Its occupant is gone.",
    ],
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
      state.buildings.woodenHut >= 2 && state.buildings.woodenHut < 6,

    timeProbability: 30,
    repeatable: true,
    message: [
      "A pile of wood has been found near the village.",
      "A pile of wood has been left near a hut.",
    ],
    priority: 2,
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 50 : 100;
      return {
        resources: {
          ...state.resources,
          wood: state.resources.wood + multiplier * state.buildings.woodenHut,
        },
      };
    },
  },

  stoneGift: {
    id: "stoneGift",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 4 && state.buildings.woodenHut < 8,

    timeProbability: 30,
    repeatable: true,
    message: [
      "A pile of stone has been found near the village.",
      "Stone has been left at the edge of the settlement.",
    ],
    priority: 2,
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 50 : 100;
      return {
        resources: {
          ...state.resources,
          stone: state.resources.stone + multiplier * state.buildings.woodenHut,
        },
      };
    },
  },

  ironGift: {
    id: "ironGift",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 1 && state.buildings.woodenHut < 8,

    timeProbability: 30,
    message: [
      "By dawn, a heap of iron lies at the village edge. No tracks remain.",
      "A gift of iron gleams at dawn. No one knows its source.",
    ],
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

  silverSackDiscovery: {
    id: "silverSackDiscovery",
    condition: (state: GameState) =>
      state.tools?.stone_axe && !state.story?.seen?.silverSackFound,

    timeProbability: 2,
    message:
      "You find a small leather sack containing silver close to the cave's entrance.",
    priority: 3,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        resources: {
          ...state.resources,
          silver: state.resources.silver + 50,
        },
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            silverSackFound: true,
          },
        },
      };
    },
  },

  steelGift: {
    id: "steelGift",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 4 && state.buildings.stoneHut <= 10,

    timeProbability: 30,
    message: [
      "Villagers found steel bars at the village's edge.",
      "Someone has left steel at the edge of the village.",
    ],
    priority: 2,
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 25 : 50;
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
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 6 && state.buildings.stoneHut <= 4,

    timeProbability: 35,
    message: [
      "By dawn, obsidian has been found around the village.",
      "In the morning, villagers find obsidian nearby the village.",
    ],
    priority: 2,
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 50 : 100;
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
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 8 && state.buildings.stoneHut <= 8,

    timeProbability: 35,
    message: [
      "By morning, adamant lies behind one of the huts.",
      "When dawn breaks, a pile of adamant is found nearby the village.",
    ],
    priority: 2,
    effect: (state: GameState) => {
      const multiplier = Math.random() < 0.5 ? 50 : 100;
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
    condition: (state: GameState) => {
      const fireStormCount = (state.story.seen.fireStormCount as number) || 0;
      const maxOccurrences = state.cruelMode ? 3 : 0;

      return (
        state.buildings.woodenHut >= 4 &&
        state.buildings.stoneHut <= 5 &&
        fireStormCount < maxOccurrences
      );
    },

    timeProbability: 120,
    repeatable: true,
    message:
      "A fire sweeps through the village in the night, destroying one wooden hut and its occupants.",
    priority: 2,
    effect: (state: GameState) => {
      // Use the centralized killVillagers function
      const deathResult = killVillagers(state, 2);

      const currentCount = (state.story.seen.fireStormCount as number) || 0;

      return {
        ...deathResult,
        buildings: {
          ...state.buildings,
          woodenHut: Math.max(0, state.buildings.woodenHut - 1),
        },
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            fireStormCount: currentCount + 1,
          },
        },
      };
    },
  },
};