// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCappedPaintLoop } from "./cappedFrameLoop";

/**
 * The old shader loops called requestAnimationFrame on every refresh and
 * returned until the cap elapsed. That is one wakeup per display frame.
 * The capped loop should take about one animation frame per paint.
 */
function displayRateWakeups(durationMs: number, refreshHz: number): number {
  return Math.floor(durationMs / (1000 / refreshHz));
}

describe("createCappedPaintLoop", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("asks for a frame only when a paint is due, not on every refresh", () => {
    vi.useFakeTimers();
    let now = 0;
    let rafCount = 0;
    let paints = 0;
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCount += 1;
      return setTimeout(() => {
        now += 1000 / 120;
        cb(now);
      }, 1000 / 120) as unknown as number;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });

    const intervalMs = 1000 / 12;
    const durationMs = 2000;
    const loop = createCappedPaintLoop(intervalMs, () => {
      paints += 1;
    });
    loop.start();
    vi.advanceTimersByTime(durationMs);
    loop.stop();

    const oldWakeups = displayRateWakeups(durationMs, 120);
    // 12 paints/s would be 24 over 2s. The timer-then-frame gap is a bit
    // longer than 1/12s, so allow some slack, and require a large drop
    // versus a 120 Hz spin. Measured on a 120 Hz fake clock over 2s:
    // 22 animation frames versus 239 for the old every-refresh spin.
    expect(paints).toBeGreaterThanOrEqual(16);
    expect(paints).toBeLessThanOrEqual(26);
    expect(rafCount).toBe(paints);
    expect(rafCount).toBeLessThan(oldWakeups / 6);
  });

  it("does not schedule paints while the page is hidden", () => {
    vi.useFakeTimers();
    let hidden = false;
    let rafCount = 0;
    let paints = 0;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCount += 1;
      return setTimeout(() => cb(0), 0) as unknown as number;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });

    const loop = createCappedPaintLoop(1000 / 12, () => {
      paints += 1;
    });
    loop.start();
    vi.advanceTimersByTime(200);
    const paintsBeforeHide = paints;
    const rafBeforeHide = rafCount;

    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(2000);

    expect(paints).toBe(paintsBeforeHide);
    expect(rafCount).toBe(rafBeforeHide);

    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(50);
    expect(paints).toBeGreaterThan(paintsBeforeHide);

    loop.stop();
  });
});
