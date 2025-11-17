import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

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

const VICTORY_MESSAGE = (goldReward: number) =>
  `Your defenses hold! The pale creatures crash against your walls but cannot break through. Victory is yours! You claim ${goldReward} gold from the fallen creatures.`;

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
    Math.random() * 0.75 * maxCasualties + 0.25 * maxCasualties + state.CM * 5,
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
    condition: (state: GameState) =>
      state.flags.portalBlasted &&
      state.story.seen.hasBastion &&
      !state.story.seen.firstWaveVictory,
    triggerType: "resource",
    timeProbability: 4,
    title: "The First Wave",
    message: FIRST_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      return {
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
              gold: state.resources.gold + 50,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                firstWaveVictory: true,
              },
            },
            _logMessage: VICTORY_MESSAGE(50),
          }),
          onDefeat: () => handleDefeat(state, 1, 5),
        },
      };
    },
  },

  secondWave: {
    id: "secondWave",
    condition: (state: GameState) =>
      state.story.seen.firstWaveVictory && !state.story.seen.secondWaveVictory,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Second Wave",
    message: SECOND_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      return {
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
              gold: state.resources.gold + 75,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                secondWaveVictory: true,
              },
            },
            _logMessage: VICTORY_MESSAGE(75),
          }),
          onDefeat: () => handleDefeat(state, 2, 10),
        },
      };
    },
  },

  thirdWave: {
    id: "thirdWave",
    condition: (state: GameState) =>
      state.story.seen.wizardDecryptsScrolls &&
      state.story.seen.secondWaveVictory &&
      !state.story.seen.thirdWaveVictory,
    triggerType: "resource",
    timeProbability: 5,
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
              gold: state.resources.gold + 100,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                thirdWaveVictory: true,
              },
            },
            _logMessage: VICTORY_MESSAGE(100),
          }),
          onDefeat: () => handleDefeat(state, 3, 15),
        },
      };
    },
  },

  fourthWave: {
    id: "fourthWave",
    condition: (state: GameState) =>
      state.weapons.frostglass_sword &&
      state.story.seen.thirdWaveVictory &&
      !state.story.seen.fourthWaveVictory,
    triggerType: "resource",
    timeProbability: 5,
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
              gold: state.resources.gold + 150,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                fourthWaveVictory: true,
              },
            },
            _logMessage: VICTORY_MESSAGE(150),
          }),
          onDefeat: () => handleDefeat(state, 4, 20),
        },
      };
    },
  },

  fifthWave: {
    id: "fifthWave",
    condition: (state: GameState) =>
      state.weapons.bloodstone_staff &&
      state.story.seen.fourthWaveVictory &&
      !state.story.seen.fifthWaveVictory,
    triggerType: "resource",
    timeProbability: 5,
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
            attack: [60, 65, 70][Math.ceil(Math.random() * 2)] + state.CM * 20,
            maxHealth: 650 + state.CM * 250,
            currentHealth: 650 + state.CM * 250,
          },
          eventTitle: "The Final Wave",
          eventMessage: FIFTH_WAVE_MESSAGE,
          onVictory: () => ({
            resources: {
              ...state.resources,
              gold: state.resources.gold + 200,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                fifthWaveVictory: true,
              },
            },
            _logMessage:
              "The final wave has been defeated! The path beyond the shattered portal now lies open. You can venture deeper into the depths to discover what lies beyond. You claim 200 gold from the fallen creatures.",
          }),
          onDefeat: () => handleDefeat(state, 5, 25),
        },
      };
    },
  },
};
