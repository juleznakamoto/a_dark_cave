/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import { useGameStore } from "@/game/state";
import { NEW_ITEM_PULSE_DURATION_MS } from "@/hooks/useNewItemPulseTooltip";
import SidePanelSection from "./SidePanelSection";

vi.mock("@/components/game/TooltipWrapper", () => ({
  TooltipWrapper: ({ children }: { children: React.ReactElement }) => children,
}));

const AXE = "Stone Axe";

function axeLabel() {
  const el = Array.from(document.querySelectorAll("span")).find(
    (node) =>
      node.textContent === AXE && node.className.includes("text-gray-400"),
  );
  if (!el) throw new Error("missing axe label");
  return el;
}

function renderAxe() {
  return render(
    <SidePanelSection
      title="Tools"
      sectionId="tools"
      items={[{ id: "stone_axe", label: AXE, value: 1 }]}
    />,
  );
}

describe("SidePanelSection new-item glow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    useGameStore.setState({
      hoveredTooltips: {},
      newItemPulseStartedAt: {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    useGameStore.setState({
      hoveredTooltips: {},
      newItemPulseStartedAt: {},
    });
  });

  it("stops the glow after the same window as the event log", async () => {
    renderAxe();
    expect(axeLabel().className).toContain("new-item-pulse-text");
    const startedAt = useGameStore.getState().newItemPulseStartedAt.stone_axe;
    expect(typeof startedAt).toBe("number");

    await act(async () => {
      vi.advanceTimersByTime(NEW_ITEM_PULSE_DURATION_MS);
    });

    expect(axeLabel().className).not.toContain("new-item-pulse-text");
    expect(useGameStore.getState().newItemPulseStartedAt.stone_axe).toBe(
      startedAt,
    );
  });

  it("does not glow for an item whose window has already passed", () => {
    useGameStore.setState({
      newItemPulseStartedAt: {
        stone_axe: Date.now() - NEW_ITEM_PULSE_DURATION_MS,
      },
    });
    renderAxe();
    expect(axeLabel().className).not.toContain("new-item-pulse-text");
  });

  it("does not restart the clock once it has been recorded", () => {
    const startedAt = Date.now() - 1000;
    useGameStore.setState({
      newItemPulseStartedAt: { stone_axe: startedAt },
    });
    renderAxe();
    useGameStore.getState().noteNewItemPulseStarted("stone_axe");
    expect(useGameStore.getState().newItemPulseStartedAt.stone_axe).toBe(
      startedAt,
    );
    useGameStore.getState().restartNewItemPulseClock("stone_axe");
    expect(useGameStore.getState().newItemPulseStartedAt.stone_axe).toBe(
      Date.now(),
    );
  });
});
