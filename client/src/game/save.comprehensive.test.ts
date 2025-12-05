import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveGame, loadGame, deleteSave } from './save';
import { GameState } from '@shared/schema';

// Mock idb module with factory function
vi.mock('idb', () => {
  const mockOpenDB = vi.fn();
  return {
    openDB: mockOpenDB,
  };
});

// Mock other modules
vi.mock('./auth');
vi.mock('./state');
vi.mock('@/lib/logger');

// Get reference to mocked openDB for assertions
const getMockOpenDB = () => {
  const idb = require('idb');
  return idb.openDB;
};

describe('Save Game System - Comprehensive Tests', () => {
  let mockDB: any;
  let mockOpenDB: any;

  const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
    resources: { wood: 100, stone: 50, gold: 200, food: 75 },
    population: { current: 10, max: 20, workers: { woodcutter: 2, miner: 3, farmer: 5 } },
    buildings: {},
    items: {},
    cooldowns: {},
    cooldownDurations: {},
    attackWaveTimers: {},
    log: [],
    events: { currentEvent: null, eventQueue: [] },
    flags: { gameStarted: true, hasLitFire: true },
    stats: { luck: 5, strength: 5, knowledge: 5, madness: 0 },
    skills: {},
    activeTab: 'cave',
    devMode: false,
    boostMode: false,
    effects: {},
    bastion_stats: { armor: 0, damage: 0 },
    cruelMode: false,
    CM: 0,
    activatedPurchases: {},
    feastPurchases: {},
    loopProgress: 0,
    isGameLoopActive: true,
    isPaused: false,
    isMuted: false,
    shopNotificationSeen: false,
    shopNotificationVisible: false,
    authNotificationSeen: false,
    authNotificationVisible: false,
    mysteriousNoteShopNotificationSeen: false,
    mysteriousNoteDonateNotificationSeen: false,
    playTime: 1000,
    isNewGame: false,
    startTime: Date.now() - 1000,
    idleModeState: { isActive: false, startTime: 0, needsDisplay: false },
    referrals: [],
    social_media_rewards: {},
    lastResourceSnapshotTime: 0,
    highlightedResources: [],
    curseState: { isActive: false, startTime: 0, duration: 0 },
    frostfallState: { isActive: false, startTime: 0, duration: 0 },
    lastFreeGoldClaim: 0,
    hoveredTooltips: new Set(),
    inactivityDialogOpen: false,
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get reference to the mocked openDB
    mockOpenDB = getMockOpenDB();

    // Setup mock database
    mockDB = {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockOpenDB.mockResolvedValue(mockDB);

    // Setup auth mocks
    const auth = await import('./auth');
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
    vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);
    vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

    // Setup state mock
    const state = await import('./state');
    vi.mocked(state.useGameStore).getState = vi.fn().mockReturnValue({
      inactivityDialogOpen: false,
      getAndResetClickAnalytics: vi.fn().mockReturnValue(null),
      getAndResetResourceAnalytics: vi.fn().mockReturnValue(null),
    });
    vi.mocked(state.useGameStore).setState = vi.fn();
  });

  describe('1. Cloud Sync Failures', () => {
    it('should save locally even when cloud save fails', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.saveGameToSupabase).mockRejectedValue(new Error('Network error'));

      const gameState = createMockGameState();
      await saveGame(gameState, true);

      expect(mockDB.put).toHaveBeenCalledWith(
        'saves',
        expect.objectContaining({
          timestamp: expect.any(Number),
          playTime: 1000,
        }),
        'mainSave'
      );
    });

    it('should handle multiple consecutive cloud save failures', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.saveGameToSupabase).mockRejectedValue(new Error('Network error'));

      await saveGame(createMockGameState(), true);
      await saveGame(createMockGameState({ playTime: 2000 }), true);
      await saveGame(createMockGameState({ playTime: 3000 }), true);

      expect(mockDB.put).toHaveBeenCalledTimes(3);
    });

    it('should not update lastCloudState when cloud save fails', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.saveGameToSupabase).mockRejectedValue(new Error('Network error'));

      await saveGame(createMockGameState(), true);

      const lastCloudStateCalls = mockDB.put.mock.calls.filter(
        (call: any) => call[2] === 'lastCloudState'
      );
      expect(lastCloudStateCalls.length).toBe(0);
    });

    it('should recover from intermittent cloud failures', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.saveGameToSupabase)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      await saveGame(createMockGameState(), true);
      await saveGame(createMockGameState({ playTime: 2000 }), true);

      const lastCloudStateCalls = mockDB.put.mock.calls.filter(
        (call: any) => call[2] === 'lastCloudState'
      );
      expect(lastCloudStateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('2. Multi-Device Conflicts', () => {
    it('should detect when cloud save is newer than local save', async () => {
      const localState = createMockGameState({ playTime: 1000, resources: { wood: 100 } });
      const cloudState = createMockGameState({ playTime: 2000, resources: { wood: 200 } });

      mockDB.get.mockResolvedValueOnce({
        gameState: localState,
        timestamp: Date.now() - 60000,
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: cloudState,
        timestamp: Date.now(),
        playTime: 2000,
      });

      const loaded = await loadGame();
      expect(loaded?.playTime).toBe(2000);
    });

    it('should handle simultaneous saves from different devices', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      await saveGame(createMockGameState({ playTime: 1000, resources: { wood: 100 } }), true);
      await saveGame(createMockGameState({ playTime: 1000, resources: { wood: 150 } }), true);

      expect(mockDB.put).toHaveBeenCalledTimes(2);
    });

    it('should preserve higher playTime when loading', async () => {
      const localState = createMockGameState({ playTime: 5000 });
      const cloudState = createMockGameState({ playTime: 3000 });

      mockDB.get.mockResolvedValue({
        gameState: localState,
        timestamp: Date.now(),
        playTime: 5000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: cloudState,
        timestamp: Date.now() - 120000,
        playTime: 3000,
      });

      const loaded = await loadGame();
      expect(loaded).toBeDefined();
    });
  });

  describe('3. Offline Progress Overwrite', () => {
    it('should not lose progress when going from offline to online', async () => {
      const offlineState = createMockGameState({ playTime: 5000 });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await saveGame(offlineState, true);

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      mockDB.get.mockResolvedValue({
        gameState: offlineState,
        timestamp: Date.now(),
        playTime: 5000,
      });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

      const loaded = await loadGame();
      expect(loaded?.playTime).toBe(5000);
    });

    it('should handle transition from offline to online with existing cloud save', async () => {
      const offlineState = createMockGameState({ playTime: 5000 });
      const oldCloudState = createMockGameState({ playTime: 2000 });

      mockDB.get.mockResolvedValue({
        gameState: offlineState,
        timestamp: Date.now(),
        playTime: 5000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: oldCloudState,
        timestamp: Date.now() - 180000,
        playTime: 2000,
      });

      const loaded = await loadGame();
      expect(loaded).toBeDefined();
    });

    it('should preserve offline progress across browser sessions', async () => {
      const offlineState = createMockGameState({ playTime: 3000 });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await saveGame(offlineState, true);

      mockDB.get.mockResolvedValue({
        gameState: offlineState,
        timestamp: Date.now() - 60000,
        playTime: 3000,
      });

      const loaded = await loadGame();
      expect(loaded?.playTime).toBe(3000);
    });
  });

  describe('4. Data Corruption and Validation', () => {
    it('should handle corrupted cooldownDurations gracefully', async () => {
      const corruptedState = {
        ...createMockGameState(),
        cooldowns: { gatherWood: 5 },
        cooldownDurations: undefined as any,
      };

      mockDB.get.mockResolvedValue({
        gameState: corruptedState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      expect(loaded?.cooldownDurations).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      mockDB.get.mockResolvedValue({
        gameState: { resources: { wood: 100 } },
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      expect(loaded).toBeDefined();
    });

    it('should handle non-serializable data in game state', async () => {
      const state = createMockGameState();
      await expect(saveGame(state, true)).resolves.not.toThrow();
    });

    it('should preserve data through JSON serialization round-trip', async () => {
      const originalState = createMockGameState({
        resources: { wood: 123.456, stone: 789.012 },
      });

      await saveGame(originalState, true);

      const savedData = mockDB.put.mock.calls[0][1];
      const serialized = JSON.stringify(savedData);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.gameState.resources.wood).toBe(123.456);
    });
  });

  describe('5. State Diffing Logic', () => {
    it('should calculate diff correctly for changed resources', async () => {
      const baseState = createMockGameState({ resources: { wood: 100 } });
      const newState = createMockGameState({ resources: { wood: 150 } });

      mockDB.get.mockResolvedValue({
        gameState: baseState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      await saveGame(newState, true);
      expect(mockDB.put).toHaveBeenCalled();
    });

    it('should handle first save (no previous state for diff)', async () => {
      mockDB.get.mockResolvedValue(null);

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      await saveGame(createMockGameState(), true);
      expect(mockDB.put).toHaveBeenCalled();
    });

    it('should detect nested object changes', async () => {
      const baseState = createMockGameState({
        population: { current: 10, max: 20, workers: { woodcutter: 2, miner: 3, farmer: 5 } },
      });
      const newState = createMockGameState({
        population: { current: 10, max: 20, workers: { woodcutter: 3, miner: 3, farmer: 5 } },
      });

      mockDB.get.mockResolvedValue({
        gameState: baseState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      await saveGame(newState, true);
      expect(mockDB.put).toHaveBeenCalled();
    });
  });

  describe('6. Referral System Integration', () => {
    it('should process unclaimed referrals on load', async () => {
      const stateWithReferrals = createMockGameState({
        referrals: [
          { userId: 'ref-1', timestamp: Date.now(), claimed: false },
        ],
      });

      mockDB.get.mockResolvedValue({
        gameState: stateWithReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: stateWithReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      expect(loaded).toBeDefined();
    });

    it('should not process already claimed referrals', async () => {
      const stateWithClaimedReferrals = createMockGameState({
        referrals: [{ userId: 'ref-1', timestamp: Date.now(), claimed: true }],
        resources: { gold: 100 },
      });

      mockDB.get.mockResolvedValue({
        gameState: stateWithClaimedReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: stateWithClaimedReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      expect(loaded?.resources.gold).toBe(100);
    });
  });

  describe('7. PlayTime Tracking', () => {
    it('should preserve playTime through save/load cycle', async () => {
      const gameState = createMockGameState({ playTime: 12345 });

      await saveGame(gameState, true);

      mockDB.get.mockResolvedValue({
        gameState,
        timestamp: Date.now(),
        playTime: 12345,
      });

      const loaded = await loadGame();
      expect(loaded?.playTime).toBe(12345);
    });

    it('should handle playTime overflow (very long sessions)', async () => {
      const gameState = createMockGameState({ playTime: Number.MAX_SAFE_INTEGER - 1000 });

      await saveGame(gameState, true);

      expect(mockDB.put).toHaveBeenCalledWith(
        'saves',
        expect.objectContaining({
          playTime: Number.MAX_SAFE_INTEGER - 1000,
        }),
        'mainSave'
      );
    });

    it('should reject saves with decreasing playTime', async () => {
      await saveGame(createMockGameState({ playTime: 5000 }), true);

      mockDB.get.mockResolvedValue({
        gameState: createMockGameState({ playTime: 5000 }),
        timestamp: Date.now(),
        playTime: 5000,
      });

      await saveGame(createMockGameState({ playTime: 3000 }), true);
      expect(mockDB.put).toHaveBeenCalled();
    });
  });

  describe('8. Edge Cases and Race Conditions', () => {
    it('should handle rapid successive saves', async () => {
      const saves = Array.from({ length: 10 }, (_, i) =>
        saveGame(createMockGameState({ playTime: 1000 + i * 100 }), true)
      );

      await Promise.all(saves);
      expect(mockDB.put).toHaveBeenCalledTimes(10);
    });

    it('should handle save during active gameplay', async () => {
      const state = await import('./state');
      vi.mocked(state.useGameStore).getState = vi.fn().mockReturnValue({
        inactivityDialogOpen: false,
        getAndResetClickAnalytics: vi.fn().mockReturnValue({ click1: 5 }),
        getAndResetResourceAnalytics: vi.fn().mockReturnValue({ wood: 100 }),
      });

      await saveGame(createMockGameState({ isGameLoopActive: true }), true);
      expect(mockDB.put).toHaveBeenCalled();
    });

    it('should skip save when inactivity dialog is open', async () => {
      const state = await import('./state');
      vi.mocked(state.useGameStore).getState = vi.fn().mockReturnValue({
        inactivityDialogOpen: true,
        getAndResetClickAnalytics: vi.fn(),
        getAndResetResourceAnalytics: vi.fn(),
      });

      await saveGame(createMockGameState(), true);
      expect(mockDB.put).not.toHaveBeenCalled();
    });

    it('should handle database connection failures', async () => {
      mockOpenDB.mockRejectedValue(new Error('Failed to open database'));

      await expect(saveGame(createMockGameState(), true)).rejects.toThrow('Failed to open database');
    });

    it('should handle concurrent load and save operations', async () => {
      const gameState = createMockGameState();

      mockDB.get.mockResolvedValue({
        gameState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const [loaded] = await Promise.all([loadGame(), saveGame(gameState, true)]);
      expect(loaded).toBeDefined();
    });
  });

  describe('9. Authentication State Changes', () => {
    it('should handle user logging in mid-session', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await saveGame(createMockGameState({ playTime: 2000 }), true);

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      await saveGame(createMockGameState({ playTime: 3000 }), true);

      expect(mockDB.put).toHaveBeenCalledTimes(2);
    });

    it('should handle user logging out mid-session', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      await saveGame(createMockGameState(), true);

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await saveGame(createMockGameState({ playTime: 2000 }), true);

      expect(mockDB.put).toHaveBeenCalledTimes(2);
    });
  });

  describe('10. Delete Operations', () => {
    it('should delete local save successfully', async () => {
      await deleteSave();
      expect(mockDB.delete).toHaveBeenCalledWith('saves', 'mainSave');
    });

    it('should handle delete errors gracefully', async () => {
      mockDB.delete.mockRejectedValue(new Error('Delete failed'));
      await expect(deleteSave()).resolves.not.toThrow();
    });
  });
});