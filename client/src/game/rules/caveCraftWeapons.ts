import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { gameActions, applyActionEffects } from '@/game/rules';

export const caveCraftWeapons: Record<string, Action> = {
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
      "weapons.master_bow": true,
      "story.seen.hasMasterBow": true,
      "story.seen.actionCraftMasterBow": true,
    },
    cooldown: 30,
  },

  craftFrostglassSword: {
    id: "craftFrostglassSword",
    label: "Frostglass Sword",
    show_when: {
      "buildings.grandBlacksmith": 1,
      "weapons.frostglass_sword": false,
    },
    cost: {
      "resources.frostglas": 50,
    },
    effects: {
      "weapons.frostglass_sword": true,
      "story.seen.hasFrostglassSword": true,
    },
    cooldown: 60,
  },
};

// Action handlers
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

export function handleCraftFrostglassSword(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftFrostglassSword', state);
  Object.assign(result.stateUpdates, effectUpdates);

  result.logEntries!.push({
    id: `frostglass-sword-forged-${Date.now()}`,
    message: "The Grand Blacksmith's forge burns with ethereal blue flames as the frostglas is shaped into a magnificent sword. The blade gleams with an otherworldly cold light, radiating power.",
    timestamp: Date.now(),
    type: 'system',
  });

  return result;
}