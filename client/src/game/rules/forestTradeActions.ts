import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { applyActionEffects } from "./actionEffects";
import {
  getMerchantGoldPricePerUnit,
  type MerchantGoldPricedResource,
} from "./eventsMerchant";

/** Ashwraith bridge sell pays this fraction of the merchant gold-per-unit rate. */
const FOREST_BRIDGE_SELL_GOLD_RATIO = 0.25;

const FOREST_SELL_GOLD_STEP = 25;

function roundForestSellGold(rawGold: number): number {
  const quotient = rawGold / FOREST_SELL_GOLD_STEP;
  const lower = Math.floor(quotient);
  const remainder = quotient - lower;
  if (remainder < 0.5) return lower * FOREST_SELL_GOLD_STEP;
  if (remainder > 0.5) return (lower + 1) * FOREST_SELL_GOLD_STEP;
  return lower * FOREST_SELL_GOLD_STEP;
}

function calculateForestBridgeSellGold(
  amount: number,
  resource: MerchantGoldPricedResource,
): number {
  return roundForestSellGold(
    amount * getMerchantGoldPricePerUnit(resource) * FOREST_BRIDGE_SELL_GOLD_RATIO,
  );
}

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
  },

  tradeGoldForIron: {
    id: "tradeGoldForIron",
    label: "Buy Iron",
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
        "resources.iron": 250,
      },
      2: {
        "resources.iron": 500,
      },
      3: {
        "resources.iron": 1000,
      },
    },
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
        "resources.gold": 25,
      },
      2: {
        "resources.gold": 50,
      },
      3: {
        "resources.gold": 75,
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
        "resources.gold": 30,
      },
      2: {
        "resources.gold": 150,
      },
      3: {
        "resources.gold": 300,
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
        "resources.gold": 300,
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
  },

  tradeGoldForBlacksteel: {
    id: "tradeGoldForBlacksteel",
    label: "Buy Blacksteel",
    show_when: {
      1: {
        "buildings.grandBazaar": 1,
        "buildings.merchantsGuild": 0,
        "buildings.masterworkFoundry": 1,
      },
      2: {
        "buildings.merchantsGuild": 1,
        "buildings.masterworkFoundry": 1,
        "buildings.grandBlacksmith": 1,
      },
    },
    cost: {
      1: {
        "resources.gold": 75,
      },
      2: {
        "resources.gold": 150,
      },
    },
    effects: {
      1: {
        "resources.blacksteel": 25,
      },
      2: {
        "resources.blacksteel": 50,
      },
    },
  },

  sellLeatherBatch: {
    id: "sellLeatherBatch",
    label: "Sell Leather",
    show_when: {
      "story.seen.canyonBridgeBuilt": true,
    },
    cost: {
      "resources.leather": 500,
    },
    effects: (_state: GameState) => ({
      "resources.gold": calculateForestBridgeSellGold(500, "leather"),
    }),
  },

  sellSteelBatch: {
    id: "sellSteelBatch",
    label: "Sell Steel",
    show_when: {
      "story.seen.canyonBridgeBuilt": true,
    },
    cost: {
      "resources.steel": 500,
    },
    effects: (_state: GameState) => ({
      "resources.gold": calculateForestBridgeSellGold(500, "steel"),
    }),
  },

  sellBlacksteelBatch: {
    id: "sellBlacksteelBatch",
    label: "Sell Blacksteel",
    show_when: {
      "buildings.masterworkFoundry": 1,
      "story.seen.canyonBridgeBuilt": true,
    },
    cost: {
      "resources.blacksteel": 100,
    },
    effects: (_state: GameState) => ({
      "resources.gold": calculateForestBridgeSellGold(100, "blacksteel"),
    }),
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
        "resources.silver": 25,
      },
      2: {
        "resources.silver": 100,
      },
      3: {
        "resources.silver": 200,
      }
    },
    effects: {
      1: {
        "resources.gold": 5,
      },
      2: {
        "resources.gold": 25,
      },
      3: {
        "resources.gold": 50,
      }
    },
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
  },
  tradeGoldForVoidBomb: {
    id: "tradeGoldForVoidBomb",
    label: "Buy Void Bomb",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "story.seen.hasVoidBomb": true,
      },
    },
    cost: {
      1: {
        "resources.gold": 150,
      },
    },
    effects: {
      1: {
        "resources.void_bomb": 1,
      },
    },
  },

  tradeGoldForVeinfireElixir: {
    id: "tradeGoldForVeinfireElixir",
    label: "Buy Veinfire Elixir",
    show_when: {
      1: {
        "buildings.tradePost": 1,
        "story.seen.veinrootDiscovered": true,
      },
    },
    cost: {
      1: {
        "resources.gold": 150,
      },
    },
    effects: {
      1: {
        "resources.veinfire_elixir": 1,
      },
    },
  },
};

/** Forest buy-trade cooldown (seconds); knowledge no longer reduces this. */
const FOREST_TRADE_COOLDOWN_SEC = 5;

export function handleTradeAction(
  actionId: string,
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects(actionId, state);
  Object.assign(result.stateUpdates, effectUpdates);

  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    [actionId]: FOREST_TRADE_COOLDOWN_SEC,
  };

  // Update initialCooldowns to match the custom cooldown for animation persistence
  (result.stateUpdates as any).initialCooldowns = {
    ...(result.stateUpdates as any).initialCooldowns,
    [actionId]: FOREST_TRADE_COOLDOWN_SEC,
  };

  return result;
}

const FOREST_SELL_ACTION_IDS = new Set([
  "sellLeatherBatch",
  "sellSteelBatch",
  "sellBlacksteelBatch",
]);

export function handleForestSellAction(
  actionId: string,
  state: GameState,
  result: ActionResult,
): ActionResult {
  if (!FOREST_SELL_ACTION_IDS.has(actionId)) {
    return result;
  }

  const effectUpdates = applyActionEffects(actionId, state);
  Object.assign(result.stateUpdates, effectUpdates);

  const sellCooldownSeconds = 90;
  result.stateUpdates.cooldowns = {
    ...result.stateUpdates.cooldowns,
    [actionId]: sellCooldownSeconds,
  };

  (result.stateUpdates as any).initialCooldowns = {
    ...(result.stateUpdates as any).initialCooldowns,
    [actionId]: sellCooldownSeconds,
  };

  return result;
}
