import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";

export const loreEvents: Record<string, GameEvent> = {
  restlessKnight: {
    id: "restlessKnight",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 4 && !state.story.seen.restlessKnightSuccess,
    timeProbability: (state: GameState) => {
      return state.story.seen.restlessKnightFailed ? 20 : 15;
    },
    message: (state: GameState) =>
      state.story.seen.restlessKnightFailed ? "repeat" : "firstTime",
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    fallbackChoice: {
      id: "refuse",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              restlessKnightFailed: true,
            },
          },
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "payGold",
        cost: "50 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 50) {
            return {
              _logMessageKey: "outcome1",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 50,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightSuccess: true,
              },
            },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            _logMessageKey: "outcome2",
          };
        },
      },
      {
        id: "convince",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.2, {
            type: "knowledge",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.2, {
            type: "knowledge",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightSuccess: true,
                },
              },
              stats: {
                ...state.stats,
                madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
              },
              _logMessageKey: "outcome3",
            };
          } else {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightFailed: true,
                },
              },
              _logMessageKey: "outcome4",
            };
          }
        },
      },
      {
        id: "refuse",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightFailed: true,
              },
            },
            _logMessageKey: "outcome5",
          };
        },
      },
    ],
  },

  restlessKnightMountains: {
    id: "restlessKnightMountains",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 6 &&
      state.story.seen.restlessKnightSuccess &&
      !state.story.seen.restlessKnightMountains,
    timeProbability: (state: GameState) =>
      state.story.seen.restlessKnightMountainsFailed ? 20 : 15,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    fallbackChoice: {
      id: "refuse",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              restlessKnightMountainsFailed: true,
            },
          },
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "payGold",
        cost: "50 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 50) {
            return {
              _logMessageKey: "outcome1",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 50,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightMountains: true,
              },
            },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            _logMessageKey: "outcome2",
          };
        },
      },
      {
        id: "payFood",
        cost: "2500 food",
        effect: (state: GameState) => {
          if (state.resources.food < 2500) {
            return {
              _logMessageKey: "outcome3",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 2500,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightMountains: true,
              },
            },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            _logMessageKey: "outcome4",
          };
        },
      },
      {
        id: "refuse",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightMountainsFailed: true,
              },
            },
            _logMessageKey: "outcome5",
          };
        },
      },
    ],
  },

  restlessKnightCoast: {
    id: "restlessKnightCoast",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 8 &&
      state.story.seen.restlessKnightMountains &&
      !state.story.seen.restlessKnightCoast,
    timeProbability: (state: GameState) =>
      state.story.seen.restlessKnightCoastFailed ? 20 : 15,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    fallbackChoice: {
      id: "refuse",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              restlessKnightCoastFailed: true,
            },
          },
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "payGold",
        cost: "50 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 50) {
            return {
              _logMessageKey: "outcome1",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 50,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightCoast: true,
              },
            },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            _logMessageKey: "outcome2",
          };
        },
      },
      {
        id: "payFood",
        cost: "2500 food",
        effect: (state: GameState) => {
          if (state.resources.food < 2500) {
            return {
              _logMessageKey: "outcome3",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 2500,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightCoast: true,
              },
            },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            _logMessageKey: "outcome4",
          };
        },
      },
      {
        id: "convince",
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
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightCoast: true,
                },
              },
              stats: {
                ...state.stats,
                madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
              },
              _logMessageKey: "outcome5",
            };
          } else {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightCoastFailed: true,
                },
              },
              _logMessageKey: "outcome6",
            };
          }
        },
      },
      {
        id: "refuse",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightCoastFailed: true,
              },
            },
            _logMessageKey: "outcome7",
          };
        },
      },
    ],
  },

  restlessKnightDesert: {
    id: "restlessKnightDesert",
    condition: (state: GameState) =>
      state.buildings.bastion >= 1 &&
      state.buildings.darkEstate >= 1 &&
      state.story.seen.restlessKnightCoast &&
      !state.story.seen.restlessKnightDesert,
    timeProbability: (state: GameState) =>
      state.story.seen.restlessKnightDesertFailed ? 20 : 10,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    fallbackChoice: {
      id: "refuse",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              restlessKnightDesertFailed: true,
            },
          },
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "payGold",
        cost: "250 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessageKey: "outcome1",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 250,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightDesert: true,
              },
            },
            fellowship: {
              ...state.fellowship,
              restless_knight: true,
            },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            _logMessageKey: "outcome2",
          };
        },
      },
      {
        id: "paySilver",
        cost: "1000 silver",
        effect: (state: GameState) => {
          if (state.resources.silver < 1000) {
            return {
              _logMessageKey: "outcome3",
            };
          }

          return {
            resources: {
              ...state.resources,
              silver: state.resources.silver - 1000,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightDesert: true,
              },
            },
            fellowship: {
              ...state.fellowship,
              restless_knight: true,
            },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            _logMessageKey: "outcome4",
          };
        },
      },
      {
        id: "convince",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.05, {
            type: "knowledge",
            multiplier: 0.005,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.05, {
            type: "knowledge",
            multiplier: 0.005,
          });

          if (Math.random() < successChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightDesert: true,
                },
              },
              fellowship: {
                ...state.fellowship,
                restless_knight: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
              },
              _logMessageKey: "outcome5",
            };
          } else {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightDesertFailed: true,
                },
              },
              _logMessageKey: "outcome6",
            };
          }
        },
      },
      {
        id: "refuse",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightDesertFailed: true,
              },
            },
            _logMessageKey: "outcome7",
          };
        },
      },
    ],
  },

  restlessKnightBurden: {
    id: "restlessKnightBurden",
    condition: (state: GameState) =>
      state.cruelMode === true && Boolean(state.fellowship?.restless_knight),
    timeProbability: 45,
    repeatable: false,
    priority: 3,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000,
    fallbackChoice: {
      id: "decline",
      effect: (state: GameState) => ({
        stats: {
          ...state.stats,
          madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
        },
        _logMessageKey: "outcome0",
      }),
    },
    choices: [
      {
        id: "accept",
        effect: (state: GameState) => ({
          blessings: {
            ...state.blessings,
            knights_burden: true,
          },
          _logMessageKey: "outcome1",
        }),
      },
      {
        id: "decline",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
          },
          _logMessageKey: "outcome2",
        }),
      },
    ],
  },

  risingSmokeRumor: {
    id: "risingSmokeRumor",
    condition: (state: GameState): boolean =>
      Boolean(state.story.seen.fourthWaveVictory) &&
      Boolean(state.flags.forestUnlocked) &&
      !Boolean(state.story.seen.risingSmokeUnlocked),
    timeProbability: 20,
    repeatable: false,
    priority: 3,
    skipEventLog: true,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              risingSmokeUnlocked: true,
            },
          },
        }),
      },
    ],
  },
};
