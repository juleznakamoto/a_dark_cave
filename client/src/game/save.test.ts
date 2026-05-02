
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveGame, loadGame } from './save';
import { GameState } from '@shared/schema';

vi.mock('idb');
vi.mock('./auth');
vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn().mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() })),
  }),
}));

describe('Game Save/Load', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const auth = await import('./auth');
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
    vi.mocked(auth.processReferralAfterConfirmation).mockResolvedValue(undefined);
  });

  it('should preserve cooldowns after save/load cycle', async () => {
    const gameState: Partial<GameState> = {
      cooldowns: {
        gatherWood: 5,
        buildHut: 10,
      },
      cooldownDurations: {
        gatherWood: 5,
        buildHut: 10,
      },
      playTime: 1000,
    };

    // Mock IndexedDB
    const mockDB = {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({
        gameState,
        timestamp: Date.now(),
        playTime: 1000,
      }),
    };

    const { openDB } = await import('idb');
    vi.mocked(openDB).mockResolvedValue(mockDB as any);

    await saveGame(gameState as GameState, 1000);
    const loaded = await loadGame();

    expect(loaded?.cooldowns).toEqual(gameState.cooldowns);
    expect(loaded?.cooldownDurations).toEqual(gameState.cooldownDurations);
  }, 15_000);

  it('should handle corrupted save data gracefully', async () => {
    const mockDB = {
      get: vi.fn().mockResolvedValue({
        gameState: { invalid: 'data' }, // Missing required fields like resources
        timestamp: Date.now(),
      }),
    };

    const { openDB } = await import('idb');
    vi.mocked(openDB).mockResolvedValue(mockDB as any);

    const loaded = await loadGame();
    // Should return the corrupted data with defaults applied, not null
    expect(loaded).toBeDefined();
    expect(loaded?.cooldownDurations).toBeDefined();
  });

  it('should merge cloud save with local save correctly', async () => {
    // Test OCC (Optimistic Concurrency Control) logic
    const localState = {
      resources: { wood: 100, stone: 50 },
      playTime: 1000,
    };

    const cloudState = {
      resources: { wood: 150, stone: 75 },
      playTime: 1500,
    };

    const mockDB = {
      get: vi.fn()
        .mockResolvedValueOnce({ gameState: localState, playTime: 1000 })
        .mockResolvedValueOnce({ gameState: cloudState, playTime: 1500 }),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const { openDB } = await import('idb');
    vi.mocked(openDB).mockResolvedValue(mockDB as any);

    const { getCurrentUser, loadGameFromSupabase } = await import('./auth');
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123', email: 'test@test.com' });
    vi.mocked(loadGameFromSupabase).mockResolvedValue({
      gameState: cloudState as GameState,
      playTime: 1500,
      timestamp: Date.now(),
    });

    const loaded = await loadGame();
    expect(loaded?.resources.wood).toBe(150); // Cloud should win
  });
});
