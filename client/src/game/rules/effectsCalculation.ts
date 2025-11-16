import { GameState } from "@shared/schema";
import {
  toolEffects,
  weaponEffects,
  clothingEffects,
  EffectDefinition,
  ActionBonuses,
} from "./effects";
import { villageBuildActions } from "./villageBuildActions";

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
    if (
      toolId in state.tools &&
      state.tools[toolId as keyof typeof state.tools]
    ) {
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
    if (
      weaponId in state.weapons &&
      state.weapons[weaponId as keyof typeof state.weapons]
    ) {
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
        // Hide reinforced rope after descending further
        if (
          toolId === "reinforced_rope" &&
          state.story.seen?.actionDescendFurther
        ) {
          return;
        }
        // Hide giant trap after laying trap
        if (toolId === "giant_trap" && state.story.seen?.actionLayTrap) {
          return;
        }
        // Hide occultist map after exploring occultist chamber
        if (
          toolId === "occultist_map" &&
          state.story.seen?.actionOccultistChamber
        ) {
          return;
        }
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

  // Check clothing effects
  Object.entries(state.clothing || {}).forEach(([key, value]) => {
    if (value && clothingEffects[key]) {
      activeEffects.push(clothingEffects[key]);
    }
  });

  // Check relic effects (relics are also in clothingEffects for now)
  Object.entries(state.relics || {}).forEach(([key, value]) => {
    if (value && clothingEffects[key]) {
      activeEffects.push(clothingEffects[key]);
    }
  });

  // Check blessing effects (blessings are also in clothingEffects)
  Object.entries(state.blessings || {}).forEach(([key, value]) => {
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
    if (clothingEffects[toolKey]) {
      activeEffects.push(clothingEffects[toolKey]);
    }
  });

  return activeEffects;
};

// Helper function to get action bonuses from pre-calculated effects in state
export const getActionBonuses = (
  actionId: string,
  state: GameState,
): {
  resourceMultiplier: number;
  resourceBonus: Record<string, number>;
  cooldownReduction: number;
  caveExploreMultiplier: number;
} => {
  const activeEffects = getActiveEffects(state);
  let resourceMultiplier = 1;
  let cooldownReduction = 0;
  let caveExploreMultiplier = 1;
  const resourceBonus: Record<string, number> = {};

  activeEffects.forEach((effect) => {
    // Check if this effect has bonuses for the specific action
    if (effect.bonuses.actionBonuses?.[actionId]) {
      const bonus = effect.bonuses.actionBonuses[actionId];
      if (bonus.resourceMultiplier) {
        // Additive: sum the bonus percentages
        resourceMultiplier += bonus.resourceMultiplier - 1;
      }
      if (bonus.cooldownReduction) {
        cooldownReduction += bonus.cooldownReduction;
      }
      if (bonus.resourceBonus) {
        Object.entries(bonus.resourceBonus).forEach(([resource, amount]) => {
          resourceBonus[resource] = (resourceBonus[resource] || 0) + amount;
        });
      }
    }

    // Add general mine bonuses for mine actions
    if (actionId.startsWith("mine")) {
      if (effect.bonuses.actionBonuses?.mining) {
        const mineBonus = effect.bonuses.actionBonuses.mining;
        if (mineBonus.resourceMultiplier) {
          // Additive: sum the bonus percentages
          resourceMultiplier += mineBonus.resourceMultiplier - 1;
        }
        if (mineBonus.cooldownReduction) {
          cooldownReduction += mineBonus.cooldownReduction;
        }
        if (mineBonus.resourceBonus) {
          Object.entries(mineBonus.resourceBonus).forEach(
            ([resource, amount]) => {
              resourceBonus[resource] = (resourceBonus[resource] || 0) + amount;
            },
          );
        }
      }
    }

    // Add cave exploration multiplier for cave explore actions
    const caveExploreActions = [
      "exploreCave",
      "ventureDeeper",
      "descendFurther",
      "exploreRuins",
      "exploreTemple",
      "exploreCitadel",
    ];
    if (caveExploreActions.includes(actionId)) {
      if (effect.bonuses.generalBonuses?.caveExploreMultiplier) {
        // Additive: sum the bonus percentages
        caveExploreMultiplier +=
          effect.bonuses.generalBonuses.caveExploreMultiplier - 1;
      }
    }
  });

  return {
    resourceMultiplier,
    resourceBonus,
    cooldownReduction,
    caveExploreMultiplier,
  };
};

// SSOT: Calculate all action bonuses for display and internal use
export const getAllActionBonuses = (
  state: GameState,
): Array<{
  id: string;
  label: string;
  multiplier: number;
  flatBonus: number;
  displayValue: string;
}> => {
  const activeEffects = getActiveEffects(state);
  const bonusMap = new Map<string, { multiplier: number; flatBonus: number }>();

  activeEffects.forEach((effect) => {
    // Check for cave explore multiplier in general bonuses
    if (effect.bonuses.generalBonuses?.caveExploreMultiplier) {
      const existing = bonusMap.get("caveExplore") || {
        multiplier: 1,
        flatBonus: 0,
      };
      existing.multiplier +=
        effect.bonuses.generalBonuses.caveExploreMultiplier - 1;
      bonusMap.set("caveExplore", existing);
    }

    if (effect.bonuses.actionBonuses) {
      Object.entries(effect.bonuses.actionBonuses).forEach(
        ([actionId, bonus]) => {
          const existing = bonusMap.get(actionId) || {
            multiplier: 1,
            flatBonus: 0,
          };

          // Aggregate multipliers (additive)
          if (bonus.resourceMultiplier) {
            existing.multiplier += bonus.resourceMultiplier - 1;
          }

          // Aggregate flat bonuses (additive)
          if (bonus.resourceBonus) {
            Object.values(bonus.resourceBonus).forEach((value) => {
              existing.flatBonus += value;
            });
          }

          bonusMap.set(actionId, existing);
        },
      );
    }
  });

  // Convert to array and format
  return Array.from(bonusMap.entries())
    .filter(([actionId]) => actionId !== "steelForger") // Exclude forge from bonus display
    .map(([actionId, bonus]) => {
      const percentBonus = Math.round((bonus.multiplier - 1) * 100);
      const label =
        actionId === "caveExplore"
          ? "Cave Explore"
          : actionId
              .replace(/([A-Z])/g, " $1")
              .trim()
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

      // Build value string
      let valueStr = "";
      if (percentBonus > 0) {
        valueStr = `+${percentBonus}%`;
      }
      if (bonus.flatBonus > 0) {
        valueStr += valueStr ? ` / +${bonus.flatBonus}` : `+${bonus.flatBonus}`;
      }

      return {
        id: actionId,
        label,
        multiplier: bonus.multiplier,
        flatBonus: bonus.flatBonus,
        displayValue: valueStr,
      };
    })
    .filter((item) => item.multiplier - 1 > 0 || item.flatBonus > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
};

// Helper function to calculate total luck
export const getTotalLuck = (state: GameState): number => {
  const effects = calculateTotalEffects(state);
  const baseLuck = state.stats.luck || 0;
  return baseLuck + (effects.statBonuses?.luck || 0);
};

// Helper function to calculate total strength
export const getTotalStrength = (state: GameState): number => {
  const effects = calculateTotalEffects(state);
  const baseStrength = state.stats.strength || 0;
  return baseStrength + (effects.statBonuses?.strength || 0);
};

// Helper function to calculate total knowledge
export const getTotalKnowledge = (state: GameState): number => {
  const effects = calculateTotalEffects(state);
  let knowledge = state.stats.knowledge || 0;
  return knowledge + (effects.statBonuses?.knowledge || 0);
};

// Helper function to calculate total madness
export const getTotalMadness = (state: GameState): number => {
  const effects = calculateTotalEffects(state);
  // Base madness already includes madnessFromEvents (they're added together when events trigger)
  // So we just use the base madness value
  let totalMadness = state.stats.madness || 0;

  // Add madness from effects
  const effectMadness = effects.statBonuses?.madness || 0;
  totalMadness += effectMadness;

  // Apply madness reduction from effects (includes building madness reductions)
  Object.entries(effects.madness_reduction).forEach(([key, reduction]) => {
    totalMadness += reduction; // Already negative values
  });

  const finalMadness = Math.max(0, totalMadness);
  return finalMadness;
};

// Helper function to calculate total crafting cost reduction
export const getTotalCraftingCostReduction = (state: GameState): number => {
  const activeEffects = getActiveEffects(state);
  let reduction = 0;

  // Add reduction from items/tools
  activeEffects.forEach((effect) => {
    if (effect.bonuses.generalBonuses?.craftingCostReduction) {
      reduction += effect.bonuses.generalBonuses.craftingCostReduction;
    }
  });

  // Add reduction from buildings (similar to statsEffects processing)
  Object.entries(state.buildings).forEach(([buildingKey, buildingCount]) => {
    if (buildingCount > 0) {
      const actionId = `build${buildingKey.charAt(0).toUpperCase() + buildingKey.slice(1)}`;
      const buildAction = villageBuildActions[actionId];

      if (buildAction?.craftingCostReduction) {
        reduction += buildAction.craftingCostReduction;
      }
    }
  });

  return reduction;
};

// Helper function to calculate total building cost reduction
export const getTotalBuildingCostReduction = (state: GameState): number => {
  const activeEffects = getActiveEffects(state);
  let reduction = 0;

  activeEffects.forEach((effect) => {
    if (effect.bonuses.generalBonuses?.buildingCostReduction) {
      reduction += effect.bonuses.generalBonuses.buildingCostReduction;
    }
  });

  return reduction;
};

// Helper function to calculate all effects for the current state
export const calculateTotalEffects = (state: GameState) => {
  const effects = {
    resource_bonus: {} as Record<string, number>,
    resource_multiplier: {} as Record<string, number>,
    probability_bonus: {} as Record<string, number>,
    cooldown_reduction: {} as Record<string, number>,
    madness_reduction: {} as Record<string, number>,
    actionBonuses: {} as Record<string, Record<string, any>>,
    statBonuses: {
      // Added statBonuses here
      strength: 0,
      luck: 0,
      knowledge: 0,
      madness: 0,
    },
  };

  // Dynamically process all building statsEffects
  // Convert building key to action ID format (e.g., "clerksHut" -> "buildClerksHut")
  const getBuildActionId = (buildingKey: string): string => {
    return `build${buildingKey.charAt(0).toUpperCase() + buildingKey.slice(1)}`;
  };

  // Track buildings with stat effects in priority order
  const madnessReductionBuildings: string[] = [];
  const knowledgeBonusBuildings: string[] = [];

  // Iterate through all buildings and collect their statsEffects
  Object.entries(state.buildings).forEach(([buildingKey, buildingCount]) => {
    if (buildingCount > 0) {
      const actionId = getBuildActionId(buildingKey);
      const buildAction = villageBuildActions[actionId];

      if (buildAction?.statsEffects) {
        // Handle madness effects (track for priority-based application)
        if (buildAction.statsEffects.madness !== undefined) {
          madnessReductionBuildings.push(buildingKey);
        }

        // Handle knowledge effects (track for priority-based application)
        if (buildAction.statsEffects.knowledge !== undefined) {
          knowledgeBonusBuildings.push(buildingKey);
        }

        // Sum up all other stat bonuses
        if (buildAction.statsEffects.strength !== undefined) {
          effects.statBonuses.strength += buildAction.statsEffects.strength;
        }
        if (buildAction.statsEffects.luck !== undefined) {
          effects.statBonuses.luck += buildAction.statsEffects.luck;
        }
      }
    }
  });

  // Apply madness reduction from highest tier building only
  // Order by priority: sanctum > temple > shrine > altar
  const madnessPriority = ["sanctum", "temple", "shrine", "altar"];
  for (const buildingKey of madnessPriority) {
    if (madnessReductionBuildings.includes(buildingKey)) {
      const actionId = getBuildActionId(buildingKey);
      const buildAction = villageBuildActions[actionId];
      if (buildAction?.statsEffects?.madness) {
        const effectKey = `${buildingKey}_madness`;
        effects.madness_reduction[effectKey] = buildAction.statsEffects.madness;
      }
      break; // Only apply the highest tier building's effect
    }
  }

  // Add Black Monolith madness reduction (applies independently)
  if (state.buildings.blackMonolith > 0) {
    const buildAction = villageBuildActions.buildBlackMonolith;
    if (buildAction?.statsEffects?.madness) {
      effects.madness_reduction.blackMonolith_madness =
        buildAction.statsEffects.madness;
    }

    // Add madness reduction from animal sacrifices
    const usageCount = Number(state.story?.seen?.animalsSacrificeLevel) || 0;
    if (usageCount > 0) {
      const sacrificeMadnessReduction = usageCount * -1;
      effects.madness_reduction.animals_sacrifice_madness =
        sacrificeMadnessReduction;
    }
  }

  // Apply knowledge bonus from highest tier building only
  // Order by priority: scriptorium > clerksHut
  const knowledgePriority = ["scriptorium", "clerksHut"];
  for (const buildingKey of knowledgePriority) {
    if (knowledgeBonusBuildings.includes(buildingKey)) {
      const actionId = getBuildActionId(buildingKey);
      const buildAction = villageBuildActions[actionId];
      if (buildAction?.statsEffects?.knowledge) {
        effects.statBonuses.knowledge += buildAction.statsEffects.knowledge;
      }
      break; // Only apply the highest tier building's effect
    }
  }

  const activeEffects = getActiveEffects(state);

  // Process all active effects
  activeEffects.forEach((effect) => {
    // Process madness bonuses from general bonuses (items that ADD madness)
    if (effect.bonuses.generalBonuses?.madness) {
      effects.statBonuses.madness += effect.bonuses.generalBonuses.madness;
    }

    // Process madness reduction from general bonuses (items that REDUCE madness)
    if (effect.bonuses.generalBonuses?.madnessReduction) {
      const effectKey = `${effect.id}_madness_reduction`;
      effects.madness_reduction[effectKey] =
        -effect.bonuses.generalBonuses.madnessReduction;
    }

    // Populate actionBonuses directly from effects
    if (effect.bonuses.actionBonuses) {
      effects.actionBonuses[effect.id] = effect.bonuses.actionBonuses;
    }

    if (effect.bonuses.actionBonuses) {
      Object.entries(effect.bonuses.actionBonuses).forEach(
        ([actionId, actionBonus]) => {
          // Resource bonuses
          if (actionBonus.resourceBonus) {
            Object.entries(actionBonus.resourceBonus).forEach(
              ([resource, bonus]) => {
                const key = `${actionId}_${resource}`;
                effects.resource_bonus[key] =
                  (effects.resource_bonus[key] || 0) + bonus;
              },
            );
          }

          // Resource multipliers (additive)
          if (
            actionBonus.resourceMultiplier &&
            actionBonus.resourceMultiplier !== 1
          ) {
            effects.resource_multiplier[actionId] =
              (effects.resource_multiplier[actionId] || 1) +
              (actionBonus.resourceMultiplier - 1);
          }

          // Probability bonuses
          if (actionBonus.probabilityBonus) {
            Object.entries(actionBonus.probabilityBonus).forEach(
              ([resource, bonus]) => {
                const key = `${actionId}_${resource}`;
                effects.probability_bonus[key] =
                  (effects.probability_bonus[key] || 0) + bonus;
              },
            );
          }

          // Cooldown reductions
          if (actionBonus.cooldownReduction) {
            effects.cooldown_reduction[actionId] =
              (effects.cooldown_reduction[actionId] || 0) +
              actionBonus.cooldownReduction;
          }
        },
      );
    }

    // Process general bonuses
    if (effect.bonuses.generalBonuses) {
      if (effect.bonuses.generalBonuses.strength) {
        effects.statBonuses.strength += effect.bonuses.generalBonuses.strength;
      }
      if (effect.bonuses.generalBonuses.luck) {
        effects.statBonuses.luck += effect.bonuses.generalBonuses.luck;
      }
      if (effect.bonuses.generalBonuses.knowledge) {
        effects.statBonuses.knowledge +=
          effect.bonuses.generalBonuses.knowledge;
      }
    }
  });

  // Add relic effects directly to statBonuses
  if (state.relics.ravens_orb) effects.statBonuses.knowledge += 6;

  // Blessing effects
  if (state.blessings?.dagons_gift) {
    effects.resource_multiplier.hunt =
      (effects.resource_multiplier.hunt || 1) * 2; // +100% hunting resources
  }
  if (state.blessings?.flames_touch) {
    effects.resource_bonus.steel = (effects.resource_bonus.steel || 0) + 1; // +1 steel from forging
  }
  if (state.blessings?.ravens_mark) {
    effects.probability_bonus.newVillager =
      (effects.probability_bonus.newVillager || 0) + 0.2; // +20% new villager chance
  }
  if (state.blessings?.ashen_embrace) {
    effects.resource_multiplier.mine =
      (effects.resource_multiplier.mine || 1) * 2; // +100% mine resources
  }

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
