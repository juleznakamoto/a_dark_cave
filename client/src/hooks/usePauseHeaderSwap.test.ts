/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePauseHeaderSwap } from "./usePauseHeaderSwap";

describe("usePauseHeaderSwap", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fades effects out, then reveals pause chrome", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ paused, holdMs }) => usePauseHeaderSwap(paused, holdMs),
      { initialProps: { paused: false, holdMs: 1000 } },
    );

    expect(result.current.effects).toEqual({ mounted: true, visible: true });
    expect(result.current.chrome).toEqual({ mounted: false, visible: false });

    rerender({ paused: true, holdMs: 1000 });
    expect(result.current.effects).toEqual({ mounted: true, visible: false });
    expect(result.current.chrome.mounted).toBe(false);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.effects.mounted).toBe(true);
    expect(result.current.chrome.mounted).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.effects.mounted).toBe(false);
    expect(result.current.chrome.mounted).toBe(true);
    expect(result.current.chrome.visible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(result.current.chrome.visible).toBe(true);
  });

  it("hides pause chrome before effects return", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ paused }) => usePauseHeaderSwap(paused, 1000),
      { initialProps: { paused: true } },
    );

    expect(result.current.chrome).toEqual({ mounted: true, visible: true });
    expect(result.current.effects.mounted).toBe(false);

    rerender({ paused: false });
    expect(result.current.chrome).toEqual({ mounted: true, visible: false });
    expect(result.current.effects.mounted).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.chrome.mounted).toBe(false);
    expect(result.current.effects.mounted).toBe(true);
    expect(result.current.effects.visible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(result.current.effects.visible).toBe(true);
  });

  it("brings effects back if pause ends before they finish fading", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ paused }) => usePauseHeaderSwap(paused, 1000),
      { initialProps: { paused: false } },
    );

    rerender({ paused: true });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.chrome.mounted).toBe(false);

    rerender({ paused: false });
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(result.current.effects).toEqual({ mounted: true, visible: true });
    expect(result.current.chrome.mounted).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.chrome.mounted).toBe(false);
  });

  it("skips the wait when nothing is fading out", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ paused }) => usePauseHeaderSwap(paused, 0),
      { initialProps: { paused: false } },
    );

    rerender({ paused: true });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current.effects.mounted).toBe(false);
    expect(result.current.chrome.mounted).toBe(true);
    expect(result.current.chrome.visible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(result.current.chrome.visible).toBe(true);
  });

  it("fades the timer out before effects return even when the status row is empty", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ paused }) => usePauseHeaderSwap(paused, 0),
      { initialProps: { paused: true } },
    );

    rerender({ paused: false });
    expect(result.current.chrome).toEqual({ mounted: true, visible: false });

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.chrome.mounted).toBe(true);
    expect(result.current.effects.mounted).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.chrome.mounted).toBe(false);
    expect(result.current.effects.mounted).toBe(true);
  });
});
