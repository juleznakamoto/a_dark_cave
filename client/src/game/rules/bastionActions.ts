import { Action, GameState } from "@shared/schema";
import { getGameActions } from "./actionsRegistry";
import { CRUEL_MODE } from "@/game/cruelMode";
import { getTotalBuildingCostReduction } from "./effectsCalculation";

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
};
