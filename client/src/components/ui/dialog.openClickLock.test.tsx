/**
 * @vitest-environment jsdom
 */
import React, { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DIALOG_OPEN_CLICK_LOCK_MS } from "@/hooks/useDialogOpenClickLock";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

function LockedDialog() {
  const [clicks, setClicks] = useState(0);
  return (
    <Dialog open>
      <DialogContent
        hideClose
        openClickLockMs={DIALOG_OPEN_CLICK_LOCK_MS}
        aria-describedby={undefined}
      >
        <DialogTitle>Lock test</DialogTitle>
        <button type="button" onClick={() => setClicks((count) => count + 1)}>
          {clicks}
        </button>
      </DialogContent>
    </Dialog>
  );
}

function clickThrough(target: Element) {
  fireEvent.pointerDown(target);
  fireEvent.pointerUp(target);
  fireEvent.click(target);
}

describe("DialogContent open click lock", () => {
  it("ignores the first 800ms of button clicks after open", () => {
    vi.useFakeTimers();
    render(<LockedDialog />);
    const button = screen.getByRole("button");

    clickThrough(button);
    expect(button.textContent).toBe("0");
    expect(button.closest("[data-adc-open-click-lock='true']")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(DIALOG_OPEN_CLICK_LOCK_MS);
    });

    clickThrough(button);
    expect(button.textContent).toBe("1");
    vi.useRealTimers();
  });
});
