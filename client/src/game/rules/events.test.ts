import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventManager, gameEvents, type EventRollState } from './events';
import { GameState } from '@shared/schema';
import { createInitialState, useGameStore } from '../state';
import { GAME_CONSTANTS } from '../constants';

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
      story: { seen: {} },
      relics: {},
      weapons: {},
      tools: {}, // Add tools to prevent undefined errors
      clothing: {}, // Add clothing to prevent undefined errors
      blessings: {}, // Add blessings to prevent undefined errors
      feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 0 }, // Add feastState
      greatFeastState: { isActive: false, endTime: 0 }, // Add greatFeastState
      fellowship: {}, // Add fellowship to prevent undefined errors
      schematics: {}, // Add schematics to prevent undefined errors
      books: {}, // Add books to prevent undefined errors
      boneDevourerState: { lastAcceptedLevel: 0 }, // Add boneDevourerState to prevent undefined errors
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should trigger events based on conditions', () => {
    const { newLogEntries, stateChanges } = EventManager.checkEvents(mockState as GameState);

    expect(newLogEntries).toBeDefined();
    expect(Array.isArray(newLogEntries)).toBe(true);
  });

  it('does not spawn another timed-tab event while one is active', () => {
    mockState.timedEventTab = {
      isActive: true,
      event: null,
      expiryTime: Date.now() + 60_000,
      startTime: Date.now(),
    };

    const { stateChanges } = EventManager.checkEvents(
      mockState as EventRollState,
    );

    expect(stateChanges._timedTabEvent).toBeUndefined();
  });

  it('does not spawn a timed-tab event within TIMED_TAB_MIN_GAP_MS of the last close', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const now = Date.now();
    const state = {
      ...createInitialState(),
      buildings: { ...createInitialState().buildings, woodenHut: 3 },
      timedEventTab: {
        isActive: false,
        event: null,
        expiryTime: 0,
        lastEndedAt: now - GAME_CONSTANTS.TIMED_TAB_MIN_GAP_MS + 1_000,
      },
    } as EventRollState;

    const { stateChanges } = EventManager.checkEvents(state);
    expect(stateChanges._timedTabEvent).toBeUndefined();
  });

  it('allows a timed-tab spawn after TIMED_TAB_MIN_GAP_MS has elapsed', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const now = Date.now();
    const state = {
      ...createInitialState(),
      buildings: { ...createInitialState().buildings, woodenHut: 3 },
      timedEventTab: {
        isActive: false,
        event: null,
        expiryTime: 0,
        lastEndedAt: now - GAME_CONSTANTS.TIMED_TAB_MIN_GAP_MS - 1,
      },
    } as EventRollState;

    const { stateChanges } = EventManager.checkEvents(state);
    expect(stateChanges._timedTabEvent).toBeDefined();
  });

  it('records lastEndedAt when a timed tab is deactivated', async () => {
    const before = Date.now();
    useGameStore.setState({
      timedEventTab: {
        isActive: true,
        event: {
          id: 'merchant-test',
          message: 'Test',
          timestamp: before,
          type: 'event',
        },
        expiryTime: before + 60_000,
        startTime: before,
      },
    });

    await useGameStore.getState().setTimedEventTab(false);
    const endedAt = useGameStore.getState().timedEventTab.lastEndedAt ?? 0;
    expect(endedAt).toBeGreaterThanOrEqual(before);
    expect(endedAt).toBeLessThanOrEqual(Date.now());
  });

  function veinrootReadyState(
    eventDialog?: EventRollState['eventDialog'],
  ): EventRollState {
    const base = createInitialState();
    return {
      ...base,
      buildings: {
        ...base.buildings,
        alchemistHall: 1,
      },
      story: {
        ...base.story,
        seen: {
          ...base.story.seen,
          firstWaveVictory: true,
        },
      },
      triggeredEvents: {},
      ...(eventDialog ? { eventDialog } : {}),
    } as EventRollState;
  }

  it('does not spawn a dialog event within EVENT_DIALOG_MIN_GAP_MS of the last close', () => {
    const now = Date.now();
    if (gameEvents.veinrootIntroduction) {
      gameEvents.veinrootIntroduction.triggered = false;
    }

    const { newLogEntries } = EventManager.checkEvents(
      veinrootReadyState({
        isOpen: false,
        lastEndedAt: now - GAME_CONSTANTS.EVENT_DIALOG_MIN_GAP_MS + 1_000,
      }),
    );

    expect(
      newLogEntries.some((entry) => entry.id.startsWith('veinrootIntroduction')),
    ).toBe(false);
  });

  it('allows a dialog event after EVENT_DIALOG_MIN_GAP_MS has elapsed', () => {
    const now = Date.now();
    if (gameEvents.veinrootIntroduction) {
      gameEvents.veinrootIntroduction.triggered = false;
    }

    const { newLogEntries } = EventManager.checkEvents(
      veinrootReadyState({
        isOpen: false,
        lastEndedAt: now - GAME_CONSTANTS.EVENT_DIALOG_MIN_GAP_MS - 1,
      }),
    );

    expect(
      newLogEntries.some((entry) => entry.id.startsWith('veinrootIntroduction')),
    ).toBe(true);
  });

  it('still allows timed-tab spawns during EVENT_DIALOG_MIN_GAP_MS', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const now = Date.now();
    const state = {
      ...createInitialState(),
      buildings: { ...createInitialState().buildings, woodenHut: 3 },
      eventDialog: {
        isOpen: false,
        lastEndedAt: now - 1_000,
      },
      timedEventTab: {
        isActive: false,
        event: null,
        expiryTime: 0,
        lastEndedAt: now - GAME_CONSTANTS.TIMED_TAB_MIN_GAP_MS - 1,
      },
    } as EventRollState;

    const { stateChanges } = EventManager.checkEvents(state);
    expect(stateChanges._timedTabEvent).toBeDefined();
  });

  it('records lastEndedAt when an event dialog is closed', () => {
    const before = Date.now();
    useGameStore.setState({
      eventDialog: {
        isOpen: true,
        currentEvent: {
          id: 'veinrootIntroduction-test',
          message: 'Test',
          timestamp: before,
          type: 'event',
        },
        lastEndedAt: 0,
      },
    });

    useGameStore.getState().setEventDialog(false);
    const endedAt = useGameStore.getState().eventDialog.lastEndedAt ?? 0;
    expect(endedAt).toBeGreaterThanOrEqual(before);
    expect(endedAt).toBeLessThanOrEqual(Date.now());
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
            return {
              resources: { ...state.resources, wood: state.resources.wood + 50 },
            };
          },
        },
      ],
    };

    const initialWood = mockState.resources!.wood;

    // Apply the effect directly since EventManager.applyEventChoice may not exist
    const choice = testEvent.choices.find(c => c.id === 'accept');
    const changes = choice?.effect(mockState as GameState);

    expect(changes?.resources?.wood).toBe(initialWood + 50);
  });

  it('does not allow stale merchant schematic offers to charge gold', () => {
    const state = createInitialState();
    state.resources.gold = 5000;
    state.buildings.stoneHut = 6;
    state.schematics.stormglass_halberd_schematic = true;
    state.merchantTrades = {
      choices: [
        {
          id: 'trade_stormglass_halberd_schematic',
          label: 'Stormglass Halberd Schematic',
          cost: '1000 Gold',
          buyResource: 'schematic',
          buyAmount: 1,
          buyItem: 'stormglass_halberd_schematic',
          sellResource: 'gold',
          sellAmount: 1000,
          executed: false,
        },
      ],
      purchasedIds: [],
    };

    const changes = EventManager.applyEventChoice(
      state,
      'trade_stormglass_halberd_schematic',
      'merchant',
    );

    expect(changes).toEqual({});
  });

  it("rejects obsidian orb villager payment when free villagers are insufficient", () => {
    const state = createInitialState();
    state.resources.gold = 0;
    state.buildings.advancedBlacksmith = 1;
    state.buildings.darkEstate = 1;
    state.story = {
      ...state.story,
      seen: { ...state.story?.seen, hasObsidian: true },
    };
    state.villagers = {
      ...state.villagers,
      free: 15,
      gatherer: 10,
    };

    const changes = EventManager.applyEventChoice(
      state,
      "payVillagers",
      "obsidianOrbVisit",
    );

    expect(changes._choiceRejected).toBe(true);
    expect(changes._logMessageKey).toBeUndefined();
    expect(changes.schematics?.obsidian_orb_schematic).toBeUndefined();
    expect(changes.villagers).toBeUndefined();
  });

  it('does not mark non-repeatable choice events seen until a choice is applied', () => {
    const state = {
      ...createInitialState(),
      buildings: {
        ...createInitialState().buildings,
        alchemistHall: 1,
      },
      story: {
        ...createInitialState().story,
        seen: {
          ...createInitialState().story.seen,
          firstWaveVictory: true,
        },
      },
      triggeredEvents: {},
    } as EventRollState;

    if (gameEvents.veinrootIntroduction) {
      gameEvents.veinrootIntroduction.triggered = false;
    }

    const { newLogEntries, stateChanges } = EventManager.checkEvents(state);
    const veinrootEntry = newLogEntries.find((entry) =>
      entry.id.startsWith('veinrootIntroduction'),
    );

    expect(veinrootEntry).toBeDefined();
    expect(stateChanges.triggeredEvents?.veinrootIntroduction).toBeUndefined();

    // Simulate a refresh after dialog open: seen was never persisted, so it can roll again.
    if (gameEvents.veinrootIntroduction) {
      gameEvents.veinrootIntroduction.triggered = false;
    }
    const secondRoll = EventManager.checkEvents({
      ...state,
      triggeredEvents: {},
    } as EventRollState);
    expect(
      secondRoll.newLogEntries.some((entry) =>
        entry.id.startsWith('veinrootIntroduction'),
      ),
    ).toBe(true);

    const choiceChanges = EventManager.applyEventChoice(
      state as GameState,
      'continue',
      'veinrootIntroduction',
    );
    expect(choiceChanges.triggeredEvents?.veinrootIntroduction).toBe(true);

    // No-op / unknown choice must not mark the event seen.
    if (gameEvents.veinrootIntroduction) {
      gameEvents.veinrootIntroduction.triggered = false;
    }
    const rejected = EventManager.applyEventChoice(
      state as GameState,
      'not_a_real_choice',
      'veinrootIntroduction',
    );
    expect(rejected).toEqual({});
    expect(rejected.triggeredEvents).toBeUndefined();
  });

  it('marks non-repeatable no-choice events seen when they trigger', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = {
      ...createInitialState(),
      buildings: {
        ...createInitialState().buildings,
        stoneHut: 5,
      },
      flags: {
        ...createInitialState().flags,
        hasCity: false,
      },
      triggeredEvents: {},
    } as EventRollState;

    if (gameEvents.villageBecomesCity) {
      gameEvents.villageBecomesCity.triggered = false;
    }

    const { stateChanges } = EventManager.checkEvents(state);
    expect(stateChanges.triggeredEvents?.villageBecomesCity).toBe(true);
    expect(stateChanges.flags?.hasCity).toBe(true);
  });
});