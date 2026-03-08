/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { useGlobalTooltip } from "./useGlobalTooltip";

vi.mock("./use-mobile", () => ({
  useIsMobile: vi.fn(() => true),
}));

// Test component that uses the tooltip hook
function TestTooltipButton({
  id,
  disabled,
  onAction,
}: {
  id: string;
  disabled: boolean;
  onAction: () => void;
}) {
  const globalTooltip = useGlobalTooltip();

  return (
    <>
      <div
        onTouchStart={(e) =>
          globalTooltip.handleTouchStart(id, disabled, false, e)
        }
        onTouchEnd={(e) =>
          globalTooltip.handleTouchEnd(id, disabled, onAction, e)
        }
      >
        <button data-testid={`trigger-${id}`}>Button</button>
      </div>
      <div data-testid={`open-${id}`}>
        {globalTooltip.isTooltipOpen(id) ? "open" : "closed"}
      </div>
    </>
  );
}

describe("useGlobalTooltip - mobile long-press behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows tooltip after long press and keeps it open until clicked elsewhere", async () => {
    const onAction = vi.fn();
    render(
      <>
        <TestTooltipButton id="test" disabled={false} onAction={onAction} />
        <button data-testid="outside">Outside</button>
      </>
    );

    const trigger = screen.getByTestId("trigger-test");
    const outside = screen.getByTestId("outside");

    // Touch start, wait 250ms, touch end - tooltip opens and stays open
    await act(async () => {
      fireEvent.touchStart(trigger);
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await act(async () => {
      fireEvent.touchEnd(trigger);
    });

    expect(onAction).not.toHaveBeenCalled();

    // Click outside - tooltip closes
    await act(async () => {
      fireEvent.click(outside);
    });
  });

  it("executes action on short tap (no long press)", async () => {
    const onAction = vi.fn();
    render(
      <TestTooltipButton id="test" disabled={false} onAction={onAction} />
    );

    const trigger = screen.getByTestId("trigger-test");

    // Touch start
    await act(async () => {
      fireEvent.touchStart(trigger);
    });

    // Touch end before 250ms - action should execute
    await act(async () => {
      fireEvent.touchEnd(trigger);
    });

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("opens tooltip on short tap for disabled buttons", async () => {
    const onAction = vi.fn();
    render(
      <TestTooltipButton id="disabled-test" disabled={true} onAction={onAction} />
    );

    const trigger = screen.getByTestId("trigger-disabled-test");
    const state = screen.getByTestId("open-disabled-test");

    expect(state.textContent).toBe("closed");

    await act(async () => {
      fireEvent.touchStart(trigger);
      fireEvent.touchEnd(trigger);
    });

    expect(onAction).not.toHaveBeenCalled();
    expect(state.textContent).toBe("open");
  });
});
