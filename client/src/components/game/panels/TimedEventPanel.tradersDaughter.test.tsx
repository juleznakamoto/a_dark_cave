/**
 * @vitest-environment jsdom
 */
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TimedEventPanel from "./TimedEventPanel";
import { useGameStore } from "@/game/state";
import { tradersDaughterEvents } from "@/game/rules/eventsTradersDaughter";

vi.mock("@/components/game/TooltipWrapper", () => ({
  TooltipWrapper: ({ children }: { children: React.ReactElement }) => children,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TimedEventPanel traders_daughter choice styling", () => {
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
    useGameStore.setState((s) => ({
      applyEventChoice: vi.fn(() => true) as typeof s.applyEventChoice,
      resources: {
        ...s.resources,
        food: 1000,
        torch: 100,
      },
      timedEventTab: {
        isActive: true,
        event: {
          id: "traders_daughter-123",
          eventId: "traders_daughter",
          title: "The Trader's Daughter",
          message: "One evening, the trader approaches you in distress.",
          choices: tradersDaughterEvents.traders_daughter.choices,
        },
        expiryTime: Date.now() + 262_000,
        startTime: Date.now() - 5_000,
      },
    }));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("keeps Do not help active when the paid choice is unaffordable", () => {
    useGameStore.setState((s) => ({
      resources: {
        ...s.resources,
        food: 1000,
        torch: 0,
      },
      timedEventTab: {
        ...s.timedEventTab,
        startTime: Date.now() - 5_000,
        expiryTime: Date.now() + 262_000,
      },
    }));

    act(() => {
      render(<TimedEventPanel />);
    });

    const sendButton = screen.getByRole("button", { name: "Send search party" });
    const declineButton = screen.getByRole("button", { name: "Do not help" });

    expect(sendButton).toBeDisabled();
    expect(declineButton).not.toBeDisabled();
    expect(declineButton.className).toContain("bg-neutral-600/10");
  });

  it("renders Do not help as an enabled, active-looking choice", () => {
    act(() => {
      render(<TimedEventPanel />);
    });

    const sendButton = screen.getByRole("button", { name: "Send search party" });
    const declineButton = screen.getByRole("button", { name: "Do not help" });

    expect(sendButton).not.toBeDisabled();
    expect(declineButton).not.toBeDisabled();

    expect(declineButton.className).toContain("bg-neutral-600/10");
    expect(declineButton.className).toContain("border-orange-950");
    expect(declineButton.className).not.toContain("border-orange-950/50");
  });
});
