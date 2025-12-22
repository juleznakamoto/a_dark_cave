import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { applyActionEffects } from "./actionEffects";

export const caveMineActions: Record<string, Action> = {
  mineStone: {
    id: "mineStone",
    label: "Mine Stone",
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
          probability: (state) => state.tools?.natharit_pickaxe ? 0.05 : 0,
          value: 50,
          logMessage: "The natharit pickaxe reveals a vein of silver! +50 Silver",
        },
        "story.seen.hasMinedStone": true,
      };
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
      "resources.food": 10,
      "resources.torch": 1,
    },
    effects: (state: GameState) => {
      const bonus = state.BTP === 1 ? 1 : 0;
      return {
        "resources.iron": `random(${4 + bonus},${8 + bonus})`,
        "resources.silver": {
          probability: (state) => state.tools?.natharit_pickaxe ? 0.05 : 0,
          value: 50,
          logMessage: "The natharit pickaxe reveals a vein of silver! +50 Silver",
        },
        "story.seen.hasIron": true,
      };
    },
    cooldown: 15,
    upgrade_key: "mineIron",
  },

  mineCoal: {
    id: "mineCoal",
    label: "Mine Coal",
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
          probability: (state) => state.tools?.natharit_pickaxe ? 0.05 : 0,
          value: 50,
          logMessage: "The natharit pickaxe reveals a vein of silver! +50 Silver",
        },
        "story.seen.hasCoal": true,
      };
    },
    cooldown: 15,
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
      "resources.food": 30,
      "resources.torch": 2,
    },
    effects: (state: GameState) => {
      const bonus = state.BTP === 1 ? 1 : 0;
      return {
        "resources.sulfur": `random(${4 + bonus},${8 + bonus})`,
        "resources.silver": {
          probability: (state) => state.tools?.natharit_pickaxe ? 0.05 : 0,
          value: 50,
          logMessage: "The natharit pickaxe reveals a vein of silver! +50 Silver",
        },
        "story.seen.hasSulfur": true,
      };
    },
    cooldown: 15,
    upgrade_key: "mineSulfur",
  },

  mineObsidian: {
    id: "mineObsidian",
    label: "Mine Obsidian",
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
          probability: (state) => state.tools?.natharit_pickaxe ? 0.05 : 0,
          value: 50,
          logMessage: "The natharit pickaxe reveals a vein of silver! +50 Silver",
        },
        "story.seen.hasObsidian": true,
      };
    },
    cooldown: 20,
    upgrade_key: "mineObsidian",
  },

  mineAdamant: {
    id: "mineAdamant",
    label: "Mine Adamant",
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
          probability: (state) => state.tools?.natharit_pickaxe ? 0.05 : 0,
          value: 50,
          logMessage: "The natharit pickaxe reveals a vein of silver! +50 Silver",
        },
        "story.seen.hasAdamant": true,
      };
    },
    cooldown: 25,
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