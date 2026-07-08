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

function TestTooltipButton({
  id,
  disabled,
  onAction,
  preferNativeClick = true,
}: {
  id: string;
  disabled: boolean;
  onAction: () => void;
  preferNativeClick?: boolean;
}) {
  const globalTooltip = useGlobalTooltip();

  return (
    <>
      <div
        data-tooltip-trigger-id={id}
        onTouchStart={(e) =>
          globalTooltip.handleTouchStart(id, disabled, false, e)
        }
        onTouchEnd={(e) =>
          globalTooltip.handleTouchEnd(
            id,
            disabled,
            onAction,
            e,
            preferNativeClick,
          )
        }
      >
        <button
          type="button"
          data-testid={`trigger-${id}`}
          disabled={disabled}
          onClick={onAction}
        >
          Button
        </button>
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

    await act(async () => {
      fireEvent.click(outside);
    });
  });

  it("does not call wrapper onAction on short tap when preferNativeClick is true", async () => {
    const onAction = vi.fn();
    render(
      <TestTooltipButton id="test" disabled={false} onAction={onAction} />
    );

    const trigger = screen.getByTestId("trigger-test");

    await act(async () => {
      fireEvent.touchStart(trigger);
      fireEvent.touchEnd(trigger);
    });

    expect(onAction).not.toHaveBeenCalled();
  });

  it("calls wrapper onAction on short tap when preferNativeClick is false", async () => {
    const onAction = vi.fn();
    render(
      <TestTooltipButton
        id="test"
        disabled={false}
        onAction={onAction}
        preferNativeClick={false}
      />
    );

    const trigger = screen.getByTestId("trigger-test");

    await act(async () => {
      fireEvent.touchStart(trigger);
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

  it("does not execute an action when closing an already-open tooltip", async () => {
    const onDisabledAction = vi.fn();
    const onEnabledAction = vi.fn();
    const { rerender } = render(
      <TestTooltipButton
        id="close-test"
        disabled={true}
        onAction={onDisabledAction}
      />
    );

    const trigger = screen.getByTestId("trigger-close-test");

    await act(async () => {
      fireEvent.touchStart(trigger);
      fireEvent.touchEnd(trigger);
    });

    rerender(
      <TestTooltipButton
        id="close-test"
        disabled={false}
        onAction={onEnabledAction}
      />
    );

    await act(async () => {
      fireEvent.touchStart(trigger);
      fireEvent.touchEnd(trigger);
    });

    expect(onDisabledAction).not.toHaveBeenCalled();
    expect(onEnabledAction).not.toHaveBeenCalled();
  });
});
