import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const noChoiceEvents: Record<string, GameEvent> = {
  villageBecomesCity: {
    id: "villageBecomesCity",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 5 && !state.flags.hasCity,

    priority: 10,
    timeProbability: 0.01,
    repeatable: false,
    effect: (state: GameState) => ({
      flags: {
        ...state.flags,
        hasCity: true,
      },
      story: {
        ...state.story,
        seen: { ...state.story.seen, villageBecomesCity: true },
      },
    }),
  },

  bastionBecomesFortress: {
    id: "bastionBecomesFortress",
    condition: (state: GameState) =>
      state.buildings.fortifiedMoat >= 1 &&
      state.buildings.palisades >= 3 &&
      state.buildings.watchtower >= 3 &&
      !state.flags.hasFortress,

    priority: 10,
    timeProbability: 0.01,
    repeatable: false,
    effect: (state: GameState) => ({
      flags: {
        ...state.flags,
        hasFortress: true,
      },
      story: {
        ...state.story,
        seen: { ...state.story.seen, bastionBecomesFortress: true },
      },
    }),
  },

  blindDruidBlessing: {
    id: "blindDruidBlessing",
    condition: (state: GameState) =>
      state.buildings.shrine >= 1 &&
      !state.blessings.forests_grace &&
      !state.story.seen.blindDruidBlessing,

    timeProbability: 0.5,
    priority: 5,
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