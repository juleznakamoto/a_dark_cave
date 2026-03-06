import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { getUpgradeLevel } from "@/game/buttonUpgrades";
import { applyActionEffects } from "./actionEffects";

export function getTorchTier(state: GameState): number {
  if (state.tools?.adamant_axe) return 6;
  if (state.tools?.obsidian_axe) return 5;
  if (state.tools?.steel_axe) return 4;
  if (state.tools?.iron_axe) return 3;
  if (state.tools?.stone_axe) return 2;
  return 1;
}

const TORCH_TIER_COSTS = [10, 20, 30, 40, 50, 100] as const;
const TORCH_TIER_AMOUNTS = [1, 2, 3, 4, 5, 10] as const;
const CRAFT_TORCHES_BASE_EXECUTION = 3;

function getCraftTorchesUpgradeMultiplier(state: GameState): number {
  if (!state.books?.book_of_ascension) return 1;
  const level = getUpgradeLevel("craftTorches", state);
  return 1 + level;
}

export const caveCraftTools: Record<string, Action> = {
  craftTorches: {
    id: "craftTorches",
    label: "Torches",
    show_when: {
      "story.seen.hasWood": true,
    },
    cost: (state: GameState) => {
      const tier = getTorchTier(state);
      const baseCost = TORCH_TIER_COSTS[tier - 1];
      const mult = getCraftTorchesUpgradeMultiplier(state);
      return { "resources.wood": Math.floor(baseCost * mult) };
    },
    effects: (state: GameState) => {
      const tier = getTorchTier(state);
      const baseAmount = TORCH_TIER_AMOUNTS[tier - 1];
      const mult = getCraftTorchesUpgradeMultiplier(state);
      const amount = Math.floor(baseAmount * mult);
      return {
        "resources.torch": `random(${amount},${amount})` as any,
        "story.seen.actionCraftTorches": true,
      };
    },
    unlocks: ["exploreDeeper"],
    executionTime: CRAFT_TORCHES_BASE_EXECUTION,
    cooldown: 0,
  },

  craftStoneAxe: {
    id: "craftStoneAxe",
    label: "StoneAxe",
    show_when: {
      "story.seen.caveExplored": true,
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
    executionTime: 1,
    cooldown: 0,
  },

  craftStonePickaxe: {
    id: "craftStonePickaxe",
    label: "Stone Pickaxe",
    show_when: {
      "story.seen.caveExplored": true,
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
    executionTime: 5,
    cooldown: 0,
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
    executionTime: 10,
    cooldown: 0,
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
    executionTime: 10,
    cooldown: 0,
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
    executionTime: 15,
    cooldown: 0,
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
    executionTime: 15,
    cooldown: 0,
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
      "resources.obsidian": 250,
    },
    effects: {
      "tools.obsidian_axe": true,
      "story.seen.hasObsidianAxe": true,
      "story.seen.actionCraftObsidianAxe": true,
    },
    executionTime: 20,
    cooldown: 0,
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
      "resources.obsidian": 500,
    },
    effects: {
      "tools.obsidian_pickaxe": true,
      "story.seen.hasObsidianPickaxe": true,
      "story.seen.actionCraftObsidianPickaxe": true,
    },
    executionTime: 20,
    cooldown: 0,
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
      "resources.adamant": 500,
    },
    effects: {
      "tools.adamant_axe": true,
      "story.seen.hasAdamantAxe": true,
      "story.seen.actionCraftAdamantAxe": true,
    },
    executionTime: 25,
    cooldown: 0,
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
      "resources.adamant": 750,
    },
    effects: {
      "tools.adamant_pickaxe": true,
      "story.seen.hasAdamantPickaxe": true,
      "story.seen.actionCraftAdamantPickaxe": true,
    },
    executionTime: 25,
    cooldown: 0,
  },

  craftIronLantern: {
    id: "craftIronLantern",
    label: "Iron Lantern",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.iron_lantern": false,
      "story.seen.venturedDeeper": true,
    },
    cost: {
      "resources.wood": 250,
      "resources.iron": 150,
    },
    effects: {
      "tools.iron_lantern": true,
      "story.seen.hasIronLantern": true,
      "story.seen.actionCraftIronLantern": true,
    },
    executionTime: 15,
    cooldown: 0,
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
      "story.seen.descendedFurther": true,
    },
    cost: {
      "resources.wood": 500,
      "resources.steel": 150,
    },
    effects: {
      "tools.steel_lantern": true,
      "story.seen.hasSteelLantern": true,
      "story.seen.actionCraftSteelLantern": true,
    },
    executionTime: 20,
    cooldown: 0,
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
      "story.seen.exploredRuins": true,
    },
    cost: {
      "resources.wood": 1000,
      "resources.obsidian": 250,
    },
    effects: {
      "tools.obsidian_lantern": true,
      "story.seen.hasObsidianLantern": true,
      "story.seen.actionCraftObsidianLantern": true,
    },
    executionTime: 25,
    cooldown: 0,
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
      "story.seen.exploredTemple": true,
    },
    cost: {
      "resources.wood": 2000,
      "resources.adamant": 500,
    },
    effects: {
      "tools.adamant_lantern": true,
      "story.seen.hasAdamantLantern": true,
      "story.seen.actionCraftAdamantLantern": true,
    },
    executionTime: 30,
    cooldown: 0,
  },

  craftBlacksteelAxe: {
    id: "craftBlacksteelAxe",
    label: "Blacksteel Axe",
    show_when: {
      "buildings.masterworkFoundry": 1,
      "buildings.grandBlacksmith": 1,
      "tools.blacksteel_axe": false,
    },
    cost: {
      "resources.blacksteel": 150,
    },
    effects: {
      "tools.blacksteel_axe": true,
      "story.seen.hasBlacksteelAxe": true,
      "story.seen.actionCraftBlacksteelAxe": true,
    },
    executionTime: 30,
    cooldown: 0,
  },

  craftBlacksteelPickaxe: {
    id: "craftBlacksteelPickaxe",
    label: "Blacksteel Pickaxe",
    show_when: {
      "buildings.masterworkFoundry": 1,
      "buildings.grandBlacksmith": 1,
      "tools.blacksteel_pickaxe": false,
    },
    cost: {
      "resources.blacksteel": 300,
    },
    effects: {
      "tools.blacksteel_pickaxe": true,
      "story.seen.hasBlacksteelPickaxe": true,
      "story.seen.actionCraftBlacksteelPickaxe": true,
    },
    executionTime: 30,
    cooldown: 0,
  },

  craftBlacksteelLantern: {
    id: "craftBlacksteelLantern",
    label: "Blacksteel Lantern",
    show_when: {
      "buildings.masterworkFoundry": 1,
      "buildings.grandBlacksmith": 1,
      "tools.blacksteel_lantern": false,
    },
    cost: {
      "resources.blacksteel": 250,
    },
    effects: {
      "tools.blacksteel_lantern": true,
      "story.seen.hasBlacksteelLantern": true,
      "story.seen.actionCraftBlacksteelLantern": true,
    },
    executionTime: 30,
    cooldown: 0,
  },

  craftBlacksteelArmor: {
    id: "craftBlacksteelArmor",
    label: "Blacksteel Armor",
    show_when: {
      "buildings.masterworkFoundry": 1,
      "buildings.grandBlacksmith": 1,
      "clothing.blacksteel_armor": false,
    },
    cost: {
      "resources.blacksteel": 300,
    },
    effects: {
      "clothing.blacksteel_armor": true,
      "story.seen.hasBlacksteelArmor": true,
      "story.seen.actionCraftBlacksteelArmor": true,
    },
    executionTime: 30,
    cooldown: 0,
  },

  craftExplorerPack: {
    id: "craftExplorerPack",
    label: "Explorer's Pack",
    show_when: {
      "buildings.tannery": 1,
      "clothing.explorer_pack": false,
    },
    cost: {
      "resources.leather": 200,
    },
    effects: {
      "clothing.explorer_pack": true,
      "story.seen.hasExplorerPack": true,
      "story.seen.actionCraftExplorerPack": true,
    },
    executionTime: 20,
    cooldown: 0,
  },

  craftHunterCloak: {
    id: "craftHunterCloak",
    label: "Hunter Cloak",
    show_when: {
      "buildings.tannery": 1,
      "clothing.hunter_cloak": false,
    },
    cost: {
      "resources.leather": 150,
    },
    effects: {
      "clothing.hunter_cloak": true,
      "story.seen.hasHunterCloak": true,
      "story.seen.actionCraftHunterCloak": true,
    },
    executionTime: 25,
    cooldown: 0,
  },

  craftGrenadierBag: {
    id: "craftGrenadierBag",
    label: "Grenadier's Bag",
    show_when: {
      "buildings.bastion": 1,
      "clothing.grenadier_bag": false,
    },
    cost: {
      "resources.leather": 750,
    },
    effects: {
      "clothing.grenadier_bag": true,
      "story.seen.hasGrenadierBag": true,
      "story.seen.actionCraftGrenadierBag": true,
    },
    executionTime: 30,
    cooldown: 0,
  },

  craftHighpriestRobe: {
    id: "craftHighpriestRobe",
    label: "Highpriest Robe",
    show_when: {
      "buildings.masterTannery": 1,
      "clothing.highpriest_robe": false,
    },
    cost: {
      "resources.leather": 500,
      "resources.gold": 50,
    },
    effects: {
      "clothing.highpriest_robe": true,
      "story.seen.hasHighpriestRobe": true,
      "story.seen.actionCraftHighpriestRobe": true,
    },
    executionTime: 40,
    cooldown: 0,
  },

  craftLoggersGloves: {
    id: "craftLoggersGloves",
    label: "Logger's Gloves",
    show_when: {
      "buildings.tannery": 1,
      "clothing.loggers_gloves": false,
    },
    cost: {
      "resources.leather": 150,
    },
    effects: {
      "clothing.loggers_gloves": true,
      "story.seen.hasLoggersGloves": true,
      "story.seen.actionCraftLoggersGloves": true,
    },
    executionTime: 15,
    cooldown: 0,
  },

  craftSacrificialTunic: {
    id: "craftSacrificialTunic",
    label: "Sacrificial Tunic",
    show_when: {
      "buildings.pillarOfClarity": 1,
      "clothing.sacrificial_tunic": false,
    },
    cost: {
      "resources.leather": 1500,
      "resources.silver": 250,
    },
    effects: {
      "clothing.sacrificial_tunic": true,
      "story.seen.hasSacrificialTunic": true,
      "story.seen.actionCraftSacrificialTunic": true,
    },
    executionTime: 60,
    cooldown: 0,
  },

  craftShadowBoots: {
    id: "craftShadowBoots",
    label: "Shadow Boots",
    show_when: {
      "buildings.masterTannery": 1,
      "clothing.shadow_boots": false,
    },
    cost: {
      "resources.leather": 1000,
      "resources.steel": 500,
    },
    effects: {
      "clothing.shadow_boots": true,
      "story.seen.hasShadowBoots": true,
      "story.seen.actionCraftShadowBoots": true,
    },
    executionTime: 40,
    cooldown: 0,
  },

  craftSkeletonKey: {
    id: "craftSkeletonKey",
    label: "Skeleton Key",
    show_when: {
      "schematics.skeleton_key_schematic": true,
      "tools.skeleton_key": false,
    },
    cost: {
      "schematics.skeleton_key_schematic": true,
      "resources.bones": 5000,
      "resources.steel": 500,
      "resources.silver": 250,
    },
    effects: {
      "tools.skeleton_key": true,
    },
    executionTime: 3,
    cooldown: 0,
  },
};

// Action handlers
export function handleCraftTorches(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftTorches", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftStoneAxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftStoneAxe", state);
  Object.assign(result.stateUpdates, effectUpdates);

  if (effectUpdates.tools?.stone_axe && !state.tools.stone_axe) {
    result.logEntries!.push({
      id: `stone-axe-unlocked-${Date.now()}`,
      message: "An axe could help gather wood.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  // Add village unlocked message when stone axe is crafted
  if (!state.flags.villageUnlocked) {
    result.logEntries!.push({
      id: `village-unlocked-${Date.now()}`,
      message:
        "Outside the cave a clearing opens. This looks like a good place to build a shelter.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return result;
}

export function handleCraftStonePickaxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftStonePickaxe", state);
  Object.assign(result.stateUpdates, effectUpdates);

  if (effectUpdates.tools?.stone_pickaxe && !state.tools.stone_pickaxe) {
    result.logEntries!.push({
      id: `stone-pickaxe-unlocked-${Date.now()}`,
      message: "A pickaxe could help mine minerals.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return result;
}

export function handleCraftIronAxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftIronAxe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftIronPickaxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftIronPickaxe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftSteelAxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftSteelAxe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftSteelPickaxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftSteelPickaxe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftObsidianAxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftObsidianAxe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftObsidianPickaxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftObsidianPickaxe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftAdamantAxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftAdamantAxe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftAdamantPickaxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftAdamantPickaxe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftIronLantern(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftIronLantern", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftSteelLantern(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftSteelLantern", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftObsidianLantern(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftObsidianLantern", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftAdamantLantern(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftAdamantLantern", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftExplorerPack(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftExplorerPack", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftHunterCloak(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftHunterCloak", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftGrenadierBag(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftGrenadierBag", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftHighpriestRobe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftHighpriestRobe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftLoggersGloves(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftLoggersGloves", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftSacrificialTunic(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftSacrificialTunic", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftShadowBoots(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftShadowBoots", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftBlacksteelAxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftBlacksteelAxe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftBlacksteelPickaxe(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftBlacksteelPickaxe", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftBlacksteelLantern(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftBlacksteelLantern", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleCraftBlacksteelArmor(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftBlacksteelArmor", state);
  Object.assign(result.stateUpdates, effectUpdates);

  return result;
}

export function handleCraftSkeletonKey(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("craftSkeletonKey", state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}
