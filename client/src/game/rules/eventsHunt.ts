import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { markCollectorItemRejectedInSeen } from "./collectorRejectedItems";
import { defineSuccessChance } from "./eventSuccessChance";

/** 50% + 2% Strength + 4% Luck; cruel: 40% + 2% Strength (no Luck). */
const deerHerdSuccess = defineSuccessChance({
  base: 0.5,
  stats: (state) => [
    { type: "strength", multiplier: 0.02 },
    ...(state.cruelMode ? [] : [{ type: "luck" as const, multiplier: 0.04 }]),
  ],
  relevantStats: ["strength", "luck"],
});

export function getDeerHerdSuccessChance(state: GameState): number {
  return deerHerdSuccess.success_chance(state);
}

export const huntEvents: Record<string, GameEvent> = {
  deerHerd: {
    id: "deerHerd",
    condition: (state: GameState) =>
      (state.resources.food ?? 0) <= 250 &&
      (state.villagers.hunter ?? 0) >= 2 &&
      (state.buildings.woodenHut ?? 0) >= 2,
    timeProbability: 5,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "sendThem",
        ...deerHerdSuccess,
        effect: (state: GameState) => {
          const successChance = getDeerHerdSuccessChance(state);
          if (Math.random() < successChance) {
            return {
              resources: {
                ...state.resources,
                food: (state.resources.food || 0) + 250,
              },
              _logMessageKey: "outcome0",
            };
          }

          const hunters = state.villagers.hunter ?? 0;
          if (hunters <= 0) {
            return { _logMessageKey: "outcome1" };
          }

          return {
            villagers: {
              ...state.villagers,
              hunter: hunters - 1,
            },
            stats: {
              ...state.stats,
              villagerDeathsLifetime:
                (state.stats.villagerDeathsLifetime ?? 0) + 1,
            },
            villagersKilled: 1,
            _logMessageKey: "outcome1",
          };
        },
      },
      {
        id: "keepThemHere",
        effect: () => ({
          _logMessageKey: "outcome2",
        }),
      },
    ],
  },

  blacksmithHammerChoice: {
    id: "blacksmithHammerChoice",
    condition: (state: GameState) => false, // Only triggered by hunt action


    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "takeHammer",
        effect: (state: GameState) => {
          return {
            tools: {
              ...state.tools,
              blacksmith_hammer: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                blacksmithHammerChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveHammer",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                blacksmithHammerChoice: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  redMaskChoice: {
    id: "redMaskChoice",
    condition: (state: GameState) => false, // Only triggered by hunt action


    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "takeMask",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              red_mask: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                redMaskChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveMask",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: markCollectorItemRejectedInSeen(
                {
                  ...state.story.seen,
                  redMaskChoice: true,
                },
                "red_mask",
              ),
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },
};