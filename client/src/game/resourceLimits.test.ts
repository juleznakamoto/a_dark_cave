
import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '@shared/schema';
import { 
  getResourceLimit, 
  isResourceLimited, 
  capResourceToLimit,
  getStorageLimitText,
  getStorageBuildingName 
} from './resourceLimits';
import { createInitialState } from './state';

describe('Resource Limits - Core Functionality', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
    // Enable resource limits for testing
    state.flags.resourceLimitsEnabled = true;
  });

  describe('getResourceLimit', () => {
    it('should return 500 for initial cap (no storage building)', () => {
      state.buildings.storage = 0;
      expect(getResourceLimit(state)).toBe(500);
    });

    it('should return 1000 for Supply Hut (level 1)', () => {
      state.buildings.storage = 1;
      expect(getResourceLimit(state)).toBe(1000);
    });

    it('should return 5000 for Storehouse (level 2)', () => {
      state.buildings.storage = 2;
      expect(getResourceLimit(state)).toBe(5000);
    });

    it('should return 10000 for Fortified Storehouse (level 3)', () => {
      state.buildings.storage = 3;
      expect(getResourceLimit(state)).toBe(10000);
    });

    it('should return 25000 for Village Warehouse (level 4)', () => {
      state.buildings.storage = 4;
      expect(getResourceLimit(state)).toBe(25000);
    });

    it('should return 50000 for Grand Repository (level 5)', () => {
      state.buildings.storage = 5;
      expect(getResourceLimit(state)).toBe(50000);
    });

    it('should return 100000 for City Vault (level 6)', () => {
      state.buildings.storage = 6;
      expect(getResourceLimit(state)).toBe(100000);
    });

    it('should return Infinity when feature flag is disabled', () => {
      state.flags.resourceLimitsEnabled = false;
      state.buildings.storage = 3;
      expect(getResourceLimit(state)).toBe(Infinity);
    });

    it('should return 500 for undefined storage level', () => {
      state.buildings.storage = undefined as any;
      expect(getResourceLimit(state)).toBe(500);
    });
  });

  describe('isResourceLimited', () => {
    it('should return true for wood', () => {
      expect(isResourceLimited('wood', state)).toBe(true);
    });

    it('should return true for stone', () => {
      expect(isResourceLimited('stone', state)).toBe(true);
    });

    it('should return true for food', () => {
      expect(isResourceLimited('food', state)).toBe(true);
    });

    it('should return false for silver', () => {
      expect(isResourceLimited('silver', state)).toBe(false);
    });

    it('should return false for gold', () => {
      expect(isResourceLimited('gold', state)).toBe(false);
    });

    it('should return false when feature flag is disabled', () => {
      state.flags.resourceLimitsEnabled = false;
      expect(isResourceLimited('wood', state)).toBe(false);
      expect(isResourceLimited('stone', state)).toBe(false);
    });
  });

  describe('capResourceToLimit', () => {
    it('should cap wood at limit', () => {
      state.buildings.storage = 1; // limit = 1000
      expect(capResourceToLimit('wood', 1500, state)).toBe(1000);
    });

    it('should not cap below limit', () => {
      state.buildings.storage = 1; // limit = 1000
      expect(capResourceToLimit('wood', 500, state)).toBe(500);
    });

    it('should not cap unlimited resources', () => {
      state.buildings.storage = 1; // limit = 1000
      expect(capResourceToLimit('silver', 50000, state)).toBe(50000);
      expect(capResourceToLimit('gold', 50000, state)).toBe(50000);
    });

    it('should not cap when feature flag is disabled', () => {
      state.flags.resourceLimitsEnabled = false;
      state.buildings.storage = 1;
      expect(capResourceToLimit('wood', 50000, state)).toBe(50000);
    });

    it('should handle edge case of exact limit', () => {
      state.buildings.storage = 1; // limit = 1000
      expect(capResourceToLimit('wood', 1000, state)).toBe(1000);
    });
  });

  describe('getStorageLimitText', () => {
    it('should return "500" for initial cap', () => {
      state.buildings.storage = 0;
      expect(getStorageLimitText(state)).toBe('500');
    });

    it('should return formatted number for storage level 3', () => {
      state.buildings.storage = 3;
      expect(getStorageLimitText(state)).toBe('10,000');
    });

    it('should return "Unlimited" when feature flag is disabled', () => {
      state.flags.resourceLimitsEnabled = false;
      expect(getStorageLimitText(state)).toBe('Unlimited');
    });
  });

  describe('getStorageBuildingName', () => {
    it('should return correct name for level 0', () => {
      expect(getStorageBuildingName(0)).toBe('No Storage');
    });

    it('should return correct name for level 1', () => {
      expect(getStorageBuildingName(1)).toBe('Supply Hut');
    });

    it('should return correct name for level 6', () => {
      expect(getStorageBuildingName(6)).toBe('City Vault');
    });

    it('should return "Unknown" for invalid level', () => {
      expect(getStorageBuildingName(99)).toBe('Unknown');
    });
  });
});

describe('Resource Limits - Integration with Game Components', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
    state.flags.resourceLimitsEnabled = true;
    state.buildings.storage = 1; // limit = 1000
  });

  describe('Villager Production Integration', () => {
    it('should cap gatherer wood production at limit', async () => {
      const { getPopulationProduction } = await import('./population');
      const { updateResource } = await import('./stateHelpers');
      
      // Start near limit
      state.resources.wood = 950;
      state.villagers.gatherer = 10; // Would produce 100 wood normally
      
      const production = getPopulationProduction('gatherer', 10, state);
      const woodProd = production.find(p => p.resource === 'wood');
      
      if (woodProd) {
        const updates = updateResource(state, 'wood', woodProd.totalAmount);
        // Should be capped at 1000
        expect(updates.resources?.wood).toBe(1000);
      }
    });

    it('should cap hunter food production at limit', async () => {
      const { getPopulationProduction } = await import('./population');
      const { updateResource } = await import('./stateHelpers');
      
      state.resources.food = 990;
      state.villagers.hunter = 5; // Would produce 25 food
      state.buildings.cabin = 1;
      
      const production = getPopulationProduction('hunter', 5, state);
      const foodProd = production.find(p => p.resource === 'food');
      
      if (foodProd) {
        const updates = updateResource(state, 'food', foodProd.totalAmount);
        expect(updates.resources?.food).toBe(1000);
      }
    });

    it('should cap miner iron production at limit', async () => {
      const { getPopulationProduction } = await import('./population');
      const { updateResource } = await import('./stateHelpers');
      
      state.resources.iron = 980;
      state.villagers.iron_miner = 10; // Would produce 50 iron
      state.buildings.shallowPit = 1;
      
      const production = getPopulationProduction('iron_miner', 10, state);
      const ironProd = production.find(p => p.resource === 'iron');
      
      if (ironProd) {
        const updates = updateResource(state, 'iron', ironProd.totalAmount);
        expect(updates.resources?.iron).toBe(1000);
      }
    });

    it('should not cap negative production (consumption)', async () => {
      const { updateResource } = await import('./stateHelpers');
      
      state.resources.food = 500;
      
      // Miners consume food
      const updates = updateResource(state, 'food', -50);
      expect(updates.resources?.food).toBe(450);
    });

    it('should allow production below limit', async () => {
      const { getPopulationProduction } = await import('./population');
      const { updateResource } = await import('./stateHelpers');
      
      state.resources.wood = 100;
      state.villagers.gatherer = 2; // Would produce 20 wood
      
      const production = getPopulationProduction('gatherer', 2, state);
      const woodProd = production.find(p => p.resource === 'wood');
      
      if (woodProd) {
        const updates = updateResource(state, 'wood', woodProd.totalAmount);
        expect(updates.resources?.wood).toBe(120);
      }
    });
  });

  describe('Action Rewards Integration', () => {
    it('should cap chopWood action reward', async () => {
      const { applyActionEffects } = await import('./rules/actionEffects');
      const { updateResource } = await import('./stateHelpers');
      
      state.resources.wood = 990;
      state.story.seen.hasWood = true;
      
      const effects = applyActionEffects('chopWood', state);
      
      if (effects.resources?.wood) {
        const finalWood = state.resources.wood + (effects.resources.wood - state.resources.wood);
        const updates = updateResource(state, 'wood', effects.resources.wood - state.resources.wood);
        expect(updates.resources?.wood).toBeLessThanOrEqual(1000);
      }
    });

    it('should cap exploreCave stone rewards', async () => {
      const { applyActionEffects } = await import('./rules/actionEffects');
      
      state.resources.stone = 995;
      state.story.seen.hasWood = true;
      state.resources.torch = 10;
      
      const effects = applyActionEffects('exploreCave', state);
      
      // Stone rewards should be capped
      if (effects.resources?.stone !== undefined) {
        expect(effects.resources.stone).toBeLessThanOrEqual(1000);
      }
    });

    it('should cap hunt food rewards', async () => {
      const { applyActionEffects } = await import('./rules/actionEffects');
      
      state.resources.food = 985;
      state.flags.forestUnlocked = true;
      state.story.seen.hasHunted = true;
      
      const effects = applyActionEffects('hunt', state);
      
      if (effects.resources?.food !== undefined) {
        expect(effects.resources.food).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('Event Rewards Integration', () => {
    it('should cap event wood rewards', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.wood = 950;
      
      // Simulate event giving 100 wood
      const updates = updateResource(state, 'wood', 100);
      expect(updates.resources?.wood).toBe(1000);
    });

    it('should cap stranger arrival food bonus', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.food = 980;
      
      // Simulate event giving 50 food
      const updates = updateResource(state, 'food', 50);
      expect(updates.resources?.food).toBe(1000);
    });

    it('should not cap silver rewards from events', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.silver = 5000;
      
      // Silver is unlimited
      const updates = updateResource(state, 'silver', 5000);
      expect(updates.resources?.silver).toBe(10000);
    });

    it('should not cap gold rewards from events', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.gold = 5000;
      
      // Gold is unlimited
      const updates = updateResource(state, 'gold', 5000);
      expect(updates.resources?.gold).toBe(10000);
    });
  });

  describe('Multiple Resource Limits', () => {
    it('should cap multiple resources independently', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.wood = 950;
      state.resources.stone = 980;
      state.resources.food = 990;
      
      let updates = updateResource(state, 'wood', 100);
      expect(updates.resources?.wood).toBe(1000);
      
      updates = updateResource({ ...state, resources: updates.resources! }, 'stone', 50);
      expect(updates.resources?.stone).toBe(1000);
      
      updates = updateResource({ ...state, resources: updates.resources! }, 'food', 20);
      expect(updates.resources?.food).toBe(1000);
    });

    it('should handle simultaneous production from multiple villager types', async () => {
      const { getPopulationProduction } = await import('./population');
      const { updateResource } = await import('./stateHelpers');
      
      state.resources.wood = 950;
      state.resources.food = 980;
      state.villagers.gatherer = 5;
      state.villagers.hunter = 2;
      state.buildings.cabin = 1;
      
      // Gatherer production
      const gatherProd = getPopulationProduction('gatherer', 5, state);
      const woodProd = gatherProd.find(p => p.resource === 'wood');
      
      if (woodProd) {
        const woodUpdates = updateResource(state, 'wood', woodProd.totalAmount);
        expect(woodUpdates.resources?.wood).toBe(1000);
      }
      
      // Hunter production
      const huntProd = getPopulationProduction('hunter', 2, state);
      const foodProd = huntProd.find(p => p.resource === 'food');
      
      if (foodProd) {
        const foodUpdates = updateResource(state, 'food', foodProd.totalAmount);
        expect(foodUpdates.resources?.food).toBe(1000);
      }
    });
  });

  describe('Storage Building Upgrades', () => {
    it('should increase limit when upgrading storage', () => {
      state.buildings.storage = 1; // 1000 limit
      expect(getResourceLimit(state)).toBe(1000);
      
      state.buildings.storage = 2; // 5000 limit
      expect(getResourceLimit(state)).toBe(5000);
      
      // Resources above old limit but below new limit should be allowed
      const { updateResource } = require('./stateHelpers');
      state.resources.wood = 3000;
      const updates = updateResource(state, 'wood', 1000);
      expect(updates.resources?.wood).toBe(4000);
    });

    it('should cap at new limit after upgrade', () => {
      state.buildings.storage = 3; // 10000 limit
      const { updateResource } = require('./stateHelpers');
      
      state.resources.stone = 9500;
      const updates = updateResource(state, 'stone', 1000);
      expect(updates.resources?.stone).toBe(10000);
    });

    it('should allow accumulation up to each storage tier', () => {
      const limits = [500, 1000, 5000, 10000, 25000, 50000, 100000];
      
      limits.forEach((expectedLimit, level) => {
        state.buildings.storage = level;
        expect(getResourceLimit(state)).toBe(expectedLimit);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle exact limit value', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.wood = 1000;
      const updates = updateResource(state, 'wood', 0);
      expect(updates.resources?.wood).toBe(1000);
    });

    it('should handle zero resources', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.wood = 0;
      const updates = updateResource(state, 'wood', 100);
      expect(updates.resources?.wood).toBe(100);
    });

    it('should handle negative resource values (consumption)', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.food = 500;
      const updates = updateResource(state, 'food', -100);
      expect(updates.resources?.food).toBe(400);
    });

    it('should not allow negative resources after consumption', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.food = 50;
      const updates = updateResource(state, 'food', -100);
      // Should be clamped to 0, not negative
      expect(updates.resources?.food).toBe(0);
    });

    it('should handle very large production amounts', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.wood = 0;
      state.buildings.storage = 6; // 100000 limit
      
      const updates = updateResource(state, 'wood', 150000);
      expect(updates.resources?.wood).toBe(100000);
    });
  });

  describe('Feature Flag Behavior', () => {
    it('should respect feature flag for new games', () => {
      const newState = createInitialState();
      newState.flags.resourceLimitsEnabled = true;
      newState.buildings.storage = 0;
      
      expect(getResourceLimit(newState)).toBe(500);
      expect(isResourceLimited('wood', newState)).toBe(true);
    });

    it('should disable limits for old games without flag', () => {
      const oldState = createInitialState();
      oldState.flags.resourceLimitsEnabled = false;
      
      expect(getResourceLimit(oldState)).toBe(Infinity);
      expect(isResourceLimited('wood', oldState)).toBe(false);
    });

    it('should allow unlimited accumulation when flag is off', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.flags.resourceLimitsEnabled = false;
      state.resources.wood = 50000;
      
      const updates = updateResource(state, 'wood', 50000);
      expect(updates.resources?.wood).toBe(100000);
    });
  });

  describe('Idle Mode Integration', () => {
    it('should cap idle mode resource accumulation', async () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.wood = 800;
      state.buildings.storage = 1; // 1000 limit
      
      // Simulate idle mode giving 500 wood
      const updates = updateResource(state, 'wood', 500);
      expect(updates.resources?.wood).toBe(1000);
    });

    it('should cap each resource type separately in idle mode', async () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.wood = 900;
      state.resources.stone = 950;
      state.resources.food = 980;
      state.buildings.storage = 1; // 1000 limit
      
      let currentState = { ...state };
      
      // Wood
      let updates = updateResource(currentState, 'wood', 200);
      expect(updates.resources?.wood).toBe(1000);
      currentState = { ...currentState, resources: { ...currentState.resources, ...updates.resources } };
      
      // Stone
      updates = updateResource(currentState, 'stone', 100);
      expect(updates.resources?.stone).toBe(1000);
      currentState = { ...currentState, resources: { ...currentState.resources, ...updates.resources } };
      
      // Food
      updates = updateResource(currentState, 'food', 50);
      expect(updates.resources?.food).toBe(1000);
    });
  });

  describe('Crafting and Building Costs', () => {
    it('should allow crafting when resources are at cap', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.wood = 1000;
      
      // Crafting consumes resources
      const updates = updateResource(state, 'wood', -100);
      expect(updates.resources?.wood).toBe(900);
    });

    it('should allow building when resources are at cap', () => {
      const { updateResource } = require('./stateHelpers');
      
      state.resources.stone = 1000;
      
      // Building consumes resources
      const updates = updateResource(state, 'stone', -200);
      expect(updates.resources?.stone).toBe(800);
    });
  });
});
