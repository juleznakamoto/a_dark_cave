
import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { getTotalKnowledge } from './effects';

export const forestTradeActions: Record<string, Action> = {
  tradeWoodForGold: {
    id: "tradeWoodForGold",
    label: "Buy 5 Gold",
    show_when: {
      1: {
        "buildings.blacksmith": 1,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
      },
    },
    effects: {
      1: {
        "resources.wood": -500,
        "resources.gold": 5,
      },
    },
    cooldown: 30,
  },

  tradeStoneForGold: {
    id: "tradeStoneForGold",
    label: "Buy 10 Gold",
    show_when: {
      1: {
        "buildings.tradePost": 1,
      },
    },
    cost: {
      1: {
        "resources.stone": 500,
      },
    },
    effects: {
      1: {
        "resources.stone": -500,
        "resources.gold": 10,
      },
    },
    cooldown: 30,
  },

  tradeSteelForGold: {
    id: "tradeSteelForGold",
    label: "Buy 15 Gold",
    show_when: {
      1: {
        "buildings.tradePost": 1,
      },
    },
    cost: {
      1: {
        "resources.steel": 100,
      },
    },
    effects: {
      1: {
        "resources.steel": -100,
        "resources.gold": 15,
      },
    },
    cooldown: 30,
  },

  tradeObsidianForGold: {
    id: "tradeObsidianForGold",
    label: "Buy 25 Gold",
    show_when: {
      1: {
        "buildings.tradePost": 1,
      },
    },
    cost: {
      1: {
        "resources.obsidian": 50,
      },
    },
    effects: {
      1: {
        "resources.obsidian": -50,
        "resources.gold": 25,
      },
    },
    cooldown: 30,
  },

  tradeAdamantForGold: {
    id: "tradeAdamantForGold",
    label: "Buy 50 Gold",
    show_when: {
      1: {
        "buildings.tradePost": 1,
      },
    },
    cost: {
      1: {
        "resources.adamant": 50,
      },
    },
    effects: {
      1: {
        "resources.adamant": -50,
        "resources.gold": 50,
      },
    },
    cooldown: 30,
  },

  tradeTorchForGold: {
    id: "tradeTorchForGold",
    label: "Buy 10 Gold",
    show_when: {
      1: {
        "buildings.tradePost": 1,
      },
    },
    cost: {
      1: {
        "resources.torch": 50,
      },
    },
    effects: {
      1: {
        "resources.torch": -50,
        "resources.gold": 10,
      },
    },
    cooldown: 30,
  },

  tradeGoldForSilver: {
    id: "tradeGoldForSilver",
    label: "Buy 100 Silver",
    show_when: {
      1: {
        "buildings.tradePost": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 50,
      },
    },
    effects: {
      1: {
        "resources.gold": -50,
        "resources.silver": 100,
      },
    },
    cooldown: 30,
  },
};

export function handleTradeWoodForGold(state: GameState, result: ActionResult): ActionResult {
  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeWoodForGold: actualCooldown,
  };

  return result;
}

export function handleTradeStoneForGold(state: GameState, result: ActionResult): ActionResult {
  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeStoneForGold: actualCooldown,
  };

  return result;
}

export function handleTradeSteelForGold(state: GameState, result: ActionResult): ActionResult {
  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeSteelForGold: actualCooldown,
  };

  return result;
}

export function handleTradeObsidianForGold(state: GameState, result: ActionResult): ActionResult {
  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeObsidianForGold: actualCooldown,
  };

  return result;
}

export function handleTradeAdamantForGold(state: GameState, result: ActionResult): ActionResult {
  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeAdamantForGold: actualCooldown,
  };

  return result;
}

export function handleTradeTorchForGold(state: GameState, result: ActionResult): ActionResult {
  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeTorchForGold: actualCooldown,
  };

  return result;
}

export function handleTradeGoldForSilver(state: GameState, result: ActionResult): ActionResult {
  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);
  
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    tradeGoldForSilver: actualCooldown,
  };

  return result;
}
