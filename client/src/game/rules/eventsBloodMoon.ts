import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalKnowledge } from "./effectsCalculation";
import { calculateSuccessChance } from "./events";

export const bloodMoonEvents: Record<string, GameEvent> = {
  bloodMoonAttack: {
    id: "bloodMoonAttack",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 7 &&
      !(state.bloodMoonState?.hasWon ?? false),
    timeProbability: (state: GameState) =>
      (state.bloodMoonState?.occurrenceCount ?? 0) === 0 ? 60 : 90,
    title: "Blood Moon",
    message: (state: GameState) => {
      const sacrificeAmount = Math.min(
        (state.cruelMode ? 10 : 5) + ((state.bloodMoonState?.occurrenceCount ?? 0) * 5),
        30
      );

      return `The moon at night turns blood red, and village elders whisper of lycanthropes. The ancient pacts demand a sacrifice of ${sacrificeAmount} villagers to appease the beasts. If you refuse, they will descend upon the village in a frenzy.`;
    },
    priority: 5,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 6 * 60 * 1000, // 6 minutes
    skipEventLog: true,
    choices: [
      {
        id: "sacrificeVillagers",
        label: (state: GameState) => {
          const sacrificeAmount = Math.min(
            (state.cruelMode ? 10 : 5) + ((state.bloodMoonState?.occurrenceCount ?? 0) * 5),
            30
          );
          return `Sacrifice ${sacrificeAmount} villagers`;
        },
        effect: (state: GameState) => {
          const sacrificeAmount = Math.min(
            (state.cruelMode ? 10 : 5) + ((state.bloodMoonState?.occurrenceCount ?? 0) * 5),
            30
          );

          const deathResult = killVillagers(state, sacrificeAmount);

          return {
            ...deathResult,
            bloodMoonState: {
              hasWon: false,
              occurrenceCount: (state.bloodMoonState?.occurrenceCount ?? 0) + 1,
            },
            _logMessage: `The elders conduct the ritual sacrifice. ${sacrificeAmount} villagers are offered to the lycanthropes. The blood moon fades, and peace returns to the village... for now.`,
          };
        },
      },
      {
        id: "prepareForAttack",
        label: "Prepare for lycanthrope attack",
        relevant_stats: ["strength", "knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.0, {
            type: "strength",
            multiplier: 0.005,
          }, {
            type: "knowledge",
            multiplier: 0.005,
          });
        },
        effect: (state: GameState) => {
          const sacrificeAmount = Math.min(
            (state.cruelMode ? 10 : 5) + ((state.bloodMoonState?.occurrenceCount ?? 0) * 5),
            30
          );

          // Check for victory using combined strength and knowledge
          const victoryChance = calculateSuccessChance(state, 0.0, {
            type: "strength",
            multiplier: 0.005,
          }, {
            type: "knowledge",
            multiplier: 0.005,
          });

          if (Math.random() < victoryChance) {
            // Victory! Get Moonblood relic
            return {
              relics: {
                ...state.relics,
                moonblood: true,
              },
              bloodMoonState: {
                hasWon: true,
                occurrenceCount: state.bloodMoonState?.occurrenceCount ?? 0,
              },
              _logMessage: "The lycanthropes attack, but your preparations hold! You defeat their leader and claim the Moonblood - a vial of blood from the lycanthrope alpha. Its purpose remains mysterious.",
            };
          }

          // Defeat - lose villagers and food
          const villagerLoss = sacrificeAmount + Math.floor(Math.random() * 5) + 1;
          const foodLoss = sacrificeAmount * 50;

          const deathResult = killVillagers(state, villagerLoss);

          return {
            ...deathResult,
            resources: {
              ...state.resources,
              food: Math.max(0, state.resources.food - foodLoss),
            },
            bloodMoonState: {
              hasWon: false,
              occurrenceCount: (state.bloodMoonState?.occurrenceCount ?? 0) + 1,
            },
            _logMessage: `The lycanthropes overwhelm your defenses! They kill ${villagerLoss} villagers and devour ${foodLoss} food from your stores. The blood moon fades, but the threat grows stronger for next time.`,
          };
        },
      },
    ],
    fallbackChoice: {
      id: "prepareForAttack",
      label: "Prepare for lycanthrope attack",
      effect: (state: GameState) => {
        // Same logic as prepareForAttack choice
        const sacrificeAmount = Math.min(
          (state.cruelMode ? 10 : 5) + ((state.bloodMoonState?.occurrenceCount ?? 0) * 5),
          30
        );

        // Check for victory using combined strength and knowledge
        const victoryChance = calculateSuccessChance(state, 0.0, {
          type: "strength",
          multiplier: 0.005,
        }, {
          type: "knowledge",
          multiplier: 0.005,
        });

        if (Math.random() < victoryChance) {
          // Victory! Get Moonblood relic
          return {
            relics: {
              ...state.relics,
              moonblood: true,
            },
            bloodMoonState: {
              hasWon: true,
              occurrenceCount: state.bloodMoonState?.occurrenceCount ?? 0,
            },
            _logMessage: "The lycanthropes attack, but your preparations hold! You defeat their leader and claim the Moonblood - a vial of blood from the lycanthrope alpha. Its purpose remains mysterious.",
          };
        }

        // Defeat - lose villagers and food
        const villagerLoss = sacrificeAmount + Math.floor(Math.random() * 5) + 1;
        const foodLoss = sacrificeAmount * 50;

        const deathResult = killVillagers(state, villagerLoss);

        return {
          ...deathResult,
          resources: {
            ...state.resources,
            food: Math.max(0, state.resources.food - foodLoss),
          },
          bloodMoonState: {
            hasWon: false,
            occurrenceCount: (state.bloodMoonState?.occurrenceCount ?? 0) + 1,
          },
          _logMessage: `The lycanthropes overwhelm your defenses! They kill ${villagerLoss} villagers and devour ${foodLoss} food from your stores. The blood moon fades, but the threat grows stronger for next time.`,
        };
      },
    },
  },
};