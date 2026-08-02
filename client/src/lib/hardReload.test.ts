/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  HARD_RELOAD_CACHE_BUST_PARAM,
  MODULE_LOAD_RETRY_KEY,
  canAutoReloadForStaleChunk,
  clearStaleChunkReloadGuard,
  isStaleChunkLoadFailure,
  recoverFromStaleChunkLoad,
  stripHardReloadCacheBustParam,
  tryOneModuleLoadRecovery,
} from "./hardReload";

describe("stripHardReloadCacheBustParam", () => {
  let originalHref: string;

  beforeEach(() => {
    originalHref = window.location.href;
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    window.history.replaceState({}, "", originalHref);
  });

  it("returns false when _cb is absent", () => {
    window.history.replaceState({}, "", "/");
    expect(stripHardReloadCacheBustParam()).toBe(false);
    expect(window.location.search).toBe("");
  });

  it("removes _cb and preserves other query params", () => {
    window.history.replaceState(
      {},
      "",
      `/?${HARD_RELOAD_CACHE_BUST_PARAM}=123&game=true`,
    );
    expect(stripHardReloadCacheBustParam()).toBe(true);
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?game=true");
  });
});

describe("isStaleChunkLoadFailure", () => {
  it("matches Chromium dynamic import errors", () => {
    expect(
      isStaleChunkLoadFailure(
        new Error(
          'Failed to fetch dynamically imported module: https://a-dark-cave.com/assets/game-abc.js',
        ),
      ),
    ).toBe(true);
  });

  it("matches Firefox and Safari wording", () => {
    expect(
      isStaleChunkLoadFailure(
        new Error("error loading dynamically imported module"),
      ),
    ).toBe(true);
    expect(
      isStaleChunkLoadFailure(new Error("Importing a module script failed.")),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isStaleChunkLoadFailure(new Error("Cannot read properties of null"))).toBe(
      false,
    );
  });
});

describe("recoverFromStaleChunkLoad", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("location", {
      ...originalLocation,
      href: "https://a-dark-cave.com/",
      replace: vi.fn(),
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("hard-reloads once for a stale chunk error", () => {
    const handled = recoverFromStaleChunkLoad(
      new Error("Failed to fetch dynamically imported module: /assets/x.js"),
    );
    expect(handled).toBe(true);
    expect(canAutoReloadForStaleChunk()).toBe(false);
    expect(window.location.replace).toHaveBeenCalled();
    const url = String(vi.mocked(window.location.replace).mock.calls[0][0]);
    expect(url).toContain(`${HARD_RELOAD_CACHE_BUST_PARAM}=`);
  });

  it("does not reload for unrelated errors", () => {
    expect(recoverFromStaleChunkLoad(new Error("boom"))).toBe(false);
    expect(window.location.replace).not.toHaveBeenCalled();
  });

  it("does not loop after the one-shot guard is set", () => {
    sessionStorage.setItem(MODULE_LOAD_RETRY_KEY, String(Date.now()));
    const handled = recoverFromStaleChunkLoad(
      new Error("Failed to fetch dynamically imported module"),
    );
    expect(handled).toBe(true);
    expect(window.location.replace).not.toHaveBeenCalled();
  });

  it("allows another retry after clearStaleChunkReloadGuard", () => {
    sessionStorage.setItem(MODULE_LOAD_RETRY_KEY, String(Date.now()));
    clearStaleChunkReloadGuard();
    expect(canAutoReloadForStaleChunk()).toBe(true);
    expect(
      recoverFromStaleChunkLoad(
        new Error("Failed to fetch dynamically imported module"),
      ),
    ).toBe(true);
    expect(window.location.replace).toHaveBeenCalled();
  });
});

describe("tryOneModuleLoadRecovery", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("location", {
      ...originalLocation,
      href: "https://a-dark-cave.com/",
      replace: vi.fn(),
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("reloads once for a stuck spinner", () => {
    expect(tryOneModuleLoadRecovery(new Error("spinner stuck"))).toBe(true);
    expect(window.location.replace).toHaveBeenCalled();
    expect(tryOneModuleLoadRecovery(new Error("spinner stuck again"))).toBe(
      false,
    );
  });
});
