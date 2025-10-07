import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const storyEvents: Record<string, GameEvent> = {
  foodGone: {
    id: "foodGone",
    condition: (state: GameState) => state.resources.food > 50,
    triggerType: "resource",
    timeProbability: 20,
    message: [
      "At dawn, food stores are lighter. Strange whispers were heard at night.",
      "Villagers wake to find food missing. Some heard ancient tongues in the night.",
      "By morning, food stores are thinned. Some murmur of inhuman voices heard in the dark.",
    ][Math.floor(Math.random() * 3)],
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
    timeProbability: 10,
    message: [
      "One hut lies empty. Its occupant is gone.",
      "A villager is gone. Claw-like marks remain.",
      "A hut stands silent. Meals lie untouched. They are gone.",
      "The wind moves through an empty hut. The villager is gone.",
      "A door of a hut stands ajar. Its occupant is gone.",
    ][Math.floor(Math.random() * 5)],
    triggered: false,
    priority: 2,
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
      "In the night, something left a heap of iron at the village's edge. No tracks lead away.",
      "A gift of iron gleams in the morning mist. None know who or what brought it.",
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        iron: state.resources.iron + 25 * state.buildings.woodenHut,
      },
    }),
  },

  steelGift: {
    id: "steelGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 5,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "At dawn, steel bars lie stacked at the village's edge. Nobody knows where they come from.",
      "A mysterious benefactor has left gleaming steel ingots at the edge of the village.",
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        steel: state.resources.steel + 15 * state.buildings.woodenHut,
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
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
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
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        adamant: state.resources.adamant + 8 * state.buildings.woodenHut,
      },
    }),
  },

  ringOfClarityFound: {
    id: "ringOfClarityFound",
    condition: (state: GameState) => false, // Only triggered by sacrifice actions
    triggerType: "action",
    title: "Ring of Clarity",
    message:
      "As the ritual concludes, a crystal-clear ring glints among the ashes of the altar, its surface perfectly smooth and radiating a sense of peace.",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        relics: {
          ...state.relics,
          ring_of_clarity: true,
        },
        _logMessage:
          "You slip the Ring of Clarity onto your finger. Immediately, your thoughts become clearer and the dark whispers in your mind quiet to a whisper.",
      };
    },
  },

  dreamMorrowind: {
    id: "dreamMorrowind",
    condition: (state: GameState) => state.buildings.woodenHut >= 3,
    triggerType: "time",
    timeProbability: 80,
    message:
      "Sleep drags you into a wasteland of ash and jagged stone. A red sky bleeds across the horizon, and enormous, insect-like shapes crawl in the distance. A low, ancient vibration hums through the ground. You wake with dust in your mouth and a lingering sense of unease.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        dream_morrowind: true,
      },
    }),
  },

  dreamOblivion: {
    id: "dreamOblivion",
    condition: (state: GameState) => state.buildings.woodenHut >= 5,
    triggerType: "time",
    timeProbability: 70,
    message:
      "You dream of a towering gate of brass and bone, weeping molten fire. Behind it, spiked towers and rivers of blood stretch into darkness. A voice calls from beyond the flames, hungry and silent. You wake in cold sweat, the echo of screaming still in your ears.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        dream_oblivion: true,
      },
    }),
  },

  dreamSkyrim: {
    id: "dreamSkyrim",
    condition: (state: GameState) => state.buildings.woodenHut >= 7,
    triggerType: "time",
    timeProbability: 60,
    message:
      "In sleep, cold winds lash your face. You stand atop a jagged cliff, snow and ash swirling around you. A colossal shadow passes overhead, scales glinting like iron in moonlight. A deep, ancient hum reverberates through your bones. You wake shivering, the chill lingering long after.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        dream_skyrim: true,
      },
    }),
  },

  findElderScroll: {
    id: "findElderScroll",
    condition: (state: GameState) =>
      state.events.dream_morrowind &&
      state.events.dream_oblivion &&
      state.events.dream_skyrim &&
      !state.relics.elder_scroll,
    triggerType: "time",
    timeProbability: 1,
    message:
      "During the night as you pass a narrow path, something moves at the edge of your vision, like a shadow fleeing the firelight. You follow it, and there, upon the cold stones, lies an ancient scroll...",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => ({
      relics: {
        ...state.relics,
        elder_scroll: true,
      },
      events: {
        ...state.events,
        elder_scroll_found: true,
      },
    }),
  },

  };