import { Action, GameState } from "@shared/schema";
import { getGameActions } from "./actionsRegistry";
import { CRUEL_MODE } from "@/game/cruelMode";
import { getTotalBuildingCostReduction } from "./effectsCalculation";
import { getAttackWavesChartRows } from "./eventsAttackWaves";
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

/** True when the active wave can be provoked (timer running, not already provoked, etc.). */
export function canProvokeAttackWave(state: GameState): boolean {
  const waves = getAttackWavesChartRows({
    story: state.story,
    buildings: state.buildings,
    weapons: state.weapons,
  });
  const activeWave = waves.find((w) => !w.completed && w.conditionMet);
  if (!activeWave) {
    return false;
  }
  const timer = state.attackWaveTimers?.[activeWave.id];
  if (!timer || timer.defeated || timer.provoked) {
    return false;
  }
  const remaining = Math.max(0, timer.duration - (timer.elapsedTime || 0));
  return remaining > 0;
}

/** State updates for a successful provoke: pay cost via action effects + set timer. */
export function getProvokeAttackWaveExecutionUpdates(
  state: GameState,
): Partial<GameState> | null {
  if (!canProvokeAttackWave(state)) {
    return null;
  }
  const waves = getAttackWavesChartRows({
    story: state.story,
    buildings: state.buildings,
    weapons: state.weapons,
  });
  const activeWave = waves.find((w) => !w.completed && w.conditionMet)!;
  const timer = state.attackWaveTimers![activeWave.id]!;
  const effectUpdates = applyActionEffects("provokeAttackWave", state);
  return {
    ...effectUpdates,
    attackWaveTimers: {
      ...state.attackWaveTimers,
      [activeWave.id]: {
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
    cost: (state: GameState) => getBastionRepairCostPaths("buildBastion", 1, state),
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
    cost: { "resources.food": 500 },
    show_when: {
      "buildings.bastion": 1,
    },
    canExecute: (state: GameState) => canProvokeAttackWave(state),
    effects: {},
  },
};
