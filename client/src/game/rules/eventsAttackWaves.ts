import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { useGameStore } from "@/game/state";

// Attack Wave Parameters
const WAVE_PARAMS = {
  firstWave: {
    attack: { base: 15, random: 10 },
    health: 200,
    silverReward: 200,
    initialDuration: 10 * 60 * 1000, // 10 minutes
    defeatDuration: 20 * 60 * 1000, // 20 minutes
    maxCasualties: 5,
    buildingDamageMultiplier: 1,
  },
  secondWave: {
    attack: { base: 25, random: 10 },
    health: 300,
    silverReward: 300,
    initialDuration: 10 * 60 * 1000,
    defeatDuration: 20 * 60 * 1000,
    maxCasualties: 10,
    buildingDamageMultiplier: 2,
  },
  thirdWave: {
    attack: { base: 35, random: 10 },
    health: 350,
    silverReward: 400,
    initialDuration: 10 * 60 * 1000,
    defeatDuration: 20 * 60 * 1000,
    maxCasualties: 15,
    buildingDamageMultiplier: 3,
  },
  fourthWave: {
    attack: { base: 45, random: 10 },
    health: 400,
    silverReward: 500,
    initialDuration: 10 * 60 * 1000,
    defeatDuration: 20 * 60 * 1000,
    maxCasualties: 20,
    buildingDamageMultiplier: 4,
  },
  fifthWave: {
    attack: { base: 55, random: 15, options: [55, 60, 65, 70] },
    health: 600,
    silverReward: 1000,
    initialDuration: 10 * 60 * 1000,
    defeatDuration: 20 * 60 * 1000,
    maxCasualties: 25,
    buildingDamageMultiplier: 5,
  },
} as const;

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
      if (!timer) {
        // Initialize timer if conditions just met
        const now = Date.now();
        useGameStore.setState((s) => ({
          attackWaveTimers: {
            ...s.attackWaveTimers,
            firstWave: {
              startTime: now,
              duration: WAVE_PARAMS.firstWave.initialDuration,
              defeated: false,
              provoked: false,
            },
          },
        }));
        return false;
      }

      if (timer.defeated) return false;

      // Check if timer has expired
      const elapsed = Date.now() - timer.startTime;
      return elapsed >= timer.duration;
    },
    triggerType: "resource",
    timeProbability: 0.5,
    title: "The First Wave",
    message: FIRST_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      const params = WAVE_PARAMS.firstWave;
      const health = params.health + state.CM * 50;
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
            attack: Math.ceil(Math.random() * params.attack.random) + params.attack.base + state.CM * 5,
            maxHealth: health,
            currentHealth: health,
          },
          eventTitle: "The First Wave",
          eventMessage: FIRST_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + params.silverReward,
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
            _logMessage: VICTORY_MESSAGE(params.silverReward),
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(state, params.buildingDamageMultiplier, params.maxCasualties);
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                firstWave: {
                  startTime: Date.now(),
                  duration: params.defeatDuration,
                  defeated: false,
                },
              },
              events: {
                ...state.events,
                firstWave: false, // Reset event triggered state
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
      if (!timer) {
        const now = Date.now();
        useGameStore.setState((s) => ({
          attackWaveTimers: {
            ...s.attackWaveTimers,
            secondWave: {
              startTime: now,
              duration: WAVE_PARAMS.secondWave.initialDuration,
              defeated: false,
              provoked: false,
            },
          },
        }));
        return false;
      }

      if (timer.defeated) return false;

      const elapsed = Date.now() - timer.startTime;
      return elapsed >= timer.duration;
    },
    triggerType: "resource",
    timeProbability: 0.5,
    title: "The Second Wave",
    message: SECOND_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      const params = WAVE_PARAMS.secondWave;
      const health = params.health + state.CM * 50;
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
            attack: Math.ceil(Math.random() * params.attack.random) + params.attack.base + state.CM * 5,
            maxHealth: health,
            currentHealth: health,
          },
          eventTitle: "The Second Wave",
          eventMessage: SECOND_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + params.silverReward,
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
            _logMessage: VICTORY_MESSAGE(params.silverReward),
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(state, params.buildingDamageMultiplier, params.maxCasualties);
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                secondWave: {
                  startTime: Date.now(),
                  duration: params.defeatDuration,
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
      if (!timer) {
        const now = Date.now();
        useGameStore.setState((s) => ({
          attackWaveTimers: {
            ...s.attackWaveTimers,
            thirdWave: {
              startTime: now,
              duration: WAVE_PARAMS.thirdWave.initialDuration,
              defeated: false,
              provoked: false,
            },
          },
        }));
        return false;
      }

      if (timer.defeated) return false;

      const elapsed = Date.now() - timer.startTime;
      return elapsed >= timer.duration;
    },
    triggerType: "resource",
    timeProbability: 0.5,
    title: "The Third Wave",
    message: THIRD_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      const params = WAVE_PARAMS.thirdWave;
      const health = params.health + state.CM * 100;
      return {
        _combatData: {
          enemy: {
            name: "Horde of pale creatures",
            attack: Math.ceil(Math.random() * params.attack.random) + params.attack.base + state.CM * 10,
            maxHealth: health,
            currentHealth: health,
          },
          eventTitle: "The Third Wave",
          eventMessage: THIRD_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + params.silverReward,
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
            _logMessage: VICTORY_MESSAGE(params.silverReward),
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(state, params.buildingDamageMultiplier, params.maxCasualties);
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                thirdWave: {
                  startTime: Date.now(),
                  duration: params.defeatDuration,
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
      if (!timer) {
        const now = Date.now();
        useGameStore.setState((s) => ({
          attackWaveTimers: {
            ...s.attackWaveTimers,
            fourthWave: {
              startTime: now,
              duration: WAVE_PARAMS.fourthWave.initialDuration,
              defeated: false,
              provoked: false,
            },
          },
        }));
        return false;
      }

      if (timer.defeated) return false;

      const elapsed = Date.now() - timer.startTime;
      return elapsed >= timer.duration;
    },
    triggerType: "resource",
    timeProbability: 0.5,
    title: "The Fourth Wave",
    message: FOURTH_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      const params = WAVE_PARAMS.fourthWave;
      const health = params.health + state.CM * 150;
      return {
        _combatData: {
          enemy: {
            name: "Legion of pale creatures",
            attack: Math.ceil(Math.random() * params.attack.random) + params.attack.base + state.CM * 15,
            maxHealth: health,
            currentHealth: health,
          },
          eventTitle: "The Fourth Wave",
          eventMessage: FOURTH_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + params.silverReward,
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
            _logMessage: VICTORY_MESSAGE(params.silverReward),
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(state, params.buildingDamageMultiplier, params.maxCasualties);
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                fourthWave: {
                  startTime: Date.now(),
                  duration: params.defeatDuration,
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
      if (!timer) {
        const now = Date.now();
        useGameStore.setState((s) => ({
          attackWaveTimers: {
            ...s.attackWaveTimers,
            fifthWave: {
              startTime: now,
              duration: WAVE_PARAMS.fifthWave.initialDuration,
              defeated: false,
              provoked: false,
            },
          },
        }));
        return false;
      }

      if (timer.defeated) return false;

      const elapsed = Date.now() - timer.startTime;
      return elapsed >= timer.duration;
    },
    triggerType: "resource",
    timeProbability: 0.5,
    title: "The Final Wave",
    message: FIFTH_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      const params = WAVE_PARAMS.fifthWave;
      const health = params.health + state.CM * 200;
      return {
        _combatData: {
          enemy: {
            name: "Swarm of pale creatures",
            attack: params.attack.options![Math.floor(Math.random() * params.attack.options!.length)] + state.CM * 20,
            maxHealth: health,
            currentHealth: health,
          },
          eventTitle: "The Final Wave",
          eventMessage: FIFTH_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + params.silverReward,
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
              `The final wave has been defeated! The path beyond the shattered portal now lies open. You can venture deeper into the depths to discover what lies beyond. You claim ${params.silverReward} silver from the fallen creatures.`,
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(state, params.buildingDamageMultiplier, params.maxCasualties);
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                fifthWave: {
                  startTime: Date.now(),
                  duration: params.defeatDuration,
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