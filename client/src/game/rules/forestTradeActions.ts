import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { getTotalKnowledge } from './effectsCalculation';
import { applyActionEffects } from "./index";

export const forestTradeActions: Record<string, Action> = {
  tradeGoldForWood: {
    id: "tradeGoldForWood",
    label: "Buy Wood",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
      },
      2: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 5,
      },
      2: {
        "resources.gold": 25,
      },
    },
    effects: {
      1: {
        "resources.wood": 500,
      },
      2: {
        "resources.wood": 2500,
      },
    },
    cooldown: 30,
  },

  tradeGoldForStone: {
    id: "tradeGoldForStone",
    label: "Buy Stone",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
      },
      2: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 10,
      },
      2: {
        "resources.gold": 50,
      },
    },
    effects: {
      1: {
        "resources.stone": 500,
      },
      2: {
        "resources.stone": 2500,
      },
    },
    cooldown: 30,
  },

  tradeGoldForSteel: {
    id: "tradeGoldForSteel",
    label: "Buy Steel",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
      },
      2: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 15,
      },
      2: {
        "resources.gold": 75,
      },
    },
    effects: {
      1: {
        "resources.steel": 100,
      },
      2: {
        "resources.steel": 500,
      },
    },
    cooldown: 30,
  },

  tradeGoldForObsidian: {
    id: "tradeGoldForObsidian",
    label: "Buy Obsidian",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
      },
      2: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 25,
      },
      2: {
        "resources.gold": 50,
      },
    },
    effects: {
      1: {
        "resources.obsidian": 50,
      },
      2: {
        "resources.obsidian": 100,
      },
    },
    cooldown: 30,
  },

  tradeGoldForAdamant: {
    id: "tradeGoldForAdamant",
    label: "Buy Adamant",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
      },
      2: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 50,
      },
      2: {
        "resources.gold": 100,
      },
    },
    effects: {
      1: {
        "resources.adamant": 50,
      },
      2: {
        "resources.adamant": 100,
      },
    },
    cooldown: 30,
  },

  tradeGoldForTorch: {
    id: "tradeGoldForTorch",
    label: "Buy Torch",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
      },
      2: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 10,
      },
      2: {
        "resources.gold": 20,
      },
    },
    effects: {
      1: {
        "resources.torch": 50,
      },
      2: {
        "resources.torch": 100,
      },
    },
    cooldown: 30,
  },

  tradeSilverForGold: {
    id: "tradeSilverForGold",
    label: "Buy Gold",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
      },
      2: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.silver": 100,
      },
      2: {
        "resources.silver": 200,
      },
    },
    effects: {
      1: {
        "resources.gold": 50,
      },
      2: {
        "resources.gold": 100,
      },
    },
    cooldown: 30,
  },
};

// Helper function to handle all trade actions with knowledge-based cooldown reduction
function handleTradeAction(
  actionId: string,
  state: GameState,
  result: ActionResult
): ActionResult {
  const effectUpdates = applyActionEffects(actionId, state);
  Object.assign(result.stateUpdates, effectUpdates);

  const knowledge = getTotalKnowledge(state);
  const cooldownReduction = Math.min(0.5 * knowledge, 15);
  const actualCooldown = Math.max(15, 30 - cooldownReduction);

  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    [actionId]: actualCooldown,
  };

  return result;
}

export function handleTradeGoldForWood(state: GameState, result: ActionResult): ActionResult {
  return handleTradeAction('tradeGoldForWood', state, result);
}

export function handleTradeGoldForStone(state: GameState, result: ActionResult): ActionResult {
  return handleTradeAction('tradeGoldForStone', state, result);
}

export function handleTradeGoldForSteel(state: GameState, result: ActionResult): ActionResult {
  return handleTradeAction('tradeGoldForSteel', state, result);
}

export function handleTradeGoldForObsidian(state: GameState, result: ActionResult): ActionResult {
  return handleTradeAction('tradeGoldForObsidian', state, result);
}

export function handleTradeGoldForAdamant(state: GameState, result: ActionResult): ActionResult {
  return handleTradeAction('tradeGoldForAdamant', state, result);
}

export function handleTradeGoldForTorch(state: GameState, result: ActionResult): ActionResult {
  return handleTradeAction('tradeGoldForTorch', state, result);
}

export function handleTradeSilverForGold(state: GameState, result: ActionResult): ActionResult {
  return handleTradeAction('tradeSilverForGold', state, result);
}