/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCssTimedWipeStyle,
  getUiClockSubscriberCount,
  isUiClockRunning,
  resetUiClockForTests,
  UI_CLOCK_PERIOD_MS,
  useUiNow,
  useUntilTimestamp,
} from "./uiClock";

describe("getCssTimedWipeStyle", () => {
  it("seeks a fill wipe with a negative delay", () => {
    const wipe = getCssTimedWipeStyle({
      startMs: 1_000,
      durationMs: 10_000,
      mode: "fill",
      nowMs: 6_000,
    });
    expect(wipe.className).toContain("adc-progress-wipe--fill");
    expect(wipe.style.animationDuration).toBe("10000ms");
    expect(wipe.style.animationDelay).toBe("-5000ms");
    expect(wipe.style.width).toBe("100%");
    expect(wipe.style.transform).toBe("scaleX(0.5)");
    expect(wipe.style.transformOrigin).toBe("left center");
  });

  it("seeks a recede wipe from the same elapsed fraction", () => {
    const wipe = getCssTimedWipeStyle({
      startMs: 0,
      durationMs: 4_000,
      mode: "recede",
      nowMs: 1_000,
    });
    expect(wipe.className).toContain("adc-progress-wipe--recede");
    expect(wipe.style.animationDuration).toBe("4000ms");
    expect(wipe.style.animationDelay).toBe("-1000ms");
    expect(wipe.style.width).toBe("100%");
    expect(wipe.style.transform).toBe("scaleX(0.75)");
  });

  it("snaps to the finished scale when time is up", () => {
    const fill = getCssTimedWipeStyle({
      startMs: 0,
      durationMs: 1_000,
      mode: "fill",
      nowMs: 1_000,
    });
    expect(fill.className).toBe("");
    expect(fill.style.width).toBe("100%");
    expect(fill.style.transform).toBe("scaleX(1)");

    const recede = getCssTimedWipeStyle({
      startMs: 0,
      durationMs: 1_000,
      mode: "recede",
      nowMs: 2_000,
    });
    expect(recede.style.width).toBe("100%");
    expect(recede.style.transform).toBe("scaleX(0)");
  });
});

describe("useUntilTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("stays true until the deadline, then flips once without an interval", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const endMs = Date.now() + 1_000;
    const { result } = renderHook(() => useUntilTimestamp(endMs));

    expect(result.current).toBe(true);
    expect(
      setIntervalSpy.mock.calls.some(([, ms]) => ms === 100),
    ).toBe(false);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current).toBe(false);
  });

  it("is false when idle or already expired", () => {
    expect(renderHook(() => useUntilTimestamp(null)).result.current).toBe(false);
    expect(renderHook(() => useUntilTimestamp(0)).result.current).toBe(false);
    expect(
      renderHook(() => useUntilTimestamp(Date.now() - 1)).result.current,
    ).toBe(false);
  });
});

describe("useUiNow", () => {
  beforeEach(() => {
    resetUiClockForTests();
  });

  afterEach(() => {
    cleanup();
    resetUiClockForTests();
  });

  it("shares one interval across subscribers and stops when idle", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    const first = renderHook(() => useUiNow(true));
    const second = renderHook(() => useUiNow(true));

    expect(getUiClockSubscriberCount()).toBe(2);
    expect(isUiClockRunning()).toBe(true);
    expect(
      setIntervalSpy.mock.calls.filter(([, ms]) => ms === UI_CLOCK_PERIOD_MS),
    ).toHaveLength(1);

    first.unmount();
    expect(getUiClockSubscriberCount()).toBe(1);
    expect(isUiClockRunning()).toBe(true);

    second.unmount();
    expect(getUiClockSubscriberCount()).toBe(0);
    expect(isUiClockRunning()).toBe(false);

    setIntervalSpy.mockRestore();
  });

  it("does not arm the clock when inactive", () => {
    const { result } = renderHook(() => useUiNow(false));
    expect(result.current).toBeGreaterThan(0);
    expect(isUiClockRunning()).toBe(false);
    expect(getUiClockSubscriberCount()).toBe(0);
  });
});
