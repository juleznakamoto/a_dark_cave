import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { applyActionEffects } from '@/game/rules';

export const caveCraftTools: Record<string, Action> = {
  craftTorch: {
    id: "craftTorch",
    label: "Torch",
    show_when: {
      "story.seen.hasWood": true,
      "tools.stone_axe": false,
    },
    cost: {
      "resources.wood": 10,
    },
    effects: {
      "resources.torch": 1,
      "story.seen.actionCraftTorch": true,
    },
    unlocks: ["exploreDeeper"],
    cooldown: 2.5,
  },

  craftTorches: {
    id: "craftTorches",
    label: "Torches",
    show_when: {
      "tools.stone_axe": true,
      "tools.iron_axe": false,
    },
    cost: {
      "resources.wood": 20,
    },
    effects: {
      "resources.torch": 2,
      "story.seen.actionCraftTorches": true,
    },
    cooldown: 2.5,
  },

  craftTorches3: {
    id: "craftTorches3",
    label: "Torches",
    show_when: {
      "tools.iron_axe": true,
      "tools.steel_axe": false,
    },
    cost: {
      "resources.wood": 30,
    },
    effects: {
      "resources.torch": 3,
      "story.seen.actionCraftTorches3": true,
    },
    cooldown: 2.5,
  },

  craftTorches4: {
    id: "craftTorches4",
    label: "Torches",
    show_when: {
      "tools.steel_axe": true,
      "tools.obsidian_axe": false,
    },
    cost: {
      "resources.wood": 40,
    },
    effects: {
      "resources.torch": 4,
      "story.seen.actionCraftTorches4": true,
    },
    cooldown: 2.5,
  },

  craftTorches5: {
    id: "craftTorches5",
    label: "Torches",
    show_when: {
      "tools.obsidian_axe": true,
      "tools.adamant_axe": false,
    },
    cost: {
      "resources.wood": 50,
    },
    effects: {
      "resources.torch": 5,
      "story.seen.actionCraftTorches5": true,
    },
    cooldown: 2.5,
  },

  craftTorches10: {
    id: "craftTorches10",
    label: "Torches",
    show_when: {
      "tools.adamant_axe": true,
    },
    cost: {
      "resources.wood": 100,
    },
    effects: {
      "resources.torch": 10,
      "story.seen.actionCraftTorches10": true,
    },
    cooldown: 2.5,
  },

  craftStoneAxe: {
    id: "craftStoneAxe",
    label: "StoneAxe",
    show_when: {
      "flags.caveExplored": true,
      "tools.stone_axe": false,
    },
    cost: {
      "resources.wood": 10,
      "resources.stone": 10,
    },
    effects: {
      "tools.stone_axe": true,
      "flags.villageUnlocked": true,
      "story.seen.hasStoneAxe": true,
      "story.seen.actionCraftStoneAxe": true,
    },
    cooldown: 1,
  },

  craftStonePickaxe: {
    id: "craftStonePickaxe",
    label: "Stone Pickaxe",
    show_when: {
      "flags.caveExplored": true,
      "tools.stone_pickaxe": false,
      "tools.stone_axe": true,
    },
    cost: {
      "resources.wood": 50,
      "resources.stone": 100,
    },
    effects: {
      "tools.stone_pickaxe": true,
      "story.seen.hasStonePickaxe": true,
      "story.seen.actionCraftStonePickaxe": true,
    },
    cooldown: 5,
  },

  craftIronAxe: {
    id: "craftIronAxe",
    label: "Iron Axe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.stone_axe": true,
      "tools.iron_axe": false,
    },
    cost: {
      "resources.wood": 100,
      "resources.iron": 50,
    },
    effects: {
      "tools.iron_axe": true,
      "story.seen.hasIronAxe": true,
      "story.seen.actionCraftIronAxe": true,
    },
    cooldown: 10,
  },

  craftIronPickaxe: {
    id: "craftIronPickaxe",
    label: "Iron Pickaxe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.stone_pickaxe": true,
      "tools.iron_pickaxe": false,
    },
    cost: {
      "resources.wood": 150,
      "resources.iron": 75,
    },
    effects: {
      "tools.iron_pickaxe": true,
      "story.seen.hasIronPickaxe": true,
      "story.seen.actionCraftIronPickaxe": true,
    },
    cooldown: 10,
  },

  craftSteelAxe: {
    id: "craftSteelAxe",
    label: "Steel Axe",
    show_when: {
      "buildings.blacksmith": 1,
      "buildings.foundry": 1,
      "tools.iron_axe": true,
      "tools.iron_pickaxe": true,
      "tools.iron_lantern": true,
      "tools.steel_axe": false,
    },
    cost: {
      "resources.wood": 200,
      "resources.steel": 100,
    },
    effects: {
      "tools.steel_axe": true,
      "story.seen.hasSteelAxe": true,
      "story.seen.actionCraftSteelAxe": true,
    },
    cooldown: 15,
  },

  craftSteelPickaxe: {
    id: "craftSteelPickaxe",
    label: "Steel Pickaxe",
    show_when: {
      "buildings.blacksmith": 1,
      "buildings.foundry": 1,
      "tools.iron_pickaxe": true,
      "tools.iron_axe": true,
      "tools.iron_lantern": true,
      "tools.steel_pickaxe": false,
    },
    cost: {
      "resources.wood": 300,
      "resources.steel": 150,
    },
    effects: {
      "tools.steel_pickaxe": true,
      "story.seen.hasSteelPickaxe": true,
      "story.seen.actionCraftSteelPickaxe": true,
    },
    cooldown: 15,
  },

  craftObsidianAxe: {
    id: "craftObsidianAxe",
    label: "Obsidian Axe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.steel_axe": true,
      "tools.steel_pickaxe": true,
      "tools.steel_lantern": true,
      "tools.obsidian_axe": false,
    },
    cost: {
      "resources.wood": 500,
      "resources.obsidian": 100,
    },
    effects: {
      "tools.obsidian_axe": true,
      "story.seen.hasObsidianAxe": true,
      "story.seen.actionCraftObsidianAxe": true,
    },
    cooldown: 20,
  },

  craftObsidianPickaxe: {
    id: "craftObsidianPickaxe",
    label: "Obsidian Pickaxe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.steel_pickaxe": true,
      "tools.steel_axe": true,
      "tools.steel_lantern": true,
      "tools.obsidian_pickaxe": false,
    },
    cost: {
      "resources.wood": 750,
      "resources.obsidian": 150,
    },
    effects: {
      "tools.obsidian_pickaxe": true,
      "story.seen.hasObsidianPickaxe": true,
      "story.seen.actionCraftObsidianPickaxe": true,
    },
    cooldown: 20,
  },

  craftAdamantAxe: {
    id: "craftAdamantAxe",
    label: "Adamant Axe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.obsidian_axe": true,
      "tools.obsidian_pickaxe": true,
      "tools.obsidian_lantern": true,
      "tools.adamant_axe": false,
    },
    cost: {
      "resources.wood": 1000,
      "resources.adamant": 100,
    },
    effects: {
      "tools.adamant_axe": true,
      "story.seen.hasAdamantAxe": true,
      "story.seen.actionCraftAdamantAxe": true,
    },
    cooldown: 25,
  },

  craftAdamantPickaxe: {
    id: "craftAdamantPickaxe",
    label: "Adamant Pickaxe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.obsidian_pickaxe": true,
      "tools.obsidian_axe": true,
      "tools.obsidian_lantern": true,
      "tools.adamant_pickaxe": false,
    },
    cost: {
      "resources.wood": 1500,
      "resources.adamant": 150,
    },
    effects: {
      "tools.adamant_pickaxe": true,
      "story.seen.hasAdamantPickaxe": true,
      "story.seen.actionCraftAdamantPickaxe": true,
    },
    cooldown: 25,
  },

  craftIronLantern: {
    id: "craftIronLantern",
    label: "Iron Lantern",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.iron_lantern": false,
      "story.seen.hasIron": true,
      "story.seen.hasCoal": true,
      "flags.venturedDeeper": true,
    },
    cost: {
      "resources.wood": 200,
      "resources.iron": 100,
    },
    effects: {
      "tools.iron_lantern": true,
      "story.seen.hasIronLantern": true,
      "story.seen.actionCraftIronLantern": true,
    },
    cooldown: 15,
  },

  craftSteelLantern: {
    id: "craftSteelLantern",
    label: "Steel Lantern",
    show_when: {
      "buildings.blacksmith": 1,
      "buildings.foundry": 1,
      "tools.iron_lantern": true,
      "tools.iron_axe": true,
      "tools.iron_pickaxe": true,
      "tools.steel_lantern": false,
      "flags.descendedFurther": true,
    },
    cost: {
      "resources.wood": 400,
      "resources.steel": 100,
    },
    effects: {
      "tools.steel_lantern": true,
      "story.seen.hasSteelLantern": true,
      "story.seen.actionCraftSteelLantern": true,
    },
    cooldown: 20,
  },

  craftObsidianLantern: {
    id: "craftObsidianLantern",
    label: "Obsidian Lantern",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.steel_lantern": true,
      "tools.steel_axe": true,
      "tools.steel_pickaxe": true,
      "tools.obsidian_lantern": false,
      "flags.exploredRuins": true,
    },
    cost: {
      "resources.wood": 800,
      "resources.obsidian": 200,
    },
    effects: {
      "tools.obsidian_lantern": true,
      "story.seen.hasObsidianLantern": true,
      "story.seen.actionCraftObsidianLantern": true,
    },
    cooldown: 25,
  },

  craftAdamantLantern: {
    id: "craftAdamantLantern",
    label: "Adamant Lantern",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.obsidian_lantern": true,
      "tools.obsidian_axe": true,
      "tools.obsidian_pickaxe": true,
      "tools.adamant_lantern": false,
      "flags.exploredTemple": true,
    },
    cost: {
      "resources.wood": 1600,
      "resources.adamant": 250,
    },
    effects: {
      "tools.adamant_lantern": true,
      "story.seen.hasAdamantLantern": true,
      "story.seen.actionCraftAdamantLantern": true,
    },
    cooldown: 30,
  },

  craftSeekerPack: {
    id: "craftSeekerPack",
    label: "Seeker's Pack",
    show_when: {
      "buildings.tannery": 1,
      "clothing.seeker_pack": false,
    },
    cost: {
      "resources.leather": 200,
    },
    effects: {
      "clothing.seeker_pack": true,
      "story.seen.hasSeekerPack": true,
      "story.seen.actionCraftSeekerPack": true,
    },
    cooldown: 20,
  },

  craftHunterCloak: {
    id: "craftHunterCloak",
    label: "Hunter Cloak",
    show_when: {
      "buildings.tannery": 1,
      "clothing.hunter_cloak": false,
    },
    cost: {
      "resources.leather": 400,
    },
    effects: {
      "clothing.hunter_cloak": true,
      "story.seen.hasHunterCloak": true,
      "story.seen.actionCraftHunterCloak": true,
    },
    cooldown: 25,
  },

  craftGrenadierBag: {
    id: "craftGrenadierBag",
    label: "Grenadier's Bag",
    show_when: {
      "buildings.bastion": 1,
      "clothing.grenadier_bag": false,
    },
    hide_when: {
      "clothing.grenadier_bag": true,
    },
    cost: {
      "resources.leather": 1000,
    },
    effects: {
      "clothing.grenadier_bag": true,
      "story.seen.hasGrenadierBag": true,
      "story.seen.actionCraftGrenadierBag": true,
    },
    cooldown: 30,
  },
};

// Action handlers
export function handleCraftTorch(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftTorch', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftTorches(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftTorches', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftTorches3(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftTorches3', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftTorches4(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftTorches4', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftTorches5(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftTorches5', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftTorches10(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftTorches10', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftStoneAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftStoneAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Add village unlocked message when stone axe is crafted
  if (!state.flags.villageUnlocked) {
    result.logEntries!.push({
      id: `village-unlocked-${Date.now()}`,
      message: "Outside the cave a clearing opens. This could be the start of something great.",
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return result;
}

export function handleCraftStonePickaxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftStonePickaxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftIronAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftIronAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftIronPickaxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftIronPickaxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftSteelAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftSteelAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftSteelPickaxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftSteelPickaxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftObsidianAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftObsidianAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftObsidianPickaxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftObsidianPickaxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftAdamantAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftAdamantAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftAdamantPickaxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftAdamantPickaxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftIronLantern(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftIronLantern', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftSteelLantern(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftSteelLantern', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftObsidianLantern(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftObsidianLantern', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftAdamantLantern(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftAdamantLantern', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftSeekerPack(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftSeekerPack', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftHunterCloak(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftHunterCloak', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftGrenadierBag(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftGrenadierBag', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}