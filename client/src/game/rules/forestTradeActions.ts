
import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { getTotalKnowledge } from './effects';
import { applyActionEffects } from './index';

export const forestTradeActions: Record<string, Action> = {
  tradeGoldForWood: {
    id: "tradeGoldForWood",
    label: "Buy 500 Wood",
    show_when: {
      "buildings.tradePost": 1,
    },
    cost: {
      "resources.gold": 5,
    },
    effects: {
      "resources.gold": -5,
      "resources.wood": 500,
    },
    cooldown: 30,
  },

  tradeGoldForStone: {
    id: "tradeGoldForStone",
    label: "Buy 500 Stone",
    show_when: {
      "buildings.tradePost": 1,
    },
    cost: {
      "resources.gold": 10,
    },
    effects: {
      "resources.gold": -10,
      "resources.stone": 500,
    },
    cooldown: 30,
  },

  tradeGoldForSteel: {
    id: "tradeGoldForSteel",
    label: "Buy 100 Steel",
    show_when: {
      "buildings.tradePost": 1,
    },
    cost: {
      "resources.gold": 15,
    },
    effects: {
      "resources.gold": -15,
      "resources.steel": 100,
    },
    cooldown: 30,
  },

  tradeGoldForObsidian: {
    id: "tradeGoldForObsidian",
    label: "Buy 50 Obsidian",
    show_when: {
      "buildings.tradePost": 1,
    },
    cost: {
      "resources.gold": 25,
    },
    effects: {
      "resources.gold": -25,
      "resources.obsidian": 50,
    },
    cooldown: 30,
  },

  tradeGoldForAdamant: {
    id: "tradeGoldForAdamant",
    label: "Buy 50 Adamant",
    show_when: {
      "buildings.tradePost": 1,
    },
    cost: {
      "resources.gold": 50,
    },
    effects: {
      "resources.gold": -50,
      "resources.adamant": 50,
    },
    cooldown: 30,
  },

  tradeGoldForTorch: {
    id: "tradeGoldForTorch",
    label: "Buy 50 Torch",
    show_when: {
      "buildings.tradePost": 1,
    },
    cost: {
      "resources.gold": 10,
    },
    effects: {
      "resources.gold": -10,
      "resources.torch": 50,
    },
    cooldown: 30,
  },

  tradeSilverForGold: {
    id: "tradeSilverForGold",
    label: "Buy 50 Gold",
    show_when: {
      "buildings.tradePost": 1,
    },
    cost: {
      "resources.silver": 100,
    },
    effects: {
      "resources.silver": -100,
      "resources.gold": 50,
    },
    cooldown: 30,
  },
};

export function handleTradeGoldForWood(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('tradeGoldForWood', state);
  Object.assign(result.stateUpdates, effectUpdates);

  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeGoldForWood: actualCooldown,
  };

  return result;
}

export function handleTradeGoldForStone(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('tradeGoldForStone', state);
  Object.assign(result.stateUpdates, effectUpdates);

  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeGoldForStone: actualCooldown,
  };

  return result;
}

export function handleTradeGoldForSteel(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('tradeGoldForSteel', state);
  Object.assign(result.stateUpdates, effectUpdates);

  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeGoldForSteel: actualCooldown,
  };

  return result;
}

export function handleTradeGoldForObsidian(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('tradeGoldForObsidian', state);
  Object.assign(result.stateUpdates, effectUpdates);

  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeGoldForObsidian: actualCooldown,
  };

  return result;
}

export function handleTradeGoldForAdamant(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('tradeGoldForAdamant', state);
  Object.assign(result.stateUpdates, effectUpdates);

  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeGoldForAdamant: actualCooldown,
  };

  return result;
}

export function handleTradeGoldForTorch(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('tradeGoldForTorch', state);
  Object.assign(result.stateUpdates, effectUpdates);

  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeGoldForTorch: actualCooldown,
  };

  return result;
}

export function handleTradeSilverForGold(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('tradeSilverForGold', state);
  Object.assign(result.stateUpdates, effectUpdates);

  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeSilverForGold: actualCooldown,
  };

  return result;
}
