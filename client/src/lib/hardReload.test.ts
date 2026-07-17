import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  HARD_RELOAD_CACHE_BUST_PARAM,
  stripHardReloadCacheBustParam,
} from "./hardReload";

describe("stripHardReloadCacheBustParam", () => {
  const originalHref = window.location.href;

  beforeEach(() => {
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
