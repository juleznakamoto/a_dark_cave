import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockLoadGame, mockSetState, mockTrackButtonClick, mockExecuteAction, mockFlags } =
  vi.hoisted(() => ({
    mockLoadGame: vi.fn(),
    mockSetState: vi.fn(),
    mockTrackButtonClick: vi.fn(),
    mockExecuteAction: vi.fn(),
    mockFlags: { gameStarted: false, villagerCapsEnabled: false },
  }));

vi.mock("./state", () => ({
  useGameStore: {
    getState: () => ({
      loadGame: mockLoadGame,
      trackButtonClick: mockTrackButtonClick,
      executeAction: mockExecuteAction,
      flags: mockFlags,
    }),
    setState: mockSetState,
  },
}));

describe("startup game hydration handoff", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLoadGame.mockReset();
    mockSetState.mockReset();
    mockTrackButtonClick.mockReset();
    mockExecuteAction.mockReset();
    mockFlags.gameStarted = false;
    mockFlags.villagerCapsEnabled = false;
    mockLoadGame.mockResolvedValue(true);
  });

  it("hydrates once across startup checking and Light Fire preparation", async () => {
    const loader = await import("./startupGameLoader");

    await loader.loadStoreForStartupCheck();
    await loader.prepareGameFromStartScreen({
      cruelMode: false,
      musicMuted: false,
      sfxMuted: false,
      musicVolume: 1,
      sfxVolume: 1,
    });

    expect(mockLoadGame).toHaveBeenCalledOnce();
    expect(loader.consumePreparedGameHydration()).toEqual({
      hadPersistedSave: true,
    });
    expect(loader.consumePreparedGameHydration()).toBeNull();
  });

  it("shares hydration when startup checking and Light Fire run concurrently", async () => {
    let resolveLoadGame!: (hadPersistedSave: boolean) => void;
    mockLoadGame.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveLoadGame = resolve;
        }),
    );
    const loader = await import("./startupGameLoader");

    const startupCheck = loader.loadStoreForStartupCheck();
    const lightFirePreparation = loader.prepareGameFromStartScreen({
      cruelMode: false,
      musicMuted: false,
      sfxMuted: false,
      musicVolume: 1,
      sfxVolume: 1,
    });

    expect(mockLoadGame).toHaveBeenCalledOnce();

    resolveLoadGame(false);
    await Promise.all([startupCheck, lightFirePreparation]);

    expect(mockLoadGame).toHaveBeenCalledOnce();
    expect(loader.consumePreparedGameHydration()).toEqual({
      hadPersistedSave: false,
    });
  });

  it("forces gameStarted when Light Fire executeAction is a no-op", async () => {
    const loader = await import("./startupGameLoader");
    mockExecuteAction.mockImplementation(() => {
      mockFlags.gameStarted = false;
    });

    loader.commitLightFireStart({
      cruelMode: false,
      musicMuted: false,
      sfxMuted: false,
      musicVolume: 1,
      sfxVolume: 1,
    });

    expect(mockExecuteAction).toHaveBeenCalledWith("lightFire");
    expect(mockSetState).toHaveBeenCalledWith({
      flags: {
        gameStarted: true,
        villagerCapsEnabled: true,
      },
    });
  });
});
