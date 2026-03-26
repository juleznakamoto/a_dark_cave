/**
 * @vitest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

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
  DialogContent: React.forwardRef(function DialogContentMock(
    {
      children,
      onPointerDownOutside: _onPointerDownOutside,
      onEscapeKeyDown: _onEscapeKeyDown,
      ...props
    }: {
      children: React.ReactNode;
      onPointerDownOutside?: unknown;
      onEscapeKeyDown?: unknown;
      [key: string]: unknown;
    },
    ref: React.Ref<HTMLDivElement>,
  ) {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  }),
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
import { useGameStore } from "@/game/state";
import { GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY } from "@/game/gamblerSession";

describe("GamblerDiceDialog", () => {
  beforeEach(() => {
    useGameStore.setState((s) => ({
      story: {
        ...s.story,
        seen: {
          ...s.story.seen,
          [GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY]: 0,
        },
      },
    }));
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

    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("alternates one player roll then one NPC roll (single die on NPC turn)", () => {
    render(
      <GamblerDiceDialog
        isOpen={true}
        onOutcomeResolved={vi.fn()}
        onClose={vi.fn()}
        playerGold={100}
        playerLuck={50}
        onWagerSelected={vi.fn()}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /10 Gold/i }));
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^roll$/i }));
      vi.advanceTimersByTime(1200);
    });

    act(() => {
      vi.runOnlyPendingTimers();
    });
    act(() => {
      vi.advanceTimersByTime(500 + 1200);
    });

    const playerRunning = Number(
      screen.getByTestId("player-running-total").textContent,
    );
    const npcRunning = Number(screen.getByTestId("gambler-running-total").textContent);
    expect(playerRunning).toBeGreaterThanOrEqual(1);
    expect(playerRunning).toBeLessThanOrEqual(6);
    expect(npcRunning).toBeGreaterThanOrEqual(1);
    expect(npcRunning).toBeLessThanOrEqual(6);
    expect(screen.getByRole("button", { name: /^roll$/i })).toBeInTheDocument();
  });
});
