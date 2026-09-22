// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "./state";
import { startGameLoop, stopGameLoop } from "./loop";
import { setGameTabHiddenForTests } from "@/lib/tabVisibility";

describe("game loop scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().initialize();
    setGameTabHiddenForTests(false);
  });

  afterEach(() => {
    stopGameLoop();
    setGameTabHiddenForTests(null);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("advances about four times a second without requestAnimationFrame", () => {
    const raf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);

    startGameLoop();
    vi.advanceTimersByTime(1000);

    const playTime = useGameStore.getState().playTime;
    expect(playTime).toBeGreaterThanOrEqual(750);
    expect(playTime).toBeLessThanOrEqual(1250);
    expect(raf).not.toHaveBeenCalled();
  });

  it("does not simulate while the page is hidden, then runs again when shown", () => {
    startGameLoop();
    vi.advanceTimersByTime(500);
    const whileVisible = useGameStore.getState().playTime;
    expect(whileVisible).toBeGreaterThan(0);

    setGameTabHiddenForTests(true);
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(5000);
    expect(useGameStore.getState().playTime).toBe(whileVisible);

    setGameTabHiddenForTests(false);
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(300);
    expect(useGameStore.getState().playTime).toBeGreaterThan(whileVisible);
  });
});
