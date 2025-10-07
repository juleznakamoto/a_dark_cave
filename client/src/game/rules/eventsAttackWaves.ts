import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

const FIRST_WAVE_MESSAGE =
  "The earth shudders as pale figures emerge from the cave, finally freed, their ember eyes cutting through the dark as they march towards the city.";

const SECOND_WAVE_MESSAGE =
  "They creatures return in greater numbers, clad in crude bone, their weapons glowing with foul light.";

const THIRD_WAVE_MESSAGE =
  "Terrifying roars shake the stone. Hoards of pale creatures come from the cave, their bone weapons cracking the ground.";

const FOURTH_WAVE_MESSAGE =
  "The sky seems to darken as an uncountable mass of pale creatures surge from the cave, pressing towards the city.";

const FIFTH_WAVE_MESSAGE =
  "From the cave emerge countless pale figures, larger and more twisted than before, their forms unspeakable as they advance on the city.";

const VICTORY_MESSAGE =
  "Your defenses hold! The pale creatures crash against your walls but cannot break through. Victory is yours!";

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
  const minCasualities = Math.floor(
    Math.random() * 0.75 * maxCasualties + 0.25 * maxCasualties,
  );
  const casualties = Math.min(minCasualities, currentPopulation);
  const deathResult = killVillagers(state, casualties);

  let buildingDamage = {};
  const damagedBuildings: string[] = [];

  // Probability increases with multiplier (from 20% to 90%)
  const baseChance = Math.min(DamageBuildingMultiplier * 0.2, 0.9);

  // helper function for random check
  const chance = (prob: number) => Math.random() < prob;

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
    chance(baseChance * 1.1) // palisades are more exposed
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
      state.flags.portalBlasted && state.story.seen.hasBastion,
    // &!!state.story.seen.firstWave,
    triggerType: "resource",
    timeProbability: 0.05,
    title: "The First Wave",
    message: FIRST_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            firstWave: true,
          },
        },
        _combatData: {
          enemy: {
            name: "Group of pale creatures",
            attack: [12, 15, 18][Math.floor(Math.random() * 3)],
            maxHealth: 100,
            currentHealth: 100,
          },
          eventTitle: "The First Wave",
          eventMessage: FIRST_WAVE_MESSAGE,
          onVictory: () => ({
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                firstWaveVictory: true,
              },
            },
            _logMessage: VICTORY_MESSAGE,
          }),
          onDefeat: () => handleDefeat(state, 1, 5),
        },
      };
    },
  },

  secondWave: {
    id: "secondWave",
    condition: (state: GameState) =>
      state.story.seen.firstWaveVictory && !state.story.seen.secondWave,
    triggerType: "resource",
    timeProbability: 0.05,
    title: "The Second Wave",
    message: SECOND_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            secondWave: true,
          },
        },
        _combatData: {
          enemy: {
            name: "Pack of pale creatures",
            attack: [15, 18, 21][Math.floor(Math.random() * 3)],
            maxHealth: 150,
            currentHealth: 150,
          },
          eventTitle: "The Second Wave",
          eventMessage: SECOND_WAVE_MESSAGE,
          onVictory: () => ({
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                secondWaveVictory: true,
              },
            },
            _logMessage: VICTORY_MESSAGE,
          }),
          onDefeat: () => handleDefeat(state, 2, 10),
        },
      };
    },
  },

  thirdWave: {
    id: "thirdWave",
    condition: (state: GameState) =>
      state.story.seen.secondWaveVictory && !state.story.seen.thirdWave,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Third Wave",
    message: THIRD_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            thirdWave: true,
          },
        },
        _combatData: {
          enemy: {
            name: "Horde of pale creatures",
            attack: [18, 21, 24][Math.floor(Math.random() * 3)],
            maxHealth: 200,
            currentHealth: 200,
          },
          eventTitle: "The Third Wave",
          eventMessage: THIRD_WAVE_MESSAGE,
          onVictory: () => ({
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                thirdWaveVictory: true,
              },
            },
            _logMessage: VICTORY_MESSAGE,
          }),
          onDefeat: () => handleDefeat(state, 3, 15),
        },
      };
    },
  },

  fourthWave: {
    id: "fourthWave",
    condition: (state: GameState) =>
      state.story.seen.thirdWaveVictory && !state.story.seen.fourthWave,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Fourth Wave",
    message: FOURTH_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            fourthWave: true,
          },
        },
        _combatData: {
          enemy: {
            name: "Legion of pale creatures",
            attack: [30, 35][Math.floor(Math.random() * 2)],
            maxHealth: 250,
            currentHealth: 250,
          },
          eventTitle: "The Fourth Wave",
          eventMessage: FOURTH_WAVE_MESSAGE,
          onVictory: () => ({
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                fourthWaveVictory: true,
              },
            },
            _logMessage: VICTORY_MESSAGE,
          }),
          onDefeat: () => handleDefeat(state, 4, 20),
        },
      };
    },
  },

  fifthWave: {
    id: "fifthWave",
    condition: (state: GameState) =>
      state.story.seen.fourthWaveVictory && !state.story.seen.fifthWave,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Final Wave",
    message: FIFTH_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            fifthWave: true,
          },
        },
        _combatData: {
          enemy: {
            name: "Swarm of pale creatures",
            attack: [50, 52, 54, 55, 56, 58, 60][Math.floor(Math.random() * 7)],
          },
          eventTitle: "The Final Wave",
          eventMessage: FIFTH_WAVE_MESSAGE,
          onVictory: () => ({
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                gameCompleted: true,
              },
            },
          }),
          onDefeat: () => handleDefeat(state, 5, 30),
        },
      };
    },
  },
};
