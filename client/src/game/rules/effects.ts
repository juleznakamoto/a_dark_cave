import { GameState } from "@shared/schema";
import { fileURLToPath } from "url";

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
    };
  };
}

// Tool effects
export const toolEffects: Record<string, EffectDefinition> = {
  stone_axe: {
    id: "stone_axe",
    name: "Stone Axe",
    description: "Increases wood gathering efficiency",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceBonus: { wood: 5 },
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
    description: "Enables mining",
    bonuses: {
      actionBonuses: {},
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
    description: "Significantly increases wood gathering efficiency",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceBonus: { wood: 10 },
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
    description: "Enables advanced mining operations",
    bonuses: {
      actionBonuses: {
        mineIron: {
          resourceBonus: { iron: 2 },
          cooldownReduction: 1,
        },
      },
    },
  },

  steel_axe: {
    id: "steel_axe",
    name: "Steel Axe",
    description: "Superior wood gathering tool",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceBonus: { wood: 15 },
          cooldownReduction: 0.75,
        },
      },
    },
  },

  steel_pickaxe: {
    id: "steel_pickaxe",
    name: "Steel Pickaxe",
    description: "High-efficiency mining tool",
    bonuses: {
      actionBonuses: {
        mineIron: {
          resourceBonus: { iron: 7 },
          cooldownReduction: 2,
        },
        mineCoal: {
          resourceBonus: { coal: 7 },
          cooldownReduction: 2,
        },
        mineSulfur: {
          resourceBonus: { sulfur: 7 },
          cooldownReduction: 2,
        },
      },
    },
  },

  obsidian_axe: {
    id: "obsidian_axe",
    name: "Obsidian Axe",
    description:
      "Legendary wood gathering tool with razor-sharp volcanic glass",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceBonus: { wood: 25 },
          cooldownReduction: 1,
        },
      },
    },
  },

  obsidian_pickaxe: {
    id: "obsidian_pickaxe",
    name: "Obsidian Pickaxe",
    description: "Ultimate mining tool forged with volcanic glass",
    bonuses: {
      actionBonuses: {
        mineIron: {
          resourceBonus: { iron: 15 },
          cooldownReduction: 4,
        },
        mineCoal: {
          resourceBonus: { coal: 15 },
          cooldownReduction: 4,
        },
        mineSulfur: {
          resourceBonus: { sulfur: 15 },
          cooldownReduction: 4,
        },
        mineObsidian: {
          resourceBonus: { obsidian: 5 },
          cooldownReduction: 4,
        },
      },
    },
  },

  adamant_axe: {
    id: "adamant_axe",
    name: "Adamant Axe",
    description:
      "The ultimate wood gathering tool forged from the hardest metal",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceBonus: { wood: 50 },
          cooldownReduction: 1.5,
        },
      },
    },
  },

  adamant_pickaxe: {
    id: "adamant_pickaxe",
    name: "Adamant Pickaxe",
    description: "The ultimate mining tool forged from the hardest metal",
    bonuses: {
      actionBonuses: {
        mineIron: {
          resourceBonus: { iron: 30 },
          cooldownReduction: 6,
        },
        mineCoal: {
          resourceBonus: { coal: 30 },
          cooldownReduction: 6,
        },
        mineSulfur: {
          resourceBonus: { sulfur: 30 },
          cooldownReduction: 6,
        },
        mineObsidian: {
          resourceBonus: { obsidian: 15 },
          cooldownReduction: 6,
        },
        mineAdamant: {
          resourceBonus: { adamant: 10 },
          cooldownReduction: 6,
        },
      },
    },
  },

  iron_lantern: {
    id: "iron_lantern",
    name: "Iron Lantern",
    description: "Provides better lighting for mining operations",
    bonuses: {
      actionBonuses: {
        mineIron: {
          resourceBonus: { iron: 3 },
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
    description: "Advanced lighting that improves all mining operations",
    bonuses: {
      actionBonuses: {
        mineIron: {
          resourceBonus: { iron: 5 },
          cooldownReduction: 2,
        },
        mineCoal: {
          resourceBonus: { coal: 5 },
          cooldownReduction: 2,
        },
        mineSulfur: {
          resourceBonus: { sulfur: 5 },
          cooldownReduction: 2,
        },
        ventureDeeper: {
          cooldownReduction: 3,
        },
      },
    },
  },

  obsidian_lantern: {
    id: "obsidian_lantern",
    name: "Obsidian Lantern",
    description: "Superior lighting that greatly enhances mining efficiency",
    bonuses: {
      actionBonuses: {
        mineIron: {
          resourceBonus: { iron: 10 },
          cooldownReduction: 3,
        },
        mineCoal: {
          resourceBonus: { coal: 10 },
          cooldownReduction: 3,
        },
        mineSulfur: {
          resourceBonus: { sulfur: 10 },
          cooldownReduction: 3,
        },
        mineObsidian: {
          resourceBonus: { obsidian: 3 },
          cooldownReduction: 3,
        },
        ventureDeeper: {
          cooldownReduction: 4,
        },
      },
    },
  },

  adamant_lantern: {
    id: "adamant_lantern",
    name: "Adamant Lantern",
    description: "The ultimate lighting tool that maximizes mining potential",
    bonuses: {
      actionBonuses: {
        mineIron: {
          resourceBonus: { iron: 15 },
          cooldownReduction: 4,
        },
        mineCoal: {
          resourceBonus: { coal: 15 },
          cooldownReduction: 4,
        },
        mineSulfur: {
          resourceBonus: { sulfur: 15 },
          cooldownReduction: 4,
        },
        mineObsidian: {
          resourceBonus: { obsidian: 15 },
          cooldownReduction: 4,
        },
        mineAdamant: {
          resourceBonus: { adamant: 15 },
          cooldownReduction: 4,
        },
        ventureDeeper: {
          cooldownReduction: 6,
        },
      },
    },
  },
};

// Weapon effects
export const weaponEffects: Record<string, EffectDefinition> = {
  crude_bow: {
    id: "crude_bow",
    name: "Crude Bow",
    description: "Basic hunting bow for gathering food",
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
    description: "Improved hunting bow for better food gathering",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceBonus: { food: 10, fur: 2, bones: 2 },
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
    description: "Superior hunting bow with extended range",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceBonus: { food: 15, fur: 4, bones: 4 },
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
    description: "Powerful military bow adapted for hunting",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceBonus: { food: 20, fur: 6, bones: 6 },
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
    description: "The ultimate hunting weapon",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceBonus: { food: 25, fur: 8, bones: 8 },
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
    description:
      "A sturdy iron blade that enhances your combat prowess (+5 Strength)",
    bonuses: {
      generalBonuses: {
        strength: 3,
      },
    },
  },

  steel_sword: {
    id: "steel_sword",
    name: "Steel Sword",
    description:
      "A finely crafted steel blade with superior balance (+8 Strength)",
    bonuses: {
      generalBonuses: {
        strength: 5,
      },
    },
  },

  obsidian_sword: {
    id: "obsidian_sword",
    name: "Obsidian Sword",
    description:
      "A razor-sharp blade forged from volcanic glass (+12 Strength)",
    bonuses: {
      generalBonuses: {
        strength: 10,
      },
    },
  },

  adamant_sword: {
    id: "adamant_sword",
    name: "Adamant Sword",
    description:
      "The ultimate weapon forged from the hardest metal (+20 Strength)",
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
    description: "An ancient amulet that brings good fortune (+10 Luck)",
    bonuses: {
      generalBonuses: {
        luck: 10,
      },
    },
  },

  bloodstained_belt: {
    id: "bloodstained_belt",
    name: "Bloodstained Belt",
    description:
      "A leather belt stained with ancient blood that grants raw power (+5 Strength)",
    bonuses: {
      generalBonuses: {
        strength: 5,
      },
    },
  },

  ravenfeather_mantle: {
    id: "ravenfeather_mantle",
    name: "Ravenfeather Mantle",
    description:
      "A mystical mantle woven from raven feathers that enhances both fortune and might (+5 Luck, +5 Strength)",
    bonuses: {
      generalBonuses: {
        luck: 5,
        strength: 5,
      },
    },
  },

  alphas_hide: {
    id: "alphas_hide",
    name: "Alpha's Hide",
    description:
      "The hide of the wolf pack leader, imbued with primal power (+3 Luck, +5 Strength)",
    bonuses: {
      generalBonuses: {
        luck: 3,
        strength: 5,
      },
    },
  },

  whispering_amulet: {
    id: "whispering_amulet",
    name: "Whispering Amulet",
    description:
      "A mysterious amulet that whispers ancient secrets (+5 Knowledge)",
    bonuses: {
      generalBonuses: {
        knowledge: 5,
      },
    },
  },

  old_trinket: {
    id: "old_trinket",
    name: "Old Trinket",
    description:
      "An ancient trinket that grants both strength and luck (+5 Strength, +2 Luck)",
    bonuses: {
      generalBonuses: {
        strength: 5,
        luck: 2,
      },
    },
  },

  blacksmith_hammer: {
    id: "blacksmith_hammer",
    name: "Blacksmith Hammer",
    description:
      "Ancient hammer that reduces crafting costs by 10% (+2 Strength)",
    bonuses: {
      generalBonuses: {
        strength: 5,
      },
    },
  },

  elder_scroll: {
    id: "elder_scroll",
    name: "Elder Scroll",
    description:
      "Ancient scroll that grants both knowledge and luck (+10 Knowledge, +5 Luck)",
    bonuses: {
      generalBonuses: {
        knowledge: 15,
        luck: 10,
      },
    },
  },

  ebony_ring: {
    id: "ebony_ring",
    name: "Ebony Ring",
    description:
      "A dark ring carved from petrified ebony wood, given to those favored by the forest gods (+5 Luck, +5 Knowledge)",
    bonuses: {
      generalBonuses: {
        luck: 5,
        knowledge: 5,
      },
    },
  },

  cracked_crown: {
    id: "cracked_crown",
    name: "Cracked Crown",
    description:
      "A cracked golden crown that hums with ancient power (+5 Luck, +5 Knowledge)",
    bonuses: {
      generalBonuses: {
        luck: 5,
        knowledge: 5,
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
  const hierarchy =
    toolType === "axe"
      ? AXE_HIERARCHY
      : toolType === "pickaxe"
        ? PICKAXE_HIERARCHY
        : LANTERN_HIERARCHY;

  // Find the highest tier tool that the player owns
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    const toolId = hierarchy[i];
    if (state.tools[toolId as keyof typeof state.tools]) {
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
  const hierarchy =
    weaponType === "bow"
      ? BOW_HIERARCHY
      : weaponType === "sword"
        ? SWORD_HIERARCHY
        : [];

  // Find the highest tier weapon that the player owns
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    const weaponId = hierarchy[i];
    if (state.weapons[weaponId as keyof typeof state.weapons]) {
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

  // Add non-hierarchical weapons
  Object.entries(state.weapons).forEach(([weaponId, owned]) => {
    if (
      owned &&
      !BOW_HIERARCHY.includes(weaponId) &&
      !SWORD_HIERARCHY.includes(weaponId)
    ) {
      displayTools[weaponId] = true;
    }
  });

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

// Helper function to calculate total bonuses for a given action
export const getActionBonuses = (actionId: string, state: GameState) => {
  const activeEffects = getActiveEffects(state);
  const bonuses = {
    resourceBonus: {} as Record<string, number>,
    probabilityBonus: {} as Record<string, number>,
    cooldownReduction: 0,
  };

  activeEffects.forEach((effect) => {
    const actionBonus = effect.bonuses.actionBonuses?.[actionId];
    if (actionBonus) {
      // Combine resource bonuses
      if (actionBonus.resourceBonus) {
        Object.entries(actionBonus.resourceBonus).forEach(
          ([resource, bonus]) => {
            bonuses.resourceBonus[resource] =
              (bonuses.resourceBonus[resource] || 0) + bonus;
          },
        );
      }

      // Combine probability bonuses
      if (actionBonus.probabilityBonus) {
        Object.entries(actionBonus.probabilityBonus).forEach(
          ([resource, bonus]) => {
            bonuses.probabilityBonus[resource] =
              (bonuses.probabilityBonus[resource] || 0) + bonus;
          },
        );
      }

      // Combine cooldown reductions (additive)
      if (actionBonus.cooldownReduction) {
        bonuses.cooldownReduction += actionBonus.cooldownReduction;
      }
    }
  });

  return bonuses;
};

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
  return (
    (state.stats.luck || 0) +
    (state.relics?.ravenfeather_mantle ? 5 : 0) +
    (state.relics?.alphas_hide ? 3 : 0) +
    (state.relics?.elder_scroll ? 10 : 0) +
    (state.relics?.ebony_ring ? 5 : 0) +
    (state.relics?.cracked_crown ? 5 : 0)
  );
};

// Helper function to calculate total strength
export const getTotalStrength = (state: GameState): number => {
  const activeEffects = getActiveEffects(state);
  let totalStrength = state.stats?.strength || 0;

  activeEffects.forEach((effect) => {
    if (effect.bonuses.generalBonuses?.strength) {
      totalStrength += effect.bonuses.generalBonuses.strength;
    }
  });

  return totalStrength;
};

// Helper function to calculate total knowledge
export const getTotalKnowledge = (state: GameState): number => {
  return (
    (state.stats.knowledge || 0) +
    (state.relics?.blackened_mirror ? 10 : 0) +
    (state.relics?.elder_scroll ? 10 : 0) +
    (state.relics?.unnamed_book ? 10 : 0) +
    (state.relics?.cracked_crown ? 5 : 0)
  );
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

// Helper function to calculate cooldown reductions based on tools
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