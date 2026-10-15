import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { getSeenResourceKeys, killVillagers } from "@/game/stateHelpers";
import { getVillagersInVillage } from "@/game/population";

export const RAGGED_YOUTH_FUR_COST = 50;
export const RAGGED_YOUTH_SILVER_REWARD = 50;

function helped(state: GameState): boolean {
  return state.story?.seen?.raggedYouthHelped === true;
}

function refused(state: GameState): boolean {
  return state.story?.seen?.raggedYouthRefused === true;
}

function repaid(state: GameState): boolean {
  return state.story?.seen?.raggedYouthRepaid === true;
}

export const raggedYouthEvents: Record<string, GameEvent> = {
  raggedYouth: {
    id: "raggedYouth",
    i18nKey: "raggedYouth",
    i18nVars: {
      furCost: RAGGED_YOUTH_FUR_COST,
    },
    condition: (state: GameState) =>
      getSeenResourceKeys(state).includes("silver") &&
      (state.resources?.fur ?? 0) >= RAGGED_YOUTH_FUR_COST &&
      getVillagersInVillage(state) >= 1 &&
      !helped(state) &&
      !refused(state),
    timeProbability: 20,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "giveFur",
        effect: (state: GameState) => {
          if ((state.resources.fur ?? 0) < RAGGED_YOUTH_FUR_COST) {
            return { _choiceRejected: true };
          }
          return {
            resources: {
              ...state.resources,
              fur: state.resources.fur - RAGGED_YOUTH_FUR_COST,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                raggedYouthHelped: true,
              },
            },
            _logMessageKey: "thanks",
          };
        },
      },
      {
        id: "doNotHelp",
        effect: (state: GameState) => {
          const deathResult = killVillagers(state, 1);
          return {
            ...deathResult,
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                raggedYouthRefused: true,
              },
            },
            _logMessageKey: "attack",
          };
        },
      },
    ],
  },

  raggedYouthReturn: {
    id: "raggedYouthReturn",
    i18nKey: "raggedYouthReturn",
    i18nVars: {
      silverReward: RAGGED_YOUTH_SILVER_REWARD,
    },
    condition: (state: GameState) => helped(state) && !repaid(state),
    timeProbability: 10,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "takeSilver",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            silver: (state.resources.silver ?? 0) + RAGGED_YOUTH_SILVER_REWARD,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              raggedYouthRepaid: true,
            },
          },
          _logMessageKey: "repay",
        }),
      },
    ],
  },
};
