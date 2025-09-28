
import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';

// Helper function to calculate dynamic cooldown for trade actions
export function getTradeActionCooldown(state: GameState): number {
  const knowledge = state.resources.knowledge || 0;
  const reduction = Math.min(0.5 * knowledge, 15);
  return Math.max(30 - reduction, 0);
}

// Trade Post Actions
export const tradePostActions: Record<string, Action> = {
  tradeWoodForGold: {
    id: "tradeWoodForGold",
    label: "500 Wood → 5 Gold",
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
    dynamicCooldown: true,
  },

  tradeStoneForGold: {
    id: "tradeStoneForGold",
    label: "500 Stone → 10 Gold",
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
    dynamicCooldown: true,
  },

  tradeSteelForGold: {
    id: "tradeSteelForGold",
    label: "100 Steel → 15 Gold",
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
    dynamicCooldown: true,
  },

  tradeObsidianForGold: {
    id: "tradeObsidianForGold",
    label: "50 Obsidian → 25 Gold",
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
    dynamicCooldown: true,
  },

  tradeAdamantForGold: {
    id: "tradeAdamantForGold",
    label: "50 Adamant → 50 Gold",
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
    dynamicCooldown: true,
  },

  tradeTorchForGold: {
    id: "tradeTorchForGold",
    label: "50 Torch → 10 Gold",
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
    dynamicCooldown: true,
  },

  tradeGoldForSilver: {
    id: "tradeGoldForSilver",
    label: "50 Gold → 100 Silver",
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
    dynamicCooldown: true,
  },
};

// Trade Post Trade Handlers
function handleTradePostTrade(
  state: GameState,
  result: ActionResult,
  actionId: string
): ActionResult {
  const action = tradePostActions[actionId];
  if (!action) return result;

  const level = 1;
  const effects = action.effects[level];
  const newResources = { ...state.resources };

  for (const [path, effect] of Object.entries(effects)) {
    if (path.startsWith('resources.')) {
      const resource = path.split('.')[1] as keyof typeof newResources;
      newResources[resource] += effect;
    }
  }

  result.stateUpdates.resources = newResources;
  return result;
}

export function handleTradeWoodForGold(state: GameState, result: ActionResult): ActionResult {
  return handleTradePostTrade(state, result, 'tradeWoodForGold');
}

export function handleTradeStoneForGold(state: GameState, result: ActionResult): ActionResult {
  return handleTradePostTrade(state, result, 'tradeStoneForGold');
}

export function handleTradeSteelForGold(state: GameState, result: ActionResult): ActionResult {
  return handleTradePostTrade(state, result, 'tradeSteelForGold');
}

export function handleTradeObsidianForGold(state: GameState, result: ActionResult): ActionResult {
  return handleTradePostTrade(state, result, 'tradeObsidianForGold');
}

export function handleTradeAdamantForGold(state: GameState, result: ActionResult): ActionResult {
  return handleTradePostTrade(state, result, 'tradeAdamantForGold');
}

export function handleTradeTorchForGold(state: GameState, result: ActionResult): ActionResult {
  return handleTradePostTrade(state, result, 'tradeTorchForGold');
}

export function handleTradeGoldForSilver(state: GameState, result: ActionResult): ActionResult {
  return handleTradePostTrade(state, result, 'tradeGoldForSilver');
}
