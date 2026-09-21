/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  getTabVisibleEpoch,
  initTabVisibilityClass,
  isGameTabHidden,
  setGameTabHiddenForTests,
  subscribeGameTabHidden,
} from "./tabVisibility";

describe("tabVisibility", () => {
  afterEach(() => {
    setGameTabHiddenForTests(null);
  });

  it("increments the visible epoch only when going from hidden to visible", () => {
    setGameTabHiddenForTests(false);
    const epoch = getTabVisibleEpoch();

    setGameTabHiddenForTests(true);
    expect(isGameTabHidden()).toBe(true);
    expect(getTabVisibleEpoch()).toBe(epoch);

    setGameTabHiddenForTests(false);
    expect(isGameTabHidden()).toBe(false);
    expect(getTabVisibleEpoch()).toBe(epoch + 1);

    setGameTabHiddenForTests(false);
    expect(getTabVisibleEpoch()).toBe(epoch + 1);
  });

  it("resyncs from window focus so a missed visibilitychange cannot stick", () => {
    initTabVisibilityClass();
    const calls: boolean[] = [];
    const unsubscribe = subscribeGameTabHidden(() => {
      calls.push(isGameTabHidden());
    });

    window.dispatchEvent(new Event("focus"));
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.at(-1)).toBe(false);

    unsubscribe();
  });
});
