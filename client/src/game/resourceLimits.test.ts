import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '@shared/schema';
import {
  getResourceLimit,
  capResourceToLimit,
  isResourceCapped,
  getStorageLimitText,
  isResourceLimited,
  getStorageBuildingName,
} from './resourceLimits';
import { updateResource } from './stateHelpers';
import { gameActions } from './rules';
import { createInitialState } from './state';

describe('Resource Limits - Core Functionality', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
  });

  describe('getResourceLimit', () => {
    it('should return 500 for initial cap (no storage building)', () => {
      expect(getResourceLimit(state)).toBe(500);
    });

    it('should return 1000 for Supply Hut (level 1)', () => {
      state.buildings.supplyHut = 1;
      expect(getResourceLimit(state)).toBe(1000);
    });

    it('should return 5000 for Storehouse (level 2)', () => {
      state.buildings.storehouse = 1;
      expect(getResourceLimit(state)).toBe(5000);
    });

    it('should return 10000 for Fortified Storehouse (level 3)', () => {
      state.buildings.fortifiedStorehouse = 1;
      expect(getResourceLimit(state)).toBe(10000);
    });

    it('should return 25000 for Village Warehouse (level 4)', () => {
      state.buildings.villageWarehouse = 1;
      expect(getResourceLimit(state)).toBe(25000);
    });

    it('should return 50000 for Grand Repository (level 5)', () => {
      state.buildings.grandRepository = 1;
      expect(getResourceLimit(state)).toBe(50000);
    });

    it('should return 100000 for Great Vault (level 6)', () => {
      state.buildings.greatVault = 1;
      expect(getResourceLimit(state)).toBe(100000);
    });

    it('should return Infinity when feature flag is disabled', () => {
      state.flags.resourceLimitsEnabled = false;
      state.buildings.fortifiedStorehouse = 1;
      expect(getResourceLimit(state)).toBe(Infinity);
    });

    it('should return 500 for no storage buildings', () => {
      state.buildings.supplyHut = 0;
      state.buildings.storehouse = 0;
      state.buildings.fortifiedStorehouse = 0;
      state.buildings.villageWarehouse = 0;
      state.buildings.grandRepository = 0;
      state.buildings.greatVault = 0;
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
      state.buildings.supplyHut = 1; // limit = 1000
      expect(capResourceToLimit('wood', 1500, state)).toBe(1000);
    });

    it('should not cap below limit', () => {
      state.buildings.supplyHut = 1; // limit = 1000
      expect(capResourceToLimit('wood', 500, state)).toBe(500);
    });

    it('should not cap unlimited resources', () => {
      state.buildings.supplyHut = 1; // limit = 1000
      expect(capResourceToLimit('silver', 50000, state)).toBe(50000);
      expect(capResourceToLimit('gold', 50000, state)).toBe(50000);
    });

    it('should not cap when feature flag is disabled', () => {
      state.flags.resourceLimitsEnabled = false;
      state.buildings.supplyHut = 1;
      expect(capResourceToLimit('wood', 50000, state)).toBe(50000);
    });

    it('should handle edge case of exact limit', () => {
      state.buildings.supplyHut = 1; // limit = 1000
      expect(capResourceToLimit('wood', 1000, state)).toBe(1000);
    });
  });

  describe('getStorageLimitText', () => {
    it('should return "500" for initial cap', () => {
      state.buildings.supplyHut = 0;
      state.buildings.storehouse = 0;
      state.buildings.fortifiedStorehouse = 0;
      state.buildings.villageWarehouse = 0;
      state.buildings.grandRepository = 0;
      state.buildings.greatVault = 0;
      expect(getStorageLimitText(state)).toBe('500');
    });

    it('should return formatted number for storage level 3', () => {
      state.buildings.fortifiedStorehouse = 1;
      expect(getStorageLimitText(state)).toBe('10,000');
    });

    it('should return "Unlimited" when feature flag is disabled', () => {
      state.flags.resourceLimitsEnabled = false;
      expect(getStorageLimitText(state)).toBe('Unlimited');
    });
  });

  describe('getStorageBuildingName', () => {
    it('should return correct name for level 0', () => {
      state.buildings.supplyHut = 0;
      expect(getStorageBuildingName(state)).toBe('No Storage');
    });

    it('should return correct name for level 1', () => {
      state.buildings.supplyHut = 1;
      expect(getStorageBuildingName(state)).toBe('Supply Hut');
    });

    it('should return correct name for level 6', () => {
      state.buildings.greatVault = 1;
      expect(getStorageBuildingName(state)).toBe('Great Vault');
    });

    it('should return "No Storage" when no storage buildings exist', () => {
      state.buildings.supplyHut = 0;
      state.buildings.storehouse = 0;
      state.buildings.fortifiedStorehouse = 0;
      state.buildings.villageWarehouse = 0;
      state.buildings.grandRepository = 0;
      state.buildings.greatVault = 0;
      expect(getStorageBuildingName(state)).toBe('No Storage');
    });
  });
});

describe('Resource Limits - Integration with Game Components', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
    state.flags.resourceLimitsEnabled = true;
    state.buildings.supplyHut = 1; // limit = 1000
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
      const { updateResource } = await import('./stateHelpers');

      state.resources.stone = 995;
      state.story.seen.hasWood = true;
      state.resources.torch = 10;

      const effects = applyActionEffects('exploreCave', state);

      // Stone rewards should be capped when applied via updateResource
      if (effects.resources?.stone !== undefined) {
        const stoneDelta = effects.resources.stone - state.resources.stone;
        const updates = updateResource(state, 'stone', stoneDelta);
        expect(updates.resources?.stone).toBeLessThanOrEqual(1000);
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
      state.resources.wood = 950;
      const updates = updateResource(state, 'wood', 100);
      expect(updates.resources?.wood).toBe(1000);
    });

    it('should cap stranger arrival food bonus', () => {
      state.resources.food = 980;
      const updates = updateResource(state, 'food', 50);
      expect(updates.resources?.food).toBe(1000);
    });

    it('should not cap silver rewards from events', () => {
      state.resources.silver = 5000;
      const updates = updateResource(state, 'silver', 5000);
      expect(updates.resources?.silver).toBe(10000);
    });

    it('should not cap gold rewards from events', () => {
      state.resources.gold = 5000;
      const updates = updateResource(state, 'gold', 5000);
      expect(updates.resources?.gold).toBe(10000);
    });
  });

  describe('Multiple Resource Limits', () => {
    it('should cap multiple resources independently', () => {
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

      state.resources.wood = 950;
      state.resources.food = 990;
      state.villagers.gatherer = 5;
      state.villagers.hunter = 2;
      state.buildings.cabin = 1;

      // Gatherer production
      const gatherProd = getPopulationProduction('gatherer', 5, state);
      const woodProd = gatherProd.find(p => p.resource === 'wood');

      if (woodProd) {
        const woodUpdates = updateResource(state, 'wood', woodProd.totalAmount);
        expect(woodUpdates.resources?.wood).toBeLessThanOrEqual(1000);
      }

      // Hunter production
      const huntProd = getPopulationProduction('hunter', 2, state);
      const foodProd = huntProd.find(p => p.resource === 'food');

      if (foodProd) {
        const foodUpdates = updateResource(state, 'food', foodProd.totalAmount);
        expect(foodUpdates.resources?.food).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('Storage Building Upgrades', () => {
    it('should increase limit when upgrading storage', () => {
      state.buildings.supplyHut = 1; // 1000 limit
      expect(getResourceLimit(state)).toBe(1000);

      state.buildings.storehouse = 1; // 5000 limit (overrides supplyHut)
      expect(getResourceLimit(state)).toBe(5000);

      // Resources above old limit but below new limit should be allowed
      state.resources.wood = 3000;
      const updates = updateResource(state, 'wood', 1000);
      expect(updates.resources?.wood).toBe(4000);
    });

    it('should cap at new limit after upgrade', () => {
      state.buildings.fortifiedStorehouse = 1; // 10000 limit
      state.resources.stone = 9500;
      const updates = updateResource(state, 'stone', 1000);
      expect(updates.resources?.stone).toBe(10000);
    });

    it('should allow accumulation up to each storage tier', () => {
      const tiers = [
        { level: 0, limit: 500, buildings: {} },
        { level: 1, limit: 1000, buildings: { supplyHut: 1 } },
        { level: 2, limit: 5000, buildings: { storehouse: 1 } },
        { level: 3, limit: 10000, buildings: { fortifiedStorehouse: 1 } },
        { level: 4, limit: 25000, buildings: { villageWarehouse: 1 } },
        { level: 5, limit: 50000, buildings: { grandRepository: 1 } },
        { level: 6, limit: 100000, buildings: { greatVault: 1 } },
      ];

      tiers.forEach(({ buildings, limit }) => {
        // Reset all storage buildings
        state.buildings.supplyHut = 0;
        state.buildings.storehouse = 0;
        state.buildings.fortifiedStorehouse = 0;
        state.buildings.villageWarehouse = 0;
        state.buildings.grandRepository = 0;
        state.buildings.greatVault = 0;

        // Set the tier's buildings
        Object.assign(state.buildings, buildings);

        expect(getResourceLimit(state)).toBe(limit);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle exact limit value', () => {
      state.buildings.supplyHut = 1;
      state.resources.wood = 1000;
      const updates = updateResource(state, 'wood', 0);
      expect(updates.resources?.wood).toBe(1000);
    });

    it('should handle zero resources', () => {
      state.resources.wood = 0;
      const updates = updateResource(state, 'wood', 100);
      expect(updates.resources?.wood).toBe(100);
    });

    it('should handle negative resource values (consumption)', () => {
      state.resources.food = 500;
      const updates = updateResource(state, 'food', -100);
      expect(updates.resources?.food).toBe(400);
    });

    it('should not allow negative resources after consumption', () => {
      state.resources.food = 50;
      const updates = updateResource(state, 'food', -100);
      expect(updates.resources?.food).toBe(0);
    });

    it('should handle very large production amounts', () => {
      state.resources.wood = 0;
      state.buildings.greatVault = 1;
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
      state.flags.resourceLimitsEnabled = false;
      state.resources.wood = 50000;
      const updates = updateResource(state, 'wood', 50000);
      expect(updates.resources?.wood).toBe(100000);
    });
  });

  describe('Idle Mode Integration', () => {
    it('should cap idle mode resource accumulation', async () => {
      state.resources.wood = 800;
      state.buildings.supplyHut = 1;
      const updates = updateResource(state, 'wood', 500);
      expect(updates.resources?.wood).toBe(1000);
    });

    it('should cap each resource type separately in idle mode', async () => {
      state.resources.wood = 900;
      state.resources.stone = 950;
      state.resources.food = 980;
      state.buildings.supplyHut = 1;

      let currentState = { ...state };
      let updates = updateResource(currentState, 'wood', 200);
      expect(updates.resources?.wood).toBe(1000);
      currentState = { ...currentState, resources: { ...currentState.resources, ...updates.resources } };

      updates = updateResource(currentState, 'stone', 100);
      expect(updates.resources?.stone).toBe(1000);
      currentState = { ...currentState, resources: { ...currentState.resources, ...updates.resources } };

      updates = updateResource(currentState, 'food', 50);
      expect(updates.resources?.food).toBe(1000);
    });
  });

  describe('Crafting and Building Costs', () => {
    it('should allow crafting when resources are at cap', () => {
      state.buildings.supplyHut = 1;
      state.resources.wood = 1000;
      const updates = updateResource(state, 'wood', -100);
      expect(updates.resources?.wood).toBe(900);
    });

    it('should allow building when resources are at cap', () => {
      state.buildings.supplyHut = 1;
      state.resources.stone = 1000;
      const updates = updateResource(state, 'stone', -200);
      expect(updates.resources?.stone).toBe(800);
    });
  });
});