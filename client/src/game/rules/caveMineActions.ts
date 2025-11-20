import { Action, GameState } from "@shared/schema";
import { ActionResult } from "../actions";
import { applyActionEffects } from "./index";

export const caveMineActions: Record<string, Action> = {
  mineStone: {
    id: "mineStone",
    label: "Mine Stone",
    show_when: {
      "tools.stone_pickaxe": true,
    },
    cost: {
      "resources.food": 5,
      "resources.torch": 1,
    },
    effects: {
      "resources.stone": "random(4,8)",
      "story.seen.hasMinedStone": true,
    },
    cooldown: 15,
  },

  mineIron: {
    id: "mineIron",
    label: "Mine Iron",
    show_when: {
      "tools.stone_pickaxe": true,
    },
    cost: {
      "resources.food": 5,
      "resources.torch": 1,
    },
    effects: {
      "resources.iron": "random(4,8)",
      "story.seen.hasIron": true,
    },
    cooldown: 20,
  },

  mineCoal: {
    id: "mineCoal",
    label: "Mine Coal",
    show_when: {
      "tools.iron_pickaxe": true,
    },
    cost: {
      "resources.food": 5,
      "resources.torch": 1,
    },
    effects: {
      "resources.coal": "random(4,8)",
      "story.seen.hasCoal": true,
    },
    cooldown: 20,
  },

  mineSulfur: {
    id: "mineSulfur",
    label: "Mine Sulfur",
    show_when: {
      "tools.steel_pickaxe": true,
      "buildings.foundry": 1,
    },
    cost: {
      "resources.food": 15,
      "resources.torch": 2,
    },
    effects: {
      "resources.sulfur": "random(4,8)",
      "story.seen.hasSulfur": true,
    },
    cooldown: 20,
  },

  mineObsidian: {
    id: "mineObsidian",
    label: "Mine Obsidian",
    show_when: {
      "tools.steel_pickaxe": true,
    },
    cost: {
      "resources.food": 25,
      "resources.torch": 5,
    },
    effects: {
      "resources.obsidian": "random(3,7)",
      "story.seen.hasObsidian": true,
    },
    cooldown: 25,
  },

  mineAdamant: {
    id: "mineAdamant",
    label: "Mine Adamant",
    show_when: {
      "tools.obsidian_pickaxe": true,
    },
    cost: {
      "resources.food": 50,
      "resources.torch": 10,
    },
    effects: {
      "resources.adamant": "random(2,6)",
      "story.seen.hasAdamant": true,
    },
    cooldown: 30,
  },
};

// Helper function to apply button upgrade bonus to mining resources
function applyMiningUpgradeBonus(actionId: string, state: GameState, effectUpdates: any, resourceKey: string): void {
  const { getButtonUpgradeBonus } = require('@/game/buttonUpgrades');
  const buttonUpgradeBonus = getButtonUpgradeBonus(actionId, state);
  
  if (buttonUpgradeBonus > 0 && effectUpdates.resources?.[resourceKey]) {
    const existingAmount = state.resources[resourceKey] || 0;
    const addedAmount = effectUpdates.resources[resourceKey] - existingAmount;
    const bonusAmount = Math.floor(addedAmount * (1 + buttonUpgradeBonus));
    effectUpdates.resources[resourceKey] = existingAmount + bonusAmount;
  }
}

// Action handlers
export function handleMineStone(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineStone', state);
  
  applyMiningUpgradeBonus('mineStone', state, effectUpdates, 'stone');

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleMineIron(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineIron', state);
  
  applyMiningUpgradeBonus('mineIron', state, effectUpdates, 'iron');

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleMineCoal(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineCoal', state);
  
  applyMiningUpgradeBonus('mineCoal', state, effectUpdates, 'coal');

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleMineSulfur(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineSulfur', state);
  
  applyMiningUpgradeBonus('mineSulfur', state, effectUpdates, 'sulfur');

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleMineObsidian(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineObsidian', state);
  
  applyMiningUpgradeBonus('mineObsidian', state, effectUpdates, 'obsidian');

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleMineAdamant(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineAdamant', state);
  
  applyMiningUpgradeBonus('mineAdamant', state, effectUpdates, 'adamant');

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}