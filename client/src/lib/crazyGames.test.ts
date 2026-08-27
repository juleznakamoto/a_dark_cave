/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function stubSdk(init: () => Promise<void>): void {
  window.CrazyGames = {
    SDK: {
      init,
      data: {
        getItem: () => null,
        setItem: () => { },
        removeItem: () => { },
        clear: () => { },
      },
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
