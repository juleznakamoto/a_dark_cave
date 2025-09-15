import { GameState } from "@shared/schema";

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
          resourceBonus: { wood: 3 },
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
          resourceBonus: { wood: 8 },
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
          cooldownReduction: 1,
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
          resourceBonus: { wood: 35 },
          cooldownReduction: 2,
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
};

// Clothing effects
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
};

// Tool hierarchy definitions
const AXE_HIERARCHY = ["stone_axe", "iron_axe", "steel_axe", "obsidian_axe", "adamant_axe"];
const PICKAXE_HIERARCHY = [
  "stone_pickaxe",
  "iron_pickaxe",
  "steel_pickaxe",
  "obsidian_pickaxe",
  "adamant_pickaxe",
];

// Helper function to get the best tool of a specific type
export const getBestTool = (
  state: GameState,
  toolType: "axe" | "pickaxe",
): string | null => {
  const hierarchy = toolType === "axe" ? AXE_HIERARCHY : PICKAXE_HIERARCHY;

  // Find the highest tier tool that the player owns
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    const toolId = hierarchy[i];
    if (state.tools[toolId as keyof typeof state.tools]) {
      return toolId;
    }
  }

  return null;
};

// Helper function to get all tools that should be displayed (only best of each type)
export const getDisplayTools = (state: GameState): Record<string, boolean> => {
  const displayTools: Record<string, boolean> = {};

  // Get best axe and pickaxe
  const bestAxe = getBestTool(state, "axe");
  const bestPickaxe = getBestTool(state, "pickaxe");

  // Add best tools to display
  if (bestAxe) displayTools[bestAxe] = true;
  if (bestPickaxe) displayTools[bestPickaxe] = true;

  // Add non-axe/pickaxe tools
  Object.entries(state.tools).forEach(([toolId, owned]) => {
    if (
      owned &&
      !AXE_HIERARCHY.includes(toolId) &&
      !PICKAXE_HIERARCHY.includes(toolId)
    ) {
      displayTools[toolId] = true;
    }
  });

  return displayTools;
};

// Helper function to get all active effects for a given state (modified to only use best tools)
export const getActiveEffects = (state: GameState): EffectDefinition[] => {
  const activeEffects: EffectDefinition[] = [];

  // Check tools - only add best axe and pickaxe
  const bestAxe = getBestTool(state, "axe");
  const bestPickaxe = getBestTool(state, "pickaxe");

  // Add best tools
  if (bestAxe && toolEffects[bestAxe]) {
    activeEffects.push(toolEffects[bestAxe]);
  }
  if (bestPickaxe && toolEffects[bestPickaxe]) {
    activeEffects.push(toolEffects[bestPickaxe]);
  }

  // Add other tools (non-axe/pickaxe)
  Object.entries(state.tools).forEach(([toolId, owned]) => {
    if (
      owned &&
      toolEffects[toolId] &&
      !AXE_HIERARCHY.includes(toolId) &&
      !PICKAXE_HIERARCHY.includes(toolId)
    ) {
      activeEffects.push(toolEffects[toolId]);
    }
  });

  // Check clothing
  Object.entries(state.clothing).forEach(([clothingId, owned]) => {
    if (owned && clothingEffects[clothingId]) {
      activeEffects.push(clothingEffects[clothingId]);
    }
  });

  return activeEffects;
};

// Helper function to calculate total bonuses for a specific action
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
  const activeEffects = getActiveEffects(state);
  let totalLuck = state.stats?.luck || 0;

  activeEffects.forEach((effect) => {
    if (effect.bonuses.generalBonuses?.luck) {
      totalLuck += effect.bonuses.generalBonuses.luck;
    }
  });

  return totalLuck;
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
export const getCooldownReduction = (actionId: string, state: GameState): number => {
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