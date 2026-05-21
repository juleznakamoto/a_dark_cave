import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { applyActionEffects } from "./actionEffects";
import { calculateTotalEffects } from "./effectsCalculation";
import { getActionLogMessage, getResourceName } from "@/i18n/resolveGameText";

const NATHARIT_SILVER_VEIN_FALLBACK =
  "The natharit pickaxe reveals a vein of silver! +50 Silver";

type ActionLogMessageRef = {
  actionId: string;
  logKey: string;
  vars?: Record<string, string | number>;
};

function appendMineLogMessages(
  logMessages: Array<string | ActionLogMessageRef>,
  result: ActionResult,
): void {
  logMessages.forEach((message) => {
    if (typeof message === "string") {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message,
        timestamp: Date.now(),
        type: "system",
      });
      return;
    }

    const ref = message as ActionLogMessageRef;
    const vars = {
      ...ref.vars,
      resource: getResourceName("silver", "Silver"),
    };
    result.logEntries!.push({
      id: `probability-effect-${Date.now()}-${Math.random()}`,
      message: getActionLogMessage(
        ref.actionId,
        ref.logKey,
        NATHARIT_SILVER_VEIN_FALLBACK,
        vars,
      ),
      timestamp: Date.now(),
      type: "system",
    });
  });
}

function handleMineAction(
  actionId: string,
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects(actionId, state);

  if (effectUpdates.logMessages) {
    appendMineLogMessages(effectUpdates.logMessages, result);
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

/** P(silver vein) from active items' mining probabilityBonus (e.g. Natharit pickaxe in toolEffects). */
function miningBonusSilverProbability(state: GameState): number {
  const p = calculateTotalEffects(state).probability_bonus.mining_silver ?? 0;
  return Math.min(1, Math.max(0, p));
}

export const caveMineActions: Record<string, Action> = {
  mineStone: {
    id: "mineStone",
    label: "Stone",
    show_when: {
      "tools.stone_pickaxe": true,
    },
    cost: {
      "resources.food": 10,
      "resources.torch": 1,
    },
    effects: (state: GameState) => {
      const bonus = state.BTP === 1 ? 1 : 0;
      return {
        "resources.stone": `random(${4 + bonus},${8 + bonus})`,
        "resources.silver": {
          probability: miningBonusSilverProbability,
          value: 50,
          logMessageKey: "natharitSilverVein",
          logMessageVars: { amount: 50 },
        },
        "story.seen.hasMinedStone": true,
      };
    },
    executionTime: 15,
    cooldown: 0,
    upgrade_key: "mineStone",
  },

  mineIron: {
    id: "mineIron",
    label: "Iron",
    show_when: {
      "tools.stone_pickaxe": true,
    },
    cost: {
      "resources.food": 10,
      "resources.torch": 1,
    },
    effects: (state: GameState) => {
      const bonus = state.BTP === 1 ? 1 : 0;
      return {
        "resources.iron": `random(${4 + bonus},${8 + bonus})`,
        "resources.silver": {
          probability: miningBonusSilverProbability,
          value: 50,
          logMessageKey: "natharitSilverVein",
          logMessageVars: { amount: 50 },
        },
        "story.seen.hasIron": true,
      };
    },
    executionTime: 15,
    cooldown: 0,
    upgrade_key: "mineIron",
  },

  mineCoal: {
    id: "mineCoal",
    label: "Coal",
    show_when: {
      "tools.iron_pickaxe": true,
    },
    cost: {
      "resources.food": 10,
      "resources.torch": 1,
    },
    effects: (state: GameState) => {
      const bonus = state.BTP === 1 ? 1 : 0;
      return {
        "resources.coal": `random(${4 + bonus},${8 + bonus})`,
        "resources.silver": {
          probability: miningBonusSilverProbability,
          value: 50,
          logMessageKey: "natharitSilverVein",
          logMessageVars: { amount: 50 },
        },
        "story.seen.hasCoal": true,
      };
    },
    executionTime: 15,
    cooldown: 0,
    upgrade_key: "mineCoal",
  },

  mineSulfur: {
    id: "mineSulfur",
    label: "Sulfur",
    show_when: {
      "tools.steel_pickaxe": true,
      "buildings.foundry": 1,
    },
    cost: {
      "resources.food": 30,
      "resources.torch": 2,
    },
    effects: (state: GameState) => {
      const bonus = state.BTP === 1 ? 1 : 0;
      return {
        "resources.sulfur": `random(${4 + bonus},${8 + bonus})`,
        "resources.silver": {
          probability: miningBonusSilverProbability,
          value: 50,
          logMessageKey: "natharitSilverVein",
          logMessageVars: { amount: 50 },
        },
        "story.seen.hasSulfur": true,
      };
    },
    executionTime: 15,
    cooldown: 0,
    upgrade_key: "mineSulfur",
  },

  mineObsidian: {
    id: "mineObsidian",
    label: "Obsidian",
    show_when: {
      "tools.steel_pickaxe": true,
    },
    cost: {
      "resources.food": 50,
      "resources.torch": 5,
    },
    effects: (state: GameState) => {
      const bonus = state.BTP === 1 ? 1 : 0;
      return {
        "resources.obsidian": `random(${3 + bonus},${7 + bonus})`,
        "resources.silver": {
          probability: miningBonusSilverProbability,
          value: 50,
          logMessageKey: "natharitSilverVein",
          logMessageVars: { amount: 50 },
        },
        "story.seen.hasObsidian": true,
      };
    },
    executionTime: 20,
    cooldown: 0,
    upgrade_key: "mineObsidian",
  },

  mineAdamant: {
    id: "mineAdamant",
    label: "Adamant",
    show_when: {
      "tools.obsidian_pickaxe": true,
    },
    cost: {
      "resources.food": 100,
      "resources.torch": 10,
    },
    effects: (state: GameState) => {
      const bonus = state.BTP === 1 ? 1 : 0;
      return {
        "resources.adamant": `random(${2 + bonus},${6 + bonus})`,
        "resources.silver": {
          probability: miningBonusSilverProbability,
          value: 50,
          logMessageKey: "natharitSilverVein",
          logMessageVars: { amount: 50 },
        },
        "story.seen.hasAdamant": true,
      };
    },
    executionTime: 25,
    cooldown: 0,
    upgrade_key: "mineAdamant",
  },
};

// Action handlers
export function handleMineStone(state: GameState, result: ActionResult): ActionResult {
  return handleMineAction("mineStone", state, result);
}

export function handleMineIron(state: GameState, result: ActionResult): ActionResult {
  return handleMineAction("mineIron", state, result);
}

export function handleMineCoal(state: GameState, result: ActionResult): ActionResult {
  return handleMineAction("mineCoal", state, result);
}

export function handleMineSulfur(state: GameState, result: ActionResult): ActionResult {
  return handleMineAction("mineSulfur", state, result);
}

export function handleMineObsidian(state: GameState, result: ActionResult): ActionResult {
  return handleMineAction("mineObsidian", state, result);
}

export function handleMineAdamant(state: GameState, result: ActionResult): ActionResult {
  return handleMineAction("mineAdamant", state, result);
}
