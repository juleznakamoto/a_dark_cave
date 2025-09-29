import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { applyActionEffects } from '@/game/rules';

export const caveCraftResources: Record<string, Action> = {
  craftBoneTotem: {
    id: "craftBoneTotem",
    label: "Bone Totem",
    show_when: {
      "buildings.altar": 1,
    },
    cost: {
      "resources.bones": 50,
    },
    effects: {
      "resources.bones": -50,
      "resources.bone_totem": 1,
      "story.seen.hasBoneTotem": true,
    },
    cooldown: 20,
  },

  craftEmberBomb: {
    id: "craftEmberBomb",
    label: "Ember Bomb",
    show_when: {
      "buildings.alchemistTower": 1,
      "story.seen.portalDiscovered": true,
    },
    cost: {
      "resources.iron": 100,
      "resources.black_powder": 50,
    },
    effects: {
      "resources.iron": -100,
      "resources.black_powder": -50,
      "resources.ember_bomb": 1,
      "story.seen.hasEmberBomb": true,
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

export function handleCraftEmberBomb(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftEmberBomb', state);
  Object.assign(result.stateUpdates, effectUpdates);

  result.logEntries!.push({
    id: `ember-bomb-crafted-${Date.now()}`,
    message: "The alchemist's knowledge proves invaluable. You craft a powerful ember bomb, its core glowing with intense heat and destructive potential.",
    timestamp: Date.now(),
    type: 'system',
  });

  return result;
}

  result.logEntries!.push({
    id: `ember-bomb-crafted-${Date.now()}`,
    message: "The alchemist's knowledge proves invaluable. You craft a powerful ember bomb, its core glowing with intense heat and destructive potential.",
    timestamp: Date.now(),
    type: 'system',
  });

  return result;
}