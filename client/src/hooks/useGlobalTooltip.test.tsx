/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import {
  closeAllGlobalTooltips,
  useGlobalTooltip,
  useGlobalTooltipOpen,
  setGlobalTooltipIsMobile,
  setGlobalTooltipsSuppressed,
} from "./useGlobalTooltip";

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
  const isOpen = useGlobalTooltipOpen(id);

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
        {isOpen ? "open" : "closed"}
      </div>
    </>
  );
}

describe("useGlobalTooltip - mobile long-press behavior", () => {
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

describe("useGlobalTooltip - modal suppression", () => {
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

  it("still opens tooltips for triggers inside a dialog while suppressed", async () => {
    const onAction = vi.fn();
    render(
      <div role="dialog">
        <TestTooltipButton
          id="shop-info"
          disabled={true}
          onAction={onAction}
        />
      </div>,
    );

    await act(async () => {
      setGlobalTooltipsSuppressed(true);
    });

    const trigger = screen.getByTestId("trigger-shop-info");
    const state = screen.getByTestId("open-shop-info");

    await act(async () => {
      fireEvent.touchStart(trigger);
      fireEvent.touchEnd(trigger);
    });

    expect(onAction).not.toHaveBeenCalled();
    expect(state.textContent).toBe("open");
  });

  it.each([
    "gambler-rules",
    "invest-dialog-info",
    "combat-luck-madness",
    "social-prompt-signup-info",
    "share-dialog-invite",
    "event-time-bonus",
    "idle-mode-village-production-info",
  ])(
    "allows dialog info tooltip id %s while suppressed",
    async (tooltipId) => {
      const onAction = vi.fn();
      render(
        <div role="dialog">
          <TestTooltipButton
            id={tooltipId}
            disabled={true}
            onAction={onAction}
          />
        </div>,
      );

      await act(async () => {
        setGlobalTooltipsSuppressed(true);
      });

      await act(async () => {
        fireEvent.touchStart(screen.getByTestId(`trigger-${tooltipId}`));
        fireEvent.touchEnd(screen.getByTestId(`trigger-${tooltipId}`));
      });

      expect(screen.getByTestId(`open-${tooltipId}`).textContent).toBe("open");
    },
  );

  it("keeps behind-modal tooltips forced closed while suppressed", async () => {
    const onAction = vi.fn();
    render(
      <TestTooltipButton
        id="behind-modal"
        disabled={true}
        onAction={onAction}
      />,
    );

    await act(async () => {
      setGlobalTooltipsSuppressed(true);
    });

    const trigger = screen.getByTestId("trigger-behind-modal");
    const state = screen.getByTestId("open-behind-modal");

    await act(async () => {
      fireEvent.touchStart(trigger);
      fireEvent.touchEnd(trigger);
    });

    expect(onAction).not.toHaveBeenCalled();
    expect(state.textContent).toBe("closed");
  });
});

describe("useGlobalTooltip - per-id subscribe", () => {
  beforeEach(() => {
    setGlobalTooltipIsMobile(true);
    setGlobalTooltipsSuppressed(false);
  });

  afterEach(() => {
    closeAllGlobalTooltips();
    setGlobalTooltipsSuppressed(false);
  });

  it("does not re-render other wrappers when a different tooltip opens", () => {
    const renderA = vi.fn();
    const renderB = vi.fn();

    function Probe({
      id,
      onRender,
    }: {
      id: string;
      onRender: () => void;
    }) {
      onRender();
      useGlobalTooltip();
      useGlobalTooltipOpen(id);
      return <div data-testid={`probe-${id}`} />;
    }

    function Opener() {
      const { setOpenTooltip } = useGlobalTooltip();
      return (
        <button
          type="button"
          data-testid="open-a"
          onClick={() => setOpenTooltip("a")}
        />
      );
    }

    render(
      <>
        <Opener />
        <Probe id="a" onRender={renderA} />
        <Probe id="b" onRender={renderB} />
      </>,
    );

    const afterMountA = renderA.mock.calls.length;
    const afterMountB = renderB.mock.calls.length;

    act(() => {
      fireEvent.click(screen.getByTestId("open-a"));
    });

    expect(renderA.mock.calls.length).toBe(afterMountA + 1);
    expect(renderB.mock.calls.length).toBe(afterMountB);
  });
});
