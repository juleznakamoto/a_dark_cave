/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PanelResizeHandle, {
  PANEL_RESIZE_HANDLE_REVEAL_MS,
} from "./PanelResizeHandle";

function separator() {
  return screen.getByTestId("panel-resize-log");
}

function renderHandle() {
  const onPointerDown = vi.fn();
  const onReset = vi.fn();
  render(
    <PanelResizeHandle
      edge="log"
      onPointerDown={onPointerDown}
      onReset={onReset}
    />,
  );
  return { onPointerDown, onReset };
}

describe("PanelResizeHandle reveal", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the knob for 3 seconds after a click", () => {
    vi.useFakeTimers();
    const { onPointerDown } = renderHandle();

    expect(separator()).toHaveAttribute("data-revealed", "false");

    fireEvent.pointerDown(separator(), {
      pointerId: 1,
      button: 0,
      pointerType: "touch",
    });
    fireEvent.pointerUp(separator(), {
      pointerId: 1,
      button: 0,
      pointerType: "touch",
    });

    expect(onPointerDown).toHaveBeenCalledOnce();
    expect(separator()).toHaveAttribute("data-revealed", "true");
    expect(separator().querySelector("span")?.className).toContain("opacity-100");

    act(() => {
      vi.advanceTimersByTime(PANEL_RESIZE_HANDLE_REVEAL_MS - 1);
    });
    expect(separator()).toHaveAttribute("data-revealed", "true");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(separator()).toHaveAttribute("data-revealed", "false");
    const knob = separator().querySelector("span");
    expect(knob?.className).toContain("opacity-0");
    expect(knob?.className).toContain("duration-1000");
  });

  it("keeps the knob visible for the whole drag, then 3 seconds after release", () => {
    vi.useFakeTimers();
    renderHandle();

    fireEvent.pointerDown(separator(), {
      pointerId: 1,
      button: 0,
      pointerType: "mouse",
    });

    act(() => {
      vi.advanceTimersByTime(PANEL_RESIZE_HANDLE_REVEAL_MS + 500);
    });
    expect(separator()).toHaveAttribute("data-revealed", "true");

    fireEvent.pointerUp(separator(), {
      pointerId: 1,
      button: 0,
      pointerType: "mouse",
    });
    act(() => {
      vi.advanceTimersByTime(PANEL_RESIZE_HANDLE_REVEAL_MS - 1);
    });
    expect(separator()).toHaveAttribute("data-revealed", "true");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(separator()).toHaveAttribute("data-revealed", "false");
  });

  it("ignores a right-click", () => {
    vi.useFakeTimers();
    const { onPointerDown } = renderHandle();

    fireEvent.pointerDown(separator(), {
      pointerId: 1,
      button: 2,
      pointerType: "mouse",
    });

    expect(onPointerDown).not.toHaveBeenCalled();
    expect(separator()).toHaveAttribute("data-revealed", "false");
  });
});
