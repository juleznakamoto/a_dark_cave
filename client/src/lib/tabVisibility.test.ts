/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
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

  it("flags the document while the window is in the background", () => {
    initTabVisibilityClass();
    const root = document.documentElement;
    const hasFocus = vi.spyOn(document, "hasFocus");

    hasFocus.mockReturnValue(false);
    window.dispatchEvent(new Event("blur"));
    expect(root.hasAttribute("data-window-inactive")).toBe(true);

    hasFocus.mockReturnValue(true);
    window.dispatchEvent(new Event("focus"));
    expect(root.hasAttribute("data-window-inactive")).toBe(false);

    hasFocus.mockRestore();
  });

  it("stays active when focus moves into an iframe on the page", () => {
    initTabVisibilityClass();
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true);

    window.dispatchEvent(new Event("blur"));
    expect(document.documentElement.hasAttribute("data-window-inactive")).toBe(false);

    hasFocus.mockRestore();
  });
});
