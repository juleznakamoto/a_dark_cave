import { GameEvent } from "./rules/events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

export const caveEvents: Record<string, GameEvent> = {
  ringOfDrownedChoice: {
    id: "ringOfDrownedChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration

    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepRing",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              ring_of_drowned: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                ringOfDrownedChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveRing",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                ringOfDrownedChoice: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        const deathResult = killVillagers(state, 1);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              ringOfDrownedChoice: true,
            },
          },
          _logMessageKey: "outcome2",
        };
      },
    },
  },

  shadowFluteChoice: {
    id: "shadowFluteChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration

    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepFlute",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              shadow_flute: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                shadowFluteChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveFlute",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                shadowFluteChoice: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      relevant_stats: ["luck"],
      effect: (state: GameState) => {
        const luck = state.stats.luck || 0;
        const devoured = Math.floor((1 - luck) * Math.random() * 9) + 1;
        const deathResult = killVillagers(state, devoured);
        const actualDevoured = deathResult.villagersKilled || 0;
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              shadowFluteChoice: true,
            },
          },
          _logMessageKey: "outcome2",
          _logMessageVars: { actualDevoured },
        };
      },
    },
  },

  hollowKingScepterChoice: {
    id: "hollowKingScepterChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration

    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepScepter",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              hollow_king_scepter: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                hollowKingScepterChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveScepter",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                hollowKingScepterChoice: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        const luck = state.stats.luck || 0;
        const deaths = Math.floor((1 - luck) * Math.random() * 6) + 3;
        const deathResult = killVillagers(state, deaths);
        const actualDeaths = deathResult.villagersKilled || 0;
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              hollowKingScepterChoice: true,
            },
          },
          _logMessageKey: "outcome2",
          _logMessageVars: { actualDeaths },
        };
      },
    },
  },

  bloodstainedBeltChoice: {
    id: "bloodstainedBeltChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration

    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "takeBelt",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              bloodstained_belt: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                bloodstainedBeltChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveBelt",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                bloodstainedBeltChoice: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        const deathResult = killVillagers(state, 1);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              bloodstainedBeltChoice: true,
            },
          },
          _logMessageKey: "outcome2",
        };
      },
    },
  },

  boneDiceChoice: {
    id: "boneDiceChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration

    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepDice",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              bone_dice: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                boneDiceChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveDice",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                boneDiceChoice: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              boneDiceChoice: true,
            },
          },
          _logMessageKey: "outcome2",
        };
      },
    },
  },
};
