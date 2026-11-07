import { Action, GameState } from "@shared/schema";
import { getGameActions } from "./actionsRegistry";
import { CRUEL_MODE } from "@/game/cruelMode";
import { getTotalBuildingCostReduction } from "./effectsCalculation";
import {
  ATTACK_WAVE_INITIAL_PROVOKE_AFTER_MS,
  getAttackWavesChartRows,
  isAttackWaveRematchTimer,
  isPostCompletionAttackWavesActive,
} from "./eventsAttackWaves";
import { POST_COMPLETION_ATTACK_WAVE_ID } from "./attackWaveOrder";
import { applyActionEffects } from "./actionEffects";

/** Repair resource paths and amounts (same formula as former Bastion panel helpers). */
export function getBastionRepairCostPaths(
  buildActionId: string,
  level: number,
  state: GameState,
): Record<string, number> {
  const action = getGameActions()[buildActionId];
  const costTable = action?.cost;
  if (!costTable || typeof costTable === "function") return {};
  const actionCost = (costTable as Record<number, Record<string, number>>)[level];
  if (!actionCost) return {};

  const buildingCostReduction = getTotalBuildingCostReduction(state);
  const out: Record<string, number> = {};
  for (const [path, cost] of Object.entries(actionCost)) {
    if (path.startsWith("resources.") && typeof cost === "number") {
      out[path] = Math.floor(
        cost * CRUEL_MODE.bastion.repairCostFactor * (1 - buildingCostReduction),
      );
    }
  }
  return out;
}

const CANONICAL_PROVOKE_FOOD_COST = 500;
const POST_COMPLETION_PROVOKE_FOOD_COST = 5000;

/** Insight spent to push a lost wave's return back by `ATTACK_WAVE_DELAY_MS`. */
export const ATTACK_WAVE_DELAY_INSIGHT_COST = 1000;
/** Added once to the current rematch countdown. A new loss allows it again. */
export const ATTACK_WAVE_DELAY_MS = 10 * 60 * 1000;

function getProvokableAttackWaveId(state: GameState): string | null {
  const waves = getAttackWavesChartRows({
    story: state.story,
    buildings: state.buildings,
    weapons: state.weapons,
  });
  const activeWave = waves.find((w) => !w.completed && w.conditionMet);
  if (activeWave) {
    return activeWave.id;
  }
  if (isPostCompletionAttackWavesActive(state)) {
    return POST_COMPLETION_ATTACK_WAVE_ID;
  }
  return null;
}

/** Food cost for the currently provokable attack wave. */
export function getProvokeAttackWaveFoodCost(state: GameState): number {
  return getProvokableAttackWaveId(state) === POST_COMPLETION_ATTACK_WAVE_ID
    ? POST_COMPLETION_PROVOKE_FOOD_COST
    : CANONICAL_PROVOKE_FOOD_COST;
}

/**
 * True when the active wave can be provoked.
 * A chart wave's first approach unlocks provoke after 5 of the 10 minutes.
 * A player who has already won a game can provoke that first approach immediately.
 * Provoke also skips a rematch countdown, or starts an endless post-completion wave.
 */
export function canProvokeAttackWave(state: GameState): boolean {
  const waveId = getProvokableAttackWaveId(state);
  if (!waveId) {
    return false;
  }
  const timer = state.attackWaveTimers?.[waveId];
  if (!timer || timer.defeated || timer.provoked) {
    return false;
  }
  if (waveId === POST_COMPLETION_ATTACK_WAVE_ID) {
    return true;
  }
  const elapsed = timer.elapsedTime || 0;
  const remaining = Math.max(0, timer.duration - elapsed);
  if (remaining <= 0) {
    return false;
  }
  if (!isAttackWaveRematchTimer(timer)) {
    if (state.hasWonAnyGame) {
      return true;
    }
    return elapsed >= ATTACK_WAVE_INITIAL_PROVOKE_AFTER_MS;
  }
  return true;
}

/**
 * True on a chart wave's rematch countdown (the wave already happened, and the player lost).
 * The first approach and endless post-completion waves stay on Provoke alone.
 */
export function canDelayAttackWave(state: GameState): boolean {
  const waveId = getProvokableAttackWaveId(state);
  if (!waveId || waveId === POST_COMPLETION_ATTACK_WAVE_ID) {
    return false;
  }
  const timer = state.attackWaveTimers?.[waveId];
  if (!timer || timer.defeated || timer.provoked) {
    return false;
  }
  if (!isAttackWaveRematchTimer(timer) || timer.delayed) {
    return false;
  }
  const elapsed = timer.elapsedTime || 0;
  return timer.duration - elapsed > 0;
}

/** Pay Insight and add 10 minutes to the active rematch countdown. */
export function getDelayAttackWaveExecutionUpdates(
  state: GameState,
): Partial<GameState> | null {
  if (!canDelayAttackWave(state)) {
    return null;
  }
  const waveId = getProvokableAttackWaveId(state)!;
  const timer = state.attackWaveTimers![waveId]!;
  const effectUpdates = applyActionEffects("delayAttackWave", state);
  return {
    ...effectUpdates,
    attackWaveTimers: {
      ...state.attackWaveTimers,
      [waveId]: {
        ...timer,
        duration: timer.duration + ATTACK_WAVE_DELAY_MS,
        delayed: true,
      },
    },
  };
}

/** State updates for a successful provoke: pay cost via action effects + set timer. */
export function getProvokeAttackWaveExecutionUpdates(
  state: GameState,
): Partial<GameState> | null {
  if (!canProvokeAttackWave(state)) {
    return null;
  }
  const waveId = getProvokableAttackWaveId(state)!;
  const timer = state.attackWaveTimers![waveId]!;
  const effectUpdates = applyActionEffects("provokeAttackWave", state);
  return {
    ...effectUpdates,
    attackWaveTimers: {
      ...state.attackWaveTimers,
      [waveId]: {
        ...timer,
        elapsedTime: timer.duration,
        provoked: true,
      },
    },
  };
}

export const bastionActions: Record<string, Action> = {
  healRestlessKnight: {
    id: "healRestlessKnight",
    label: "Heal Restless Knight",
    executionTime: 30,
    cooldown: 0,
    cost: { "resources.food": 1500 },
    show_when: {
      "story.seen.restlessKnightWounded": true,
      "fellowship.restless_knight": true,
    },
    effects: {},
  },
  healElderWizard: {
    id: "healElderWizard",
    label: "Heal Elder Wizard",
    executionTime: 30,
    cooldown: 0,
    cost: { "resources.food": 1500 },
    show_when: {
      "story.seen.elderWizardWounded": true,
      "fellowship.elder_wizard": true,
    },
    effects: {},
  },
  repairBastion: {
    id: "repairBastion",
    label: "Repair Bastion",
    executionTime: 30,
    cooldown: 0,
    cost: (state: GameState) => {
      const level = state.buildings.bastion || 1;
      return level >= 2
        ? getBastionRepairCostPaths("buildHighBastion", 1, state)
        : getBastionRepairCostPaths("buildBastion", 1, state);
    },
    show_when: {
      "story.seen.bastionDamaged": true,
      "buildings.bastion": 1,
    },
    effects: {},
  },
  repairWatchtower: {
    id: "repairWatchtower",
    label: "Repair Watchtower",
    executionTime: 30,
    cooldown: 0,
    cost: (state: GameState) => {
      const level = state.buildings.watchtower || 0;
      return getBastionRepairCostPaths("buildWatchtower", level, state);
    },
    show_when: {
      "story.seen.watchtowerDamaged": true,
      "buildings.watchtower": 1,
    },
    effects: {},
  },
  repairPalisades: {
    id: "repairPalisades",
    label: "Repair Palisades",
    executionTime: 30,
    cooldown: 0,
    cost: (state: GameState) => {
      const level = state.buildings.palisades || 0;
      return getBastionRepairCostPaths("buildPalisades", level, state);
    },
    show_when: {
      "story.seen.palisadesDamaged": true,
      "buildings.palisades": 1,
    },
    effects: {},
  },
  provokeAttackWave: {
    id: "provokeAttackWave",
    label: "Provoke attack wave",
    executionTime: 0,
    cooldown: 0,
    cost: (state: GameState) => ({
      "resources.food": getProvokeAttackWaveFoodCost(state),
    }),
    show_when: {
      "buildings.bastion": 1,
    },
    canExecute: (state: GameState) => canProvokeAttackWave(state),
    effects: {},
  },
  delayAttackWave: {
    id: "delayAttackWave",
    label: "Delay attack wave",
    executionTime: 0,
    cooldown: 0,
    cost: { "resources.insight": ATTACK_WAVE_DELAY_INSIGHT_COST },
    show_when: {
      "buildings.bastion": 1,
    },
    canExecute: (state: GameState) => canDelayAttackWave(state),
    effects: {},
  },
};
