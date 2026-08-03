import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockLoadGame, mockSetState } = vi.hoisted(() => ({
  mockLoadGame: vi.fn(),
  mockSetState: vi.fn(),
}));

vi.mock("./state", () => ({
  useGameStore: {
    getState: () => ({ loadGame: mockLoadGame }),
    setState: mockSetState,
  },
}));

describe("startup game hydration handoff", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLoadGame.mockReset();
    mockSetState.mockReset();
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
});
