import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockInvoke, mockGetSession, mockGetSupabaseClient } = vi.hoisted(() => {
  const mockInvoke = vi.fn();
  const mockGetSession = vi.fn();
  const mockGetSupabaseClient = vi.fn();
  return { mockInvoke, mockGetSession, mockGetSupabaseClient };
});

vi.mock("idb", () => ({
  openDB: vi.fn().mockResolvedValue({
    put: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn(),
  }),
}));

vi.mock("./auth", () => ({
  getCurrentUser: vi.fn(),
  saveGameToSupabase: vi.fn(),
  loadGameFromSupabase: vi.fn(),
  processReferralAfterConfirmation: vi.fn().mockResolvedValue(undefined),
  flushPendingReferralToUserMetadata: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./state", () => ({
  useGameStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

vi.mock("./saveGameV2", () => ({
  dualWriteSaveGameV2: vi.fn().mockResolvedValue(undefined),
  isSaveGameV2CloudEnabled: vi.fn().mockReturnValue(false),
  isSaveGameV2RichEnabled: vi.fn().mockReturnValue(false),
  SAVE_SCHEMA_VERSION_V2: 1,
}));

vi.mock("./steamSaveAdapter", () => ({
  writeSteamCloudSave: vi.fn(),
  readSteamCloudSave: vi.fn().mockResolvedValue(null),
  pickNewerSave: vi.fn((a: unknown) => a),
}));

import { saveGame, isSaveFullReplaceEnabled } from "./save";
import * as auth from "./auth";
import { useGameStore } from "./state";
import type { GameState } from "@shared/schema";

describe("save full replace (V1 flagged)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSupabaseClient.mockResolvedValue({
      auth: { getSession: mockGetSession },
      functions: { invoke: mockInvoke },
    });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    vi.mocked(auth.getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "t@example.com",
    } as any);

    vi.mocked(useGameStore.getState).mockReturnValue({
      inactivityDialogOpen: false,
      isUserSignedIn: true,
      getAndResetClickAnalytics: vi.fn().mockReturnValue(null),
      getAndResetResourceAnalytics: vi.fn().mockReturnValue(null),
    } as any);
  });

  it("enables full replace by default", () => {
    expect(isSaveFullReplaceEnabled()).toBe(true);
  });

  it("sends full state + fullReplace:true on cloud save", async () => {
    const state = {
      playTime: 1234.7,
      resources: { wood: 10, stone: 0, gold: 0, food: 0 },
      flags: { gameStarted: true },
      tools: { stone_axe: true },
      buildings: {},
      villagers: {},
      stats: { luck: 0, strength: 0, knowledge: 0, madness: 0 },
      story: { seen: {} },
      events: {},
      log: [],
      cooldowns: {},
      cooldownDurations: {},
      attackWaveTimers: {},
      activatedPurchases: {},
      claimedAchievements: {},
      unlockedAchievements: {},
      startTime: Date.now(),
      isNewGame: false,
      isPaused: false,
      effects: {},
      bastion_stats: { armor: 0, damage: 0 },
      cruelMode: false,
      feastActivations: {},
      loopProgress: 0,
      isGameLoopActive: true,
      musicMuted: false,
      sfxMuted: false,
      boostApplied: false,
      referrals: [],
      social_media_rewards: {},
      lastResourceSnapshotTime: 0,
      highlightedResources: [],
      curseState: { isActive: false, startTime: 0, duration: 0 },
      frostfallState: { isActive: false, startTime: 0, duration: 0 },
      lastFreeGoldClaim: 0,
      hoveredTooltips: new Set(),
      inactivityDialogOpen: false,
      current_population: 0,
      total_population: 0,
      items: {},
      skills: {},
      activeTab: "cave",
      devMode: false,
      idleModeState: { isActive: false, startTime: 0, needsDisplay: false },
      authNotificationSeen: false,
      authNotificationVisible: false,
    } as unknown as GameState;

    await saveGame(state, true);

    expect(mockInvoke).toHaveBeenCalledWith(
      "save-game",
      expect.objectContaining({
        body: expect.objectContaining({
          fullReplace: true,
          gameStateDiff: expect.objectContaining({
            playTime: 1234,
            tools: { stone_axe: true },
            resources: expect.objectContaining({ wood: 10 }),
          }),
        }),
      }),
    );
  });
});
