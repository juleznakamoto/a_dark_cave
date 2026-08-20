/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveGame = vi.fn().mockResolvedValue({
  localSaved: true,
  cloudSaved: false,
  cloudSkipped: true,
});
const buildGameState = vi.fn((state: unknown) => state);
const steamOnWillQuit = vi.fn();
const steamNotifyQuitSaveComplete = vi.fn();
const getState = vi.fn();

vi.mock("./save", () => ({
  saveGame: (...args: unknown[]) => saveGame(...args),
}));

vi.mock("./stateHelpers", () => ({
  buildGameState: (state: unknown) => buildGameState(state),
}));

vi.mock("./state", () => ({
  useGameStore: {
    getState: () => getState(),
  },
}));

vi.mock("@/lib/steam", () => ({
  steamOnWillQuit: (cb: () => void) => steamOnWillQuit(cb),
  steamNotifyQuitSaveComplete: () => steamNotifyQuitSaveComplete(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("flushSaveOnExit", () => {
  beforeEach(() => {
    saveGame.mockClear();
    buildGameState.mockClear();
    steamNotifyQuitSaveComplete.mockClear();
    steamOnWillQuit.mockReset();
    steamOnWillQuit.mockReturnValue(vi.fn());
    getState.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("shouldFlushLiveGameOnExit is true only for a started or looping game", async () => {
    const { shouldFlushLiveGameOnExit } = await import("./flushSaveOnExit");
    expect(shouldFlushLiveGameOnExit({})).toBe(false);
    expect(shouldFlushLiveGameOnExit({ flags: { gameStarted: false } })).toBe(
      false,
    );
    expect(shouldFlushLiveGameOnExit({ flags: { gameStarted: true } })).toBe(
      true,
    );
    expect(shouldFlushLiveGameOnExit({ isGameLoopActive: true })).toBe(true);
  });

  it("does not write a start-screen store on pagehide", async () => {
    getState.mockReturnValue({
      flags: { gameStarted: false },
      isGameLoopActive: false,
    });
    const { installFlushSaveOnExit } = await import("./flushSaveOnExit");
    const stop = installFlushSaveOnExit();
    window.dispatchEvent(new Event("pagehide"));
    await Promise.resolve();
    expect(saveGame).not.toHaveBeenCalled();
    stop();
  });

  it("force-saves a live game on pagehide", async () => {
    const live = {
      flags: { gameStarted: true },
      isGameLoopActive: true,
      resources: { wood: 3 },
    };
    getState.mockReturnValue(live);
    const { installFlushSaveOnExit } = await import("./flushSaveOnExit");
    const stop = installFlushSaveOnExit();
    window.dispatchEvent(new Event("pagehide"));
    await vi.waitFor(() => {
      expect(saveGame).toHaveBeenCalledWith(live, false, { force: true });
    });
    stop();
  });

  it("saves then acks when Steam asks to quit", async () => {
    let willQuit: (() => void) | undefined;
    steamOnWillQuit.mockImplementation((cb: () => void) => {
      willQuit = cb;
      return vi.fn();
    });
    getState.mockReturnValue({
      flags: { gameStarted: true },
      isGameLoopActive: true,
    });
    const { installFlushSaveOnExit } = await import("./flushSaveOnExit");
    const stop = installFlushSaveOnExit();
    willQuit?.();
    await vi.waitFor(() => {
      expect(saveGame).toHaveBeenCalledWith(
        expect.objectContaining({ flags: { gameStarted: true } }),
        false,
        { force: true },
      );
      expect(steamNotifyQuitSaveComplete).toHaveBeenCalled();
    });
    stop();
  });

  it("acks Steam quit without saving when no live game is loaded", async () => {
    let willQuit: (() => void) | undefined;
    steamOnWillQuit.mockImplementation((cb: () => void) => {
      willQuit = cb;
      return vi.fn();
    });
    getState.mockReturnValue({
      flags: { gameStarted: false },
      isGameLoopActive: false,
    });
    const { installFlushSaveOnExit } = await import("./flushSaveOnExit");
    const stop = installFlushSaveOnExit();
    willQuit?.();
    await vi.waitFor(() => {
      expect(steamNotifyQuitSaveComplete).toHaveBeenCalled();
    });
    expect(saveGame).not.toHaveBeenCalled();
    stop();
  });
});
