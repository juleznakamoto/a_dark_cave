
import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { applyActionEffects } from '@/game/rules';

export const caveCraftActions: Record<string, Action> = {
  buildTorch: {
    id: "buildTorch",
    label: "Torch",
    show_when: {
      "story.seen.hasWood": true,
    },
    cost: {
      "resources.wood": 10,
    },
    effects: {
      "resources.wood": -10,
      "resources.torch": 1,
      "story.seen.actionBuildTorch": true,
    },
    unlocks: ["exploreDeeper"],
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
      "resources.wood": -10,
      "resources.stone": -10,
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
    },
    cost: {
      "resources.wood": 50,
      "resources.stone": 100,
    },
    effects: {
      "resources.wood": -10,
      "resources.stone": -20,
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
      "resources.iron": -50,
      "resources.wood": -100,
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
      "resources.iron": -75,
      "resources.wood": -150,
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
      "resources.steel": -100,
      "resources.wood": -200,
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
      "resources.steel": -150,
      "resources.wood": -300,
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
      "resources.obsidian": -100,
      "resources.wood": -500,
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
      "resources.obsidian": -150,
      "resources.wood": -750,
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
      "resources.adamant": -100,
      "resources.wood": -1000,
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
      "resources.adamant": -150,
      "resources.wood": -1500,
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
      "resources.iron": -100,
      "resources.wood": -200,
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
    },
    cost: {
      "resources.wood": 400,
      "resources.steel": 100,
    },
    effects: {
      "resources.steel": -150,
      "resources.wood": -400,
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
    },
    cost: {
      "resources.wood": 800,
      "resources.obsidian": 200,
    },
    effects: {
      "resources.obsidian": -200,
      "resources.wood": -800,
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
    },
    cost: {
      "resources.wood": 1600,
      "resources.adamant": 250,
    },
    effects: {
      "resources.adamant": -250,
      "resources.wood": -1600,
      "tools.adamant_lantern": true,
      "story.seen.hasAdamantLantern": true,
      "story.seen.actionCraftAdamantLantern": true,
    },
    cooldown: 30,
  },

  craftBoneTotem: {
    id: "craftBoneTotem",
    label: "Bone Totem",
    show_when: {
      "buildings.shrine": 1,
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

  // Weapon crafting
  craftIronSword: {
    id: "craftIronSword",
    label: "Iron Sword",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.iron_sword": false,
    },
    cost: {
      "resources.iron": 100,
    },
    effects: {
      "resources.iron": -100,
      "weapons.iron_sword": true,
    },
    cooldown: 15,
  },

  craftSteelSword: {
    id: "craftSteelSword",
    label: "Steel Sword",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.iron_sword": true,
      "weapons.crude_bow": true,
      "weapons.huntsman_bow": true,
      "weapons.steel_sword": false,
      "story.seen.hasSteel": true,
    },
    cost: {
      "resources.steel": 150,
    },
    effects: {
      "resources.steel": -150,
      "weapons.steel_sword": true,
    },
    cooldown: 20,
  },

  craftObsidianSword: {
    id: "craftObsidianSword",
    label: "Obsidian Sword",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.steel_sword": true,
      "weapons.long_bow": true,
      "weapons.obsidian_sword": false,
    },
    cost: {
      "resources.obsidian": 200,
    },
    effects: {
      "resources.obsidian": -200,
      "weapons.obsidian_sword": true,
    },
    cooldown: 25,
  },

  craftAdamantSword: {
    id: "craftAdamantSword",
    label: "Adamant Sword",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.obsidian_sword": true,
      "weapons.war_bow": true,
      "weapons.adamant_sword": false,
    },
    cost: {
      "resources.adamant": 250,
    },
    effects: {
      "resources.adamant": -250,
      "weapons.adamant_sword": true,
    },
    cooldown: 30,
  },

  craftCrudeBow: {
    id: "craftCrudeBow",
    label: "Crude Bow",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.crude_bow": false,
    },
    cost: {
      "resources.wood": 200,
    },
    effects: {
      "resources.wood": -200,
      "weapons.crude_bow": true,
      "flags.forestUnlocked": true,
    },
    cooldown: 10,
  },

  craftHuntsmanBow: {
    id: "craftHuntsmanBow",
    label: "Huntsman Bow",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.crude_bow": true,
      "weapons.huntsman_bow": false,
      "story.seen.hasIron": true,
    },
    cost: {
      "resources.wood": 500,
      "resources.iron": 50,
    },
    effects: {
      "resources.wood": -500,
      "resources.iron": -50,
      "weapons.huntsman_bow": true,
    },
    cooldown: 15,
  },

  craftLongBow: {
    id: "craftLongBow",
    label: "Long Bow",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.huntsman_bow": true,
      "weapons.iron_sword": true,
      "weapons.steel_sword": true,
      "weapons.long_bow": false,
      "story.seen.hasSteel": true,
    },
    cost: {
      "resources.wood": 1000,
      "resources.steel": 100,
    },
    effects: {
      "resources.wood": -1000,
      "resources.steel": -100,
      "weapons.long_bow": true,
    },
    cooldown: 20,
  },

  craftWarBow: {
    id: "craftWarBow",
    label: "War Bow",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.long_bow": true,
      "weapons.steel_sword": true,
      "weapons.war_bow": false,
    },
    cost: {
      "resources.wood": 1500,
      "resources.obsidian": 100,
    },
    effects: {
      "resources.wood": -1500,
      "resources.obsidian": -100,
      "weapons.war_bow": true,
      "story.seen.hasWarBow": true,
      "story.seen.actionCraftWarBow": true,
    },
    cooldown: 25,
  },

  craftMasterBow: {
    id: "craftMasterBow",
    label: "Master Bow",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.war_bow": true,
      "weapons.obsidian_sword": true,
      "weapons.adamant_sword": true,
      "weapons.master_bow": false,
    },
    cost: {
      "resources.wood": 2500,
      "resources.adamant": 100,
    },
    effects: {
      "resources.wood": -2500,
      "resources.adamant": -100,
      "weapons.master_bow": true,
      "story.seen.hasMasterBow": true,
      "story.seen.actionCraftMasterBow": true,
    },
    cooldown: 30,
  },
};

// Action handlers
export function handleBuildTorch(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('buildTorch', state);
  Object.assign(result.stateUpdates, effectUpdates);

  result.stateUpdates.flags = { ...state.flags, torchBuilt: true };

  if (!state.story.seen.rumbleSound) {
    result.logEntries!.push({
      id: `rumble-sound-${Date.now()}`,
      message: 'A low, rumbling sound echoes from deeper in the cave.',
      timestamp: Date.now(),
      type: 'system',
    });
    result.stateUpdates.story!.seen!.rumbleSound = true;
  }

  return result;
}

export function handleCraftStoneAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftStoneAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);

  result.logEntries!.push({
    id: `village-unlocked-${Date.now()}`,
    message: 'Outside the cave, a small clearing opens up. This could be the foundation of something greater.',
    timestamp: Date.now(),
    type: 'system',
  });

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

export function handleCraftBoneTotem(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftBoneTotem', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftIronSword(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftIronSword', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftSteelSword(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftSteelSword', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftObsidianSword(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftObsidianSword', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftAdamantSword(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftAdamantSword', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftCrudeBow(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftCrudeBow', state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Add forest unlock message when crude bow is crafted
  if (effectUpdates.flags && effectUpdates.flags.forestUnlocked && !state.flags.forestUnlocked) {
    result.logEntries!.push({
      id: `forest-unlocked-${Date.now()}`,
      message: 'The village is encircled by a dense, dark forest. Danger lingers in the air, though it may also be a place to hunt.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return result;
}

export function handleCraftHuntsmanBow(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftHuntsmanBow', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftLongBow(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftLongBow', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftWarBow(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftWarBow', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftMasterBow(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftMasterBow', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}
