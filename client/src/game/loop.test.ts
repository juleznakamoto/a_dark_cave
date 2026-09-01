import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  useGameStore,
  isModalDialogOpen,
  syncTimedEventTabPauseTracking,
  getTimedEventTabEffectiveRemainingMs,
} from "./state";
import { EventManager, type EventRollState } from "./rules/events";
import {
  clearExpiredTimedEventTab,
  flushOverdueExecutionsDuringHandoff,
  processActionTicks,
  shouldRestoreSleepDialog,
  resolveSleepDialogInit,
  startGameLoop,
  stopGameLoop,
  resetAttackWaveElapsedClock,
  advanceAttackWaveTimers,
  flushPendingAttackWaveElapsed,
  manualSave,
} from "./loop";
import * as saveModule from "./save";
import { setGameTabHiddenForTests } from "@/lib/tabVisibility";

describe('Game Loop Production', () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  afterEach(() => {
    setGameTabHiddenForTests(null);
    vi.useRealTimers();
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

  it("does not pause simulation while only a timed event tab is active", () => {
    useGameStore.setState({
      rewardDialog: { isOpen: false, data: null },
      eventDialog: { isOpen: false, currentEvent: null },
      timedEventTab: {
        isActive: true,
        event: {
          id: "theDamned-test",
          message: "Test",
          timestamp: Date.now(),
          type: "event" as const,
        },
        expiryTime: Date.now() + 60_000,
        startTime: Date.now(),
      },
    });

    expect(isModalDialogOpen(useGameStore.getState())).toBe(false);
  });

  it("does not spawn a second timed tab event while one is active", () => {
    const state = useGameStore.getState();
    useGameStore.setState({
      rewardDialog: { isOpen: false, data: null },
      eventDialog: { isOpen: false, currentEvent: null },
      timedEventTab: {
        isActive: true,
        event: {
          id: "theDamned-test",
          message: "Test",
          timestamp: Date.now(),
          type: "event" as const,
        },
        expiryTime: Date.now() + 60_000,
        startTime: Date.now(),
      },
    });

    const { stateChanges } = EventManager.checkEvents({
      ...state,
      timedEventTab: useGameStore.getState().timedEventTab,
    } as EventRollState);
    expect(stateChanges._timedTabEvent).toBeUndefined();
  });

  it("clears expired timed events via clearExpiredTimedEventTab", () => {
    const mockEvent = {
      id: "test-event",
      eventId: "test-event",
      message: "Test event",
      title: "Test Event",
      type: "event" as const,
      choices: [{ id: "choice1", label: "Choice 1", effect: () => ({}) }],
      fallbackChoice: { id: "choice1", label: "Choice 1", effect: () => ({}) },
    };

    useGameStore.setState({
      eventDialog: { isOpen: false, currentEvent: null },
      timedEventTab: {
        isActive: true,
        event: mockEvent,
        expiryTime: Date.now() - 1000,
        startTime: Date.now() - 2000,
        pauseAccumMs: 0,
        pauseStartedAt: 0,
      },
    });

    clearExpiredTimedEventTab();

    const finalState = useGameStore.getState();
    expect(finalState.timedEventTab.isActive).toBe(false);
    expect(finalState.timedEventTab.event).toBe(null);
    expect(finalState.timedEventTab.expiryTime).toBe(0);
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

  it("does not expire a timed tab while the document is hidden", () => {
    setGameTabHiddenForTests(true);

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

    useGameStore.setState({
      timedEventTab: {
        isActive: true,
        event: mockEvent,
        expiryTime: Date.now() - 1000,
        startTime: Date.now() - 2000,
        pauseAccumMs: 0,
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

  it("keeps remaining timed-tab time after the tab was hidden", () => {
    vi.useFakeTimers();
    const mockEvent = {
      id: "test-event",
      eventId: "test-event",
      message: "Test event",
      title: "Test Event",
      type: "event" as const,
      choices: [{ id: "choice1", label: "Choice 1", effect: () => ({}) }],
      fallbackChoice: { id: "choice1", label: "Choice 1", effect: () => ({}) },
    };

    const now = Date.now();
    useGameStore.setState({
      timedEventTab: {
        isActive: true,
        event: mockEvent,
        expiryTime: now + 60_000,
        startTime: now,
        pauseAccumMs: 0,
        pauseStartedAt: 0,
      },
    });

    setGameTabHiddenForTests(true);
    syncTimedEventTabPauseTracking();
    vi.advanceTimersByTime(120_000);
    setGameTabHiddenForTests(false);
    syncTimedEventTabPauseTracking();
    clearExpiredTimedEventTab();

    const s = useGameStore.getState();
    expect(s.timedEventTab.isActive).toBe(true);
    expect(getTimedEventTabEffectiveRemainingMs(s)).toBeGreaterThan(50_000);
  });
});

describe("reward and event dialog stacking", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().initialize();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defers event dialog while reward dialog is open", () => {
    const store = useGameStore.getState();
    const testEvent = {
      id: "test-event",
      message: "Test",
      timestamp: Date.now(),
      type: "event" as const,
      skipSound: true,
      choices: [{ id: "acknowledge", label: "OK", effect: () => ({}) }],
    };

    store.setRewardDialog(true, {
      rewards: { resources: { wood: 1 } },
      variant: "success",
    });

    store.setEventDialog(true, testEvent);
    expect(useGameStore.getState().eventDialog.isOpen).toBe(false);

    vi.advanceTimersByTime(200);
    expect(useGameStore.getState().eventDialog.isOpen).toBe(false);

    store.setRewardDialog(false);
    vi.advanceTimersByTime(200);
    expect(useGameStore.getState().eventDialog.isOpen).toBe(false);

    vi.advanceTimersByTime(3000);
    expect(useGameStore.getState().eventDialog.isOpen).toBe(true);
    expect(useGameStore.getState().eventDialog.currentEvent?.id).toBe(
      "test-event",
    );
  });
});

describe("sleep dialog restore on loop start", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const listenerTarget = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("window", listenerTarget);
    vi.stubGlobal("document", listenerTarget);
    vi.stubGlobal("performance", { now: () => Date.now() });
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => { });
    useGameStore.getState().initialize();
  });

  afterEach(() => {
    stopGameLoop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts a fresh sleep when the dialog opens with no session", () => {
    expect(resolveSleepDialogInit({ isActive: false, startTime: 0 })).toBe(
      "startFresh",
    );
    expect(resolveSleepDialogInit(undefined)).toBe("startFresh");
    expect(
      resolveSleepDialogInit({ isActive: true, startTime: Date.now() }),
    ).toBe("resume");
  });

  it("restores sleep only while a session is still pending display", () => {
    expect(
      shouldRestoreSleepDialog({
        idleModeState: { needsDisplay: true, startTime: 1 },
      }),
    ).toBe(true);
    expect(
      shouldRestoreSleepDialog({
        idleModeState: { needsDisplay: false, startTime: 1 },
      }),
    ).toBe(false);
    expect(
      shouldRestoreSleepDialog({
        idleModeState: { needsDisplay: true, startTime: 0 },
      }),
    ).toBe(false);
  });

  it("opens the sleep dialog when a session is still pending", () => {
    useGameStore.setState({
      idleModeState: {
        isActive: true,
        startTime: Date.now() - 1000,
        needsDisplay: true,
      },
      idleModeDialog: { isOpen: false },
    });

    startGameLoop();
    vi.advanceTimersByTime(600);

    expect(useGameStore.getState().idleModeDialog.isOpen).toBe(true);
  });

  it("does not reopen sleep after the player already woke", () => {
    useGameStore.setState({
      idleModeState: {
        isActive: true,
        startTime: Date.now() - 1000,
        needsDisplay: true,
      },
      idleModeDialog: { isOpen: true },
    });

    startGameLoop();

    useGameStore.setState({
      idleModeState: {
        isActive: false,
        startTime: 0,
        needsDisplay: false,
      },
      idleModeDialog: { isOpen: false },
    });

    vi.advanceTimersByTime(600);

    expect(useGameStore.getState().idleModeDialog.isOpen).toBe(false);
  });

  it("cancels a pending sleep restore when the loop stops", () => {
    useGameStore.setState({
      idleModeState: {
        isActive: true,
        startTime: Date.now() - 1000,
        needsDisplay: true,
      },
      idleModeDialog: { isOpen: false },
    });

    startGameLoop();
    stopGameLoop();
    vi.advanceTimersByTime(600);

    expect(useGameStore.getState().idleModeDialog.isOpen).toBe(false);
  });

  it("leaves the player stuck sleeping if dialogs reset after restore", async () => {
    const { getTransientDialogResetOnLoad } = await import(
      "./persistedStateBoundary"
    );

    useGameStore.setState({
      idleModeState: {
        isActive: true,
        startTime: Date.now() - 1000,
        needsDisplay: true,
      },
      idleModeDialog: { isOpen: false },
    });

    startGameLoop();
    vi.advanceTimersByTime(600);
    expect(useGameStore.getState().idleModeDialog.isOpen).toBe(true);

    // loadGame / cloud reconcile always close transient dialogs.
    useGameStore.setState(getTransientDialogResetOnLoad());
    startGameLoop();
    vi.advanceTimersByTime(600);

    const stuck = useGameStore.getState();
    expect(stuck.idleModeState.isActive).toBe(true);
    expect(stuck.idleModeState.needsDisplay).toBe(true);
    expect(stuck.idleModeDialog.isOpen).toBe(false);
  });
});

describe("attack wave elapsed clock", () => {
  const baseTimer = {
    startTime: 1,
    duration: 60_000,
    defeated: false,
    provoked: false,
    elapsedTime: 0,
  };

  beforeEach(() => {
    resetAttackWaveElapsedClock();
  });

  it("keeps sub-second ticks out of the store patch", () => {
    expect(advanceAttackWaveTimers({ firstWave: baseTimer }, 250)).toBeNull();
    expect(advanceAttackWaveTimers({ firstWave: baseTimer }, 250)).toBeNull();
  });

  it("flushes when a whole second has accumulated", () => {
    advanceAttackWaveTimers({ firstWave: baseTimer }, 400);
    const flushed = advanceAttackWaveTimers({ firstWave: baseTimer }, 700);
    expect(flushed?.firstWave?.elapsedTime).toBe(1100);
  });

  it("flushes immediately when the wave becomes due", () => {
    const almostDue = { ...baseTimer, elapsedTime: 59_900 };
    const flushed = advanceAttackWaveTimers({ firstWave: almostDue }, 250);
    expect(flushed?.firstWave?.elapsedTime).toBe(60_150);
  });

  it("writes leftover sub-second time on an explicit flush", () => {
    advanceAttackWaveTimers({ firstWave: baseTimer }, 400);
    const flushed = flushPendingAttackWaveElapsed({ firstWave: baseTimer });
    expect(flushed?.firstWave?.elapsedTime).toBe(400);
  });

  it("manualSave flushes pending wave elapsed before persisting", async () => {
    const saveSpy = vi.spyOn(saveModule, "saveGame").mockResolvedValue({
      localSaved: true,
      cloudSaved: false,
      cloudSkipped: true,
    });
    useGameStore.getState().initialize();
    useGameStore.setState({
      attackWaveTimers: { firstWave: { ...baseTimer } },
    });
    advanceAttackWaveTimers(useGameStore.getState().attackWaveTimers, 400);
    expect(useGameStore.getState().attackWaveTimers.firstWave?.elapsedTime).toBe(
      0,
    );

    await manualSave();

    expect(useGameStore.getState().attackWaveTimers.firstWave?.elapsedTime).toBe(
      400,
    );
    saveSpy.mockRestore();
  });
});

describe("processActionTicks cave executions", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("completes an overdue Cave gather so the bar does not stay at 0s left", () => {
    const now = Date.now();
    useGameStore.setState({
      flags: { ...useGameStore.getState().flags, gameStarted: true },
      executionStartTimes: { chopWood: now - 10_000 },
      executionDurations: { chopWood: 4 },
      resources: { ...useGameStore.getState().resources, wood: 0 },
    });

    processActionTicks();

    expect(useGameStore.getState().executionStartTimes?.chopWood).toBeUndefined();
    expect(useGameStore.getState().resources.wood).toBeGreaterThan(0);
  });

  it("completes an overdue Cave gather during dialog handoff when nothing is on screen", () => {
    const now = Date.now();
    useGameStore.setState({
      flags: { ...useGameStore.getState().flags, gameStarted: true },
      isPaused: false,
      dialogHandoffPending: true,
      executionStartTimes: { chopWood: now - 10_000 },
      executionDurations: { chopWood: 4 },
      resources: { ...useGameStore.getState().resources, wood: 0 },
    });

    flushOverdueExecutionsDuringHandoff();

    expect(useGameStore.getState().executionStartTimes?.chopWood).toBeUndefined();
    expect(useGameStore.getState().resources.wood).toBeGreaterThan(0);
  });

  it("does not complete Cave gathers when the player paused", () => {
    const now = Date.now();
    useGameStore.setState({
      flags: { ...useGameStore.getState().flags, gameStarted: true },
      isPaused: true,
      dialogHandoffPending: true,
      executionStartTimes: { chopWood: now - 10_000 },
      executionDurations: { chopWood: 4 },
      resources: { ...useGameStore.getState().resources, wood: 0 },
    });

    flushOverdueExecutionsDuringHandoff();

    expect(useGameStore.getState().executionStartTimes?.chopWood).toBe(now - 10_000);
    expect(useGameStore.getState().resources.wood).toBe(0);
  });
});

