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
    title: "The Exiled Scholar",
    message: "A scholar of the dark arts approaches your estate. Upon seeing the three blood vials, he says, with a hint of restrained excitement, 'I can create a mixture that will grant you great power.'",
    priority: 10,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000, // 5 minutes
    skipEventLog: true,
    choices: [
      {
        id: "payScholar",
        label: "Pay 250 Gold",
        cost: "250 Gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessage: "You don't have enough gold to pay the scholar.",
            };
          }

          return {
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
            _logMessage: "The scholar creates a shadowy red mixture and instructs you to bathe in it. As you emerge from the bath, you feel stronger but also tainted.",
          };
        },
      },
      {
        id: "sendAway",
        label: "Send away",
        effect: (state: GameState) => ({
          exiledScholarState: {
            hasPaid: false,
          },
          _logMessage: "You send the scholar away. He departs with a disappointed sigh, but you sense he may return.",
        }),
      },
    ],
    fallbackChoice: {
      id: "sendAway",
      label: "Send him away",
      effect: (state: GameState) => ({
        exiledScholarState: {
          hasPaid: false,
        },
        _logMessage: "The scholar departs, displeased by your indecision.",
      }),
    },
  },
};