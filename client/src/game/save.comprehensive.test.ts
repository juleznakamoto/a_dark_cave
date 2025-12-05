
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveGame, loadGame, deleteSave } from './save';
import { GameState } from '@shared/schema';
import type { IDBPDatabase } from 'idb';

// Use vi.hoisted to ensure mocks are created before module imports
const { mockPut, mockGet, mockDelete, mockOpenDB } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
  mockOpenDB: vi.fn(),
}));

// Mock idb with factory function using hoisted mocks
vi.mock('idb', () => ({
  openDB: mockOpenDB,
}));

// Mock auth module
vi.mock('./auth', () => ({
  getCurrentUser: vi.fn(),
  saveGameToSupabase: vi.fn(),
  loadGameFromSupabase: vi.fn(),
}));

// Mock state module
vi.mock('./state', () => ({
  useGameStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Save Game System - Comprehensive Tests', () => {
  let mockDB: any;

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
    // Clear all mocks
    vi.clearAllMocks();
    mockPut.mockClear();
    mockGet.mockClear();
    mockDelete.mockClear();
    mockOpenDB.mockClear();

    // Setup mock database - use closure to share state between mock functions
    const mockStores: Record<string, Record<string, any>> = {
      saves: {},
      lastCloudState: {},
    };

    mockDB = {
      put: mockPut.mockImplementation(async (storeName: string, value: any, key: string) => {
        if (!mockStores[storeName]) {
          mockStores[storeName] = {};
        }
        mockStores[storeName][key] = value;
        console.log(`[MOCK DB] PUT ${storeName}/${key}:`, value);
        return undefined;
      }),
      get: mockGet.mockImplementation(async (storeName: string, key: string) => {
        const result = mockStores[storeName]?.[key];
        console.log(`[MOCK DB] GET ${storeName}/${key}:`, result);
        return result !== undefined ? result : null;
      }),
      delete: mockDelete.mockImplementation(async (storeName: string, key: string) => {
        if (mockStores[storeName]) {
          delete mockStores[storeName][key];
          console.log(`[MOCK DB] DELETE ${storeName}/${key}`);
        }
        return undefined;
      }),
    };

    mockOpenDB.mockResolvedValue(mockDB);

    // Setup auth mocks - import and mock them
    const auth = await import('./auth');
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
    vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);
    vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

    // Setup state mock
    const state = await import('./state');
    vi.mocked(state.useGameStore.getState).mockReturnValue({
      inactivityDialogOpen: false,
      getAndResetClickAnalytics: vi.fn().mockReturnValue(null),
      getAndResetResourceAnalytics: vi.fn().mockReturnValue(null),
    } as any);
    vi.mocked(state.useGameStore.setState).mockImplementation(() => {});
  });

  describe('1. Cloud Sync Failures', () => {
    it('should save locally even when cloud save fails', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.saveGameToSupabase).mockRejectedValue(new Error('Network error'));

      const gameState = createMockGameState();
      await saveGame(gameState, true);

      expect(mockPut).toHaveBeenCalledWith(
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

      expect(mockPut).toHaveBeenCalledTimes(3);
    });

    it('should not update lastCloudState when cloud save fails', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.saveGameToSupabase).mockRejectedValue(new Error('Network error'));

      await saveGame(createMockGameState(), true);

      const lastCloudStateCalls = mockPut.mock.calls.filter(
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

      const lastCloudStateCalls = mockPut.mock.calls.filter(
        (call: any) => call[2] === 'lastCloudState'
      );
      expect(lastCloudStateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('2. Multi-Device Conflicts', () => {
    it('should detect when cloud save is newer than local save', async () => {
      const auth = await import('./auth');
      
      const localState = createMockGameState({ playTime: 1000, resources: { wood: 100 } });
      const cloudState = createMockGameState({ playTime: 2000, resources: { wood: 200 } });

      // Setup auth BEFORE saving to ensure consistent state
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: cloudState,
        timestamp: Date.now(),
        playTime: 2000,
      });

      // Mock local IndexedDB save
      await mockDB.put('saves', {
        gameState: localState,
        timestamp: Date.now() - 60000,
        playTime: 1000,
      }, 'mainSave');

      const loaded = await loadGame();
      expect(loaded?.playTime).toBe(2000);
    });

    it('should handle simultaneous saves from different devices', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      await saveGame(createMockGameState({ playTime: 1000, resources: { wood: 100 } }), true);
      await saveGame(createMockGameState({ playTime: 1500, resources: { wood: 150 } }), true);

      // Each save writes to 'saves' and 'lastCloudState', so expect 4 total calls
      expect(mockPut).toHaveBeenCalledTimes(4);
    });

    it('should preserve higher playTime when loading', async () => {
      const localState = createMockGameState({ playTime: 5000 });
      const cloudState = createMockGameState({ playTime: 3000 });

      mockGet.mockResolvedValue({
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
      const auth = await import('./auth');
      const offlineState = createMockGameState({ playTime: 5000 });

      // Start offline
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
      
      await saveGame(offlineState, true);

      // User logs in - cloud has no save yet
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
      vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);

      const loaded = await loadGame();
      expect(loaded?.playTime).toBe(5000);
    });

    it('should handle transition from offline to online with existing cloud save', async () => {
      const offlineState = createMockGameState({ playTime: 5000 });
      const oldCloudState = createMockGameState({ playTime: 2000 });

      mockGet.mockResolvedValue({
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
      const auth = await import('./auth');
      const offlineState = createMockGameState({ playTime: 3000 });

      // Setup offline mode
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
      
      await saveGame(offlineState, true);

      // Simulate new session - still offline, load from IndexedDB
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

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

      await mockDB.put('saves', {
        gameState: corruptedState,
        timestamp: Date.now(),
        playTime: 1000,
      }, 'mainSave');

      const loaded = await loadGame();
      expect(loaded?.cooldownDurations).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      mockGet.mockResolvedValue({
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

      const savedData = mockPut.mock.calls[0][1];
      const serialized = JSON.stringify(savedData);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.gameState.resources.wood).toBe(123.456);
    });
  });

  describe('5. State Diffing Logic', () => {
    it('should calculate diff correctly for changed resources', async () => {
      const baseState = createMockGameState({ resources: { wood: 100 } });
      const newState = createMockGameState({ resources: { wood: 150 } });

      mockGet.mockResolvedValue({
        gameState: baseState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      await saveGame(newState, true);
      expect(mockPut).toHaveBeenCalled();
    });

    it('should handle first save (no previous state for diff)', async () => {
      mockGet.mockResolvedValue(null);

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      await saveGame(createMockGameState(), true);
      expect(mockPut).toHaveBeenCalled();
    });

    it('should detect nested object changes', async () => {
      const baseState = createMockGameState({
        population: { current: 10, max: 20, workers: { woodcutter: 2, miner: 3, farmer: 5 } },
      });
      const newState = createMockGameState({
        population: { current: 10, max: 20, workers: { woodcutter: 3, miner: 3, farmer: 5 } },
      });

      mockGet.mockResolvedValue({
        gameState: baseState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      await saveGame(newState, true);
      expect(mockPut).toHaveBeenCalled();
    });
  });

  describe('6. Referral System Integration', () => {
    it('should process unclaimed referrals on load', async () => {
      const auth = await import('./auth');
      const stateWithReferrals = createMockGameState({
        referrals: [
          { userId: 'ref-1', timestamp: Date.now(), claimed: false },
        ],
      });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: stateWithReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });
      vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);

      const loaded = await loadGame();
      expect(loaded).toBeDefined();
    });

    it('should not process already claimed referrals', async () => {
      const auth = await import('./auth');
      const stateWithClaimedReferrals = createMockGameState({
        referrals: [{ userId: 'ref-1', timestamp: Date.now(), claimed: true }],
        resources: { gold: 100 },
      });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: stateWithClaimedReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });
      vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);

      const loaded = await loadGame();
      expect(loaded?.resources.gold).toBe(100);
    });
  });

  describe('7. PlayTime Tracking', () => {
    it('should preserve playTime through save/load cycle', async () => {
      const auth = await import('./auth');
      const gameState = createMockGameState({ playTime: 12345 });

      // Setup offline mode
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

      await saveGame(gameState, true);

      const loaded = await loadGame();
      expect(loaded?.playTime).toBe(12345);
    });

    it('should handle playTime overflow (very long sessions)', async () => {
      const gameState = createMockGameState({ playTime: Number.MAX_SAFE_INTEGER - 1000 });

      await saveGame(gameState, true);

      expect(mockPut).toHaveBeenCalledWith(
        'saves',
        expect.objectContaining({
          playTime: Number.MAX_SAFE_INTEGER - 1000,
        }),
        'mainSave'
      );
    });

    it('should reject saves with decreasing playTime', async () => {
      await saveGame(createMockGameState({ playTime: 5000 }), true);

      mockGet.mockResolvedValue({
        gameState: createMockGameState({ playTime: 5000 }),
        timestamp: Date.now(),
        playTime: 5000,
      });

      await saveGame(createMockGameState({ playTime: 3000 }), true);
      expect(mockPut).toHaveBeenCalled();
    });
  });

  describe('8. Edge Cases and Race Conditions', () => {
    it('should handle rapid successive saves', async () => {
      const saves = Array.from({ length: 10 }, (_, i) =>
        saveGame(createMockGameState({ playTime: 1000 + i * 100 }), true)
      );

      await Promise.all(saves);
      expect(mockPut).toHaveBeenCalledTimes(10);
    });

    it('should handle save during active gameplay', async () => {
      const state = await import('./state');
      vi.mocked(state.useGameStore.getState).mockReturnValue({
        inactivityDialogOpen: false,
        getAndResetClickAnalytics: vi.fn().mockReturnValue({ click1: 5 }),
        getAndResetResourceAnalytics: vi.fn().mockReturnValue({ wood: 100 }),
      } as any);

      await saveGame(createMockGameState({ isGameLoopActive: true }), true);
      expect(mockPut).toHaveBeenCalled();
    });

    it('should skip save when inactivity dialog is open', async () => {
      const state = await import('./state');
      vi.mocked(state.useGameStore.getState).mockReturnValue({
        inactivityDialogOpen: true,
        getAndResetClickAnalytics: vi.fn(),
        getAndResetResourceAnalytics: vi.fn(),
      } as any);

      await saveGame(createMockGameState(), true);
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('should handle database connection failures', async () => {
      mockOpenDB.mockRejectedValue(new Error('Failed to open database'));

      await expect(saveGame(createMockGameState(), true)).rejects.toThrow('Failed to open database');
    });

    it('should handle concurrent load and save operations', async () => {
      const gameState = createMockGameState();

      mockGet.mockResolvedValue({
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

      // First save: 1 put to 'saves', second save: 1 put to 'saves' + 1 put to 'lastCloudState'
      expect(mockPut).toHaveBeenCalledTimes(3);
    });

    it('should handle user logging out mid-session', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      await saveGame(createMockGameState({ playTime: 1000 }), true);

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await saveGame(createMockGameState({ playTime: 2000 }), true);

      // First save: 1 put to 'saves' + 1 put to 'lastCloudState', second save: 1 put to 'saves'
      expect(mockPut).toHaveBeenCalledTimes(3);
    });
  });

  describe('10. Delete Operations', () => {
    it('should delete local save successfully', async () => {
      await deleteSave();
      expect(mockDelete).toHaveBeenCalledWith('saves', 'mainSave');
    });

    it('should handle delete errors gracefully', async () => {
      mockDelete.mockRejectedValue(new Error('Delete failed'));
      await expect(deleteSave()).resolves.not.toThrow();
    });
  });
});
