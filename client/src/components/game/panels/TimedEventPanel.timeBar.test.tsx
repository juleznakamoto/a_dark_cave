/**
 * @vitest-environment jsdom
 */
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TimedEventPanel from "./TimedEventPanel";
import { useGameStore } from "@/game/state";
import { TIMED_EVENT_TIME_BAR_PULSE_CLASS } from "@/game/timedEventTimeBar";

vi.mock("@/lib/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function openVisit(remainingMs: number) {
  const now = Date.now();
  useGameStore.setState((state) => ({
    ...state,
    isPaused: false,
    timedEventTab: {
      isActive: true,
      event: {
        id: "traveler-1",
        eventId: "traveler",
        title: "A Traveler",
        message: "They will not stay long.",
        choices: [],
        timestamp: now,
      },
      expiryTime: now + remainingMs,
      startTime: now - (4 * 60 * 1000 - remainingMs),
      pauseAccumMs: 0,
      pauseStartedAt: 0,
    },
  }));
}

describe("TimedEventPanel time bar", () => {
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
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("pulses the time bar during the last 5 seconds", () => {
    openVisit(4_000);

    act(() => {
      render(<TimedEventPanel />);
    });

    expect(screen.getByTestId("timed-event-time-bar").className).toContain(
      TIMED_EVENT_TIME_BAR_PULSE_CLASS,
    );
    expect(screen.getByTestId("timed-event-time").textContent).toBe("00:04");
  });

  it("leaves the time bar still when more than 5 seconds remain", () => {
    openVisit(30_000);

    act(() => {
      render(<TimedEventPanel />);
    });

    expect(screen.getByTestId("timed-event-time-bar").className).not.toContain(
      TIMED_EVENT_TIME_BAR_PULSE_CLASS,
    );
    expect(screen.getByTestId("timed-event-time").textContent).toBe("00:30");
  });
});
