import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { getUpgradeBonusMultiplier } from "@/game/buttonUpgrades";
import { applyActionEffects } from "./actionEffects";

const BONE_TOTEM_BASE_COST = 100;
const BONE_TOTEM_BASE_AMOUNT = 1;

const LEATHER_TOTEM_BASE_COST = 30;
const LEATHER_TOTEM_BASE_AMOUNT = 1;

function getCraftTotemUpgradeMultiplier(state: GameState, key: "craftBoneTotems" | "craftLeatherTotems"): number {
  if (!state.books?.book_of_ascension) return 1;
  return getUpgradeBonusMultiplier(key, state);
}

export const caveCraftResources: Record<string, Action> = {
  craftBoneTotems: {
    id: "craftBoneTotems",
    label: "Bone Totems",
    show_when: {
      "buildings.altar": 1,
    },
    cost: (state: GameState) => {
      const mult = getCraftTotemUpgradeMultiplier(state, "craftBoneTotems");
      return { "resources.bones": Math.floor(BONE_TOTEM_BASE_COST * mult) };
    },
    effects: (state: GameState) => {
      const mult = getCraftTotemUpgradeMultiplier(state, "craftBoneTotems");
      const amount = Math.floor(BONE_TOTEM_BASE_AMOUNT * mult);
      return {
        "resources.bone_totem": amount,
        "story.seen.hasBoneTotem": true,
      };
    },
    executionTime: 20,
    cooldown: 0,
  },

  craftLeatherTotems: {
    id: "craftLeatherTotems",
    label: "Leather Totems",
    show_when: {
      "buildings.temple": 1,
    },
    cost: (state: GameState) => {
      const mult = getCraftTotemUpgradeMultiplier(state, "craftLeatherTotems");
      return { "resources.leather": Math.floor(LEATHER_TOTEM_BASE_COST * mult) };
    },
    effects: (state: GameState) => {
      const mult = getCraftTotemUpgradeMultiplier(state, "craftLeatherTotems");
      const amount = Math.floor(LEATHER_TOTEM_BASE_AMOUNT * mult);
      return {
        "resources.leather_totem": amount,
        "story.seen.hasLeatherTotem": true,
      };
    },
    executionTime: 20,
    cooldown: 0,
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
      "story.seen.emberBombsCrafted": (state: GameState) => {
        const current = Number(state.story?.seen?.emberBombsCrafted) || 0;
        return current + 1;
      },
    },
    executionTime: 20,
    cooldown: 0,
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
      "story.seen.ashfireBombsCrafted": (state: GameState) => {
        const current = Number(state.story?.seen?.ashfireBombsCrafted) || 0;
        return current + 1;
      },
    },
    executionTime: 30,
    cooldown: 0,
  },

  craftVoidBomb: {
    id: "craftVoidBomb",
    label: "Void Bomb",
    show_when: {
      "buildings.alchemistHall": 1,
      "story.seen.canCraftVoidBomb": true,
    },
    cost: {
      "resources.ashfire_dust": 15,
      "resources.black_powder": 50,
      "resources.obsidian": 25,
    },
    effects: {
      "resources.void_bomb": 1,
      "story.seen.hasVoidBomb": true,
      "story.seen.voidBombsCrafted": (state: GameState) => {
        const current = Number(state.story?.seen?.voidBombsCrafted) || 0;
        return current + 1;
      },
    },
    executionTime: 45,
    cooldown: 0,
  },
};

// Action handlers
export function handleCraftBoneTotems(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects("craftBoneTotems", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftLeatherTotems(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects("craftLeatherTotems", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftEmberBomb(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects("craftEmberBomb", state);
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
  const effectUpdates = applyActionEffects("craftAshfireBomb", state);
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

export function handleCraftVoidBomb(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects("craftVoidBomb", state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Only show message on first craft
  if (!state.story.seen.hasVoidBomb) {
    result.logEntries!.push({
      id: `void-bomb-crafted-${Date.now()}`,
      message: "Combining ashfire dust with obsidian and black powder, you create a weapon of terrifying power. The void bomb seems to distort space around it, reality itself recoiling from its presence.",
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return result;
}
