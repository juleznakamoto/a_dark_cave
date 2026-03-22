/**
 * @vitest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { mockRollDie, mockRunNpcTurn } = vi.hoisted(() => ({
  mockRollDie: vi.fn(),
  mockRunNpcTurn: vi.fn(),
}));

vi.mock("@/game/diceFifteenGame", async () => {
  const actual =
    await vi.importActual<typeof import("@/game/diceFifteenGame")>(
      "@/game/diceFifteenGame",
    );

  return {
    ...actual,
    rollDie: (...args: unknown[]) => mockRollDie(...args),
    runNpcTurn: (...args: unknown[]) => mockRunNpcTurn(...args),
  };
});

vi.mock("@/components/game/TooltipWrapper", () => ({
  TooltipWrapper: ({ children }: { children: React.ReactElement }) => children,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({
    children,
    onPointerDownOutside: _onPointerDownOutside,
    onEscapeKeyDown: _onEscapeKeyDown,
    ...props
  }: {
    children: React.ReactNode;
    onPointerDownOutside?: unknown;
    onEscapeKeyDown?: unknown;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import GamblerDiceDialog from "./GamblerDiceDialog";

describe("GamblerDiceDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    mockRollDie.mockReset();
    mockRunNpcTurn.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("does not double-count prior NPC rolls during animated turns", async () => {
    mockRollDie
      .mockReturnValueOnce(6)
      .mockReturnValueOnce(6);

    mockRunNpcTurn.mockReturnValue({
      rolls: [4, 4, 4, 1],
      finalTotal: 13,
      status: "playing",
    });

    render(
      <GamblerDiceDialog
        isOpen={true}
        onOutcomeResolved={vi.fn()}
        onClose={vi.fn()}
        hasBoneDice={false}
        playerGold={100}
        playerLuck={50}
        onWagerSelected={vi.fn()}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /10 gold/i }));
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^roll$/i }));
      vi.advanceTimersByTime(600);
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^roll$/i }));
      vi.advanceTimersByTime(600);
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /stand/i }));
    });

    for (let i = 0; i < 4; i += 1) {
      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    act(() => {
      vi.advanceTimersByTime(400);
    });

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByText(/you lose\./i)).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.queryByText("24")).not.toBeInTheDocument();
  });
});
