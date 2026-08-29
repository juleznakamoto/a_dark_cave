import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import type { GameEvent } from "./eventTypes";
import { calculateSuccessChance, defineSuccessChance } from "./eventSuccessChance";
import { bloodMoonSacrificeAmount } from "../cruelMode";
import { btpLootAmount } from "@/game/btpLoot";
import { getTrapWinChanceBonus } from "@/game/buildingHierarchy";

function bloodMoonI18nVars(state: GameState) {
  return {
    sacrificeAmount: bloodMoonSacrificeAmount(
      state.cruelMode,
      state.bloodMoonState?.occurrenceCount ?? 0,
    ),
  };
}

export const bloodMoonEvents: Record<string, GameEvent> = {
  bloodMoonAttack: {
    id: "bloodMoonAttack",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 8 && !state.bloodMoonState.hasWon,
    timeProbability: (state: GameState) =>
      (state.bloodMoonState?.occurrenceCount ?? 0) === 0 ? 45 : 75,
    cooldownPercent: 0.6,
    i18nVars: bloodMoonI18nVars,
    priority: 5,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    skipEventLog: true,
    choices: [
      {
        id: "sacrificeVillagers",
        cost: (state: GameState) => {
          const amount = bloodMoonSacrificeAmount(
            state.cruelMode,
            state.bloodMoonState?.occurrenceCount ?? 0,
          );
          return `${amount} Villagers`;
        },
        effect: (state: GameState) => {
          const sacrificeAmount = bloodMoonSacrificeAmount(
            state.cruelMode,
            state.bloodMoonState?.occurrenceCount ?? 0,
          );

          const deathResult = killVillagers(state, sacrificeAmount);

          return {
            ...deathResult,
            bloodMoonState: {
              hasWon: false,
              occurrenceCount: (state.bloodMoonState?.occurrenceCount ?? 0) + 1,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "prepareForAttack",
        ...defineSuccessChance({
          base: (state) => getTrapWinChanceBonus(state.buildings),
          stats: [
            { type: "strength", multiplier: 0.0025 },
            { type: "knowledge", multiplier: 0.0025 },
          ],
        }),
        effect: (state: GameState) => {
          const sacrificeAmount = bloodMoonSacrificeAmount(
            state.cruelMode,
            state.bloodMoonState?.occurrenceCount ?? 0,
          );

          // Check for victory using combined strength and knowledge
          // Traps increase victory chance by 10% / 20%
          const victoryChance = calculateSuccessChance(
            state,
            getTrapWinChanceBonus(state.buildings),
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
                gold: state.resources.gold + btpLootAmount(150, state),
                fur: state.resources.fur + 500,
              },
              bloodMoonState: {
                hasWon: true,
                occurrenceCount: state.bloodMoonState?.occurrenceCount ?? 0,
              },
              _logMessageKey: "outcome1",
            };
          }

          // Defeat - lose villagers and food
          const villagerLoss = Math.max(
            0,
            sacrificeAmount + Math.floor(Math.random() * 5) + 1,
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
            _logMessageKey: "outcome2",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "prepareForAttack",
      effect: (state: GameState) => {
        // Same logic as prepareForAttack choice
        const sacrificeAmount = bloodMoonSacrificeAmount(
          state.cruelMode,
          state.bloodMoonState?.occurrenceCount ?? 0,
        );

        // Check for victory using combined strength and knowledge
        // Traps increase victory chance by 10% / 20%
        const victoryChance = calculateSuccessChance(
          state,
          getTrapWinChanceBonus(state.buildings),
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
              gold: state.resources.gold + btpLootAmount(150, state),
              fur: state.resources.fur + 500,
            },
            bloodMoonState: {
              hasWon: true,
              occurrenceCount: state.bloodMoonState?.occurrenceCount ?? 0,
            },
            _logMessageKey: "outcome3",
          };
        }

        // Defeat - lose villagers and food
        const villagerLoss = Math.max(
          0,
          sacrificeAmount + Math.floor(Math.random() * 5) + 1,
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
          _logMessageKey: "outcome4",
        };
      },
    },
  },
};
