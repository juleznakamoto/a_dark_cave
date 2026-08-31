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

  it("hydrates once across startup checking and Make Fire preparation", async () => {
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

  it("shares hydration when startup checking and Make Fire run concurrently", async () => {
    let resolveLoadGame!: (hadPersistedSave: boolean) => void;
    mockLoadGame.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveLoadGame = resolve;
        }),
    );
    const loader = await import("./startupGameLoader");

    const startupCheck = loader.loadStoreForStartupCheck();
    const makeFirePreparation = loader.prepareGameFromStartScreen({
      cruelMode: false,
      musicMuted: false,
      sfxMuted: false,
      musicVolume: 1,
      sfxVolume: 1,
    });

    expect(mockLoadGame).toHaveBeenCalledOnce();

    resolveLoadGame(false);
    await Promise.all([startupCheck, makeFirePreparation]);

    expect(mockLoadGame).toHaveBeenCalledOnce();
    expect(loader.consumePreparedGameHydration()).toEqual({
      hadPersistedSave: false,
    });
  });

  it("does not re-run Make Fire when the save is already started", async () => {
    mockFlags.gameStarted = true;
    const loader = await import("./startupGameLoader");

    loader.commitMakeFireStart({
      cruelMode: true,
      musicMuted: false,
      sfxMuted: false,
      musicVolume: 1,
      sfxVolume: 1,
    });

    expect(mockSetState).toHaveBeenCalledWith({
      cruelMode: true,
      musicMuted: false,
      sfxMuted: false,
      musicVolume: 1,
      sfxVolume: 1,
    });
    expect(mockExecuteAction).not.toHaveBeenCalled();
    expect(mockTrackButtonClick).not.toHaveBeenCalled();
  });

  it("forces gameStarted when Make Fire executeAction is a no-op", async () => {
    const loader = await import("./startupGameLoader");
    mockExecuteAction.mockImplementation(() => {
      mockFlags.gameStarted = false;
    });

    loader.commitMakeFireStart({
      cruelMode: false,
      musicMuted: false,
      sfxMuted: false,
      musicVolume: 1,
      sfxVolume: 1,
    });

    expect(mockExecuteAction).toHaveBeenCalledWith("makeFire");
    expect(mockSetState).toHaveBeenCalledWith({
      flags: {
        gameStarted: true,
        villagerCapsEnabled: true,
      },
    });
  });
});
