import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeAuth: vi.fn(),
  applyCleanup: vi.fn(),
  getCurrentUser: vi.fn(),
  syncAuth: vi.fn(),
  flushMarketing: vi.fn(),
  consumePrepared: vi.fn(),
  loadGame: vi.fn(),
  setState: vi.fn(),
  getState: vi.fn(),
  rehydrateStartup: vi.fn(),
  processStripe: vi.fn(),
  startGameLoop: vi.fn(),
  saveGame: vi.fn(),
  ensureLocales: vi.fn(),
  mountFont: vi.fn(),
  syncSocial: vi.fn(),
  loadGameFromSupabase: vi.fn(),
}));

vi.mock("@/i18n/loadLocaleResources", () => ({
  ensureGameplayLocalesLoaded: () => mocks.ensureLocales(),
}));
vi.mock("@/lib/notoSansSymbols2FontFace", () => ({
  mountNotoSansSymbols2FontFace: () => mocks.mountFont(),
}));
vi.mock("@/game/startupUrlCleanup", () => ({
  consumeStartupAuthCallback: (...args: unknown[]) => mocks.consumeAuth(...args),
  applyStartupUrlCleanup: (...args: unknown[]) => mocks.applyCleanup(...args),
}));
vi.mock("@/game/auth", () => ({
  getCurrentUser: () => mocks.getCurrentUser(),
  syncStoreAuthFromSession: () => mocks.syncAuth(),
  flushPendingMarketingPreferences: () => mocks.flushMarketing(),
  loadGameFromSupabase: () => mocks.loadGameFromSupabase(),
}));
vi.mock("@/game/startupGameLoader", () => ({
  consumePreparedGameHydration: () => mocks.consumePrepared(),
}));
vi.mock("@/game/state", () => ({
  useGameStore: {
    getState: () => mocks.getState(),
    setState: (...args: unknown[]) => mocks.setState(...args),
  },
  StateManager: { scheduleEffectsUpdate: vi.fn() },
}));
vi.mock("@/game/loop", () => ({
  startGameLoop: () => mocks.startGameLoop(),
}));
vi.mock("@/game/save", () => ({
  saveGame: (...args: unknown[]) => mocks.saveGame(...args),
}));
vi.mock("@/game/shopPurchases", () => ({
  rehydratePurchasesOnStartup: (...args: unknown[]) =>
    mocks.rehydrateStartup(...args),
}));
vi.mock("@/lib/stripePaymentReturn", () => ({
  processStripePaymentReturn: () => mocks.processStripe(),
}));
vi.mock("@/game/socialPromoExclusiveReward", () => ({
  syncSocialPromoExclusiveRewardPending: () => mocks.syncSocial(),
}));
vi.mock("@/game/stateHelpers", () => ({
  getTransientDialogResetOnLoad: () => ({ authDialogOpen: false }),
}));
vi.mock("@/game/boost", () => ({
  canApplySaveBoost: () => false,
  applySaveBoost: vi.fn(),
}));
vi.mock("@/game/demoLimit", () => ({
  isDemoLimitReachedFromState: () => false,
}));
vi.mock("@/lib/edition", () => ({
  isLocalOnlyEdition: () => false,
  isDemoEdition: () => false,
  isSteamBuild: false,
}));
vi.mock("@/lib/utmLanding", () => ({
  reportUtmLanding: vi.fn(),
}));
vi.mock("@/lib/firaSansFontFace", () => ({
  mountFiraSansFontFace: vi.fn(),
}));
vi.mock("@/lib/audio", () => ({
  audioManager: {
    setMusicVolume: vi.fn(),
    setSfxVolume: vi.fn(),
    musicMute: vi.fn(),
    sfxMute: vi.fn(),
    loadGameSounds: vi.fn(async () => { }),
    startBackgroundMusic: vi.fn(async () => { }),
  },
}));

describe("runGameplayInitialization", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(mocks).forEach((fn) => {
      if (typeof fn === "function" && "mockReset" in fn) fn.mockReset();
    });
    mocks.ensureLocales.mockResolvedValue(undefined);
    mocks.consumeAuth.mockResolvedValue(undefined);
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.syncAuth.mockResolvedValue(false);
    mocks.flushMarketing.mockResolvedValue(undefined);
    mocks.consumePrepared.mockReturnValue(null);
    mocks.loadGame.mockResolvedValue(false);
    mocks.rehydrateStartup.mockResolvedValue([]);
    mocks.processStripe.mockResolvedValue(undefined);
    mocks.saveGame.mockResolvedValue({});
    mocks.loadGameFromSupabase.mockResolvedValue(null);
    mocks.getState.mockReturnValue({
      loadGame: mocks.loadGame,
      googleAdsSource: null,
      utmAttribution: null,
      flags: { gameStarted: false },
      musicVolume: 1,
      sfxVolume: 1,
      musicMuted: true,
      sfxMuted: true,
      referrals: [],
      addLogEntry: vi.fn(),
    });
  });

  it("paints after local hydrate and defers auth until background", async () => {
    const { runGameplayInitialization } = await import(
      "./gameplayInitOrchestrator"
    );

    const result = await runGameplayInitialization({
      pathname: "/",
      search: "",
      hash: "",
    });

    expect(mocks.loadGame).toHaveBeenCalledWith({ cloud: false });
    expect(mocks.startGameLoop).toHaveBeenCalledOnce();

    await result.background;

    expect(mocks.consumeAuth).toHaveBeenCalled();
    expect(mocks.getCurrentUser).toHaveBeenCalled();
    expect(mocks.rehydrateStartup).toHaveBeenCalled();
    expect(mocks.startGameLoop.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.consumeAuth.mock.invocationCallOrder[0],
    );
  });

  it("consumes auth before cleanup and skips a second load when prepared", async () => {
    mocks.consumePrepared.mockReturnValue({ hadPersistedSave: true });
    const { runGameplayInitialization } = await import(
      "./gameplayInitOrchestrator"
    );

    const result = await runGameplayInitialization({
      pathname: "/",
      search: "",
      hash: "#access_token=tok",
    });

    expect(mocks.loadGame).not.toHaveBeenCalled();
    expect(result.hadPersistedSave).toBe(true);
    expect(mocks.startGameLoop).toHaveBeenCalledOnce();

    await result.background;

    expect(mocks.consumeAuth).toHaveBeenCalled();
    const consumeOrder = mocks.consumeAuth.mock.invocationCallOrder[0];
    const cleanupOrder = mocks.applyCleanup.mock.invocationCallOrder[0];
    expect(consumeOrder).toBeLessThan(cleanupOrder);
    expect(mocks.loadGame).not.toHaveBeenCalled();
  });

  it("skips loadGame when Make Fire already started the run", async () => {
    mocks.consumePrepared.mockReturnValue(null);
    mocks.getState.mockReturnValue({
      loadGame: mocks.loadGame,
      flags: { gameStarted: true },
      googleAdsSource: null,
      utmAttribution: null,
      musicVolume: 1,
      sfxVolume: 1,
      musicMuted: true,
      sfxMuted: true,
      referrals: [],
      addLogEntry: vi.fn(),
    });
    const { runGameplayInitialization } = await import(
      "./gameplayInitOrchestrator"
    );

    const result = await runGameplayInitialization({
      pathname: "/",
      search: "",
      hash: "",
    });

    await result.background;

    expect(mocks.loadGame).not.toHaveBeenCalled();
    expect(result.hadPersistedSave).toBe(false);
  });

  it("skips startup purchase rehydrate on payment return", async () => {
    const { runGameplayInitialization } = await import(
      "./gameplayInitOrchestrator"
    );

    const result = await runGameplayInitialization({
      pathname: "/",
      search: "?payment_intent=pi_1&redirect_status=succeeded",
      hash: "",
    });
    await result.background;

    expect(mocks.rehydrateStartup).toHaveBeenCalledWith({
      paymentReturn: true,
      skipIfPaymentReturn: true,
    });
    expect(mocks.processStripe).toHaveBeenCalledOnce();
  });
});
