
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './state';

describe('State - Resource Limits Integration', () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
    // Enable resource limits for all tests
    useGameStore.setState((state) => ({
      flags: {
        ...state.flags,
        resourceLimitsEnabled: true,
      },
      buildings: {
        ...state.buildings,
        storage: 1, // 1000 limit
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
      // Start with resources at 900
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          wood: 900,
          stone: 950,
        },
      }));
      
      // Simulate a state update that would exceed limits
      const store = useGameStore.getState();
      store.updateResource('wood', 200); // Would be 1100, should cap at 1000
      store.updateResource('stone', 100); // Would be 1050, should cap at 1000
      
      const finalState = useGameStore.getState();
      expect(finalState.resources.wood).toBe(1000);
      expect(finalState.resources.stone).toBe(1000);
    });

    it('should handle negative resource changes while respecting limits', () => {
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          wood: 500,
        },
      }));
      
      const store = useGameStore.getState();
      
      // Consume resources
      store.updateResource('wood', -100);
      expect(useGameStore.getState().resources.wood).toBe(400);
      
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
      
      // Start at limit with storage level 1
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          wood: 1000,
        },
        buildings: {
          ...state.buildings,
          storage: 1, // 1000 limit
        },
      }));
      
      // Upgrade storage
      useGameStore.setState((state) => ({
        buildings: {
          ...state.buildings,
          storage: 2, // 5000 limit
        },
      }));
      
      // Now can add more
      store.updateResource('wood', 2000);
      expect(useGameStore.getState().resources.wood).toBe(3000);
      
      // But still capped at new limit
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
        // Reset resources
        useGameStore.setState((state) => ({
          resources: {
            ...state.resources,
            iron: 0,
          },
          buildings: {
            ...state.buildings,
            storage: level,
          },
        }));
        
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
        resources: {
          ...state.resources,
          wood: 800,
        },
      }));
      
      // Rapid updates
      for (let i = 0; i < 10; i++) {
        store.updateResource('wood', 50);
      }
      
      // Should be capped at limit, not exceed it
      expect(useGameStore.getState().resources.wood).toBe(1000);
    });

    it('should handle mixed positive and negative updates', () => {
      const store = useGameStore.getState();
      
      useGameStore.setState((state) => ({
        resources: {
          ...state.resources,
          food: 500,
        },
      }));
      
      // Mixed updates
      store.updateResource('food', 300); // 800
      store.updateResource('food', -200); // 600
      store.updateResource('food', 500); // Should cap at 1000
      
      expect(useGameStore.getState().resources.food).toBe(1000);
    });
  });
});
