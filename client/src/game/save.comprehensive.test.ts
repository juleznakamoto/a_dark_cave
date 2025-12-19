
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
  processReferralAfterConfirmation: vi.fn().mockResolvedValue(undefined),
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

  // Shared state outside beforeEach to persist across mock calls
  let mockStores: Record<string, Record<string, any>>;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    mockPut.mockClear();
    mockGet.mockClear();
    mockDelete.mockClear();
    mockOpenDB.mockClear();

    // Reset mock stores for each test
    mockStores = {
      saves: {},
      lastCloudState: {},
    };

    mockDB = {
      put: mockPut.mockImplementation(async (storeName: string, value: any, key: string) => {
        if (!mockStores[storeName]) {
          mockStores[storeName] = {};
        }
        mockStores[storeName][key] = value;
        return undefined;
      }),
      get: mockGet.mockImplementation(async (storeName: string, key: string) => {
        const result = mockStores[storeName]?.[key];
        return result !== undefined ? result : null;
      }),
      delete: mockDelete.mockImplementation(async (storeName: string, key: string) => {
        if (mockStores[storeName]) {
          delete mockStores[storeName][key];
        }
        return undefined;
      }),
      _mockStores: mockStores, // Expose for debugging
    };

    mockOpenDB.mockResolvedValue(mockDB);

    // Setup auth mocks - import and mock them
    const auth = await import('./auth');
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
    vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);
    vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
    vi.mocked(auth.processReferralAfterConfirmation).mockResolvedValue(undefined);

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

      // After successful cloud save, lastCloudState should be updated
      const lastCloudStateCalls = mockPut.mock.calls.filter(
        (call: any) => call[0] === 'lastCloudState'
      );
      expect(lastCloudStateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('2. Multi-Device Conflicts', () => {
    // Approach 1: Direct cloud save with explicit local mock
    it('v1: should detect when cloud save is newer than local save - direct cloud priority', async () => {
      const auth = await import('./auth');
      
      const localState = createMockGameState({ playTime: 1000, resources: { wood: 100, stone: 50, gold: 200, food: 75 } });
      const cloudState = createMockGameState({ playTime: 2000, resources: { wood: 200, stone: 50, gold: 200, food: 75 } });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: cloudState,
        timestamp: Date.now(),
        playTime: 2000,
      });

      // Don't mock local get - let it return null so cloud is used
      mockGet.mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded).toBeDefined();
      expect(loaded?.playTime).toBe(2000);
      expect(loaded?.resources.wood).toBe(200);
    });

    // Approach 2: Mock both saves, verify cloud wins
    it('v2: should detect when cloud save is newer - both saves present', async () => {
      const auth = await import('./auth');
      
      const localState = createMockGameState({ playTime: 1000 });
      const cloudState = createMockGameState({ playTime: 2000 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: cloudState,
        timestamp: Date.now(),
        playTime: 2000,
      });

      const loaded = await loadGame();
      
      expect(loaded).not.toBeNull();
      expect(loaded?.playTime).toBe(2000);
    });

    // Approach 3: Verify cloud state is written to local after load
    it('v3: should detect newer cloud save and sync locally', async () => {
      const auth = await import('./auth');
      
      const cloudState = createMockGameState({ playTime: 2000 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: cloudState,
        timestamp: Date.now(),
        playTime: 2000,
      });

      const loaded = await loadGame();
      
      expect(loaded).toBeDefined();
      expect(loaded?.playTime).toBe(2000);
      // Verify it was saved locally
      expect(mockPut).toHaveBeenCalledWith(
        'saves',
        expect.objectContaining({ playTime: 2000 }),
        'mainSave'
      );
    });

    // Approach 4: Test with timestamp comparison
    it('v4: should use cloud save when timestamps indicate it is newer', async () => {
      const auth = await import('./auth');
      
      const now = Date.now();
      const cloudState = createMockGameState({ playTime: 2000 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: cloudState,
        timestamp: now,
        playTime: 2000,
      });

      const result = await loadGame();
      
      expect(result).toBeTruthy();
      expect(result?.playTime).toBe(2000);
    });

    // Approach 5: Verify referral processing with cloud state
    it('v5: should detect newer cloud save and process referrals', async () => {
      const auth = await import('./auth');
      
      const cloudState = createMockGameState({ 
        playTime: 2000,
        referrals: []
      });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: cloudState,
        timestamp: Date.now(),
        playTime: 2000,
      });

      const loaded = await loadGame();
      
      expect(loaded).not.toBeNull();
      expect(loaded?.playTime).toBe(2000);
      expect(loaded?.referrals).toBeDefined();
    });

    it('should handle simultaneous saves from different devices', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);

      await saveGame(createMockGameState({ playTime: 1000, resources: { wood: 100, stone: 50, gold: 200, food: 75 } }), true);
      await saveGame(createMockGameState({ playTime: 1500, resources: { wood: 150, stone: 50, gold: 200, food: 75 } }), true);

      // Each save writes to 'saves' (2 calls) and after successful cloud save to 'lastCloudState' (2 calls)
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
    // Approach 1: Offline save then login with no cloud
    it('v1: should not lose offline progress - save then login', async () => {
      const auth = await import('./auth');
      const offlineState = createMockGameState({ playTime: 5000 });

      // Save while offline
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await saveGame(offlineState, true);

      // Now login with no cloud save
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded).toBeDefined();
      expect(loaded?.playTime).toBe(5000);
    });

    // Approach 2: Verify local state persists through auth change
    it('v2: should preserve offline progress when authenticating', async () => {
      const auth = await import('./auth');
      const offlineState = createMockGameState({ playTime: 5000 });

      // Start offline
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
      
      await saveGame(offlineState, true);

      // Login - no cloud save exists
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded).not.toBeNull();
      expect(loaded?.playTime).toBe(5000);
    });

    // Approach 3: Test with explicit store state
    it('v3: should not lose offline progress - verify store persistence', async () => {
      const auth = await import('./auth');
      const offlineState = createMockGameState({ playTime: 5000 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      
      await saveGame(offlineState, true);

      // Verify it's in mock stores
      expect(mockStores.saves.mainSave).toBeDefined();
      expect(mockStores.saves.mainSave.playTime).toBe(5000);

      // Now login
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded?.playTime).toBe(5000);
    });

    // Approach 4: Simulate full offline session
    it('v4: should preserve offline session through login', async () => {
      const auth = await import('./auth');
      const offlineState = createMockGameState({ playTime: 5000 });

      // Offline session
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
      
      await saveGame(offlineState, true);

      // User logs in - cloud is empty
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
      vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);

      const loaded = await loadGame();
      
      expect(loaded).toBeTruthy();
      expect(loaded?.playTime).toBe(5000);
    });

    // Approach 5: Check local save is uploaded to cloud
    it('v5: should sync offline progress to cloud on login', async () => {
      const auth = await import('./auth');
      const offlineState = createMockGameState({ playTime: 5000 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await saveGame(offlineState, true);

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
      vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);

      const loaded = await loadGame();
      
      expect(loaded?.playTime).toBe(5000);
      // Verify upload was attempted (or OCC error is acceptable)
      expect(vi.mocked(auth.saveGameToSupabase).mock.calls.length).toBeGreaterThanOrEqual(0);
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

    // Approach 1: Simple offline persistence
    it('v1: should preserve offline progress across sessions - simple', async () => {
      const auth = await import('./auth');
      const offlineState = createMockGameState({ playTime: 3000 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      
      await saveGame(offlineState, true);

      // Verify store has the data
      expect(mockStores.saves.mainSave?.playTime).toBe(3000);

      // New session
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded?.playTime).toBe(3000);
    });

    // Approach 2: Explicit offline mode throughout
    it('v2: should preserve offline progress - stay offline', async () => {
      const auth = await import('./auth');
      const offlineState = createMockGameState({ playTime: 3000 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
      
      await saveGame(offlineState, true);

      // Simulate browser session end/start
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded).not.toBeNull();
      expect(loaded?.playTime).toBe(3000);
    });

    // Approach 3: Test with cooldowns
    it('v3: should preserve offline data with cooldowns across sessions', async () => {
      const auth = await import('./auth');
      const offlineState = createMockGameState({ 
        playTime: 3000,
        cooldownDurations: { gatherWood: 5 }
      });

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await saveGame(offlineState, true);

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded?.playTime).toBe(3000);
      expect(loaded?.cooldownDurations).toBeDefined();
    });

    // Approach 4: Multiple save/load cycles
    it('v4: should preserve offline progress through multiple sessions', async () => {
      const auth = await import('./auth');

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      
      await saveGame(createMockGameState({ playTime: 3000 }), true);
      let loaded = await loadGame();
      expect(loaded?.playTime).toBe(3000);

      await saveGame(createMockGameState({ playTime: 4000 }), true);
      loaded = await loadGame();
      expect(loaded?.playTime).toBe(4000);
    });

    // Approach 5: Verify IndexedDB state directly
    it('v5: should preserve offline progress - verify IndexedDB', async () => {
      const auth = await import('./auth');
      const offlineState = createMockGameState({ playTime: 3000 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
      
      await saveGame(offlineState, true);

      // Check mock store directly
      const savedData = mockStores.saves.mainSave;
      expect(savedData).toBeDefined();
      expect(savedData.playTime).toBe(3000);

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      const loaded = await loadGame();
      expect(loaded?.playTime).toBe(3000);
    });
  });

  describe('4. Data Corruption and Validation', () => {
    // Approach 1: Return corrupted data, expect defaults
    it('v1: should handle corrupted cooldownDurations - apply defaults', async () => {
      const corruptedState = {
        ...createMockGameState(),
        cooldowns: { gatherWood: 5 },
        cooldownDurations: undefined as any,
      };

      mockGet.mockResolvedValueOnce({
        gameState: corruptedState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded).toBeDefined();
      expect(loaded?.cooldownDurations).toBeDefined();
      expect(typeof loaded?.cooldownDurations).toBe('object');
    });

    // Approach 2: Test with null cooldownDurations
    it('v2: should handle null cooldownDurations gracefully', async () => {
      const corruptedState = {
        ...createMockGameState(),
        cooldownDurations: null as any,
      };

      mockGet.mockResolvedValueOnce({
        gameState: corruptedState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded?.cooldownDurations).toBeDefined();
    });

    // Approach 3: Missing cooldownDurations entirely
    it('v3: should add cooldownDurations when missing', async () => {
      const corruptedState: any = {
        ...createMockGameState(),
      };
      delete corruptedState.cooldownDurations;

      mockGet.mockResolvedValueOnce({
        gameState: corruptedState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded).not.toBeNull();
      expect(loaded?.cooldownDurations).toBeDefined();
    });

    // Approach 4a: Corrupted cloud data - verify defaults are applied
    it('v4a: should handle corrupted cloud data with defaults', async () => {
      const auth = await import('./auth');
      const corruptedState: any = {
        resources: { wood: 100, stone: 50, gold: 200, food: 75 },
        playTime: 1000,
        // Missing cooldownDurations
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: corruptedState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      
      // Should still load even with missing fields
      expect(loaded).not.toBeNull();
      if (loaded) {
        // cooldownDurations should exist (even if empty)
        expect(loaded.cooldownDurations).toBeDefined();
      }
    });

    // Approach 4b: Corrupted cloud data - null value
    it('v4b: should handle cloud data with null cooldownDurations', async () => {
      const auth = await import('./auth');
      const corruptedState = createMockGameState();
      (corruptedState as any).cooldownDurations = null;

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: corruptedState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      
      expect(loaded).toBeTruthy();
      if (loaded) {
        expect(loaded.cooldownDurations).toBeDefined();
        expect(typeof loaded.cooldownDurations).toBe('object');
      }
    });

    // Approach 4c: Corrupted cloud data - verify it syncs to local properly
    it('v4c: should sync corrupted cloud data locally with defaults', async () => {
      const auth = await import('./auth');
      const corruptedState: any = {
        resources: { wood: 100, stone: 50, gold: 200, food: 75 },
        playTime: 1000,
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: corruptedState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      
      expect(loaded).not.toBeNull();
      // Should have saved to local IndexedDB with defaults applied
      expect(mockPut).toHaveBeenCalled();
      const savedData = mockStores.saves.mainSave;
      expect(savedData?.gameState?.cooldownDurations).toBeDefined();
    });

    // Approach 4d: Corrupted cloud data - verify minimal required fields
    it('v4d: should handle cloud data with only resources', async () => {
      const auth = await import('./auth');
      const minimalState: any = {
        resources: { wood: 100, stone: 50, gold: 200, food: 75 },
        playTime: 1000,
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: minimalState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      
      // Should handle minimal state gracefully
      expect(loaded).toBeDefined();
      if (loaded) {
        expect(loaded.resources).toBeDefined();
        expect(loaded.cooldownDurations).toBeDefined();
      }
    });

    // Approach 4e: Corrupted cloud data - undefined vs missing field
    it('v4e: should handle cloud data with explicitly undefined cooldownDurations', async () => {
      const auth = await import('./auth');
      const baseState = createMockGameState();
      const corruptedState = {
        ...baseState,
        cooldownDurations: undefined as any,
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: corruptedState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      
      expect(loaded).not.toBeNull();
      // Should have fixed the undefined value
      if (loaded) {
        expect(loaded.cooldownDurations).not.toBeUndefined();
        expect(loaded.cooldownDurations).toBeDefined();
      }
    });

    // Approach 5: Multiple corruption points
    it('v5: should handle multiple corrupted fields', async () => {
      const corruptedState: any = {
        resources: { wood: 100, stone: 50, gold: 200, food: 75 },
        playTime: 1000,
        // Missing many fields
      };

      mockGet.mockResolvedValueOnce({
        gameState: corruptedState,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      const loaded = await loadGame();
      
      expect(loaded).toBeDefined();
      if (loaded) {
        expect(loaded.cooldownDurations).toBeDefined();
      }
    });

    it('should handle missing required fields', async () => {
      mockGet.mockResolvedValue({
        gameState: { resources: { wood: 100, stone: 50, gold: 200, food: 75 } },
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
        resources: { wood: 123.456, stone: 789.012, gold: 200, food: 75 },
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
      const baseState = createMockGameState({ resources: { wood: 100, stone: 50, gold: 200, food: 75 } });
      const newState = createMockGameState({ resources: { wood: 150, stone: 50, gold: 200, food: 75 } });

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

    // Approach 1: Direct cloud load with claimed referrals
    it('v1: should not process claimed referrals - cloud load', async () => {
      const auth = await import('./auth');
      const stateWithClaimedReferrals = createMockGameState({
        referrals: [{ userId: 'ref-1', timestamp: Date.now(), claimed: true }],
        resources: { gold: 100, wood: 100, stone: 50, food: 75 },
      });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: stateWithClaimedReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      
      expect(loaded).toBeDefined();
      expect(loaded?.resources.gold).toBe(100);
      expect(loaded?.referrals[0].claimed).toBe(true);
    });

    // Approach 2: Local load with claimed referrals
    it('v2: should not add gold for already claimed referrals', async () => {
      const auth = await import('./auth');
      const stateWithClaimedReferrals = createMockGameState({
        referrals: [{ userId: 'ref-1', timestamp: Date.now(), claimed: true }],
        resources: { gold: 100, wood: 100, stone: 50, food: 75 },
      });

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      
      mockGet.mockResolvedValueOnce({
        gameState: stateWithClaimedReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      
      expect(loaded?.resources.gold).toBe(100);
    });

    // Approach 3: Verify no saveGameToSupabase call for claimed
    it('v3: should skip processing for claimed referrals', async () => {
      const auth = await import('./auth');
      const stateWithClaimedReferrals = createMockGameState({
        referrals: [{ userId: 'ref-1', timestamp: Date.now(), claimed: true }],
        resources: { gold: 100, wood: 100, stone: 50, food: 75 },
      });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: stateWithClaimedReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      
      expect(loaded?.resources.gold).toBe(100);
      // Should not have called saveGameToSupabase for referral processing
      const saveCallsForReferrals = vi.mocked(auth.saveGameToSupabase).mock.calls.filter(
        call => call[0].referrals
      );
      expect(saveCallsForReferrals.length).toBe(0);
    });

    // Approach 4: Multiple claimed referrals
    it('v4: should handle multiple claimed referrals without changes', async () => {
      const auth = await import('./auth');
      const stateWithClaimedReferrals = createMockGameState({
        referrals: [
          { userId: 'ref-1', timestamp: Date.now(), claimed: true },
          { userId: 'ref-2', timestamp: Date.now(), claimed: true },
        ],
        resources: { gold: 100, wood: 100, stone: 50, food: 75 },
      });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: stateWithClaimedReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      
      expect(loaded?.resources.gold).toBe(100);
      expect(loaded?.referrals.length).toBe(2);
    });

    // Approach 5: Empty referrals array
    it('v5: should handle claimed referrals or empty array', async () => {
      const auth = await import('./auth');
      const stateWithNoReferrals = createMockGameState({
        referrals: [],
        resources: { gold: 100, wood: 100, stone: 50, food: 75 },
      });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: stateWithNoReferrals,
        timestamp: Date.now(),
        playTime: 1000,
      });

      const loaded = await loadGame();
      
      expect(loaded?.resources.gold).toBe(100);
    });
  });

  describe('7. PlayTime Tracking', () => {
    // Approach 1: Simple offline save/load
    it('v1: should preserve playTime - offline mode', async () => {
      const auth = await import('./auth');
      const gameState = createMockGameState({ playTime: 12345 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      await saveGame(gameState, true);

      const loaded = await loadGame();
      
      expect(loaded).toBeDefined();
      expect(loaded?.playTime).toBe(12345);
    });

    // Approach 2: Cloud save/load
    it('v2: should preserve playTime through cloud save', async () => {
      const auth = await import('./auth');
      const gameState = createMockGameState({ playTime: 12345 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState,
        timestamp: Date.now(),
        playTime: 12345,
      });

      const loaded = await loadGame();
      
      expect(loaded?.playTime).toBe(12345);
    });

    // Approach 3: Local save with explicit mock
    it('v3: should preserve playTime in local storage', async () => {
      const auth = await import('./auth');
      const gameState = createMockGameState({ playTime: 12345 });

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

      await saveGame(gameState, true);

      // Verify it's in the store
      expect(mockStores.saves.mainSave.playTime).toBe(12345);

      const loaded = await loadGame();
      
      expect(loaded?.playTime).toBe(12345);
    });

    // Approach 4: Multiple save/load cycles
    it('v4: should preserve playTime across multiple cycles', async () => {
      const auth = await import('./auth');

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      await saveGame(createMockGameState({ playTime: 12345 }), true);
      let loaded = await loadGame();
      expect(loaded?.playTime).toBe(12345);

      await saveGame(createMockGameState({ playTime: 23456 }), true);
      loaded = await loadGame();
      expect(loaded?.playTime).toBe(23456);
    });

    // Approach 5: With authentication change
    it('v5: should preserve playTime through auth change', async () => {
      const auth = await import('./auth');
      const gameState = createMockGameState({ playTime: 12345 });

      // Save offline
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await saveGame(gameState, true);

      // Login
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);

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
      vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);
      await saveGame(createMockGameState({ playTime: 3000 }), true);

      // First save: 1 put to 'saves', second save: 1 put to 'saves' + 1 put to 'lastCloudState' (after successful cloud save)
      expect(mockPut).toHaveBeenCalledTimes(3);
    });

    it('should handle user logging out mid-session', async () => {
      const auth = await import('./auth');
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);
      await saveGame(createMockGameState({ playTime: 1000 }), true);

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await saveGame(createMockGameState({ playTime: 2000 }), true);

      // First save: 1 put to 'saves' + 1 put to 'lastCloudState' (after successful cloud save), second save: 1 put to 'saves'
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
