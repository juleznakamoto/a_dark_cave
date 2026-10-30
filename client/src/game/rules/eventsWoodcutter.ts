import { formatNumber } from "@/lib/utils";
import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { CRUEL_MODE } from "../cruelMode";
import { getSeenResourceKeys, killVillagers } from "@/game/stateHelpers";
import { defineSuccessChance } from "./eventSuccessChance";

interface WoodcutterConfig {
  level: number;
  woodenHuts: number;
  foodCost: number;
  woodReward: number;
  betrayalChance?: number;
  isLastEvent?: boolean;
}

const woodcutterAttack = CRUEL_MODE.woodcutter.attack;

const woodcutterAttackSuccess = defineSuccessChance({
  base: woodcutterAttack.successBase,
  stats: [{ type: "strength", multiplier: woodcutterAttack.successPerStrength }],
  cmMultiplier: woodcutterAttack.cruelPenalty,
  relevantStats: ["strength"],
});

export function getWoodcutterAttackSuccessChance(state: GameState): number {
  return woodcutterAttackSuccess.success_chance(state);
}

/** Villagers killed when the woodcutter wins the fight. Visit 1 is 1-2, visit 6 is 6-12. */
export function rollWoodcutterAttackDeaths(
  level: number,
  random: () => number = Math.random,
): number {
  const min = Math.max(1, Math.floor(level) * woodcutterAttack.deathMinMultiplier);
  const max = Math.max(min, Math.floor(level) * woodcutterAttack.deathMaxMultiplier);
  return min + Math.floor(random() * (max - min + 1));
}

function endWoodcutterOffers(
  state: GameState,
  seen: Record<string, boolean>,
): Pick<GameState, "woodcutterState" | "story"> {
  return {
    woodcutterState: { isActive: false, endTime: 0 },
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        woodcutterEnded: true,
        ...seen,
      },
    },
  };
}

function woodcutterKillGold(level: number): number {
  return Math.max(1, Math.floor(level)) * woodcutterAttack.goldPerVisit;
}

function woodcutterAttackChoice(level: number) {
  return {
    id: "attack",
    ...woodcutterAttackSuccess,
    effect: (state: GameState) => {
      if (Math.random() < getWoodcutterAttackSuccessChance(state)) {
        const gold = woodcutterKillGold(level);
        return {
          resources: {
            ...state.resources,
            gold: (state.resources.gold ?? 0) + gold,
          },
          tools: {
            ...state.tools,
            woodcutter_axe: true,
          },
          ...endWoodcutterOffers(state, {
            [`woodcutter${level}Accepted`]: true,
          }),
          _logMessageKey: "attackWin",
          _logMessageVars: { gold },
        };
      }

      const deathResult = killVillagers(state, rollWoodcutterAttackDeaths(level));
      return {
        ...deathResult,
        ...endWoodcutterOffers(state, {
          woodcutterFightLost: true,
          [`woodcutter${level}Accepted`]: true,
        }),
        _logMessageKey: "attackLose",
        _logMessageVars: { deaths: deathResult.villagersKilled ?? 0 },
      };
    },
  };
}

const woodcutterConfigs: WoodcutterConfig[] = [
  { level: 1, woodenHuts: 2, foodCost: 25, woodReward: 250 },
  { level: 2, woodenHuts: 3, foodCost: 50, woodReward: 500 },
  { level: 3, woodenHuts: 4, foodCost: 100, woodReward: 1000 },
  {
    level: 4,
    woodenHuts: 5,
    foodCost: 150,
    woodReward: 1500,
    betrayalChance: 0.3333,
  },
  {
    level: 5,
    woodenHuts: 6,
    foodCost: 200,
    woodReward: 2000,
    betrayalChance: 0.5,
  },
  {
    level: 6,
    woodenHuts: 7,
    foodCost: 250,
    woodReward: 2500,
    betrayalChance: 1.0,
    isLastEvent: true,
  },
];

function createWoodcutterEvent(config: WoodcutterConfig): GameEvent {
  const {
    level,
    woodenHuts,
    foodCost,
    woodReward,
    betrayalChance,
    isLastEvent,
  } = config;
  const eventId = `woodcutter${level}`;

  return {
    id: eventId,
    i18nKey: "woodcutter",
    i18nVars: {
      level,
      foodCost: formatNumber(foodCost),
      woodReward: formatNumber(woodReward),
    },
    condition: (state: GameState) => {
      // Check if woodcutter event is currently active (timed tab is showing)
      if (
        state.woodcutterState?.isActive &&
        state.woodcutterState.endTime > Date.now()
      ) {
        return false;
      }

      // Check if woodcutter was betrayed
      if (state.story.seen.woodcutterBetrayed) {
        return false;
      }

      // Check if woodcutter storyline ended, or a cruel fight drove him off
      if (state.story.seen.woodcutterEnded || state.story.seen.woodcutterFightLost) {
        return false;
      }

      // Check if this specific event was already accepted
      if (
        state.story.seen[
        `woodcutter${level}Accepted` as keyof typeof state.story.seen
        ]
      ) {
        return false;
      }

      // For first event: 2 huts + player has seen food (cost gated on accept)
      if (level === 1) {
        return (
          state.buildings.woodenHut >= woodenHuts &&
          getSeenResourceKeys(state).includes("food")
        );
      }

      // For subsequent events, check if previous event was met
      if (
        !state.story.seen[
        `woodcutter${level - 1}Met` as keyof typeof state.story.seen
        ]
      ) {
        return false;
      }

      // Check building requirements
      const canTrigger = state.buildings.woodenHut >= woodenHuts;
      return canTrigger;
    },

    timeProbability: 15,
    effect: (state: GameState) => {
      return {
        woodcutterState: {
          isActive: true,
          endTime: Date.now() + 4 * 60 * 1000,
        },
      };
    },
    message: `level${level}`,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    skipEventLog: true, // Don't add to event log, only show in timed tab
    choices: (state: GameState) => {
      const payOrRefuse = [
      {
        id: "acceptServices",
        effect: (state: GameState) => {
          // Handle betrayal chance if it exists
          if (betrayalChance !== undefined) {
            const isBetrayedNow = Math.random() < betrayalChance;

            if (isBetrayedNow) {
              return {
                resources: {
                  ...state.resources,
                  food: state.resources.food - foodCost,
                },
                story: {
                  ...state.story,
                  seen: {
                    ...state.story.seen,
                    woodcutterBetrayed: true,
                    [`woodcutter${level}Accepted`]: true,
                  },
                },
                _logMessageKey: isLastEvent
                  ? "betrayLast"
                  : level === 5
                    ? "betrayLevel5"
                    : "betray",
              };
            }
          }

          // Successful transaction
          return {
            resources: {
              ...state.resources,
              food: state.resources.food - foodCost,
              wood: state.resources.wood + woodReward,
            },
            woodcutterState: {
              isActive: false,
              endTime: 0,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutterMet: true,
                [`woodcutter${level}Met`]: true,
                [`woodcutter${level}Accepted`]: true,
              },
            },
            _logMessageKey: `successLevel${level}`,
          };
        },
      },
      {
        id: "denyServices",
        effect: (state: GameState) => {
          // Special handling for last event
          if (isLastEvent) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  woodcutterEnded: true,
                },
              },
              _logMessageKey: "denyLastUneasy",
            };
          }

          return {
            woodcutterState: {
              isActive: false,
              endTime: 0,
            },
            _logMessageKey: `denyLevel${level}`,
          };
        },
      },
      ];
      if (!state.cruelMode) return payOrRefuse;
      return [...payOrRefuse, woodcutterAttackChoice(level)];
    },
    fallbackChoice: {
      id: "timeExpired",
      effect: (state: GameState) => {
        // Special handling for last event
        if (isLastEvent) {
          return {
            woodcutterState: {
              isActive: false,
              endTime: 0,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutterEnded: true,
              },
            },
            _logMessageKey: "timeoutLast",
          };
        }

        return {
          woodcutterState: {
            isActive: false,
            endTime: 0,
          },
          _logMessageKey: `timeoutLevel${level}`,
        };
      },
    },
  };
}

const remains = CRUEL_MODE.woodcutter.remains;

/** Cruel Mode: he won the fight, then something in the woods killed him. One choice, the axe, no gold. */
export const woodcutterRemains: GameEvent = {
  id: "woodcutterRemains",
  i18nKey: "woodcutterRemains",
  condition: (state: GameState) =>
    state.cruelMode === true &&
    state.story.seen.woodcutterFightLost === true &&
    !state.tools?.woodcutter_axe &&
    state.story.seen.woodcutterRemainsTaken !== true,
  timeProbability: remains.timeProbabilityMinutes,
  earliestMinutes: remains.earliestMinutes,
  priority: 3,
  repeatable: false,
  choices: [
    {
      id: "takeAxe",
      effect: (state: GameState) => ({
        tools: {
          ...state.tools,
          woodcutter_axe: true,
        },
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            woodcutterRemainsTaken: true,
          },
        },
        _logMessageKey: "take",
      }),
    },
  ],
};

// Generate all woodcutter events
export const woodcutterEvents: Record<string, GameEvent> = {
  woodcutterRemains,
};
woodcutterConfigs.forEach((config) => {
  const event = createWoodcutterEvent(config);
  woodcutterEvents[event.id] = event;
});
