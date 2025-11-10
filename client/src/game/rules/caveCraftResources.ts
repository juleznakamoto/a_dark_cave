import { Action, GameState } from "@shared/schema";
import { ActionResult } from "../actions";
import { applyActionEffects } from "./index";

export const caveCraftResources: Record<string, Action> = {
  craftBoneTotem: {
    id: "craftBoneTotem",
    label: "Bone Totem",
    show_when: {
      "buildings.altar": 1,
      "buildings.shrine": 0,
    },
    cost: {
      "resources.bones": 50,
    },
    effects: {
      "resources.bone_totem": 2,
      "story.seen.hasBoneTotem": true,
    },
    cooldown: 20,
  },
  craftBoneTotems2: {
    id: "craftBoneTotems2",
    label: "Bone Totems",
    show_when: {
      "buildings.shrine": 1,
      "buildings.temple": 0,
    },
    cost: {
      "resources.bones": 100,
    },
    effects: {
      "resources.bone_totem": 2,
      "story.seen.hasBoneTotem": true,
    },
    cooldown: 20,
  },
  craftBoneTotems3: {
    id: "craftBoneTotems3",
    label: "Bone Totems",
    show_when: {
      "buildings.temple": 1,
      "buildings.sanctum": 0,
    },
    cost: {
      "resources.bones": 150,
    },
    effects: {
      "resources.bone_totem": 3,
      "story.seen.hasBoneTotem": true,
    },
    cooldown: 20,
  },
  craftBoneTotems5: {
    id: "craftBoneTotems5",
    label: "Bone Totems",
    show_when: {
      "buildings.sanctum": 1,
    },
    cost: {
      "resources.bones": 500,
    },
    effects: {
      "resources.bone_totem": 5,
      "story.seen.hasBoneTotem": true,
    },
    cooldown: 20,
  },

  craftLeatherTotem: {
    id: "craftLeatherTotem",
    label: "Leather Totem",
    show_when: {
      "buildings.temple": 1,
      "buildings.sanctum": 0,
    },
    cost: {
      "resources.leather": 10,
    },
    effects: {
      "resources.leather_totem": 1,
      "story.seen.hasLeatherTotem": true,
    },
    cooldown: 20,
  },

  craftLeatherTotems5: {
    id: "craftLeatherTotems5",
    label: "Leather Totems",
    show_when: {
      "buildings.sanctum": 1,
    },
    cost: {
      "resources.leather": 50,
    },
    effects: {
      "resources.leather_totem": 5,
      "story.seen.hasLeatherTotem": true,
    },
    cooldown: 20,
  },

  craftEmberBomb: {
    id: "craftEmberBomb",
    label: "Ember Bomb",
    show_when: {
      "buildings.alchemistHall": 1,
      "story.seen.portalDiscovered": true,
    },
    cost: {
      "resources.iron": 100,
      "resources.black_powder": 50,
    },
    effects: {
      "resources.ember_bomb": 1,
      "story.seen.hasEmberBomb": true,
    },
    cooldown: 20,
  },

  craftAshfireBomb: {
    id: "craftAshfireBomb",
    label: "Ashfire Bomb",
    show_when: {
      "buildings.alchemistHall": 1,
      "story.seen.alchemistArrives": true,
    },
    cost: {
      "resources.ashfire_dust": 10,
      "resources.black_powder": 50,
    },
    effects: {
      "resources.ashfire_bomb": 1,
      "story.seen.hasAshfireBomb": true,
    },
    cooldown: 30,
  },
};

// Action handlers
export function handleCraftBoneTotem(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftBoneTotem', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftBoneTotems2(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftBoneTotems2', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftBoneTotems3(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftBoneTotems3', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftLeatherTotem(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftLeatherTotem', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftLeatherTotems5(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftLeatherTotems5', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftBoneTotems5(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftBoneTotems5', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftEmberBomb(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftEmberBomb', state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Only show message on first craft
  if (!state.story.seen.hasEmberBomb) {
    result.logEntries!.push({
      id: `ember-bomb-crafted-${Date.now()}`,
      message: "The alchemist's knowledge proves invaluable. You craft a powerful ember bomb, its core glowing with intense heat and destructive potential.",
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return result;
}

export function handleCraftAshfireBomb(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftAshfireBomb', state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Only show message on first craft
  if (!state.story.seen.hasAshfireBomb) {
    result.logEntries!.push({
      id: `ashfire-bomb-crafted-${Date.now()}`,
      message: "Using the mystical ashfire dust, you craft an extraordinary bomb that pulses with otherworldly fire. Its flames burn with colors not of this realm.",
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return result;
}