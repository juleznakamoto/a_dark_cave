/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { useHoldToRepeat } from "./useHoldToRepeat";

function touchEvent(
  x: number,
  y: number,
  cancelable = true,
): ReactTouchEvent {
  const preventDefault = vi.fn();
  const point = { clientX: x, clientY: y };
  return {
    cancelable,
    preventDefault,
    touches: [point],
    changedTouches: [point],
  } as unknown as ReactTouchEvent;
}

function dispatchTouchMove(x: number, y: number) {
  const event = new Event("touchmove");
  Object.defineProperty(event, "touches", {
    value: [{ clientX: x, clientY: y }],
  });
  document.dispatchEvent(event);
}

describe("useHoldToRepeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("repeats while the finger stays still", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useHoldToRepeat());

    act(() => {
      result.current.beginTouchHold(touchEvent(0, 0), action, true);
    });
    expect(action).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(action).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("stops repeating when the finger slides into a scroll", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useHoldToRepeat());

    act(() => {
      result.current.beginTouchHold(touchEvent(0, 0), action, true);
    });
    act(() => {
      dispatchTouchMove(0, 9);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(action).toHaveBeenCalledTimes(2);

    action.mockClear();
    act(() => {
      result.current.beginTouchHold(touchEvent(0, 0), action, true);
    });
    act(() => {
      dispatchTouchMove(0, 10);
    });
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("stops repeating when the browser cancels the pointer for a scroll", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useHoldToRepeat());

    act(() => {
      result.current.beginTouchHold(touchEvent(0, 0), action, true);
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointercancel", { pointerType: "touch" }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("does not let a mouse cancel interrupt a touch hold", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useHoldToRepeat());

    act(() => {
      result.current.beginTouchHold(touchEvent(0, 0), action, true);
    });
    act(() => {
      result.current.stopHold(false);
      document.dispatchEvent(
        new PointerEvent("pointercancel", { pointerType: "mouse" }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("ignores the compatibility mousedown until the touch gesture has ended", () => {
    const touchAction = vi.fn();
    const mouseAction = vi.fn();
    const { result } = renderHook(() => useHoldToRepeat());

    act(() => {
      result.current.beginTouchHold(touchEvent(0, 0), touchAction, true);
      dispatchTouchMove(30, 0);
      result.current.startHold(mouseAction, false);
    });
    expect(mouseAction).not.toHaveBeenCalled();

    const end = touchEvent(30, 0);
    act(() => {
      result.current.endTouchHold(end);
      result.current.startHold(mouseAction, false);
    });
    expect(end.preventDefault).toHaveBeenCalled();
    expect(mouseAction).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
      result.current.startHold(mouseAction, false);
    });
    expect(mouseAction).toHaveBeenCalledTimes(1);
  });

  it("does not start a hold when the button cannot act", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useHoldToRepeat());

    act(() => {
      result.current.beginTouchHold(touchEvent(0, 0), action, false);
      vi.advanceTimersByTime(700);
    });
    expect(action).not.toHaveBeenCalled();
  });
});
