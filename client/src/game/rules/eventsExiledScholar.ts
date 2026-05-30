import { GameState } from "@shared/schema";
import { GameEvent } from "./events";

export const exiledScholarEvents: Record<string, GameEvent> = {
  exiledScholarVisit: {
    id: "exiledScholarVisit",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.relics.lycan_blood &&
      state.relics.necromancer_blood &&
      state.relics.bone_devourer_blood,
    timeProbability: (state: GameState) => {
      // Return 20 if this is the first visit, 60 if the player hasn't paid yet
      return state.exiledScholarState?.hasPaid ? 60 : 20;
    },

    priority: 10,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000, // 5 minutes
    skipEventLog: true,
    choices: [
      {
        id: "payScholar",
        cost: "250 Gold",
        effect: (state: GameState) => ({
            resources: {
              ...state.resources,
              gold: state.resources.gold - 250,
            },
            relics: {
              ...state.relics,
              lycan_blood: false,
              necromancer_blood: false,
              bone_devourer_blood: false,
            },
            blessings: {
              ...state.blessings,
              blood_baptized: true,
            },
            exiledScholarState: {
              hasPaid: true,
            },
            _logMessageKey: "outcome1",
        }),
      },
      {
        id: "sendAway",
        effect: (state: GameState) => ({
          exiledScholarState: {
            hasPaid: false,
          },
          _logMessageKey: "outcome2",
        }),
      },
    ],
    fallbackChoice: {
      id: "sendAway",
      effect: (state: GameState) => ({
        exiledScholarState: {
          hasPaid: false,
        },
        _logMessageKey: "outcome3",
      }),
    },
  },
};