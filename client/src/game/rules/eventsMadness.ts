import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { addFreeVillagersWithinCap, killVillagers } from "@/game/stateHelpers";
import { getTotalMadness, getTotalLuck } from "./effectsCalculation";
import { getCurrentPopulation, getMaxPopulation } from "../population";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";

const withCruelMadnessBonus = (state: GameState, baseMadnessGain: number): number =>
  baseMadnessGain +
  (state.cruelMode ? CRUEL_MODE.madnessFromEvents.flatBonusWhenCruel : 0);

export const madnessEvents: Record<string, GameEvent> = {
  whisperingVoices: {
    id: "whisperingVoices",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 10 && !state.events.whisperingVoices,
    timeProbability: 30,

    priority: 2,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        whisperingVoices: true,
      },
      stats: {
        ...state.stats,
        madnessFromEvents:
          (state.stats.madnessFromEvents || 0) +
          withCruelMadnessBonus(state, 1),
      },
    }),
  },

  shadowsMove: {
    id: "shadowsMove",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 15 && !state.events.shadowsMove,
    timeProbability: 30,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        shadowsMove: true,
      },
      stats: {
        ...state.stats,
        madnessFromEvents:
          (state.stats.madnessFromEvents || 0) +
          withCruelMadnessBonus(state, 2),
      },
    }),
  },

  villagerStares: {
    id: "villagerStares",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 20 &&
      state.villagers.free > 0 &&
      !state.events.villagerStares,
    timeProbability: 30,

    priority: 3,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "confront",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                villagerStares: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 2),
              },
              _logMessageKey: "outcome0",
            };
          } else {
            const deathResult = killVillagers(state, 1);
            return {
              ...deathResult,
              events: {
                ...state.events,
                villagerStares: true,
              },
              stats: {
                ...state.stats,
                ...(deathResult.stats || {}),
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 3),
              },
              _logMessageKey: "outcome1",
            };
          }
        },
      },
      {
        id: "avoid",
        effect: (state: GameState) => {
          const deathResult = killVillagers(state, 1);
          return {
            ...deathResult,
            events: {
              ...state.events,
              villagerStares: true,
            },
            stats: {
              ...state.stats,
              ...(deathResult.stats || {}),
              madnessFromEvents:
                (state.stats.madnessFromEvents || 0) +
                withCruelMadnessBonus(state, 2),
            },
            _logMessageKey: "outcome2",
          };
        },
      },
    ],
  },

  bloodInWater: {
    id: "bloodInWater",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 25 && !state.events.bloodInWater,
    timeProbability: 30,
    priority: 2,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        bloodInWater: true,
      },
      stats: {
        ...state.stats,
        madnessFromEvents:
          (state.stats.madnessFromEvents || 0) +
          withCruelMadnessBonus(state, 2),
      },
    }),
  },

  facesInWalls: {
    id: "facesInWalls",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 27 && !state.events.facesInWalls,

    timeProbability: 30,

    priority: 3,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "examine",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.0, {
            type: "knowledge",
            multiplier: 0.0075,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.0, {
            type: "knowledge",
            multiplier: 0.0075,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                facesInWalls: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 1),
              },
              _logMessageKey: "outcome0",
            };
          } else {
            return {
              events: {
                ...state.events,
                facesInWalls: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 5),
              },
              _logMessageKey: "outcome1",
            };
          }
        },
      },
      {
        id: "ignore",
        effect: (state: GameState) => ({
          events: {
            ...state.events,
            facesInWalls: true,
          },
          stats: {
            ...state.stats,
            madnessFromEvents:
              (state.stats.madnessFromEvents || 0) +
              withCruelMadnessBonus(state, 3),
          },
          _logMessageKey: "outcome2",
        }),
      },
    ],
  },

  wrongVillagers: {
    id: "wrongVillagers",
    condition: (state: GameState) => {
      const currentPopulation = getCurrentPopulation(state);
      const maxPopulation = getMaxPopulation(state);
      const spaceForThree = currentPopulation + 3 <= maxPopulation;

      return (
        getTotalMadness(state) >= 30 &&
        state.villagers.free > 2 &&
        spaceForThree &&
        !state.events.wrongVillagers
      );
    },
    timeProbability: 30,
    priority: 2,
    repeatable: false,
    effect: (state: GameState) => {
      const { patch } = addFreeVillagersWithinCap(state, 3);

      return {
        ...patch,
        events: {
          ...state.events,
          wrongVillagers: true,
        },
        stats: {
          ...state.stats,
          madnessFromEvents:
            (state.stats.madnessFromEvents || 0) +
            withCruelMadnessBonus(state, 2),
        },
      };
    },
  },

  skinCrawling: {
    id: "skinCrawling",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 35 && !state.events.skinCrawling,
    timeProbability: 30,

    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "calm_down",
        relevant_stats: ["knowledge", "luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.0, {
            type: "knowledge",
            multiplier: 0.005,
          }, {
            type: "luck",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.0, {
            type: "knowledge",
            multiplier: 0.005,
          }, {
            type: "luck",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                skinCrawling: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
              },
              _logMessageKey: "outcome0",
            };
          } else {
            return {
              events: {
                ...state.events,
                skinCrawling: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 2),
              },
              _logMessageKey: "outcome1",
            };
          }
        },
      },
      {
        id: "keep_scratching",
        effect: (state: GameState) => {
          const deathResult = killVillagers(state, 5 + cruelModeScale(state) * 3);
          const killedCount = deathResult.villagersKilled ?? 0;
          return {
            ...deathResult,
            events: {
              ...state.events,
              skinCrawling: true,
            },
            stats: {
              ...state.stats,
              ...(deathResult.stats || {}),
              madnessFromEvents:
                (state.stats.madnessFromEvents || 0) +
                withCruelMadnessBonus(state, 2),
            },
            _logMessageKey: "outcome2",
            _logMessageVars: { killedVillagers: killedCount },
          };
        },
      },
    ],
  },

  creatureInHut: {
    id: "creatureInHut",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 35 &&
      state.buildings.woodenHut > 0 &&
      !state.events.creatureInHut,
    timeProbability: 30,

    priority: 3,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "burn_hut",
        relevant_stats: ["luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.1, {
            type: "luck",
            multiplier: 0.015,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.1, {
            type: "luck",
            multiplier: 0.015,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                creatureInHut: true,
              },
              resources: {
                ...state.resources,
                gold: (state.resources.gold || 0) + 250,
              },
              buildings: {
                ...state.buildings,
                woodenHut: Math.max(0, state.buildings.woodenHut - 1),
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 0),
              },
              _logMessageKey: "outcome0",
            };
          } else {
            const deathResult = killVillagers(state, 2);
            return {
              ...deathResult,
              events: {
                ...state.events,
                creatureInHut: true,
              },
              buildings: {
                ...state.buildings,
                woodenHut: Math.max(0, state.buildings.woodenHut - 1),
              },
              stats: {
                ...state.stats,
                ...(deathResult.stats || {}),
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 3),
              },
              _logMessageKey: "outcome1",
            };
          }
        },
      },
      {
        id: "do_nothing",
        effect: (state: GameState) => ({
          events: {
            ...state.events,
            creatureInHut: true,
          },
          stats: {
            ...state.stats,
            madnessFromEvents:
              (state.stats.madnessFromEvents || 0) +
              withCruelMadnessBonus(state, 3),
          },
          _logMessageKey: "outcome2",
        }),
      },
    ],
  },

  wrongReflections: {
    id: "wrongReflections",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 40 && !state.events.wrongReflections,
    timeProbability: 30,

    priority: 2,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "investigate",
        relevant_stats: ["knowledge", "luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.0025,
          }, {
            type: "luck",
            multiplier: 0.005,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.0025,
          }, {
            type: "luck",
            multiplier: 0.005,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                wrongReflections: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents: (state.stats.madnessFromEvents || 0),
              },
              _logMessageKey: "outcome0",
            };
          } else {
            return {
              events: {
                ...state.events,
                wrongReflections: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 5),
              },
              _logMessageKey: "outcome1",
            };
          }
        },
      },
      {
        id: "cover_well",
        effect: (state: GameState) => {
          // In cruel mode, exactly 8 villagers perish of thirst
          const thirstDeaths = state.cruelMode ? 8 : 4;
          const deathResult = killVillagers(state, thirstDeaths);

          return {
            ...deathResult,
            events: {
              ...state.events,
              wrongReflections: true,
            },
            stats: {
              ...state.stats,
              ...(deathResult.stats || {}),
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            _logMessageKey: "outcome2",
            _logMessageVars: { thirstDeaths },
          };
        },
      },
    ],
  },

  villagersStareAtSky: {
    id: "villagersStareAtSky",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 45 && !state.events.villagersStareAtSky,
    timeProbability: 30,

    priority: 2,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "shake_them",
        relevant_stats: ["knowledge", "luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.0025,
          }, {
            type: "luck",
            multiplier: 0.005,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.0025,
          }, {
            type: "luck",
            multiplier: 0.005,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                villagersStareAtSky: true,
              },
              _logMessageKey: "outcome0",
            };
          } else {
            const deathResult = killVillagers(state, 1);
            return {
              ...deathResult,
              events: {
                ...state.events,
                villagersStareAtSky: true,
              },
              stats: {
                ...state.stats,
                ...(deathResult.stats || {}),
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 3),
              },
              _logMessageKey: "outcome1",
            };
          }
        },
      },
      {
        id: "look_up_too",
        effect: (state: GameState) => ({
          events: {
            ...state.events,
            villagersStareAtSky: true,
          },
          stats: {
            ...state.stats,
            madnessFromEvents:
              (state.stats.madnessFromEvents || 0) +
              withCruelMadnessBonus(state, 4),
          },
          _logMessageKey: "outcome2",
        }),
      },
    ],
  },

  monolithDemand: {
    id: "monolithDemand",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 20 &&
      !state.events.monolithDemand &&
      !state.buildings.blackMonolith,
    timeProbability: 5,

    priority: 3,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        monolithDemand: true,
      },
      flags: {
        ...state.flags,
        monolithUnlocked: true,
      },
    }),
  },

  humanSacrificeDemand: {
    id: "humanSacrificeDemand",
    condition: (state: GameState) =>
      state.flags.monolithUnlocked &&
      getTotalMadness(state) >= 25 &&
      !state.events.humanSacrificeDemand &&
      state.buildings.blackMonolith > 0,

    timeProbability: 5,

    priority: 3,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        humanSacrificeDemand: true,
      },
      flags: {
        ...state.flags,
        humanSacrificeUnlocked: true,
      },
    }),
  },
};
