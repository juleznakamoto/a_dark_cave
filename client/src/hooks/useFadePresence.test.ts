/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFadePresence } from "./useFadePresence";

describe("useFadePresence", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fades in on the next frame and stays mounted through the fade-out", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ open }) => useFadePresence(open, 1000),
      { initialProps: { open: false } },
    );

    expect(result.current).toEqual({ mounted: false, visible: false });

    rerender({ open: true });
    expect(result.current.mounted).toBe(true);
    expect(result.current.visible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current.visible).toBe(true);

    rerender({ open: false });
    expect(result.current.mounted).toBe(true);
    expect(result.current.visible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.mounted).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.mounted).toBe(false);
  });
});
