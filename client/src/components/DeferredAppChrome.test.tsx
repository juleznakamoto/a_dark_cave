/** @vitest-environment jsdom */
import React, { useEffect, useRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DeferredAppChrome from "./DeferredAppChrome";

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children?: ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
}));

vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

function MountProbe({ onMount }: { onMount: () => void }) {
  const onMountRef = useRef(onMount);
  onMountRef.current = onMount;
  useEffect(() => {
    onMountRef.current();
  }, []);
  return <div>start screen</div>;
}

describe("DeferredAppChrome", () => {
  it("does not remount route children when Radix chrome loads after a gesture", async () => {
    const onMount = vi.fn();
    render(
      <DeferredAppChrome>
        <MountProbe onMount={onMount} />
      </DeferredAppChrome>,
    );

    expect(onMount).toHaveBeenCalledOnce();
    fireEvent.pointerDown(document.body);

    await vi.waitFor(() => {
      expect(screen.getByTestId("toaster")).toBeTruthy();
    });
    expect(onMount).toHaveBeenCalledOnce();
    expect(screen.getByText("start screen")).toBeTruthy();
  });
});
