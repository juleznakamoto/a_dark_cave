import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { useGameStore } from "@/game/state";

const FIRST_WAVE_MESSAGE =
  "Pale figures emerge from the cave, finally freed, their ember eyes cutting through the dark as they march towards the city.";

const SECOND_WAVE_MESSAGE =
  "They creatures return in greater numbers, clad in crude bone, their weapons glowing with foul light.";

const THIRD_WAVE_MESSAGE =
  "Hoards of pale creatures come from the cave, screams shake even the stones, their bone weapons cracking the ground.";

const FOURTH_WAVE_MESSAGE =
  "The sky seems to darken as an uncountable mass of pale creatures surges from the cave, pressing towards the city.";

const FIFTH_WAVE_MESSAGE =
  "From the cave emerge countless pale figures, larger and more twisted than before, their forms unspeakable as they advance on the city.";

const VICTORY_MESSAGE = (silverReward: number) =>
  `Your defenses hold! The pale creatures crash against your walls but cannot break through. Victory is yours! You claim ${silverReward} silver from the fallen creatures.`;

function createDefeatMessage(
  casualties: number,
  damagedBuildings: string[],
): string {
  let msg = "The creatures overwhelm your defenses. ";

  if (casualties === 1) {
    msg +=
      "One villager falls before the remaining creatures retreat to the depths.";
  } else {
    msg += `${casualties} villagers fall before the remaining creatures retreat to the depths.`;
  }

  if (damagedBuildings.length > 0) {
    msg += ` Your ${damagedBuildings.join(" and ")} ${damagedBuildings.length === 1 ? "is" : "are"} damaged in the assault.`;
  }

  return msg;
}

function handleDefeat(
  state: GameState,
  DamageBuildingMultiplier: number,
  maxCasualties: number,
) {
  const currentPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  const minCasualities = Math.ceil(
    Math.random() * 0.8 * maxCasualties + 0.2 * maxCasualties + state.CM * 5,
  );
  const casualties = Math.min(minCasualities, currentPopulation);
  const deathResult = killVillagers(state, casualties);

  let buildingDamage = {};
  const damagedBuildings: string[] = [];

  // Probability increases with multiplier (from 10% to 90%)
  const baseChance = Math.min(
    DamageBuildingMultiplier * 0.1 + state.CM * 0.1,
    0.9,
  );

  // helper function for random check
  const chance = (prob: number) => Math.random() < prob;

  // Bastion damage
  if (
    state.buildings.bastion > 0 &&
    !state.story.seen.bastionDamaged &&
    chance(baseChance)
  ) {
    buildingDamage = { ...buildingDamage, bastionDamaged: true };
    damagedBuildings.push("bastion");
  }

  // Watchtower damage
  if (
    state.buildings.watchtower > 0 &&
    !state.story.seen.watchtowerDamaged &&
    chance(baseChance)
  ) {
    buildingDamage = { ...buildingDamage, watchtowerDamaged: true };
    damagedBuildings.push("watchtower");
  }

  // Palisades damage
  if (
    state.buildings.palisades > 0 &&
    !state.story.seen.palisadesDamaged &&
    chance(baseChance)
  ) {
    buildingDamage = { ...buildingDamage, palisadesDamaged: true };
    damagedBuildings.push("palisades");
  }

  return {
    ...deathResult,
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        ...buildingDamage,
      },
    },
    _logMessage: createDefeatMessage(casualties, damagedBuildings),
  };
}

export const attackWaveEvents: Record<string, GameEvent> = {
  firstWave: {
    id: "firstWave",
    condition: (state: GameState) => {
      const baseCondition = state.flags.portalBlasted &&
        state.story.seen.hasBastion &&
        !state.story.seen.firstWaveVictory;
      
      if (!baseCondition) return false;

      // Check if timer exists and has expired
      const timer = state.attackWaveTimers?.firstWave;
      if (!timer || timer.defeated) {
        // Initialize timer if conditions just met
        if (!timer) {
          const now = Date.now();
          const duration = 10 * 60 * 1000; // 10 minutes
          setTimeout(() => {
            useGameStore.setState((s) => ({
              attackWaveTimers: {
                ...s.attackWaveTimers,
                firstWave: {
                  startTime: now,
                  duration: duration,
                  defeated: false,
                },
              },
            }));
          }, 0);
        }
        return false;
      }

      // Check if timer has expired
      const elapsed = Date.now() - timer.startTime;
      return elapsed >= timer.duration;
    },
    triggerType: "resource",
    timeProbability: 10,
    title: "The First Wave",
    message: FIRST_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      return {
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            firstWaveTriggered: true,
          },
        },
        _combatData: {
          enemy: {
            name: "Group of pale creatures",
            attack: Math.ceil(Math.random() * 10) + 15 + state.CM * 5,
            maxHealth: 200 + state.CM * 50,
            currentHealth: 200 + state.CM * 50,
          },
          eventTitle: "The First Wave",
          eventMessage: FIRST_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + 200,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                firstWaveVictory: true,
              },
            },
            attackWaveTimers: {
              ...state.attackWaveTimers,
              firstWave: {
                ...state.attackWaveTimers.firstWave,
                defeated: true,
              },
            },
            _logMessage: VICTORY_MESSAGE(200),
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(state, 1, 5);
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                firstWave: {
                  startTime: Date.now(),
                  duration: 20 * 60 * 1000, // 20 minutes on defeat
                  defeated: false,
                },
              },
            };
          },
        },
      };
    },
  },

  secondWave: {
    id: "secondWave",
    condition: (state: GameState) => {
      const baseCondition = state.story.seen.firstWaveVictory && !state.story.seen.secondWaveVictory;
      
      if (!baseCondition) return false;

      const timer = state.attackWaveTimers?.secondWave;
      if (!timer || timer.defeated) {
        if (!timer) {
          const now = Date.now();
          const duration = 10 * 60 * 1000;
          setTimeout(() => {
            useGameStore.setState((s) => ({
              attackWaveTimers: {
                ...s.attackWaveTimers,
                secondWave: {
                  startTime: now,
                  duration: duration,
                  defeated: false,
                },
              },
            }));
          }, 0);
        }
        return false;
      }

      const elapsed = Date.now() - timer.startTime;
      return elapsed >= timer.duration;
    },
    triggerType: "resource",
    timeProbability: 10,
    title: "The Second Wave",
    message: SECOND_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      return {
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            secondWaveTriggered: true,
          },
        },
        _combatData: {
          enemy: {
            name: "Pack of pale creatures",
            attack: Math.ceil(Math.random() * 10) + 25 + state.CM * 5,
            maxHealth: 250 + state.CM * 50,
            currentHealth: 250 + state.CM * 50,
          },
          eventTitle: "The Second Wave",
          eventMessage: SECOND_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + 300,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                secondWaveVictory: true,
              },
            },
            attackWaveTimers: {
              ...state.attackWaveTimers,
              secondWave: {
                ...state.attackWaveTimers.secondWave,
                defeated: true,
              },
            },
            _logMessage: VICTORY_MESSAGE(300),
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(state, 2, 10);
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                secondWave: {
                  startTime: Date.now(),
                  duration: 20 * 60 * 1000,
                  defeated: false,
                },
              },
            };
          },
        },
      };
    },
  },

  thirdWave: {
    id: "thirdWave",
    condition: (state: GameState) => {
      const baseCondition = state.story.seen.wizardDecryptsScrolls &&
        state.story.seen.secondWaveVictory &&
        !state.story.seen.thirdWaveVictory;
      
      if (!baseCondition) return false;

      const timer = state.attackWaveTimers?.thirdWave;
      if (!timer || timer.defeated) {
        if (!timer) {
          const now = Date.now();
          const duration = 10 * 60 * 1000;
          setTimeout(() => {
            useGameStore.setState((s) => ({
              attackWaveTimers: {
                ...s.attackWaveTimers,
                thirdWave: {
                  startTime: now,
                  duration: duration,
                  defeated: false,
                },
              },
            }));
          }, 0);
        }
        return false;
      }

      const elapsed = Date.now() - timer.startTime;
      return elapsed >= timer.duration;
    },
    triggerType: "resource",
    timeProbability: 10,
    title: "The Third Wave",
    message: THIRD_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      return {
        _combatData: {
          enemy: {
            name: "Horde of pale creatures",
            attack: Math.ceil(Math.random() * 10) + 35 + state.CM * 10,
            maxHealth: 300 + state.CM * 100,
            currentHealth: 300 + state.CM * 100,
          },
          eventTitle: "The Third Wave",
          eventMessage: THIRD_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + 400,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                thirdWaveVictory: true,
              },
            },
            attackWaveTimers: {
              ...state.attackWaveTimers,
              thirdWave: {
                ...state.attackWaveTimers.thirdWave,
                defeated: true,
              },
            },
            _logMessage: VICTORY_MESSAGE(400),
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(state, 3, 15);
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                thirdWave: {
                  startTime: Date.now(),
                  duration: 20 * 60 * 1000,
                  defeated: false,
                },
              },
            };
          },
        },
      };
    },
  },

  fourthWave: {
    id: "fourthWave",
    condition: (state: GameState) => {
      const baseCondition = state.weapons.frostglass_sword &&
        state.story.seen.thirdWaveVictory &&
        !state.story.seen.fourthWaveVictory;
      
      if (!baseCondition) return false;

      const timer = state.attackWaveTimers?.fourthWave;
      if (!timer || timer.defeated) {
        if (!timer) {
          const now = Date.now();
          const duration = 10 * 60 * 1000;
          setTimeout(() => {
            useGameStore.setState((s) => ({
              attackWaveTimers: {
                ...s.attackWaveTimers,
                fourthWave: {
                  startTime: now,
                  duration: duration,
                  defeated: false,
                },
              },
            }));
          }, 0);
        }
        return false;
      }

      const elapsed = Date.now() - timer.startTime;
      return elapsed >= timer.duration;
    },
    triggerType: "resource",
    timeProbability: 10,
    title: "The Fourth Wave",
    message: FOURTH_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      return {
        _combatData: {
          enemy: {
            name: "Legion of pale creatures",
            attack: Math.ceil(Math.random() * 10) + 45 + state.CM * 15,
            maxHealth: 350 + state.CM * 150,
            currentHealth: 350 + state.CM * 150,
          },
          eventTitle: "The Fourth Wave",
          eventMessage: FOURTH_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + 500,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                fourthWaveVictory: true,
              },
            },
            attackWaveTimers: {
              ...state.attackWaveTimers,
              fourthWave: {
                ...state.attackWaveTimers.fourthWave,
                defeated: true,
              },
            },
            _logMessage: VICTORY_MESSAGE(500),
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(state, 4, 20);
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                fourthWave: {
                  startTime: Date.now(),
                  duration: 20 * 60 * 1000,
                  defeated: false,
                },
              },
            };
          },
        },
      };
    },
  },

  fifthWave: {
    id: "fifthWave",
    condition: (state: GameState) => {
      const baseCondition = state.weapons.bloodstone_staff &&
        state.story.seen.fourthWaveVictory &&
        !state.story.seen.fifthWaveVictory;
      
      if (!baseCondition) return false;

      const timer = state.attackWaveTimers?.fifthWave;
      if (!timer || timer.defeated) {
        if (!timer) {
          const now = Date.now();
          const duration = 10 * 60 * 1000;
          setTimeout(() => {
            useGameStore.setState((s) => ({
              attackWaveTimers: {
                ...s.attackWaveTimers,
                fifthWave: {
                  startTime: now,
                  duration: duration,
                  defeated: false,
                },
              },
            }));
          }, 0);
        }
        return false;
      }

      const elapsed = Date.now() - timer.startTime;
      return elapsed >= timer.duration;
    },
    triggerType: "resource",
    timeProbability: 10,
    title: "The Final Wave",
    message: FIFTH_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      return {
        _combatData: {
          enemy: {
            name: "Swarm of pale creatures",
            attack: [55, 60, 65, 70][Math.ceil(Math.random() * 3)] + state.CM * 20,
            maxHealth: 600 + state.CM * 200,
            currentHealth: 600 + state.CM * 200,
          },
          eventTitle: "The Final Wave",
          eventMessage: FIFTH_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + 1000,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                fifthWaveVictory: true,
              },
            },
            attackWaveTimers: {
              ...state.attackWaveTimers,
              fifthWave: {
                ...state.attackWaveTimers.fifthWave,
                defeated: true,
              },
            },
            _logMessage:
              "The final wave has been defeated! The path beyond the shattered portal now lies open. You can venture deeper into the depths to discover what lies beyond. You claim 1000 silver from the fallen creatures.",
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(state, 5, 25);
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                fifthWave: {
                  startTime: Date.now(),
                  duration: 20 * 60 * 1000,
                  defeated: false,
                },
              },
            };
          },
        },
      };
    },
  },
};