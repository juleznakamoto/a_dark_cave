/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { TooltipWrapper } from "./TooltipWrapper";
import {
  closeAllGlobalTooltips,
  getTooltipOpenProp,
  setGlobalTooltipIsMobile,
  setGlobalTooltipsSuppressed,
} from "@/hooks/useGlobalTooltip";
import { setGameTabHiddenForTests } from "@/lib/tabVisibility";

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

  it("does not light costs on a short tap, only while the hold tooltip is open", async () => {
    const onEnter = vi.fn();
    const onLeave = vi.fn();
    render(
      <TooltipWrapper
        tooltip="Gather wood"
        tooltipId="chop-wood"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <button type="button" data-testid="make-wood">
          Make Wood
        </button>
      </TooltipWrapper>,
    );

    const button = screen.getByTestId("make-wood");
    const wrapper = button.closest("[data-tooltip-trigger-id]")!;

    await act(async () => {
      fireEvent.touchStart(wrapper);
      fireEvent.touchEnd(wrapper);
      fireEvent.mouseEnter(wrapper);
      fireEvent.click(button);
    });

    expect(onEnter).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.touchStart(wrapper);
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(onEnter).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.mouseLeave(wrapper);
    });
    expect(onLeave).not.toHaveBeenCalled();

    await act(async () => {
      closeAllGlobalTooltips();
    });
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("still lights costs on mouse hover", async () => {
    setGlobalTooltipIsMobile(false);
    const onEnter = vi.fn();
    const onLeave = vi.fn();
    render(
      <TooltipWrapper
        tooltip="Gather wood"
        tooltipId="chop-wood-hover"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <button type="button" data-testid="make-wood">
          Make Wood
        </button>
      </TooltipWrapper>,
    );

    const wrapper = screen.getByTestId("make-wood").closest("[data-tooltip-trigger-id]")!;
    fireEvent.mouseEnter(wrapper);
    expect(onEnter).toHaveBeenCalledTimes(1);
    fireEvent.mouseLeave(wrapper);
    expect(onLeave).toHaveBeenCalledTimes(1);
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

describe("TooltipWrapper - forced open", () => {
  beforeEach(() => {
    setGlobalTooltipIsMobile(false);
    setGlobalTooltipsSuppressed(false);
  });

  afterEach(() => {
    setGlobalTooltipsSuppressed(false);
    closeAllGlobalTooltips();
  });

  it("keeps tooltip content visible when open is true", async () => {
    render(
      <TooltipWrapper tooltip="Wood: 12 / 50" tooltipId="forced-wood" open>
        <span>Wood</span>
      </TooltipWrapper>,
    );

    expect((await screen.findAllByText("Wood: 12 / 50")).length).toBeGreaterThan(0);
  });
});

describe("TooltipWrapper - inactive tab", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setGlobalTooltipIsMobile(true);
    setGlobalTooltipsSuppressed(false);
    setGameTabHiddenForTests(false);
  });

  afterEach(() => {
    setGameTabHiddenForTests(null);
    setGlobalTooltipsSuppressed(false);
    closeAllGlobalTooltips();
    vi.useRealTimers();
  });

  it("can open a long-press tooltip after the tab was hidden", async () => {
    const onAction = vi.fn();
    render(<MakeWoodButton onAction={onAction} />);

    await act(async () => {
      setGameTabHiddenForTests(true);
    });
    await act(async () => {
      setGameTabHiddenForTests(false);
    });

    const button = screen.getByTestId("make-wood");
    const wrapper = button.closest("[data-tooltip-trigger-id]")!;

    await act(async () => {
      fireEvent.touchStart(wrapper);
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(onAction).not.toHaveBeenCalled();
    expect(getTooltipOpenProp("chop-wood")).toBe(true);
  });
});
