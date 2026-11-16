/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  getTabVisibleEpoch,
  initTabVisibilityClass,
  isGameTabHidden,
  setGameTabHiddenForTests,
  setNativeAppBackgrounded,
  subscribeGameTabHidden,
} from "./tabVisibility";

describe("tabVisibility", () => {
  afterEach(() => {
    setGameTabHiddenForTests(null);
    setNativeAppBackgrounded(false);
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

  it("treats the iOS app as hidden while document.hidden stays false", () => {
    initTabVisibilityClass();
    expect(isGameTabHidden()).toBe(false);
    setNativeAppBackgrounded(true);
    expect(isGameTabHidden()).toBe(true);
    expect(document.documentElement.hasAttribute("data-tab-hidden")).toBe(true);
    setNativeAppBackgrounded(false);
    expect(isGameTabHidden()).toBe(false);
    expect(document.documentElement.hasAttribute("data-tab-hidden")).toBe(false);
  });
});
