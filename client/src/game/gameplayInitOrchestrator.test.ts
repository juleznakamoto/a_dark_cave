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
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  it("consumes auth before cleanup and skips a second load when prepared", async () => {
    mocks.consumePrepared.mockReturnValue({ hadPersistedSave: true });
    const { runGameplayInitialization } = await import(
      "./gameplayInitOrchestrator"
    );

    const result = await runGameplayInitialization({
      pathname: "/",
      search: "#access_token=tok".startsWith("#") ? "" : "",
      hash: "#access_token=tok",
    });

    expect(mocks.consumeAuth).toHaveBeenCalled();
    const consumeOrder = mocks.consumeAuth.mock.invocationCallOrder[0];
    const cleanupOrder = mocks.applyCleanup.mock.invocationCallOrder[0];
    expect(consumeOrder).toBeLessThan(cleanupOrder);
    expect(mocks.loadGame).not.toHaveBeenCalled();
    expect(result.hadPersistedSave).toBe(true);
    expect(mocks.startGameLoop).toHaveBeenCalledOnce();
  });

  it("skips startup purchase rehydrate on payment return", async () => {
    const { runGameplayInitialization } = await import(
      "./gameplayInitOrchestrator"
    );

    await runGameplayInitialization({
      pathname: "/",
      search: "?payment_intent=pi_1&redirect_status=succeeded",
      hash: "",
    });

    expect(mocks.rehydrateStartup).toHaveBeenCalledWith({
      paymentReturn: true,
      skipIfPaymentReturn: true,
    });
    expect(mocks.processStripe).toHaveBeenCalledOnce();
  });
});
