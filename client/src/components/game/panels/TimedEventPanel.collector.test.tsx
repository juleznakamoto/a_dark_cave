/**
 * @vitest-environment jsdom
 */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TimedEventPanel from "./TimedEventPanel";
import { useGameStore } from "@/game/state";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";

vi.mock("@/lib/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TimedEventPanel wandering collector headers", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T12:00:00Z"));
    await ensureGameplayLocalesLoaded();
    await i18n.changeLanguage("en");

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
    useGameStore.setState((state) => ({
      resources: { ...state.resources, gold: 500 },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          collectorVisitCount: 0,
        },
      },
      timedEventTab: {
        isActive: true,
        event: {
          id: "wandering_collector-1",
          eventId: "wandering_collector",
          title: "The Wandering Collector",
          message: "Sell me one, or buy back what others left behind.",
          choices: [
            {
              id: "buy_bone_dice",
              label: "Bone Dice",
              cost: "200 gold",
              effect: () => ({}),
            },
            {
              id: "sell_fang_charm",
              label: "Fang Charm",
              effect: () => ({}),
            },
            {
              id: "sell_nothing",
              effect: () => ({}),
            },
          ],
        },
        expiryTime: Date.now() + 60_000,
        startTime: Date.now(),
        collectorBuyAvailable: true,
        collectorSellAvailable: true,
      },
    }));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("puts the gold price on the buy and sell headers", () => {
    render(<TimedEventPanel />);

    expect(
      screen.getByRole("heading", { name: "Buy for 200 Gold" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sell for 100 Gold" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bone Dice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fang Charm" })).toBeInTheDocument();
  });
});
