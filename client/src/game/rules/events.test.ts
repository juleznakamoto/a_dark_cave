
import { describe, it, expect, beforeEach } from 'vitest';
import { EventManager } from './events';
import { GameState } from '@shared/schema';

describe('Event System', () => {
  let mockState: Partial<GameState>;

  beforeEach(() => {
    mockState = {
      resources: { wood: 100, food: 50, stone: 30 },
      buildings: { woodenHut: 2, stoneHut: 0 },
      flags: { villageUnlocked: true },
      villagers: { free: 5, gatherer: 2, hunter: 1 },
      events: {},
      log: [],
      story: { seen: {} }, // Add story.seen to prevent undefined errors
    };
  });

  it('should trigger events based on conditions', () => {
    const { newLogEntries, stateChanges } = EventManager.checkEvents(mockState as GameState);
    
    expect(newLogEntries).toBeDefined();
    expect(Array.isArray(newLogEntries)).toBe(true);
  });

  it('should not trigger events with unmet conditions', () => {
    mockState.buildings!.woodenHut = 0; // No huts
    
    const { newLogEntries } = EventManager.checkEvents(mockState as GameState);
    
    // Should not trigger events requiring huts
    const hutRequiredEvents = newLogEntries.filter(e => 
      e.id.includes('stranger') || e.id.includes('merchant')
    );
    expect(hutRequiredEvents.length).toBe(0);
  });

  it('should apply event choice effects correctly', () => {
    const testEvent = {
      id: 'test-event',
      message: 'A stranger offers you wood',
      timestamp: Date.now(),
      type: 'event' as const,
      choices: [
        {
          id: 'accept',
          label: 'Accept',
          effect: (state: GameState) => {
            const newWood = state.resources.wood + 50;
            return {
              resources: { ...state.resources, wood: newWood },
            };
          },
        },
      ],
    };

    const initialWood = mockState.resources!.wood;
    const changes = EventManager.applyEventChoice(
      mockState as GameState,
      'accept',
      'test-event',
      testEvent
    );

    expect(changes.resources?.wood).toBe(initialWood + 50);
  });
});
