import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const disgracedPriorEvents: Record<string, GameEvent> = {
  disgracedPriorOffer: {
    id: "disgracedPriorOffer",
    condition: (state: GameState) => {
      const minWoodenHuts = state.cruelMode ? 5 : 6;
      return (
        state.buildings.woodenHut >= minWoodenHuts &&
        state.buildings.darkEstate >= 1 &&
        !state.fellowship.disgraced_prior &&
        !state.story?.seen?.disgracedPriorJoined
      );
    },
    timeProbability: 5,

    priority: 10,
    repeatable: false,
    choices: [
      {
        id: "offerShelter",
        effect: (state: GameState) => ({
          fellowship: {
            ...state.fellowship,
            disgraced_prior: true,
          },
          disgracedPriorSkills: state.disgracedPriorSkills ?? { level: 0 },
          priorAssignedActions: state.priorAssignedActions ?? [],
          story: {
            ...state.story,
            seen: {
              ...(state.story?.seen ?? {}),
              disgracedPriorJoined: true,
            },
          },
          _logMessageKey: "outcome0",
        }),
      },
    ],
  },
};
