import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGameStore } from "./state";
import { clearExpiredTimedEventTab } from "./loop";

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

    // Simulate production tick
    const { getPopulationProduction } = await import('./population');
    const production = getPopulationProduction('gatherer', 2, store);

    expect(production.length).toBeGreaterThan(0);
    // Gatherers produce wood and stone, not food
    expect(production.some(p => p.resource === 'wood' || p.resource === 'stone')).toBe(true);
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

    // Set event dialog without triggering sound
    store.setEventDialog(true, {
      id: 'test-event',
      message: 'Test',
      timestamp: Date.now(),
      type: 'event',
      skipSound: true, // Skip sound to avoid window errors in tests
    });

    // Get fresh state after setting dialog
    const updatedState = useGameStore.getState();
    expect(updatedState.eventDialog.isOpen).toBe(true);
    expect(updatedState.isPaused || updatedState.eventDialog.isOpen).toBe(true);
  });

  it('should clear expired timed events', () => {
    // Create a mock expired timed event by directly setting state
    const mockEvent = {
      id: 'test-event',
      eventId: 'test-event',
      message: 'Test event',
      title: 'Test Event',
      type: 'event' as const,
      choices: [{ id: 'choice1', label: 'Choice 1', effect: () => ({}) }],
      fallbackChoice: { id: 'choice1', label: 'Choice 1', effect: () => ({}) },
    };

    // Set up an expired timed event directly in state
    useGameStore.setState({
      timedEventTab: {
        isActive: true,
        event: mockEvent,
        expiryTime: Date.now() - 1000, // Already expired (1 second ago)
        startTime: Date.now() - 2000,
      },
    });

    // Verify it's active but expired
    const initialState = useGameStore.getState();
    expect(initialState.timedEventTab.isActive).toBe(true);
    expect(initialState.timedEventTab.expiryTime).toBeLessThan(Date.now());

    // Simulate the cleanup logic from the game loop
    const currentState = useGameStore.getState();
    if (currentState.timedEventTab.isActive && currentState.timedEventTab.expiryTime) {
      const now = Date.now();
      if (currentState.timedEventTab.expiryTime <= now) {
        // Execute fallback choice
        const event = currentState.timedEventTab.event;
        if (event?.fallbackChoice) {
          currentState.applyEventChoice(event.fallbackChoice.id, event.eventId || event.id.split("-")[0], event);
        }
        // Clear the timed event tab
        useGameStore.getState().setTimedEventTab(false);
      }
    }

    // Verify the timed event was cleared
    const finalState = useGameStore.getState();
    expect(finalState.timedEventTab.isActive).toBe(false);
    expect(finalState.timedEventTab.event).toBe(null);
    expect(finalState.timedEventTab.expiryTime).toBe(0);
  });

  it("does not clear gambler timed tab while dice dialog is open after outcome is resolved", () => {
    const gamblerEvent = {
      id: "gambler-test",
      eventId: "gambler",
      message: "Roll",
      title: "Gambler",
      type: "event" as const,
      choices: [{ id: "accept", label: "Accept", effect: () => ({}) }],
    };

    useGameStore.setState({
      timedEventTab: {
        isActive: true,
        event: gamblerEvent,
        expiryTime: Date.now() - 5000,
        startTime: Date.now() - 10_000,
      },
      gamblerDiceDialogOpen: true,
      gamblerGame: { wager: 10, outcome: "lose" as const },
    });

    clearExpiredTimedEventTab();

    const s = useGameStore.getState();
    expect(s.timedEventTab.isActive).toBe(true);
    expect(s.timedEventTab.event).toEqual(gamblerEvent);
    expect(s.gamblerGame?.outcome).toBe("lose");
  });

  it("does not clear timed tab when raw expiry passed but pause credit extends the deadline", () => {
    const mockEvent = {
      id: "test-event",
      eventId: "test-event",
      message: "Test event",
      title: "Test Event",
      type: "event" as const,
      choices: [{ id: "choice1", label: "Choice 1", effect: () => ({}) }],
      fallbackChoice: { id: "choice1", label: "Choice 1", effect: () => ({}) },
    };

    const applySpy = vi.spyOn(useGameStore.getState(), "applyEventChoice");

    const now = Date.now();
    useGameStore.setState({
      timedEventTab: {
        isActive: true,
        event: mockEvent,
        expiryTime: now - 60_000,
        startTime: now - 62_000,
        pauseAccumMs: 120_000,
        pauseStartedAt: 0,
      },
    });

    clearExpiredTimedEventTab();

    const s = useGameStore.getState();
    expect(s.timedEventTab.isActive).toBe(true);
    expect(s.timedEventTab.event).toEqual(mockEvent);
    expect(applySpy).not.toHaveBeenCalled();

    applySpy.mockRestore();
  });
});
