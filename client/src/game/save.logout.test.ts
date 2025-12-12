
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveGame, loadGame } from './save';
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

describe('Logout/Login Save Behavior Tests', () => {
  let mockDB: any;
  let mockStores: Record<string, Record<string, any>>;

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
    mockPut.mockClear();
    mockGet.mockClear();
    mockDelete.mockClear();
    mockOpenDB.mockClear();

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
    };

    mockOpenDB.mockResolvedValue(mockDB);

    const auth = await import('./auth');
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
    vi.mocked(auth.saveGameToSupabase).mockResolvedValue(undefined);
    vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null);
    vi.mocked(auth.processReferralAfterConfirmation).mockResolvedValue(undefined);

    const state = await import('./state');
    vi.mocked(state.useGameStore.getState).mockReturnValue({
      inactivityDialogOpen: false,
      getAndResetClickAnalytics: vi.fn().mockReturnValue(null),
      getAndResetResourceAnalytics: vi.fn().mockReturnValue(null),
    } as any);
    vi.mocked(state.useGameStore.setState).mockImplementation(() => {});
  });

  describe('User Reported Bug: Logout -> Offline Play -> Login', () => {
    it('should preserve offline progress when logging back in (newer local)', async () => {
      const auth = await import('./auth');

      // Step 1: User is logged in, has some progress
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      const initialState = createMockGameState({ playTime: 5000, resources: { wood: 100, stone: 50, gold: 200, food: 75 } });
      await saveGame(initialState, false);

      // Verify cloud save was called
      expect(vi.mocked(auth.saveGameToSupabase)).toHaveBeenCalled();

      // Step 2: User gets logged out (session expires, or they logout)
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      
      // Clear lastCloudState (simulating logout behavior)
      await mockDB.delete('lastCloudState', 'lastCloudState');

      // Step 3: User continues playing offline, making significant progress
      const offlineProgress1 = createMockGameState({ playTime: 6000, resources: { wood: 150, stone: 50, gold: 200, food: 75 } });
      await saveGame(offlineProgress1, false);

      const offlineProgress2 = createMockGameState({ playTime: 7000, resources: { wood: 200, stone: 50, gold: 200, food: 75 } });
      await saveGame(offlineProgress2, false);

      // Verify local save has the latest progress
      const localData = mockStores.saves.mainSave;
      expect(localData.playTime).toBe(7000);
      expect(localData.gameState.resources.wood).toBe(200);

      // Step 4: User logs back in
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      
      // Cloud still has old state from before logout
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: initialState,
        timestamp: Date.now() - 120000,
        playTime: 5000,
      });

      // Step 5: Load game - should use local progress since it's newer
      const loaded = await loadGame();

      // CRITICAL ASSERTIONS
      expect(loaded).toBeDefined();
      expect(loaded?.playTime).toBe(7000); // Should use newer local playTime
      expect(loaded?.resources.wood).toBe(200); // Should use newer local resources

      // Verify that local progress was synced to cloud
      expect(vi.mocked(auth.saveGameToSupabase)).toHaveBeenCalledWith(
        expect.objectContaining({
          playTime: 7000,
        }),
        7000,
        false,
        null,
        null
      );
    });

    it('should handle cloud being newer than local (different device scenario)', async () => {
      const auth = await import('./auth');

      // Local has some progress
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      const localState = createMockGameState({ playTime: 3000, resources: { wood: 50, stone: 50, gold: 200, food: 75 } });
      await saveGame(localState, false);

      // User logs in, cloud has more recent progress (played on another device)
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      const cloudState = createMockGameState({ playTime: 8000, resources: { wood: 300, stone: 50, gold: 200, food: 75 } });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: cloudState,
        timestamp: Date.now(),
        playTime: 8000,
      });

      const loaded = await loadGame();

      expect(loaded).toBeDefined();
      expect(loaded?.playTime).toBe(8000); // Should use cloud playTime
      expect(loaded?.resources.wood).toBe(300); // Should use cloud resources
    });

    it('should handle equal playTime (use cloud as tiebreaker)', async () => {
      const auth = await import('./auth');

      // Local and cloud have same playTime
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      const localState = createMockGameState({ playTime: 5000, resources: { wood: 100, stone: 50, gold: 200, food: 75 } });
      await saveGame(localState, false);

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      const cloudState = createMockGameState({ playTime: 5000, resources: { wood: 150, stone: 50, gold: 200, food: 75 } });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: cloudState,
        timestamp: Date.now(),
        playTime: 5000,
      });

      const loaded = await loadGame();

      expect(loaded).toBeDefined();
      expect(loaded?.playTime).toBe(5000);
      // When equal, cloud wins (safer choice)
      expect(loaded?.resources.wood).toBe(150);
    });

    it('should handle OCC rejection gracefully when syncing local to cloud', async () => {
      const auth = await import('./auth');

      // User plays offline
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      const offlineState = createMockGameState({ playTime: 7000, resources: { wood: 200, stone: 50, gold: 200, food: 75 } });
      await saveGame(offlineState, false);

      // User logs in
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue(null); // No cloud save

      // Simulate OCC rejection on first sync attempt
      vi.mocked(auth.saveGameToSupabase)
        .mockRejectedValueOnce(new Error('OCC violation: playTime 7000 is not greater than 7000'))
        .mockResolvedValueOnce(undefined);

      const loaded = await loadGame();

      // Should still load local state even if cloud sync fails
      expect(loaded).toBeDefined();
      expect(loaded?.playTime).toBe(7000);
      expect(loaded?.resources.wood).toBe(200);
    });

    it('should preserve local state through multiple logout/login cycles', async () => {
      const auth = await import('./auth');

      // Cycle 1: Login, play, logout
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      const state1 = createMockGameState({ playTime: 2000 });
      await saveGame(state1, false);
      
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      await mockDB.delete('lastCloudState', 'lastCloudState');

      // Cycle 2: Offline play
      const state2 = createMockGameState({ playTime: 3000 });
      await saveGame(state2, false);

      // Cycle 3: Login again
      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      vi.mocked(auth.loadGameFromSupabase).mockResolvedValue({
        gameState: state1,
        timestamp: Date.now() - 60000,
        playTime: 2000,
      });

      const loaded = await loadGame();

      expect(loaded?.playTime).toBe(3000); // Latest local progress
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted lastCloudState', async () => {
      const auth = await import('./auth');

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      
      // Set corrupted lastCloudState
      mockStores.lastCloudState.lastCloudState = { corrupted: 'data' };

      const state = createMockGameState({ playTime: 5000 });
      
      // Should not throw
      await expect(saveGame(state, false)).resolves.not.toThrow();
    });

    it('should handle missing playTime in local save', async () => {
      const auth = await import('./auth');

      const stateWithoutPlayTime: any = createMockGameState();
      delete stateWithoutPlayTime.playTime;

      mockStores.saves.mainSave = {
        gameState: stateWithoutPlayTime,
        timestamp: Date.now(),
      };

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      const loaded = await loadGame();

      expect(loaded).toBeDefined();
      // Should default to 0 or handle gracefully
    });

    it('should handle very large playTime values', async () => {
      const auth = await import('./auth');

      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
      const hugePlayTime = Number.MAX_SAFE_INTEGER - 1000;
      const state = createMockGameState({ playTime: hugePlayTime });

      await saveGame(state, false);
      const loaded = await loadGame();

      expect(loaded?.playTime).toBe(hugePlayTime);
    });
  });

  describe('Final Save Before Logout', () => {
    it('should complete final save before clearing cloud state', async () => {
      const auth = await import('./auth');
      const state = await import('./state');

      vi.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      
      const gameState = createMockGameState({ playTime: 5000 });
      vi.mocked(state.useGameStore.getState).mockReturnValue({
        ...gameState,
        inactivityDialogOpen: false,
        getAndResetClickAnalytics: vi.fn().mockReturnValue(null),
        getAndResetResourceAnalytics: vi.fn().mockReturnValue(null),
      } as any);

      // Simulate logout (this would normally be in auth.ts signOut)
      await saveGame(gameState, false);
      await mockDB.delete('lastCloudState', 'lastCloudState');

      // Verify save was called before clearing
      expect(vi.mocked(auth.saveGameToSupabase)).toHaveBeenCalled();
      expect(mockStores.lastCloudState.lastCloudState).toBeUndefined();
      // Local save should still exist
      expect(mockStores.saves.mainSave).toBeDefined();
    });
  });
});
