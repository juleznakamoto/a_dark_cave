/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function stubSdk(
  init: () => Promise<void>,
  game?: { gameplayStart: () => void; gameplayStop: () => void },
): void {
  window.CrazyGames = {
    SDK: {
      init,
      data: {
        getItem: () => null,
        setItem: () => { },
        removeItem: () => { },
        clear: () => { },
      },
      game,
    },
  };
}

describe("initCrazyGamesSdk timeout", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.CrazyGames;
  });

  it("does not reject after init already succeeded", async () => {
    stubSdk(() => Promise.resolve());
    const rejections: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      rejections.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    const { initCrazyGamesSdk } = await import("./crazyGames");
    await expect(initCrazyGamesSdk()).resolves.toBe(true);

    await vi.advanceTimersByTimeAsync(8000);
    await Promise.resolve();

    process.off("unhandledRejection", onUnhandled);
    expect(rejections).toEqual([]);
  });

  it("times out when init never settles", async () => {
    stubSdk(() => new Promise(() => { }));
    const { initCrazyGamesSdk } = await import("./crazyGames");
    const init = initCrazyGamesSdk();
    const settled = vi.fn();
    void init.then(settled);

    await vi.advanceTimersByTimeAsync(7999);
    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(init).resolves.toBe(false);
  });

  it("uses Data persist when the SDK is injected even off /crazygames", async () => {
    stubSdk(() => Promise.resolve());
    const { shouldUseCrazyGamesPersist } = await import("./crazyGames");
    expect(shouldUseCrazyGamesPersist()).toBe(true);
  });
});

describe("CrazyGames gameplay signal", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete window.CrazyGames;
  });

  it("sends gameplayStart once when play begins", async () => {
    const gameplayStart = vi.fn();
    const gameplayStop = vi.fn();
    stubSdk(() => Promise.resolve(), { gameplayStart, gameplayStop });
    const { syncCrazyGamesGameplay } = await import("./crazyGames");

    await syncCrazyGamesGameplay(true);
    await syncCrazyGamesGameplay(true);

    expect(gameplayStart).toHaveBeenCalledTimes(1);
    expect(gameplayStop).not.toHaveBeenCalled();
  });

  it("sends gameplayStop on a break and gameplayStart again on resume", async () => {
    const gameplayStart = vi.fn();
    const gameplayStop = vi.fn();
    stubSdk(() => Promise.resolve(), { gameplayStart, gameplayStop });
    const { syncCrazyGamesGameplay } = await import("./crazyGames");

    await syncCrazyGamesGameplay(false);
    await syncCrazyGamesGameplay(true);
    await syncCrazyGamesGameplay(false);
    await syncCrazyGamesGameplay(true);

    expect(gameplayStop.mock.invocationCallOrder[0]).toBeGreaterThan(
      gameplayStart.mock.invocationCallOrder[0]!,
    );
    expect(gameplayStart).toHaveBeenCalledTimes(2);
    expect(gameplayStop).toHaveBeenCalledTimes(1);
  });

  it("applies a stop that was requested while init was still running", async () => {
    let finishInit: (() => void) | undefined;
    const gameplayStart = vi.fn();
    const gameplayStop = vi.fn();
    stubSdk(
      () =>
        new Promise<void>((resolve) => {
          finishInit = resolve;
        }),
      { gameplayStart, gameplayStop },
    );
    const { syncCrazyGamesGameplay } = await import("./crazyGames");

    const started = syncCrazyGamesGameplay(true);
    const stopped = syncCrazyGamesGameplay(false);
    await vi.waitFor(() => {
      expect(finishInit).toBeTypeOf("function");
    });
    finishInit?.();
    await started;
    await stopped;

    expect(gameplayStart).toHaveBeenCalledTimes(1);
    expect(gameplayStop).toHaveBeenCalledTimes(1);
    expect(gameplayStop.mock.invocationCallOrder[0]).toBeGreaterThan(
      gameplayStart.mock.invocationCallOrder[0]!,
    );
  });

  it("does nothing when the SDK is absent", async () => {
    const { syncCrazyGamesGameplay } = await import("./crazyGames");
    await expect(syncCrazyGamesGameplay(true)).resolves.toBeUndefined();
  });
});
