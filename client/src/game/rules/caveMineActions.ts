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
    upgrade_key: "mineStone",
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
    upgrade_key: "mineIron",
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
    upgrade_key: "mineCoal",
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
    upgrade_key: "mineSulfur",
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
    upgrade_key: "mineObsidian",
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
    upgrade_key: "mineAdamant",
  },
};

// Action handlers
export function handleMineStone(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineStone', state);

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
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleMineIron(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineIron', state);

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
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleMineCoal(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineCoal', state);

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
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleMineSulfur(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineSulfur', state);

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