import type { GameState } from "@shared/schema";
import { getSeenResourceKeys } from "@/game/stateHelpers";
import type { EventChoiceEffectResult, GameEvent } from "./eventTypes";

export const BRIMSTONE_FLUX_DURATION_MS = 30 * 60 * 1000;
export const BRIMSTONE_FLUX_STEEL_BONUS = 2;

const VISIT_COSTS = [
  { sulfur: 1000, gold: 50 },
  { sulfur: 2500, gold: 100 },
  { sulfur: 5000, gold: 250 },
] as const;

function hasFoundry(state: GameState): boolean {
  return (
    (state.buildings.foundry ?? 0) >= 1 ||
    (state.buildings.primeFoundry ?? 0) >= 1 ||
    (state.buildings.masterworkFoundry ?? 0) >= 1
  );
}

function hasSeenSteel(state: GameState): boolean {
  return getSeenResourceKeys(state).includes("steel");
}

function isAccepted(state: GameState, visit: 1 | 2 | 3): boolean {
  return Boolean(state.story.seen[`brimstoneFlux${visit}Accepted`]);
}

function deductCosts(
  state: GameState,
  sulfurCost: number,
  goldCost: number,
): GameState["resources"] {
  return {
    ...state.resources,
    sulfur: Math.max(0, (state.resources.sulfur ?? 0) - sulfurCost),
    gold: Math.max(0, (state.resources.gold ?? 0) - goldCost),
  };
}

function withAcceptedFlag(
  state: GameState,
  visit: 1 | 2 | 3,
): GameState["story"] {
  return {
    ...state.story,
    seen: {
      ...state.story.seen,
      [`brimstoneFlux${visit}Accepted`]: true,
    },
  };
}

function acceptTimedVisit(
  state: GameState,
  visit: 1 | 2,
  sulfurCost: number,
  goldCost: number,
): EventChoiceEffectResult {
  return {
    resources: deductCosts(state, sulfurCost, goldCost),
    brimstoneFluxState: {
      isActive: true,
      endTime: Date.now() + BRIMSTONE_FLUX_DURATION_MS,
    },
    story: withAcceptedFlag(state, visit),
    _logMessageKey: "accept",
  };
}

function sendAwayEffect(): EventChoiceEffectResult {
  return {
    _logMessageKey: "sendAway",
  };
}

function createTimedVisit(
  visit: 1 | 2,
  timeProbability: number,
  cooldownPercent?: number,
): GameEvent {
  const { sulfur, gold } = VISIT_COSTS[visit - 1];
  return {
    id: `brimstoneFlux${visit}`,
    i18nVars: {
      sulfurCost: sulfur,
      goldCost: gold,
    },
    condition: (state: GameState) => {
      if (!hasFoundry(state) || !hasSeenSteel(state)) return false;
      if (state.blessings?.brimstone_infusion) return false;
      if (isAccepted(state, visit)) return false;
      if (visit === 2 && !isAccepted(state, 1)) return false;
      return true;
    },
    timeProbability,
    ...(cooldownPercent !== undefined ? { cooldownPercent } : {}),
    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    skipEventLog: true,
    fallbackChoice: {
      id: "sendAway",
      effect: sendAwayEffect,
    },
    choices: [
      {
        id: "accept",
        cost: `${sulfur} Sulfur, ${gold} Gold`,
        effect: (state: GameState) =>
          acceptTimedVisit(state, visit, sulfur, gold),
      },
      {
        id: "sendAway",
        effect: sendAwayEffect,
      },
    ],
  };
}

export const brimstoneFlux3Event: GameEvent = {
  id: "brimstoneFlux3",
  i18nVars: {
    sulfurCost: VISIT_COSTS[2].sulfur,
    goldCost: VISIT_COSTS[2].gold,
  },
  condition: (state: GameState) => {
    if (!hasFoundry(state) || !hasSeenSteel(state)) return false;
    if (state.blessings?.brimstone_infusion) return false;
    if (isAccepted(state, 3)) return false;
    return isAccepted(state, 2);
  },
  timeProbability: 45,
  cooldownPercent: 0.5,
  priority: 4,
  repeatable: true,
  showAsTimedTab: true,
  timedTabDuration: 4 * 60 * 1000,
  skipEventLog: true,
  fallbackChoice: {
    id: "sendAway",
    effect: sendAwayEffect,
  },
  choices: [
    {
      id: "accept",
      cost: `${VISIT_COSTS[2].sulfur} Sulfur, ${VISIT_COSTS[2].gold} Gold`,
      effect: (state: GameState) => ({
        resources: deductCosts(
          state,
          VISIT_COSTS[2].sulfur,
          VISIT_COSTS[2].gold,
        ),
        blessings: {
          ...state.blessings,
          brimstone_infusion: true,
        },
        story: withAcceptedFlag(state, 3),
        _logMessageKey: "accept",
      }),
    },
    {
      id: "sendAway",
      effect: sendAwayEffect,
    },
  ],
};

export const brimstoneFluxEvents: Record<string, GameEvent> = {
  brimstoneFlux1: createTimedVisit(1, 30),
  brimstoneFlux2: createTimedVisit(2, 45, 0.5),
  brimstoneFlux3: brimstoneFlux3Event,
};
