import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { getTotalKnowledge } from "./effectsCalculation";
import { applyActionEffects } from "./index";

export const forestTradeActions: Record<string, Action> = {
  tradeGoldForFood: {
    id: "tradeGoldForFood",
    label: "Buy Food",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
      },
      2: {
        "buildings.buildGrandBazaar": 1,
        "buildings.merchantsGuild": 0,
      },
      3: {
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
      3: {
        "resources.gold": 40,
      },
    },
    effects: {
      1: {
        "resources.food": 250,
      },
      2: {
        "resources.food": 500,
      },
      3: {
        "resources.food": 1000,
      },
    },
    cooldown: 90,
  },

  tradeGoldForWood: {
    id: "tradeGoldForWood",
    label: "Buy Wood",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
      },
      2: {
        "buildings.grandBazaar": 1,
        "buildings.merchantsGuild": 0,
      },
      3: {
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
      3: {
        "resources.gold": 40,
      },
    },
    effects: {
      1: {
        "resources.wood": 250,
      },
      2: {
        "resources.wood": 500,
      },
      3: {
        "resources.wood": 1000,
      },
    },
    cooldown: 90,
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
        "buildings.grandBazaar": 1,
        "buildings.merchantsGuild": 0,
      },
      3: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 15,
      },
      2: {
        "resources.gold": 30,
      },
      3: {
        "resources.gold": 60,
      },
    },
    effects: {
      1: {
        "resources.stone": 250,
      },
      2: {
        "resources.stone": 500,
      },
      3: {
        "resources.stone": 1000,
      },
    },
    cooldown: 90,
  },

  tradeGoldForLeather: {
    id: "tradeGoldForLeather",
    label: "Buy Leather",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
      },
      2: {
        "buildings.grandBazaar": 1,
        "buildings.merchantsGuild": 0,
      },
      3: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 15,
      },
      2: {
        "resources.gold": 30,
      },
      3: {
        "resources.gold": 45,
      },
    },
    effects: {
      1: {
        "resources.leather": 50,
      },
      2: {
        "resources.leather": 100,
      },
      3: {
        "resources.leather": 150,
      },
    },
    cooldown: 90,
  },

  tradeGoldForSteel: {
    id: "tradeGoldForSteel",
    label: "Buy Steel",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
        "tools.iron_pickaxe": 1,
      },
      2: {
        "buildings.grandBazaar": 1,
        "buildings.merchantsGuild": 0,
        "tools.iron_pickaxe": 1,
      },
      3: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 20,
      },
      2: {
        "resources.gold": 100,
      },
      3: {
        "resources.gold": 200,
      },
    },
    effects: {
      1: {
        "resources.steel": 50,
      },
      2: {
        "resources.steel": 250,
      },
      3: {
        "resources.steel": 500,
      },
    },
    cooldown: 90,
  },

  tradeGoldForObsidian: {
    id: "tradeGoldForObsidian",
    label: "Buy Obsidian",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
        "tools.steel_pickaxe": 1,
      },
      2: {
        "buildings.grandBazaar": 1,
        "buildings.merchantsGuild": 0,
        "tools.steel_pickaxe": 1,
      },
      3: {
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
      3: {
        "resources.gold": 250,
      },
    },
    effects: {
      1: {
        "resources.obsidian": 50,
      },
      2: {
        "resources.obsidian": 100,
      },
      3: {
        "resources.obsidian": 250,
      },
    },
    cooldown: 90,
  },

  tradeGoldForAdamant: {
    id: "tradeGoldForAdamant",
    label: "Buy Adamant",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "buildings.merchantsGuild": 0,
        "tools.obsidian_pickaxe": 1,
      },
      2: {
        "buildings.grandBazaar": 1,
        "buildings.merchantsGuild": 0,
        "tools.obsidian_pickaxe": 1,
      },
      3: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 60,
      },
      2: {
        "resources.gold": 120,
      },
      3: {
        "resources.gold": 240,
      },
    },
    effects: {
      1: {
        "resources.adamant": 50,
      },
      2: {
        "resources.adamant": 100,
      },
      3: {
        "resources.adamant": 250,
      },
    },
    cooldown: 90,
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
        "buildings.grandBazaar": 1,
        "buildings.merchantsGuild": 0,
      },
      3: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 15,
      },
      2: {
        "resources.gold": 30,
      },
      3: {
        "resources.gold": 75,
      },
    },
    effects: {
      1: {
        "resources.torch": 50,
      },
      2: {
        "resources.torch": 100,
      },
      3: {
        "resources.torch": 250,
      },
    },
    cooldown: 90,
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
        "buildings.grandBazaar": 1,
        "buildings.merchantsGuild": 0,
      },
      3: {
        "buildings.merchantsGuild": 1,
      },
    },
    cost: {
      1: {
        "resources.silver": 40,
      },
      2: {
        "resources.silver": 100,
      },
      3: {
        "resources.silver": 200,
      },
    },
    effects: {
      1: {
        "resources.gold": 10,
      },
      2: {
        "resources.gold": 25,
      },
      3: {
        "resources.gold": 50,
      },
    },
    cooldown: 90,
  },

  tradeGoldForEmberBomb: {
    id: "tradeGoldForEmberBomb",
    label: "Buy Ember Bomb",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "story.seen.hasEmberBomb": true,
      },
    },
    cost: {
      1: {
        "resources.gold": 50,
      },
    },
    effects: {
      1: {
        "resources.ember_bomb": 1,
      },
    },
    cooldown: 90,
  },

  tradeGoldForAshfireBomb: {
    id: "tradeGoldForAshfireBomb",
    label: "Buy Ashfire Bomb",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "story.seen.hasAshfireBomb": true,
      },
    },
    cost: {
      1: {
        "resources.gold": 100,
      },
    },
    effects: {
      1: {
        "resources.ashfire_bomb": 1,
      },
    },
    cooldown: 90,
  },
};

// Helper function to handle all trade actions with knowledge-based cooldown reduction
function handleTradeAction(
  actionId: string,
  state: GameState,
  result: ActionResult,
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

export function handleTradeGoldForFood(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeGoldForFood", state, result);
}

export function handleTradeGoldForWood(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeGoldForWood", state, result);
}

export function handleTradeGoldForStone(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeGoldForStone", state, result);
}

export function handleTradeGoldForLeather(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeGoldForLeather", state, result);
}

export function handleTradeGoldForSteel(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeGoldForSteel", state, result);
}

export function handleTradeGoldForObsidian(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeGoldForObsidian", state, result);
}

export function handleTradeGoldForAdamant(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeGoldForAdamant", state, result);
}

export function handleTradeGoldForTorch(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeGoldForTorch", state, result);
}

export function handleTradeSilverForGold(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeSilverForGold", state, result);
}

export function handleTradeGoldForEmberBomb(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeGoldForEmberBomb", state, result);
}

export function handleTradeGoldForAshfireBomb(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTradeAction("tradeGoldForAshfireBomb", state, result);
}
