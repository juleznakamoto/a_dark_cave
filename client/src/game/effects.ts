
import { GameState } from '@shared/schema';

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
    actionBonuses?: Record<string, {
      cooldownReduction?: number; // Percentage reduction (0.1 = 10% reduction)
      resourceBonus?: Record<string, number>; // Fixed bonus to specific resources
      probabilityBonus?: Record<string, number>; // Bonus to probability effects
    }>;
    
    // General bonuses
    generalBonuses?: {
      gatheringSpeed?: number; // Multiplier for all gathering actions
      craftingSpeed?: number; // Multiplier for crafting actions
      explorationBonus?: number; // Bonus resources when exploring
    };
  };
}

// Tool effects
export const toolEffects: Record<string, EffectDefinition> = {
  stone_axe: {
    id: 'stone_axe',
    name: 'Stone Axe',
    description: 'Increases wood gathering efficiency',
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceBonus: { wood: 3 } // +3 wood per gather action
        }
      }
    }
  },
  
  stone_pickaxe: {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    description: 'Enables mining and improves stone gathering',
    bonuses: {
      actionBonuses: {
        exploreCave: {
          resourceBonus: { stone: 2 }, // +2 stone when exploring
          probabilityBonus: { coal: 0.1, iron: 0.05 } // Better chance to find minerals
        },
        mineIron: {
          cooldownReduction: 0.15, // 15% faster mining
          probabilityBonus: { coal: 0.1 } // 10% better chance for coal
        }
      }
    }
  },
  
  spear: {
    id: 'spear',
    name: 'Spear',
    description: 'Improves hunting efficiency',
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceBonus: { meat: 2, fur: 1 }, // Better hunting yields
          cooldownReduction: 0.2 // 20% faster hunting
        }
      }
    }
  }
};

// Clothing effects
export const clothingEffects: Record<string, EffectDefinition> = {
  tarnished_amulet: {
    id: 'tarnished_amulet',
    name: 'Tarnished Amulet',
    description: 'An ancient amulet that brings good fortune',
    bonuses: {
      generalBonuses: {
        explorationBonus: 1 // +1 to all exploration rewards
      },
      actionBonuses: {
        exploreCave: {
          probabilityBonus: { 
            bones: 0.05, // 5% better chance for bones
            iron: 0.03   // 3% better chance for iron
          }
        },
        mineIron: {
          probabilityBonus: {
            sulphur: 0.1 // 10% better chance for sulphur
          }
        }
      }
    }
  }
};

// Helper function to get all active effects for a given state
export const getActiveEffects = (state: GameState): EffectDefinition[] => {
  const activeEffects: EffectDefinition[] = [];
  
  // Check tools
  Object.entries(state.tools).forEach(([toolId, owned]) => {
    if (owned && toolEffects[toolId]) {
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
    cooldownReduction: 0
  };
  
  activeEffects.forEach(effect => {
    const actionBonus = effect.bonuses.actionBonuses?.[actionId];
    if (actionBonus) {
      // Combine resource bonuses
      if (actionBonus.resourceBonus) {
        Object.entries(actionBonus.resourceBonus).forEach(([resource, bonus]) => {
          bonuses.resourceBonus[resource] = (bonuses.resourceBonus[resource] || 0) + bonus;
        });
      }
      
      // Combine probability bonuses
      if (actionBonus.probabilityBonus) {
        Object.entries(actionBonus.probabilityBonus).forEach(([resource, bonus]) => {
          bonuses.probabilityBonus[resource] = (bonuses.probabilityBonus[resource] || 0) + bonus;
        });
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
  
  activeEffects.forEach(effect => {
    if (effect.bonuses.generalBonuses?.explorationBonus) {
      totalBonus += effect.bonuses.generalBonuses.explorationBonus;
    }
  });
  
  return totalBonus;
};
