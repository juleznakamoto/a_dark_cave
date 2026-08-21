/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { TooltipWrapper } from "./TooltipWrapper";
import {
  closeAllGlobalTooltips,
  setGlobalTooltipIsMobile,
  setGlobalTooltipsSuppressed,
} from "@/hooks/useGlobalTooltip";

function MakeWoodButton({ onAction }: { onAction: () => void }) {
  return (
    <TooltipWrapper tooltip="Gather wood" tooltipId="chop-wood">
      <button type="button" data-testid="make-wood" onClick={onAction}>
        Make Wood
      </button>
    </TooltipWrapper>
  );
}

describe("TooltipWrapper - mobile long-press vs action", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setGlobalTooltipIsMobile(true);
    setGlobalTooltipsSuppressed(false);
  });

  afterEach(() => {
    setGlobalTooltipsSuppressed(false);
    closeAllGlobalTooltips();
    vi.useRealTimers();
  });

  it("does not execute the button when releasing after a long-press tooltip", async () => {
    const onAction = vi.fn();
    render(<MakeWoodButton onAction={onAction} />);

    const button = screen.getByTestId("make-wood");
    const wrapper = button.closest("[data-tooltip-trigger-id]")!;

    await act(async () => {
      fireEvent.touchStart(wrapper);
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await act(async () => {
      fireEvent.touchEnd(wrapper);
      fireEvent.click(button);
    });

    expect(onAction).not.toHaveBeenCalled();
  });

  it("executes the button on a short tap (synthesized click)", async () => {
    const onAction = vi.fn();
    render(<MakeWoodButton onAction={onAction} />);

    const button = screen.getByTestId("make-wood");
    const wrapper = button.closest("[data-tooltip-trigger-id]")!;

    await act(async () => {
      fireEvent.touchStart(wrapper);
      fireEvent.touchEnd(wrapper);
      fireEvent.click(button);
    });

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
