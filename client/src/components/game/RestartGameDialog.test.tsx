/**
 * @vitest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { playSound } = vi.hoisted(() => ({
  playSound: vi.fn(),
}));
vi.mock("@/lib/audio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audio")>();
  return {
    ...actual,
    audioManager: {
      ...actual.audioManager,
      playSound,
    },
  };
});

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: React.forwardRef(function DialogContentMock(
    { children }: { children: React.ReactNode },
    ref: React.Ref<HTMLDivElement>,
  ) {
    return <div ref={ref}>{children}</div>;
  }),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { RestartGameDialog } from "./RestartGameDialog";
import { useGameStore } from "@/game/state";
import { CRUEL_MODE_ACTIVATE_VOLUME } from "@/lib/audio";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";

describe("RestartGameDialog", () => {
  beforeEach(async () => {
    playSound.mockClear();
    await ensureGameplayLocalesLoaded();
    useGameStore.getState().initialize();
  });

  it("hides the Cruel Mode checkbox when the Steam unlock is not available", () => {
    render(
      <RestartGameDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Cruel Mode")).toBeNull();
  });

  it("shows a pre-checked Cruel Mode checkbox after the end-screen CTA", () => {
    useGameStore.setState({
      restartGamePreferCruelMode: true,
    });

    const onConfirm = vi.fn();
    render(
      <RestartGameDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Cruel Mode" });
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveTextContent("⛤");
    expect(screen.getByText("Cruel Mode").closest("label")).not.toHaveTextContent(
      "⛤",
    );
    fireEvent.click(screen.getByRole("button", { name: /Start New Game/i }));
    expect(onConfirm).toHaveBeenCalledWith({ cruelMode: true });
  });

  it("starts unchecked when New Game is opened from the menu", async () => {
    useGameStore.setState({
      devGameMode: "steamEndCruelOn",
      restartGamePreferCruelMode: false,
    });

    const onConfirm = vi.fn();
    render(
      <RestartGameDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Cruel Mode" });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).not.toHaveTextContent("⛤");
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveTextContent("⛤");
    await waitFor(() => {
      expect(playSound).toHaveBeenCalledWith(
        "makeFire",
        CRUEL_MODE_ACTIVATE_VOLUME,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: /Start New Game/i }));
    expect(onConfirm).toHaveBeenCalledWith({ cruelMode: true });
  });
});
