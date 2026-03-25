/**
 * @vitest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TimedEventPanel from "./TimedEventPanel";
import { useGameStore } from "@/game/state";

vi.mock("@/components/game/TooltipWrapper", () => ({
  TooltipWrapper: ({ children }: { children: React.ReactElement }) => children,
}));

vi.mock("@/components/game/GamblerDiceDialog", () => ({
  default: ({
    isOpen,
    onWagerSelected,
  }: {
    isOpen: boolean;
    onWagerSelected: (wager: number) => void;
  }) => (
    <div data-testid="gambler-dialog" data-open={isOpen ? "true" : "false"}>
      {isOpen && (
        <button onClick={() => onWagerSelected(50)} type="button">
          Mock Wager
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function makeGamblerEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "gambler-123",
    eventId: "gambler",
    title: "The Obsessed Gambler",
    message: "Try your luck.",
    choices: [
      { id: "accept", label: "Accept", effect: () => ({}) },
      { id: "decline", label: "Decline", effect: () => ({}) },
    ],
    fallbackChoice: {
      id: "decline",
      label: "Decline",
      effect: () => ({}),
    },
    ...overrides,
  };
}

describe("TimedEventPanel gambler coverage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T12:00:00Z"));

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

    useGameStore.getState().initialize();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("does not open the gambler dialog while the game is paused", () => {
    const applyEventChoice = vi.fn();

    useGameStore.setState((state) => ({
      ...state,
      isPaused: true,
      applyEventChoice: applyEventChoice as typeof state.applyEventChoice,
      timedEventTab: {
        isActive: true,
        event: makeGamblerEvent(),
        expiryTime: Date.now() + 60_000,
        startTime: Date.now() - 2_000,
      },
    }));

    act(() => {
      render(<TimedEventPanel />);
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    });

    expect(applyEventChoice).not.toHaveBeenCalled();
    expect(screen.getByTestId("gambler-dialog")).toHaveAttribute(
      "data-open",
      "false",
    );
  });

  it("freezes the timed event countdown while the gambler dice dialog is open", () => {
    const applyEventChoice = vi.fn();
    const setTimedEventTab = vi.fn();
    const setHighlightedResources = vi.fn();

    useGameStore.setState((state) => ({
      ...state,
      applyEventChoice: applyEventChoice as typeof state.applyEventChoice,
      setTimedEventTab: setTimedEventTab as typeof state.setTimedEventTab,
      setHighlightedResources:
        setHighlightedResources as typeof state.setHighlightedResources,
      resources: {
        ...state.resources,
        gold: 100,
      },
      timedEventTab: {
        isActive: true,
        event: makeGamblerEvent(),
        expiryTime: Date.now() + 200,
        startTime: Date.now() - 2_000,
      },
    }));

    act(() => {
      render(<TimedEventPanel />);
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    });
    expect(screen.getByTestId("gambler-dialog")).toHaveAttribute(
      "data-open",
      "true",
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Mock Wager" }));
    });
    expect(useGameStore.getState().gamblerGame).toMatchObject({
      wager: 50,
      stakeNotYetDeducted: true,
      session: expect.objectContaining({ phase: "playerTurn" }),
    });
    expect(useGameStore.getState().resources.gold).toBe(100);

    applyEventChoice.mockClear();
    setTimedEventTab.mockClear();
    setHighlightedResources.mockClear();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(applyEventChoice).not.toHaveBeenCalled();
    expect(setTimedEventTab).not.toHaveBeenCalled();
    expect(setHighlightedResources).not.toHaveBeenCalled();
    expect(useGameStore.getState().gamblerGame).toMatchObject({
      wager: 50,
      stakeNotYetDeducted: true,
    });
    expect(screen.getByTestId("gambler-dialog")).toHaveAttribute(
      "data-open",
      "true",
    );
  });

  it("does not forfeit a gambler round that already resolved when the timer expires", () => {
    const applyEventChoice = vi.fn();
    const setTimedEventTab = vi.fn();
    const setHighlightedResources = vi.fn();

    useGameStore.setState((state) => ({
      ...state,
      applyEventChoice: applyEventChoice as typeof state.applyEventChoice,
      setTimedEventTab: setTimedEventTab as typeof state.setTimedEventTab,
      setHighlightedResources:
        setHighlightedResources as typeof state.setHighlightedResources,
      resources: {
        ...state.resources,
        gold: 150,
      },
      gamblerGame: { wager: 50, outcome: "win" },
      timedEventTab: {
        isActive: true,
        event: makeGamblerEvent(),
        expiryTime: Date.now() + 200,
        startTime: Date.now() - 2_000,
      },
    }));

    act(() => {
      render(<TimedEventPanel />);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(
      useGameStore
        .getState()
        .log.some((e) => e.message.includes("silence as forfeit")),
    ).toBe(false);
    expect(useGameStore.getState().gamblerGame).toBeNull();
    expect(applyEventChoice).not.toHaveBeenCalled();
    expect(setTimedEventTab).toHaveBeenCalledWith(false);
    expect(setHighlightedResources).toHaveBeenCalledWith([]);
  });
});
