
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './state';
import { getPopulationProduction } from './population';

describe('Game Loop - Resource Limits Integration', () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
    // Enable resource limits
    useGameStore.setState({
      flags: {
        ...useGameStore.getState().flags,
        resourceLimitsEnabled: true,
      },
      buildings: {
        ...useGameStore.getState().buildings,
        storage: 1, // 1000 limit
      },
    });
  });

  describe('Production Tick with Limits', () => {
    it('should cap gatherer wood production during tick', () => {
      const store = useGameStore.getState();
      
      // Set up near limit
      store.updateResource('wood', 950 - store.resources.wood);
      
      // Assign gatherers
      useGameStore.setState({
        villagers: {
          ...store.villagers,
          gatherer: 10, // Would produce 100 wood
        },
      });
      
      // Simulate production
      const production = getPopulationProduction('gatherer', 10, useGameStore.getState());
      const woodProd = production.find(p => p.resource === 'wood');
      
      if (woodProd) {
        store.updateResource('wood', woodProd.totalAmount);
        // Should be capped at 1000
        expect(useGameStore.getState().resources.wood).toBe(1000);
      }
    });

    it('should cap hunter food production during tick', () => {
      const store = useGameStore.getState();
      
      store.updateResource('food', 985 - store.resources.food);
      
      useGameStore.setState({
        villagers: {
          ...store.villagers,
          hunter: 5, // Would produce 25 food
        },
        buildings: {
          ...store.buildings,
          cabin: 1,
        },
      });
      
      const production = getPopulationProduction('hunter', 5, useGameStore.getState());
      const foodProd = production.find(p => p.resource === 'food');
      
      if (foodProd) {
        store.updateResource('food', foodProd.totalAmount);
        expect(useGameStore.getState().resources.food).toBe(1000);
      }
    });

    it('should handle multiple villager types producing simultaneously', () => {
      const store = useGameStore.getState();
      
      // Set up multiple villager types
      useGameStore.setState({
        resources: {
          ...store.resources,
          wood: 950,
          food: 980,
          iron: 990,
        },
        villagers: {
          ...store.villagers,
          gatherer: 5,
          hunter: 2,
          iron_miner: 1,
        },
        buildings: {
          ...store.buildings,
          cabin: 1,
          shallowPit: 1,
        },
      });
      
      const currentState = useGameStore.getState();
      
      // Gatherer production
      const gatherProd = getPopulationProduction('gatherer', 5, currentState);
      const woodProd = gatherProd.find(p => p.resource === 'wood');
      if (woodProd) {
        store.updateResource('wood', woodProd.totalAmount);
      }
      
      // Hunter production
      const huntProd = getPopulationProduction('hunter', 2, currentState);
      const foodProd = huntProd.find(p => p.resource === 'food');
      if (foodProd) {
        store.updateResource('food', foodProd.totalAmount);
      }
      
      // Iron miner production
      const minerProd = getPopulationProduction('iron_miner', 1, currentState);
      const ironProd = minerProd.find(p => p.resource === 'iron');
      if (ironProd) {
        store.updateResource('iron', ironProd.totalAmount);
      }
      
      const finalState = useGameStore.getState();
      
      // All should be at or below limit
      expect(finalState.resources.wood).toBeLessThanOrEqual(1000);
      expect(finalState.resources.food).toBeLessThanOrEqual(1000);
      expect(finalState.resources.iron).toBeLessThanOrEqual(1000);
    });
  });

  describe('Action Execution with Limits', () => {
    it('should cap chopWood action results', () => {
      const store = useGameStore.getState();
      
      useGameStore.setState({
        resources: {
          ...store.resources,
          wood: 995,
        },
        story: {
          ...store.story,
          seen: {
            ...store.story.seen,
            hasWood: true,
          },
        },
      });
      
      // Execute chopWood action multiple times
      for (let i = 0; i < 3; i++) {
        store.executeAction('chopWood');
      }
      
      // Should not exceed 1000
      expect(useGameStore.getState().resources.wood).toBeLessThanOrEqual(1000);
    });

    it('should cap exploreCave stone rewards', () => {
      const store = useGameStore.getState();
      
      useGameStore.setState({
        resources: {
          ...store.resources,
          stone: 990,
          torch: 10,
        },
        story: {
          ...store.story,
          seen: {
            ...store.story.seen,
            hasWood: true,
          },
        },
      });
      
      // Execute multiple times
      for (let i = 0; i < 5; i++) {
        if (useGameStore.getState().resources.torch > 0) {
          store.executeAction('exploreCave');
        }
      }
      
      expect(useGameStore.getState().resources.stone).toBeLessThanOrEqual(1000);
    });
  });

  describe('Storage Upgrade Effects', () => {
    it('should increase limit when storage is upgraded', () => {
      const store = useGameStore.getState();
      
      // Start at limit
      useGameStore.setState({
        resources: {
          ...store.resources,
          wood: 1000,
        },
        buildings: {
          ...store.buildings,
          storage: 1, // 1000 limit
        },
      });
      
      expect(useGameStore.getState().resources.wood).toBe(1000);
      
      // Upgrade storage
      useGameStore.setState({
        buildings: {
          ...useGameStore.getState().buildings,
          storage: 2, // 5000 limit
        },
      });
      
      // Now production can go higher
      store.updateResource('wood', 2000);
      expect(useGameStore.getState().resources.wood).toBe(3000);
      
      // But not above new limit
      store.updateResource('wood', 5000);
      expect(useGameStore.getState().resources.wood).toBe(5000);
    });

    it('should handle all storage tiers correctly', () => {
      const store = useGameStore.getState();
      const tiers = [
        { level: 0, limit: 500 },
        { level: 1, limit: 1000 },
        { level: 2, limit: 5000 },
        { level: 3, limit: 10000 },
        { level: 4, limit: 25000 },
        { level: 5, limit: 50000 },
        { level: 6, limit: 100000 },
      ];
      
      tiers.forEach(({ level, limit }) => {
        useGameStore.setState({
          resources: {
            ...store.resources,
            wood: 0,
          },
          buildings: {
            ...store.buildings,
            storage: level,
          },
        });
        
        // Try to set above limit
        store.updateResource('wood', limit + 1000);
        
        // Should be capped at limit
        expect(useGameStore.getState().resources.wood).toBe(limit);
      });
    });
  });

  describe('Feast and Boost Effects with Limits', () => {
    it('should cap boosted production from feast', () => {
      const store = useGameStore.getState();
      
      useGameStore.setState({
        resources: {
          ...store.resources,
          wood: 900,
        },
        villagers: {
          ...store.villagers,
          gatherer: 5,
        },
        feastState: {
          isActive: true,
          endTime: Date.now() + 60000,
          lastAcceptedLevel: 0,
        },
      });
      
      // Feast doubles production (5 gatherers * 10 wood * 2 = 100 wood)
      const production = getPopulationProduction('gatherer', 5, useGameStore.getState());
      const woodProd = production.find(p => p.resource === 'wood');
      
      if (woodProd) {
        store.updateResource('wood', woodProd.totalAmount);
        // Should still be capped at 1000
        expect(useGameStore.getState().resources.wood).toBe(1000);
      }
    });

    it('should cap great feast 4x production', () => {
      const store = useGameStore.getState();
      
      useGameStore.setState({
        resources: {
          ...store.resources,
          food: 800,
        },
        villagers: {
          ...store.villagers,
          hunter: 5,
        },
        buildings: {
          ...store.buildings,
          cabin: 1,
        },
        greatFeastState: {
          isActive: true,
          endTime: Date.now() + 60000,
        },
      });
      
      // Great feast 4x production (5 hunters * 5 food * 4 = 100 food)
      const production = getPopulationProduction('hunter', 5, useGameStore.getState());
      const foodProd = production.find(p => p.resource === 'food');
      
      if (foodProd) {
        store.updateResource('food', foodProd.totalAmount);
        expect(useGameStore.getState().resources.food).toBe(1000);
      }
    });
  });

  describe('Silver and Gold Exceptions', () => {
    it('should not cap silver accumulation', () => {
      const store = useGameStore.getState();
      
      useGameStore.setState({
        resources: {
          ...store.resources,
          silver: 10000,
        },
      });
      
      store.updateResource('silver', 50000);
      expect(useGameStore.getState().resources.silver).toBe(60000);
    });

    it('should not cap gold accumulation', () => {
      const store = useGameStore.getState();
      
      useGameStore.setState({
        resources: {
          ...store.resources,
          gold: 10000,
        },
      });
      
      store.updateResource('gold', 50000);
      expect(useGameStore.getState().resources.gold).toBe(60000);
    });
  });

  describe('Feature Flag Persistence', () => {
    it('should maintain unlimited resources for games without flag', () => {
      const store = useGameStore.getState();
      
      useGameStore.setState({
        flags: {
          ...store.flags,
          resourceLimitsEnabled: false,
        },
        resources: {
          ...store.resources,
          wood: 50000,
        },
      });
      
      store.updateResource('wood', 50000);
      expect(useGameStore.getState().resources.wood).toBe(100000);
    });

    it('should enforce limits for games with flag enabled', () => {
      const store = useGameStore.getState();
      
      useGameStore.setState({
        flags: {
          ...store.flags,
          resourceLimitsEnabled: true,
        },
        resources: {
          ...store.resources,
          wood: 0,
        },
        buildings: {
          ...store.buildings,
          storage: 1,
        },
      });
      
      store.updateResource('wood', 50000);
      expect(useGameStore.getState().resources.wood).toBe(1000);
    });
  });
});
