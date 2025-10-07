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
      "resources.bone_totem": 1,
      "story.seen.hasBoneTotem": true,
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

  craftCinderflameBomb: {
    id: "craftCinderflameBomb",
    label: "Cinderflame Bomb",
    show_when: {
      "buildings.alchemistHall": 1,
      "story.seen.alchemistArrives": true,
    },
    cost: {
      "resources.cinderflame_dust": 10,
      "resources.black_powder": 50,
    },
    effects: {
      "resources.cinderflame_bomb": 1,
      "story.seen.hasCinderflameBomb": true,
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

export function handleCraftCinderflameBomb(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftCinderflameBomb', state);
  Object.assign(result.stateUpdates, effectUpdates);

  result.logEntries!.push({
    id: `cinderflame-bomb-crafted-${Date.now()}`,
    message: "Using the mystical cinderflame dust, you craft an extraordinary bomb that pulses with otherworldly fire. Its flames burn with colors not of this realm.",
    timestamp: Date.now(),
    type: 'system',
  });

  return result;
}
