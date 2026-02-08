import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { calculateSuccessChance, GameEvent } from "./events";

export const bloodMoonEvents: Record<string, GameEvent> = {
  bloodMoonAttack: {
    id: "bloodMoonAttack",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 7 && !state.bloodMoonState?.hasWon,
    timeProbability: (state: GameState) =>
      (state.bloodMoonState?.occurrenceCount ?? 0) === 0 ? 0.06 : 0.09,
    title: "Blood Moon",
    message: (state: GameState) => {
      const sacrificeAmount = Math.min(
        (state.cruelMode ? 10 : 5) +
          (state.bloodMoonState?.occurrenceCount ?? 0) * 5,
        30,
      );

      return `The moon at night turned blood red, village elders speak of lycanthropes. Ancient pacts demand a sacrifice of ${sacrificeAmount} villagers to appease the beasts. If you refuse, they will ensure their hunger is satisfied.`;
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
            (state.cruelMode ? 10 : 5) +
              (state.bloodMoonState?.occurrenceCount ?? 0) * 5,
            30,
          );
          return `Sacrifice ${sacrificeAmount} villagers`;
        },
        effect: (state: GameState) => {
          const sacrificeAmount = Math.min(
            (state.cruelMode ? 10 : 5) +
              (state.bloodMoonState?.occurrenceCount ?? 0) * 5,
            30,
          );

          const deathResult = killVillagers(state, sacrificeAmount);

          return {
            ...deathResult,
            bloodMoonState: {
              hasWon: false,
              occurrenceCount: (state.bloodMoonState?.occurrenceCount ?? 0) + 1,
            },
            _logMessage: `${sacrificeAmount} villagers are offered to the lycanthropes. With the blood moon fading, peace returns to the village… for now.`,
          };
        },
      },
      {
        id: "prepareForAttack",
        label: "Prepare for attack",
        relevant_stats: ["strength", "knowledge"],
        success_chance: (state: GameState) => {
          const traps = state.buildings.traps;
          return calculateSuccessChance(
            state,
            0.0 + traps * 0.1,
            {
              type: "strength",
              multiplier: 0.0025,
            },
            {
              type: "knowledge",
              multiplier: 0.0025,
            },
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const sacrificeAmount = Math.min(
            (state.cruelMode ? 10 : 5) +
              (state.bloodMoonState?.occurrenceCount ?? 0) * 5,
            30,
          );

          // Check for victory using combined strength and knowledge
          // Traps increase victory chance by 10%
          const victoryChance = calculateSuccessChance(
            state,
            0.0 + traps * 0.1,
            {
              type: "strength",
              multiplier: 0.0025,
            },
            {
              type: "knowledge",
              multiplier: 0.0025,
            },
          );

          if (Math.random() < victoryChance) {
            // Victory! Get Lycan Blood relic
            return {
              relics: {
                ...state.relics,
                lycan_blood: true,
              },
              resources: {
                ...state.resources,
                gold: state.resources.gold + 150,
                food: state.resources.fur + 500,
              },
              bloodMoonState: {
                hasWon: true,
                occurrenceCount: state.bloodMoonState?.occurrenceCount ?? 0,
              },
              _logMessage:
                "The lycanthropes attack, but your defenses hold! You defeat their leader and claim the Lycan Blood - a vial of blood from the lycanthrope alpha.",
            };
          }

          // Defeat - lose villagers and food
          // Traps reduce deaths by 3
          const villagerLoss = Math.max(
            0,
            sacrificeAmount + Math.floor(Math.random() * 5) + 1 - traps * 3,
          );
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
            _logMessage: `The lycanthropes overwhelm your defenses!${(deathResult.villagersKilled ?? 0) > 0 ? ` They kill ${deathResult.villagersKilled ?? 0} ${(deathResult.villagersKilled ?? 0) === 1 ? 'villager' : 'villagers'} and` : ' They'} devour ${foodLoss} food from your stores. The blood moon fades, but the threat remains.`,
          };
        },
      },
    ],
    fallbackChoice: {
      id: "prepareForAttack",
      label: "Prepare for attack",
      effect: (state: GameState) => {
        // Same logic as prepareForAttack choice
        const traps = state.buildings.traps;
        const sacrificeAmount = Math.min(
          (state.cruelMode ? 10 : 5) +
            (state.bloodMoonState?.occurrenceCount ?? 0) * 5,
          30,
        );

        // Check for victory using combined strength and knowledge
        // Traps increase victory chance by 10%
        const victoryChance = calculateSuccessChance(
          state,
          0.0 + traps * 0.1,
          {
            type: "strength",
            multiplier: 0.0025,
          },
          {
            type: "knowledge",
            multiplier: 0.0025,
          },
        );

        if (Math.random() < victoryChance) {
          // Victory! Get Lycan Blood relic
          return {
            relics: {
              ...state.relics,
              lycan_blood: true,
            },
            resources: {
              ...state.resources,
              gold: state.resources.gold + 150,
              fur: state.resources.fur + 500,
            },
            bloodMoonState: {
              hasWon: true,
              occurrenceCount: state.bloodMoonState?.occurrenceCount ?? 0,
            },
            _logMessage:
            "The lycanthropes attack, but your defenses hold! You defeat their leader and claim the Lycan Blood - a vial of blood from the lycanthrope alpha.",
          };
        }

        // Defeat - lose villagers and food
        // Traps reduce deaths by 3
        const villagerLoss = Math.max(
          0,
          sacrificeAmount + Math.floor(Math.random() * 5) + 1 - traps * 3,
        );
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
          _logMessage: `The lycanthropes overwhelm your defenses!${(deathResult.villagersKilled ?? 0) > 0 ? ` They kill ${deathResult.villagersKilled ?? 0} ${(deathResult.villagersKilled ?? 0) === 1 ? 'villager' : 'villagers'} and` : ' They'} devour ${foodLoss} food from your stores. The blood moon fades, but the threat remains.`,
        };
      },
    },
  },
};
