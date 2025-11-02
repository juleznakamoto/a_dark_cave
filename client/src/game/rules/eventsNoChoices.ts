
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const noChoiceEvents: Record<string, GameEvent> = {
  findElderScroll: {
    id: "findElderScroll",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 6 &&
      !state.relics.elder_scroll,
    triggerType: "time",
    timeProbability: 45,
    message:
      "During the night as you pass a narrow path, something moves at the edge of your vision, like a shadow fleeing the firelight. You follow it, and there, upon the cold stones, lies an ancient scroll.",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
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

  blindDruidBlessing: {
    id: "blindDruidBlessing",
    condition: (state: GameState) =>
      state.buildings.shrine >= 1 &&
      !state.blessings.forests_grace &&
      !state.story.seen.blindDruidBlessing,
    triggerType: "resource",
    timeProbability: 0.5,
    title: "The Blind Druid",
    message:
      "A blind druid emerges from the forest. He approaches the shrine and nods approvingly. 'The gods of the forest are pleased with your devotion, they grant you their blessing'.",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: false,
    effect: (state: GameState) => ({
      blessings: {
        ...state.blessings,
        forests_grace: true,
      },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          blindDruidBlessing: true,
        },
      },
    }),
  },
};
