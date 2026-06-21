import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const CHAINMASTER_SELL_GOLD = 250;
export const CHAINMASTER_TEACH_COSTS = [250, 500, 750, 1000] as const;
export const CHAINMASTER_COLLECTOR_MAX_VISITS = 4;

export function getChainmasterCollectorVisitCount(
  state: Pick<GameState, "story">,
): number {
  const value = state.story?.seen?.chainmasterCollectorVisitCount;
  return typeof value === "number" ? value : 0;
}

export function getChainmasterTeachCost(
  state: Pick<GameState, "story">,
): number {
  const visitCount = getChainmasterCollectorVisitCount(state);
  return CHAINMASTER_TEACH_COSTS[
    Math.min(visitCount, CHAINMASTER_TEACH_COSTS.length - 1)
  ];
}

function removeLeatherboundBook(state: GameState): Partial<GameState> {
  return {
    relics: {
      ...state.relics,
      leatherbound_book: false,
    },
  };
}

function resolveCollector(state: GameState): Partial<GameState> {
  return {
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        chainmasterCollectorResolved: true,
      },
    },
    timedEventTab: { isActive: false } as any,
  };
}

function incrementCollectorVisitCount(state: GameState): Partial<GameState> {
  const visitCount = getChainmasterCollectorVisitCount(state);
  return {
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        chainmasterCollectorVisitCount: visitCount + 1,
      },
    },
    timedEventTab: { isActive: false } as any,
  };
}

export const chainmasterEvents: Record<string, GameEvent> = {
  leatherboundBookFound: {
    id: "leatherboundBookFound",
    condition: () => false,
    priority: 0,
    repeatable: false,
    skipEventLog: true,
    choices: [
      {
        id: "keepBook",
        effect: (state: GameState) => ({
          relics: {
            ...state.relics,
            leatherbound_book: true,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              leatherboundBookFound: true,
            },
          },
        }),
      },
    ],
  },

  chainmasterCollector: {
    id: "chainmasterCollector",
    condition: (state: GameState) => {
      if (!state.relics?.leatherbound_book) return false;
      if (state.story?.seen?.chainmasterCollectorResolved) return false;
      return getChainmasterCollectorVisitCount(state) < CHAINMASTER_COLLECTOR_MAX_VISITS;
    },
    timeProbability: (state: GameState) =>
      getChainmasterCollectorVisitCount(state) === 0 ? 25 : 60,
    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    skipEventLog: true,
    message: (state: GameState) => {
      const visitCount = getChainmasterCollectorVisitCount(state);
      return visitCount === CHAINMASTER_COLLECTOR_MAX_VISITS - 1
        ? "lastChance"
        : "offer";
    },
    i18nVars: (state: GameState) => ({
      teachCost: getChainmasterTeachCost(state),
      sellGold: CHAINMASTER_SELL_GOLD,
    }),
    choices: [
      {
        id: "sellBook",
        effect: (state: GameState) => ({
          ...removeLeatherboundBook(state),
          ...resolveCollector(state),
          resources: {
            ...state.resources,
            gold: (state.resources.gold || 0) + CHAINMASTER_SELL_GOLD,
          },
          _logMessageKey: "sellOutcome",
        }),
      },
      {
        id: "learnSecrets",
        cost: (state: GameState) => `${getChainmasterTeachCost(state)} gold`,
        effect: (state: GameState) => {
          const teachCost = getChainmasterTeachCost(state);
          return {
            ...removeLeatherboundBook(state),
            ...resolveCollector(state),
            resources: {
              ...state.resources,
              gold: (state.resources.gold || 0) - teachCost,
            },
            books: {
              ...state.books,
              book_of_chainmaster: true,
            },
            chainmasterSkills: { level: 0 },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) + 2,
            },
            _logMessageKey: "learnOutcome",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "wait",
      effect: (state: GameState) => {
        const visitCount = getChainmasterCollectorVisitCount(state);
        const isLastChance =
          visitCount === CHAINMASTER_COLLECTOR_MAX_VISITS - 1;
        return {
          ...incrementCollectorVisitCount(state),
          _logMessageKey: isLastChance ? "fallbackLast" : "fallback",
        };
      },
    },
  },
};
