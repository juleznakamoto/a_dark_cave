import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './state';
import { gameActions } from './rules';

describe('State - Resource Limits Integration', () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
    useGameStore.setState((state) => ({
      buildings: {
        ...state.buildings,
        supplyHut: 1, // 1000 limit
      },
    }));
  });

  describe('executeAction with resource limits', () => {
    it('should cap chopWood results at storage limit', () => {
      const store = useGameStore.getState();

      // Set wood near limit
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          wood: 950,
        },
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            hasWood: true,
          },
        },
      }));

      // Execute action multiple times
      for (let i = 0; i < 10; i++) {
        store.executeAction('chopWood');
      }

      // Should never exceed limit
      const finalWood = useGameStore.getState().resources.wood;
      expect(finalWood).toBeLessThanOrEqual(1000);
      expect(finalWood).toBeGreaterThan(950); // But should have increased
    });

    it('should cap exploreCave stone rewards at storage limit', () => {
      const store = useGameStore.getState();

      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          stone: 980,
          torch: 20,
        },
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            hasWood: true,
          },
        },
      }));

      // Execute multiple times
      for (let i = 0; i < 10; i++) {
        if (useGameStore.getState().resources.torch > 0) {
          store.executeAction('exploreCave');
        }
      }

      const finalStone = useGameStore.getState().resources.stone;
      expect(finalStone).toBeLessThanOrEqual(1000);
    });

    it('should handle actions that produce multiple resources', () => {
      const store = useGameStore.getState();

      // Set multiple resources near limit
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          wood: 950,
          stone: 980,
          food: 990,
        },
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            hasWood: true,
          },
        },
        tools: {
          ...state.tools,
          pickaxe: true,
        },
      }));

      // Execute actions that produce different resources
      store.executeAction('chopWood');
      store.executeAction('gatherStone');

      const finalState = useGameStore.getState();
      expect(finalState.resources.wood).toBeLessThanOrEqual(1000);
      expect(finalState.resources.stone).toBeLessThanOrEqual(1000);
    });
  });

  describe('mergeStateUpdates resource capping', () => {
    it('should cap resources when merging state updates', () => {
      useGameStore.setState((state) => ({
        flags: {
          ...state.flags,
          resourceLimitsEnabled: true,
        },
        buildings: {
          ...state.buildings,
          supplyHut: 1, // 1000 limit
        },
        resources: {
          ...state.resources,
          wood: 900,
          stone: 950,
        },
      }));

      const finalState = useGameStore.getState();
      expect(finalState.resources.wood).toBe(900);
      expect(finalState.resources.stone).toBe(950);
    });

    it('should handle negative resource changes while respecting limits', () => {
      const store = useGameStore.getState();

      useGameStore.setState((state) => ({
        flags: {
          ...state.flags,
          resourceLimitsEnabled: true,
        },
        buildings: {
          ...state.buildings,
          supplyHut: 1, // 1000 limit
        },
        resources: {
          ...state.resources,
          wood: 1000,
        },
      }));

      // Consume resources
      store.updateResource('wood', -700);
      expect(useGameStore.getState().resources.wood).toBe(300);

      // Then add back up to limit
      store.updateResource('wood', 700);
      expect(useGameStore.getState().resources.wood).toBe(1000);
    });

    it('should not cap unlimited resources (silver, gold)', () => {
      const store = useGameStore.getState();

      // These should never be capped
      store.updateResource('silver', 50000);
      store.updateResource('gold', 50000);

      const finalState = useGameStore.getState();
      expect(finalState.resources.silver).toBe(50000);
      expect(finalState.resources.gold).toBe(50000);
    });
  });

  describe('Storage upgrade scenarios', () => {
    it('should allow accumulation above old limit after storage upgrade', () => {
      const store = useGameStore.getState();

      // Start at limit with supplyHut (1000 limit)
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          wood: 1000,
        },
        buildings: {
          ...state.buildings,
          supplyHut: 1,
          storehouse: 0,
        },
      }));

      // Upgrade to storehouse
      const storehouseLimit = 5000;
      useGameStore.setState((state) => ({
        buildings: {
          ...state.buildings,
          storehouse: 1,
        },
      }));

      // Set wood to a value below new limit
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          wood: 1000,
        },
      }));

      // Now can add more
      store.updateResource('wood', storehouseLimit - 1500);
      expect(useGameStore.getState().resources.wood).toBe(1000 + (storehouseLimit - 1500));

      // But still capped at new limit
      store.updateResource('wood', storehouseLimit);
      expect(useGameStore.getState().resources.wood).toBe(storehouseLimit);
    });

    it('should handle all storage tiers correctly', () => {
      const store = useGameStore.getState();
      const tiers = [
        { level: 0, limit: 500, building: null },
        { level: 1, limit: 1000, building: 'supplyHut' },
        { level: 2, limit: 5000, building: 'storehouse' },
        { level: 3, limit: 10000, building: 'fortifiedStorehouse' },
        { level: 4, limit: 25000, building: 'villageWarehouse' },
        { level: 5, limit: 50000, building: 'grandRepository' },
        { level: 6, limit: 100000, building: 'greatVault' },
      ];

      tiers.forEach(({ level, limit, building }) => {
        // Reset all storage buildings first
        useGameStore.setState((state) => ({
          resources: {
            ...state.resources,
            iron: 0,
          },
          buildings: {
            ...state.buildings,
            supplyHut: 0,
            storehouse: 0,
            fortifiedStorehouse: 0,
            villageWarehouse: 0,
            grandRepository: 0,
            greatVault: 0,
          },
        }));

        // Set the specific building for this tier
        if (building) {
          useGameStore.setState((state) => ({
            buildings: {
              ...state.buildings,
              [building]: 1,
            },
          }));
        }

        // Try to add more than limit
        store.updateResource('iron', limit + 5000);

        // Should be capped exactly at limit
        expect(useGameStore.getState().resources.iron).toBe(limit);
      });
    });
  });

  describe('Feature flag disabled scenarios', () => {
    it('should allow unlimited resources when flag is disabled', () => {
      const store = useGameStore.getState();

      useGameStore.setState((state) => ({
        flags: {
          ...state.flags,
          resourceLimitsEnabled: false,
        },
        resources: {
          ...state.resources,
          wood: 0,
        },
      }));

      // Should not be capped
      store.updateResource('wood', 150000);
      expect(useGameStore.getState().resources.wood).toBe(150000);
    });
  });

  describe('Concurrent resource updates', () => {
    it('should handle rapid consecutive updates correctly', () => {
      const store = useGameStore.getState();

      useGameStore.setState((state) => ({
        flags: {
          ...state.flags,
          resourceLimitsEnabled: true,
        },
        buildings: {
          ...state.buildings,
          supplyHut: 1, // 1000 limit
        },
        resources: {
          ...state.resources,
          wood: 900,
        },
      }));

      // Multiple rapid updates
      store.updateResource('wood', 50);
      store.updateResource('wood', 50);
      store.updateResource('wood', 50);

      // Should be capped at limit, not exceed it
      expect(useGameStore.getState().resources.wood).toBe(1000);
    });

    it('should handle mixed positive and negative updates', () => {
      const store = useGameStore.getState();

      useGameStore.setState((state) => ({
        flags: {
          ...state.flags,
          resourceLimitsEnabled: true,
        },
        buildings: {
          ...state.buildings,
          supplyHut: 1, // 1000 limit
        },
        resources: {
          ...state.resources,
          food: 800,
        },
      }));

      store.updateResource('food', -200); // Down to 600
      store.updateResource('food', 500); // Should cap at 1000

      expect(useGameStore.getState().resources.food).toBe(1000);
    });
  });
});