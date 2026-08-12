import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { getGameWinAchievementUpdates } from "@/game/winAchievements";

export const cubeEvents: Record<string, GameEvent> = {
  cubeDiscovery: {
    id: "cubeDiscovery",
    condition: (state: GameState) =>
      (Number(state.story.seen.exploreCaveCount) || 0) >= 3 &&
      !state.relics.whispering_cube,
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              whispering_cube: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                cubeStoryArchiveV2Applied: true,
              },
            },
          };
        },
      },
    ],
  },

  cube01: {
    id: "cube01",
    condition: (state: GameState) =>
      Boolean(
        state.relics.whispering_cube &&
        state.buildings.woodenHut >= 2 &&
        !state.events.cube01,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube01: true,
            },
          };
        },
      },
    ],
  },

  cubeLostCivilization: {
    id: "cubeLostCivilization",
    condition: (state: GameState) =>
      Boolean(
        state.relics.whispering_cube &&
        state.story.seen.venturedDeeper &&
        state.events.cube01 &&
        !state.events.cubeLostCivilization,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cubeLostCivilization: true,
            },
          };
        },
      },
    ],
  },

  cube02: {
    id: "cube02",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.descendedFurther &&
        state.events.cubeLostCivilization &&
        !state.events.cube02,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube02: true,
            },
          };
        },
      },
    ],
  },

  cube03: {
    id: "cube03",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.exploredRuins &&
        state.events.cube02 &&
        !state.events.cube03,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube03: true,
            },
          };
        },
      },
    ],
  },

  cube04: {
    id: "cube04",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.exploredTemple &&
        state.events.cube03 &&
        !state.events.cube04,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube04: true,
            },
          };
        },
      },
    ],
  },

  cube05: {
    id: "cube05",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.exploredCitadel &&
        state.events.cube04 &&
        !state.events.cube05,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube05: true,
            },
          };
        },
      },
    ],
  },

  cubeLostKnowledge: {
    id: "cubeLostKnowledge",
    condition: (state: GameState) =>
      Boolean(
        state.relics.whispering_cube &&
        state.buildings.alchemistHall >= 1 &&
        state.story.seen.portalDiscovered &&
        !state.events.cubeLostKnowledge,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cubeLostKnowledge: true,
            },
          };
        },
      },
    ],
  },

  cube06: {
    id: "cube06",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.portalBlasted &&
        state.events.cube05 &&
        state.events.cubeLostKnowledge &&
        !state.events.cube06,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube06: true,
            },
          };
        },
      },
    ],
  },

  cube07: {
    id: "cube07",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.firstWaveVictory &&
        state.events.cube06 &&
        !state.events.cube07,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube07: true,
            },
          };
        },
      },
    ],
  },

  cube08: {
    id: "cube08",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.thirdWaveVictory &&
        state.events.cube07 &&
        !state.events.cube08,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube08: true,
            },
          };
        },
      },
    ],
  },

  cube09: {
    id: "cube09",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.fourthWaveVictory &&
        state.events.cube08 &&
        !state.events.cube09,
      ),
    timeProbability: 0.1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube09: true,
            },
          };
        },
      },
    ],
  },

  cubeHesitant: {
    id: "cubeHesitant",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.firstBossWaveVictory &&
        state.events.cube09 &&
        !state.events.cubeHesitant,
      ),
    timeProbability: 1,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cubeHesitant: true,
            },
          };
        },
      },
    ],
  },

  cube10: {
    id: "cube10",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.sixthWaveVictory &&
        state.events.cube09 &&
        state.events.cubeHesitant &&
        !state.events.cube10,
      ),
    timeProbability: 0.25,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube10: true,
            },
          };
        },
      },
    ],
  },

  cube11: {
    id: "cube11",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.eighthWaveVictory &&
        state.events.cube10 &&
        !state.events.cube11,
      ),
    timeProbability: 0.25,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube11: true,
            },
          };
        },
      },
    ],
  },

  cube12: {
    id: "cube12",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.secondBossWaveVictory &&
        state.events.cube11 &&
        !state.events.cube12,
      ),
    timeProbability: 0.25,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube12: true,
            },
          };
        },
      },
    ],
  },

  cube13: {
    id: "cube13",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.slaughteredCreatures &&
        state.events.cube12 &&
        !state.events.cube13,
      ),
    timeProbability: 0.02,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube13: true,
            },
            ...getGameWinAchievementUpdates(state),
          };
        },
      },
    ],
  },

  cube14a: {
    id: "cube14a",
    condition: (state: GameState) =>
      Boolean(
        (state.events.cube13 || state.story.seen.communicatedWithCreatures) &&
        state.events.cube12 &&
        !state.events.cube14a,
      ),
    timeProbability: 0.02,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube14a: true,
            },
          };
        },
      },
    ],
  },

  cube14b: {
    id: "cube14b",
    condition: (state: GameState) =>
      Boolean(state.events.cube14a && !state.events.cube14b),
    timeProbability: 0.02,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube14b: true,
            },
          };
        },
      },
    ],
  },

  cube14c: {
    id: "cube14c",
    condition: (state: GameState) =>
      Boolean(state.events.cube14b && !state.events.cube14c),
    timeProbability: 0.02,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube14c: true,
            },
          };
        },
      },
    ],
  },

  cube14d: {
    id: "cube14d",
    condition: (state: GameState) =>
      Boolean(state.events.cube14c && !state.events.cube14d),
    timeProbability: 0.02,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube14d: true,
            },
          };
        },
      },
    ],
  },

  cube15a: {
    id: "cube15a",
    condition: (state: GameState) =>
      Boolean(
        state.events.cube14d &&
        state.story.seen.slaughteredCreatures &&
        !state.events.cube15a,
      ),
    timeProbability: 0.02,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube15a: true,
            },
            // Redundant with cube13 on slaughter path; OR-merged if already set.
            ...getGameWinAchievementUpdates(state),
          };
        },
      },
    ],
  },

  cube15b: {
    id: "cube15b",
    condition: (state: GameState) =>
      Boolean(
        state.events.cube14d &&
        state.story.seen.communicatedWithCreatures &&
        !state.events.cube15b,
      ),
    timeProbability: 0.02,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube15b: true,
            },
            // Communicate path skips cube13 — award win flags here.
            ...getGameWinAchievementUpdates(state),
          };
        },
      },
    ],
  },

  cube16a: {
    id: "cube16a",
    condition: (state: GameState) =>
      Boolean(
        state.cruelMode && state.events.cube15a && !state.events.cube16a,
      ),
    timeProbability: 0.02,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube16a: true,
            },
            ...getGameWinAchievementUpdates(state),
          };
        },
      },
    ],
  },

  cube16b: {
    id: "cube16b",
    condition: (state: GameState) =>
      Boolean(
        state.cruelMode && state.events.cube15b && !state.events.cube16b,
      ),
    timeProbability: 0.02,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube16b: true,
            },
            ...getGameWinAchievementUpdates(state),
          };
        },
      },
    ],
  },
};
