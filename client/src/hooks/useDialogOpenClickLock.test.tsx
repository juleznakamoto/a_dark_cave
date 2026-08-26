/**
 * @vitest-environment jsdom
 */
import React, { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DIALOG_OPEN_CLICK_LOCK_MS,
  useDialogOpenClickLock,
} from "./useDialogOpenClickLock";

function LockProbe({
  durationMs,
  resetKey,
}: {
  durationMs: number;
  resetKey?: string;
}) {
  const lock = useDialogOpenClickLock(durationMs, resetKey);
  const [clicks, setClicks] = useState(0);
  return (
    <div
      data-testid="lock-root"
      data-lock-active={lock.lockActive ? "true" : "false"}
      onPointerDownCapture={lock.onActivationCapture}
      onPointerUpCapture={lock.onActivationCapture}
      onClickCapture={lock.onActivationCapture}
      onKeyDownCapture={lock.onKeyDownCapture}
    >
      <button type="button" onClick={() => setClicks((count) => count + 1)}>
        {clicks}
      </button>
    </div>
  );
}

function clickThrough(target: Element) {
  fireEvent.pointerDown(target);
  fireEvent.pointerUp(target);
  fireEvent.click(target);
}

describe("useDialogOpenClickLock", () => {
  it("swallows clicks during the open lock, then accepts a fresh click", () => {
    vi.useFakeTimers();
    render(<LockProbe durationMs={DIALOG_OPEN_CLICK_LOCK_MS} />);
    const button = screen.getByRole("button");

    clickThrough(button);
    expect(button.textContent).toBe("0");
    expect(screen.getByTestId("lock-root").dataset.lockActive).toBe("true");

    act(() => {
      vi.advanceTimersByTime(DIALOG_OPEN_CLICK_LOCK_MS);
    });
    expect(screen.getByTestId("lock-root").dataset.lockActive).toBe("false");

    clickThrough(button);
    expect(button.textContent).toBe("1");
    vi.useRealTimers();
  });

  it("swallows a leftover pointerup after the timer if pointerdown was during the lock", () => {
    vi.useFakeTimers();
    render(<LockProbe durationMs={DIALOG_OPEN_CLICK_LOCK_MS} />);
    const button = screen.getByRole("button");

    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(DIALOG_OPEN_CLICK_LOCK_MS);
    });
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(button.textContent).toBe("0");
    vi.useRealTimers();
  });

  it("does not intercept clicks when the lock duration is 0", () => {
    render(<LockProbe durationMs={0} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button.textContent).toBe("1");
  });

  it("allows a click-only activate after the lock if no press started during it", () => {
    vi.useFakeTimers();
    render(<LockProbe durationMs={DIALOG_OPEN_CLICK_LOCK_MS} />);
    act(() => {
      vi.advanceTimersByTime(DIALOG_OPEN_CLICK_LOCK_MS);
    });
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("1");
    vi.useRealTimers();
  });

  it("restarts the lock when resetKey changes", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <LockProbe durationMs={DIALOG_OPEN_CLICK_LOCK_MS} resetKey="a" />,
    );
    act(() => {
      vi.advanceTimersByTime(DIALOG_OPEN_CLICK_LOCK_MS);
    });
    expect(screen.getByTestId("lock-root").dataset.lockActive).toBe("false");

    rerender(<LockProbe durationMs={DIALOG_OPEN_CLICK_LOCK_MS} resetKey="b" />);
    expect(screen.getByTestId("lock-root").dataset.lockActive).toBe("true");
    clickThrough(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("0");
    vi.useRealTimers();
  });
});
