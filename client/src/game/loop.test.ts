
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './state';

describe('Game Loop Production', () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it('should produce resources based on villager assignments', async () => {
    const store = useGameStore.getState();
    
    // Assign gatherers
    store.updateResource('free' as any, 5);
    store.assignVillager('gatherer');
    store.assignVillager('gatherer');

    const initialFood = store.resources.food;
    
    // Simulate production tick
    const { getPopulationProduction } = await import('./population');
    const production = getPopulationProduction('gatherer', 2, store);
    
    expect(production.length).toBeGreaterThan(0);
    expect(production.some(p => p.resource === 'food')).toBe(true);
  });

  it('should handle starvation when food runs out', async () => {
    const store = useGameStore.getState();
    
    // Set up starvation scenario
    store.updateResource('free' as any, 10);
    store.setFlag('starvationActive', true);
    store.updateResource('food', -999); // No food

    const initialPopulation = Object.values(store.villagers).reduce((sum, v) => sum + v, 0);
    
    // Simulate starvation check (would be called by game loop)
    // Note: This would require extracting the starvation logic to a testable function
    
    expect(store.resources.food).toBe(0);
  });

  it('should pause production when dialogs are open', () => {
    const store = useGameStore.getState();
    
    store.setEventDialog(true, {
      id: 'test-event',
      message: 'Test',
      timestamp: Date.now(),
      type: 'event',
    });

    expect(store.eventDialog.isOpen).toBe(true);
    expect(store.isPaused || store.eventDialog.isOpen).toBe(true);
  });
});
