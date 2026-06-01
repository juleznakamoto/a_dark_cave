import { GameState } from "@shared/schema";
import { GameEvent } from "./events";
import { spendFreeVillagers } from "@/game/stateHelpers";
import { getCurrentPopulation } from "@/game/population";

const DISGUST_DURATION_MS = 15 * 60 * 1000;

export const obsidianOrbEvents: Record<string, GameEvent> = {
  obsidianOrbVisit: {
    id: "obsidianOrbVisit",
    condition: (state: GameState) =>
      state.story?.seen?.hasObsidian === true &&
      state.buildings.advancedBlacksmith >= 1 &&
      state.buildings.darkEstate >= 1 &&
      getCurrentPopulation(state) > 300000000 &&
      !state.schematics.obsidian_orb_schematic &&
      !state.relics.obsidian_orb,
    timeProbability: 45,
    priority: 10,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000,
    skipEventLog: true,
    choices: [
      {
        id: "payGold",
        cost: "250 Gold",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            gold: (state.resources.gold ?? 0) - 250,
          },
          schematics: {
            ...state.schematics,
            obsidian_orb_schematic: true,
          },
          _logMessageKey: "outcome0",
        }),
      },
      {
        id: "payVillagers",
        cost: "20 Villagers",
        effect: (state: GameState) => {
          const deathResult = spendFreeVillagers(state, 20);
          return {
            ...deathResult,
            schematics: {
              ...state.schematics,
              obsidian_orb_schematic: true,
            },
            disgustState: {
              isActive: true,
              endTime: Date.now() + DISGUST_DURATION_MS,
            },
            _logMessageKey: "outcome1",
          };
        },
      },
      {
        id: "sendAway",
        effect: () => ({
          _logMessageKey: "outcome2",
        }),
      },
    ],
    fallbackChoice: {
      id: "sendAway",
      effect: () => ({
        _logMessageKey: "outcome3",
      }),
    },
  },
};
