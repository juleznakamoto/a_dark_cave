import { GameState } from "@shared/schema";
import { villageBuildActions } from './villageBuildActions';

// Define action bonuses interface
export interface ActionBonuses {
  resourceBonus: Record<string, number>;
  resourceMultiplier: number;
  probabilityBonus: Record<string, number>;
  cooldownReduction: number;
}

// Define effects that tools and clothing provide
export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  bonuses: {
    // Resource gathering bonuses
    resourceMultipliers?: Record<string, number>;
    resourceBonuses?: Record<string, number>;

    // Action-specific bonuses
    actionBonuses?: Record<
      string,
      {
        cooldownReduction?: number; // Percentage reduction (0.1 = 10% reduction)
        resourceBonus?: Record<string, number>; // Fixed bonus to specific resources
        resourceMultiplier?: number; // Multiplier for all resources (1.25 = 25% bonus)
        probabilityBonus?: Record<string, number>; // Bonus to probability effects
      }
    >;

    // General bonuses
    generalBonuses?: {
      gatheringSpeed?: number; // Multiplier for all gathering actions
      craftingSpeed?: number; // Multiplier for crafting actions
      explorationBonus?: number; // Bonus resources when exploring
      luck?: number; // Luck bonus
      strength?: number; // Strength bonus
      knowledge?: number; // Knowledge bonus
      madness?: number; // Madness bonus
      craftingCostReduction?: number; // Percentage reduction in crafting costs (0.1 = 10% reduction)
    };
  };
}

// Tool effects
export const toolEffects: Record<string, EffectDefinition> = {
  stone_axe: {
    id: "stone_axe",
    name: "Stone Axe",
    description: "Basic axe for chopping wood",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceMultiplier: 1.10,
          cooldownReduction: 0.25,
        },
        buildTorch: {
          cooldownReduction: 0.25,
        },
      },
    },
  },

  stone_pickaxe: {
    id: "stone_pickaxe",
    name: "Stone Pickaxe",
    description: "Rudimentary pickaxe for mining",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.10,
          cooldownReduction: 1,
        },
      },
    },
  },

  spear: {
    id: "spear",
    name: "Spear",
    description: "Improves hunting efficiency",
    bonuses: {
      actionBonuses: {},
    },
  },

  iron_axe: {
    id: "iron_axe",
    name: "Iron Axe",
    description: "Sharp axe for heavy chopping",
    bonuses: {
      actionBonuses: {
        gatherWood: {
            resourceMultiplier: 1.25,
          cooldownReduction: 0.5,
        },
        buildTorch: {
          cooldownReduction: 0.5,
        },
      },
    },
  },

  iron_pickaxe: {
    id: "iron_pickaxe",
    name: "Iron Pickaxe",
    description: "Durable pickaxe for mining efficiently",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.25,
          cooldownReduction: 1,
        },
      },
    },
  },

  steel_axe: {
    id: "steel_axe",
    name: "Steel Axe",
    description: "Finely crafted axe forged from tempered steel",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceMultiplier: 1.5,
          cooldownReduction: 0.75,
        },
      },
    },
  },

  steel_pickaxe: {
    id: "steel_pickaxe",
    name: "Steel Pickaxe",
    description: "Very sturdy mining tool crafted from resilient steel",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.5,
          cooldownReduction: 2,
        },
      },
    },
  },

  obsidian_axe: {
    id: "obsidian_axe",
    name: "Obsidian Axe",
    description:
      "Legendary axe with razor-sharp volcanic edges",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceMultiplier: 2.0,
          cooldownReduction: 1,
        },
      },
    },
  },

  obsidian_pickaxe: {
    id: "obsidian_pickaxe",
    name: "Obsidian Pickaxe",
    description: "Masterful tool for mining made of volcanic glass",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 2.0,
          cooldownReduction: 4,
        },
      },
    },
  },

  adamant_axe: {
    id: "adamant_axe",
    name: "Adamant Axe",
    description:
      "Unbreakable axe, forged from the hardest metal",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceMultiplier: 3.0,
          cooldownReduction: 1.5,
        },
      },
    },
  },

  adamant_pickaxe: {
    id: "adamant_pickaxe",
    name: "Adamant Pickaxe",
    description: "Pinnacle of mining tools, unyielding and precise",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 3.0,
          cooldownReduction: 6,
        },
      },
    },
  },

  iron_lantern: {
    id: "iron_lantern",
    name: "Iron Lantern",
    description: "Simple lantern providing reliable light",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.25,
          cooldownReduction: 1,
        },
        ventureDeeper: {
          cooldownReduction: 2,
        },
      },
    },
  },

  steel_lantern: {
    id: "steel_lantern",
    name: "Steel Lantern",
    description: "Bright and sturdy, illuminating the darkest places.",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.5,
          cooldownReduction: 2,
        },
      },
    },
  },

  obsidian_lantern: {
    id: "obsidian_lantern",
    name: "Obsidian Lantern",
    description: "Powerful lantern that casts a strong, unwavering light",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 2.0,
          cooldownReduction: 3,
        },
      },
    },
  },

  adamant_lantern: {
    id: "adamant_lantern",
    name: "Adamant Lantern",
    description: "Ultimate light source, illuminating every path",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 3.0,
          cooldownReduction: 4,
        },
      },
    },
  },

  reinforced_rope: {
    id: "reinforced_rope",
    name: "Reinforced Rope",
    description: "Strong rope that enables access to deeper cave chambers",
    bonuses: {
      actionBonuses: {},
    },
  },

  giant_trap: {
    id: "giant_trap",
    name: "Giant Trap",
    description: "Massive trap capable of catching gigantic forest creatures",
    bonuses: {
      actionBonuses: {},
    },
  },
};

// Weapon effects
export const weaponEffects: Record<string, EffectDefinition> = {
  crude_bow: {
    id: "crude_bow",
    name: "Crude Bow",
    description: "Simple bow, reliable for any challenge",
    bonuses: {
      actionBonuses: {},
      generalBonuses: {
        strength: 1,
      },
    },
  },

  huntsman_bow: {
    id: "huntsman_bow",
    name: "Huntsman Bow",
    description: "Improved bow, finely balanced and precise",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.1,
        },
      },
      generalBonuses: {
        strength: 2,
      },
    },
  },

  long_bow: {
    id: "long_bow",
    name: "Long Bow",
    description: "Superior bow with extended reach and accuracy",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.25,
        },
      },
      generalBonuses: {
        strength: 3,
      },
    },
  },

  war_bow: {
    id: "war_bow",
    name: "War Bow",
    description: "Very powerful bow, crafted for strength and precision",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.5,
        },
      },
      generalBonuses: {
        strength: 4,
      },
    },
  },

  master_bow: {
    id: "master_bow",
    name: "Master Bow",
    description: "Ultimate bow, unmatched in power and control",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 2.0,
        },
      },
      generalBonuses: {
        strength: 5,
      },
    },
  },

  iron_sword: {
    id: "iron_sword",
    name: "Iron Sword",
    description: "Sturdy iron blade that enhances your combat prowess",
    bonuses: {
      generalBonuses: {
        strength: 3,
      },
    },
  },

  steel_sword: {
    id: "steel_sword",
    name: "Steel Sword",
    description: "Finely crafted steel blade with superior balance",
    bonuses: {
      generalBonuses: {
        strength: 5,
      },
    },
  },

  obsidian_sword: {
    id: "obsidian_sword",
    name: "Obsidian Sword",
    description: "Razor-sharp blade forged from volcanic glass",
    bonuses: {
      generalBonuses: {
        strength: 10,
      },
    },
  },

  adamant_sword: {
    id: "adamant_sword",
    name: "Adamant Sword",
    description: "Ultimate weapon forged from the hardest metal",
    bonuses: {
      generalBonuses: {
        strength: 15,
      },
    },
  },
};

// Relic effects
export const clothingEffects: Record<string, EffectDefinition> = {
  tarnished_amulet: {
    id: "tarnished_amulet",
    name: "Tarnished Amulet",
    description: "Timeworn amulet that brings good fortune",
    bonuses: {
      generalBonuses: {
        luck: 5,
      },
    },
  },

  bloodstained_belt: {
    id: "bloodstained_belt",
    name: "Bloodstained Belt",
    description:
      "Leather belt stained with old blood that grants raw power",
    bonuses: {
      generalBonuses: {
        strength: 3,
      },
    },
  },

  ravenfeather_mantle: {
    id: "ravenfeather_mantle",
    name: "Ravenfeather Mantle",
    description:
      "Mystical mantle woven from shimmering raven feathers",
    bonuses: {
      generalBonuses: {
        luck: 3,
        strength: 3,
      },
    },
  },

  alphas_hide: {
    id: "alphas_hide",
    name: "Alpha's Hide",
    description: "Hide of the wolf pack leader, imbued with primal power",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.10,
        },
      },
      generalBonuses: {
        luck: 3,
        strength: 4,
      },
    },
  },

  whispering_amulet: {
    id: "whispering_amulet",
    name: "Whispering Amulet",
    description: "Mysterious amulet that whispers ancient secrets",
    bonuses: {
      generalBonuses: {
        knowledge: 5,
        madness: 1,
      },
    },
  },

  old_trinket: {
    id: "old_trinket",
    name: "Old Trinket",
    description: "Ancient trinket that grants both strength and luck",
    bonuses: {
      generalBonuses: {
        strength: 3,
        luck: 2,
      },
    },
  },

  blacksmith_hammer: {
    id: "blacksmith_hammer",
    name: "Blacksmith Hammer",
    description: "Legendary blacksmith hammer once owned by a great blacksmith",
    bonuses: {
      generalBonuses: {
        strength: 4,
        craftingCostReduction: 0.1,
      },
    },
  },

  elder_scroll: {
      id: "elder_scroll",
      name: "Elder Scroll",
      description: "Ancient scroll containing forbidden knowledge",
      bonuses: {
        generalBonuses: {
          knowledge: 10,
          madness: 3,
        },
      },
    },
    dragon_bone_dice: {
      id: "dragon_bone_dice",
      name: "Dragon Bone Dice",
      description: "Six-sided dice carved from ancient dragon bone",
      bonuses: {
        generalBonuses: {
          luck: 3,
        },
      },
    },
    coin_of_drowned: {
      id: "coin_of_drowned",
      name: "Coin of Drowned",
      description: "A ring that is always wet and cold",
      bonuses: {
        generalBonuses: {
          luck: 4,
          madness: 2,
        },
      },
    },
    shadow_flute: {
      id: "shadow_flute",
      name: "Shadow Flute",
      description: "A bone flute that makes shadows move unnaturally",
      bonuses: {
        generalBonuses: {
          luck: 3,
          knowledge: 2,
          madness: 3,
        },
      },
    },
    hollow_kings_scepter: {
      id: "hollow_kings_scepter",
      name: "Hollow King's Scepter",
      description: "Scepter of the lost king, radiating power and madness",
      bonuses: {
        generalBonuses: {
          strength: 3,
          knowledge: 7,
          madness: 5,
        },
      },
    },

    wooden_figure: {
      id: "wooden_figure",
      name: "Wooden Figure",
      description: "Carved wooden figure of Cthulhu that whispers forbidden secrets",
      bonuses: {
        generalBonuses: {
          luck: 5,
          madness: 2,
        },
      },
    },

    blackened_mirror: {
      id: "blackened_mirror",
      name: "Blackened Mirror",
      description: "A tall, cracked mirror framed in black iron that radiates cold, unnatural aura",
      bonuses: {
        generalBonuses: {
          knowledge: 8,
          madness: 4,
        },
      },
    },

    ebony_ring: {
      id: "ebony_ring",
      name: "Ebony Ring",
      description: "Dark ring left as a gift by the forest gods, pulsing with otherworldly power",
      bonuses: {
        generalBonuses: {
          luck: 6,
          strength: 3,
          madness: 2,
        },
      },
    },
};

// Tool hierarchy definitions
const AXE_HIERARCHY = [
  "stone_axe",
  "iron_axe",
  "steel_axe",
  "obsidian_axe",
  "adamant_axe",
];
const PICKAXE_HIERARCHY = [
  "stone_pickaxe",
  "iron_pickaxe",
  "steel_pickaxe",
  "obsidian_pickaxe",
  "adamant_pickaxe",
];
const LANTERN_HIERARCHY = [
  "lantern",
  "iron_lantern",
  "steel_lantern",
  "obsidian_lantern",
  "adamant_lantern",
];

const BOW_HIERARCHY = [
  "crude_bow",
  "huntsman_bow",
  "long_bow",
  "war_bow",
  "master_bow",
];

const SWORD_HIERARCHY = [
  "iron_sword",
  "steel_sword",
  "obsidian_sword",
  "adamant_sword",
];

// Helper function to get the best tool of a specific type
export const getBestTool = (
  state: GameState,
  toolType: "axe" | "pickaxe" | "lantern",
): string | null => {
  if (!state.tools) return null;

  const hierarchy =
    toolType === "axe"
      ? AXE_HIERARCHY
      : toolType === "pickaxe"
        ? PICKAXE_HIERARCHY
        : LANTERN_HIERARCHY;

  // Find the highest tier tool that the player owns
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    const toolId = hierarchy[i];
    if (toolId in state.tools && state.tools[toolId as keyof typeof state.tools]) {
      return toolId;
    }
  }

  return null;
};

// Helper function to get the best weapon of a specific type
export const getBestWeapon = (
  state: GameState,
  weaponType: "bow" | "sword",
): string | null => {
  if (!state.weapons) return null;

  const hierarchy =
    weaponType === "bow"
      ? BOW_HIERARCHY
      : weaponType === "sword"
        ? SWORD_HIERARCHY
        : [];

  // Find the highest tier weapon that the player owns
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    const weaponId = hierarchy[i];
    if (weaponId in state.weapons && state.weapons[weaponId as keyof typeof state.weapons]) {
      return weaponId;
    }
  }

  return null;
};

// Helper function to get all tools that should be displayed (only best of each type)
export const getDisplayTools = (state: GameState): Record<string, boolean> => {
  const displayTools: Record<string, boolean> = {};

  // Get best axe, pickaxe, lantern, bow, and sword
  const bestAxe = getBestTool(state, "axe");
  const bestPickaxe = getBestTool(state, "pickaxe");
  const bestLantern = getBestTool(state, "lantern");
  const bestBow = getBestWeapon(state, "bow");
  const bestSword = getBestWeapon(state, "sword");

  // Add best tools to display
  if (bestAxe) displayTools[bestAxe] = true;
  if (bestPickaxe) displayTools[bestPickaxe] = true;
  if (bestLantern) displayTools[bestLantern] = true;
  if (bestBow) displayTools[bestBow] = true;
  if (bestSword) displayTools[bestSword] = true;

  // Add non-hierarchical tools
  if (state.tools) {
    Object.entries(state.tools).forEach(([toolId, owned]) => {
      if (
        owned &&
        !AXE_HIERARCHY.includes(toolId) &&
        !PICKAXE_HIERARCHY.includes(toolId) &&
        !LANTERN_HIERARCHY.includes(toolId)
      ) {
        displayTools[toolId] = true;
      }
    });
  }

  // Add non-hierarchical weapons
  if (state.weapons) {
    Object.entries(state.weapons).forEach(([weaponId, owned]) => {
      if (
        owned &&
        !BOW_HIERARCHY.includes(weaponId) &&
        !SWORD_HIERARCHY.includes(weaponId)
      ) {
        displayTools[weaponId] = true;
      }
    });
  }

  return displayTools;
};

// Helper function to get all active effects for a given state (modified to only use best tools)
export const getActiveEffects = (state: GameState): EffectDefinition[] => {
  const activeEffects: EffectDefinition[] = [];

  // Check clothing effects (legacy)
  Object.entries(state.clothing || {}).forEach(([key, value]) => {
    if (value && clothingEffects[key]) {
      activeEffects.push(clothingEffects[key]);
    }
  });

  // Check relic effects
  Object.entries(state.relics || {}).forEach(([key, value]) => {
    if (value && clothingEffects[key]) {
      activeEffects.push(clothingEffects[key]);
    }
  });

  // Check tool effects
  const displayTools = getDisplayTools(state);
  Object.keys(displayTools).forEach((toolKey) => {
    if (toolEffects[toolKey]) {
      activeEffects.push(toolEffects[toolKey]);
    }
    if (weaponEffects[toolKey]) {
      activeEffects.push(weaponEffects[toolKey]);
    }
  });

  return activeEffects;
};

// Helper function to get action bonuses from pre-calculated effects in state
export function getActionBonuses(actionId: string, state: GameState): ActionBonuses {
  const effects = calculateTotalEffects(state);
  let bonuses: ActionBonuses = {
    resourceBonus: {},
    resourceMultiplier: 1,
    cooldownReduction: 0,
    probabilityBonus: 0,
  };

  // Define mining actions
  const miningActions = ['mineIron', 'mineCoal', 'mineSulfur', 'mineObsidian', 'mineAdamant'];
  const isMiningAction = miningActions.includes(actionId);

  // Apply bonuses for this specific action
  if (effects.actionBonuses) {
    Object.entries(effects.actionBonuses).forEach(([itemId, itemBonuses]) => {
      // Check for specific action bonuses
      if (itemBonuses[actionId]) {
        const actionBonus = itemBonuses[actionId];

        // Apply resource bonuses
        if (actionBonus.resourceBonus) {
          Object.entries(actionBonus.resourceBonus).forEach(([resource, bonus]) => {
            bonuses.resourceBonus[resource] = (bonuses.resourceBonus[resource] || 0) + bonus;
          });
        }

        // Apply multipliers (multiplicative)
        if (actionBonus.resourceMultiplier) {
          bonuses.resourceMultiplier *= actionBonus.resourceMultiplier;
        }

        // Apply cooldown reduction (additive)
        if (actionBonus.cooldownReduction) {
          bonuses.cooldownReduction += actionBonus.cooldownReduction;
        }

        // Apply probability bonus (additive)
        if (actionBonus.probabilityBonus) {
          bonuses.probabilityBonus += actionBonus.probabilityBonus;
        }
      }

      // Check for general "mining" bonuses that apply to all mining actions
      if (isMiningAction && itemBonuses.mining) {
        const miningBonus = itemBonuses.mining;

        // Apply resource bonuses
        if (miningBonus.resourceBonus) {
          Object.entries(miningBonus.resourceBonus).forEach(([resource, bonus]) => {
            bonuses.resourceBonus[resource] = (bonuses.resourceBonus[resource] || 0) + bonus;
          });
        }

        // Apply multipliers (multiplicative)
        if (miningBonus.resourceMultiplier) {
          bonuses.resourceMultiplier *= miningBonus.resourceMultiplier;
        }

        // Apply cooldown reduction (additive)
        if (miningBonus.cooldownReduction) {
          bonuses.cooldownReduction += miningBonus.cooldownReduction;
        }

        // Apply probability bonus (additive)
        if (miningBonus.probabilityBonus) {
          bonuses.probabilityBonus += miningBonus.probabilityBonus;
        }
      }
    });
  }

  return bonuses;
}

// Helper function to get sacrifice bonuses from religious buildings
export function getSacrificeBonus(state: GameState): number {
  let bonus = 0;

  if (state.buildings.shrine > 0) {
    bonus += 0.1; // 10% bonus
  }
  if (state.buildings.temple > 0) {
    bonus += 0.2; // 20% bonus
  }
  if (state.buildings.sanctum > 0) {
    bonus += 0.3; // 30% bonus
  }

  return bonus;
}

// Helper function to get exploration bonuses
export const getExplorationBonuses = (state: GameState): number => {
  const activeEffects = getActiveEffects(state);
  let totalBonus = 0;

  activeEffects.forEach((effect) => {
    if (effect.bonuses.generalBonuses?.explorationBonus) {
      totalBonus += effect.bonuses.generalBonuses.explorationBonus;
    }
  });

  return totalBonus;
};

// Helper function to calculate total luck
export const getTotalLuck = (state: GameState): number => {
  const activeEffects = getActiveEffects(state);
  let luck = state.stats.luck || 0;

  activeEffects.forEach((effect) => {
    if (effect.bonuses.generalBonuses?.luck) {
      luck += effect.bonuses.generalBonuses.luck;
    }
  });

  return luck;
};

// Helper function to calculate total strength
export const getTotalStrength = (state: GameState): number => {
  const activeEffects = getActiveEffects(state);
  let strength = state.stats.strength || 0;

  activeEffects.forEach((effect) => {
    if (effect.bonuses.generalBonuses?.strength) {
      strength += effect.bonuses.generalBonuses.strength;
    }
  });

  return strength;
};

// Helper function to calculate total knowledge
export const getTotalKnowledge = (state: GameState): number => {
  const activeEffects = getActiveEffects(state);
  let knowledge = state.stats.knowledge || 0;

  activeEffects.forEach((effect) => {
    if (effect.bonuses.generalBonuses?.knowledge) {
      knowledge += effect.bonuses.generalBonuses.knowledge;
    }
  });

  return knowledge;
};

// Helper function to calculate total madness
export const getTotalMadness = (state: GameState): number => {
  const baseMadness = state.stats.madness || 0;
  let totalMadness = baseMadness;

  // Apply modifiers from clothing and relics
  Object.entries(clothingEffects).forEach(([key, effect]) => {
    if (state.clothing?.[key] || state.relics?.[key]) {
      if (effect.bonuses.generalBonuses?.madness) {
        totalMadness += effect.bonuses.generalBonuses.madness;
      }
    }
  });

  // Apply madness reduction from buildings dynamically
  const buildingStatsEffects = getBuildingStatsEffects(state);
  if (buildingStatsEffects.madness) {
    totalMadness += buildingStatsEffects.madness; // buildingStatsEffects.madness is negative for reduction
  }

  return Math.max(0, totalMadness);
};

// Helper function to calculate total crafting cost reduction
export const getTotalCraftingCostReduction = (state: GameState): number => {
  const activeEffects = getActiveEffects(state);
  let reduction = 0;

  activeEffects.forEach((effect) => {
    if (effect.bonuses.generalBonuses?.craftingCostReduction) {
      reduction += effect.bonuses.generalBonuses.craftingCostReduction;
    }
  });

  return reduction;
};

// Helper function to apply luck bonus to probability (10 luck = 10% increase)
export const applyLuckToprobability = (
  baseProbability: number,
  luck: number,
): number => {
  const luckBonus = luck / 100; // Convert luck to percentage (10 luck = 0.1 = 10%)
  const adjustedProbability = baseProbability + baseProbability * luckBonus;
  return Math.min(adjustedProbability, 1.0); // Cap at 100%
};

// Helper function to calculate all effects for the current state
export const calculateTotalEffects = (state: GameState) => {
  const effects = {
    resource_bonus: {} as Record<string, number>,
    resource_multiplier: {} as Record<string, number>,
    probability_bonus: {} as Record<string, number>,
    cooldown_reduction: {} as Record<string, number>,
    madness_reduction: {} as Record<string, number>,
  };

  const activeEffects = getActiveEffects(state);

  // Process all active effects
  activeEffects.forEach((effect) => {
    // Process madness bonuses from general bonuses
    if (effect.bonuses.generalBonuses?.madness) {
      const effectKey = `${effect.id}_madness`;
      effects.madness_reduction[effectKey] = -effect.bonuses.generalBonuses.madness; // Negative because it increases madness
    }

    if (effect.bonuses.actionBonuses) {
      Object.entries(effect.bonuses.actionBonuses).forEach(([actionId, actionBonus]) => {
        // Resource bonuses
        if (actionBonus.resourceBonus) {
          Object.entries(actionBonus.resourceBonus).forEach(([resource, bonus]) => {
            const key = `${actionId}_${resource}`;
            effects.resource_bonus[key] = (effects.resource_bonus[key] || 0) + bonus;
          });
        }

        // Resource multipliers
        if (actionBonus.resourceMultiplier && actionBonus.resourceMultiplier !== 1) {
          effects.resource_multiplier[actionId] =
            (effects.resource_multiplier[actionId] || 1) * actionBonus.resourceMultiplier;
        }

        // Probability bonuses
        if (actionBonus.probabilityBonus) {
          Object.entries(actionBonus.probabilityBonus).forEach(([resource, bonus]) => {
            const key = `${actionId}_${resource}`;
            effects.probability_bonus[key] = (effects.probability_bonus[key] || 0) + bonus;
          });
        }

        // Cooldown reductions
        if (actionBonus.cooldownReduction) {
          effects.cooldown_reduction[actionId] =
            (effects.cooldown_reduction[actionId] || 0) + actionBonus.cooldownReduction;
        }
      });
    }
  });

  return effects;
};

// Helper function to get cooldown reductions based on tools
export const getCooldownReduction = (
  actionId: string,
  state: GameState,
): number => {
  const activeEffects = getActiveEffects(state);
  let totalReduction = 0;

  // Apply cooldown reductions from tool effects
  activeEffects.forEach((effect) => {
    const actionBonus = effect.bonuses.actionBonuses?.[actionId];
    if (actionBonus?.cooldownReduction) {
      totalReduction += actionBonus.cooldownReduction;
    }
  });

  return totalReduction;
};



// Helper function to get building stats effects
export const getBuildingStatsEffects = (state: GameState) => {
  const statsEffects: Record<string, number> = {};

  // Check each building action for stats effects
  Object.entries(villageBuildActions).forEach(([actionId, action]: [string, any]) => {
    if (action.statsEffects) {
      const buildingName = actionId.replace('build', '').toLowerCase();
      const buildingKey = buildingName.charAt(0).toLowerCase() + buildingName.slice(1);

      // Check if this building is built
      if (state.buildings && state.buildings[buildingKey as keyof typeof state.buildings] > 0) {
        Object.entries(action.statsEffects).forEach(([stat, effect]) => {
          if (typeof effect === 'number') {
            statsEffects[stat] = (statsEffects[stat] || 0) + effect;
          }
        });
      }
    }
  });

  return statsEffects;
};