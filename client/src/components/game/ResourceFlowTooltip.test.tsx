/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@/i18n";
import { useGameStore } from "@/game/state";
import { getResourceProductionBreakdown } from "@/game/population";
import { getResourceAmountCap } from "@/game/resourceLimits";
import { formatNumber, formatSignedNumber } from "@/lib/utils";
import ResourceFlowTooltip from "./ResourceFlowTooltip";

describe("ResourceFlowTooltip capacity line", () => {
  beforeEach(() => {
    const resources = useGameStore.getState().resources;
    useGameStore.setState({
      resources: { ...resources, wood: 0, gold: 0 },
      villagers: {
        ...useGameStore.getState().villagers,
        gatherer: 0,
        hunter: 0,
        free: 0,
      },
    });
  });

  it("puts At capacity on the first line when the stack is full", () => {
    const cap = getResourceAmountCap("wood", useGameStore.getState());
    expect(cap).not.toBeNull();
    useGameStore.setState({
      resources: { ...useGameStore.getState().resources, wood: cap! },
    });
    render(<ResourceFlowTooltip resourceId="wood" />);
    const line = screen.getByTestId("resource-at-capacity");
    expect(line).toHaveTextContent(`At capacity (${formatNumber(cap!)})`);
    expect(line.parentElement?.firstElementChild).toBe(line);
  });

  it("stays empty when the resource is under the cap and has no production", () => {
    const { container } = render(<ResourceFlowTooltip resourceId="wood" />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("resource-at-capacity")).toBeNull();
  });

  it("does not mark unlimited currencies", () => {
    useGameStore.setState({
      resources: { ...useGameStore.getState().resources, gold: 5000 },
    });
    const { container } = render(<ResourceFlowTooltip resourceId="gold" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ResourceFlowTooltip flow order", () => {
  function sectionOrder(container: HTMLElement): string[] {
    return [...container.firstElementChild!.children].map(
      (el) => el.getAttribute("data-testid") ?? "",
    );
  }

  it("lists costs, a divider, output, a divider, then a bold sum", () => {
    const current = useGameStore.getState();
    useGameStore.setState({
      villagers: {
        ...current.villagers,
        gatherer: 2,
        iron_miner: 1,
        hunter: 0,
        free: 2,
      },
      story: {
        ...current.story,
        seen: { ...current.story.seen, hasHunted: true },
      },
    });
    const state = useGameStore.getState();
    const breakdown = getResourceProductionBreakdown(state, "food");
    const costs = breakdown.filter((line) => line.amount < 0);
    const outputs = breakdown.filter((line) => line.amount > 0);
    expect(costs.length).toBeGreaterThan(0);
    expect(outputs.length).toBeGreaterThan(0);

    const { container } = render(<ResourceFlowTooltip resourceId="food" />);
    expect(sectionOrder(container)).toEqual([
      ...costs.map(() => "resource-flow-line"),
      "resource-flow-divider",
      ...outputs.map(() => "resource-flow-line"),
      "resource-flow-divider",
      "resource-flow-sum",
    ]);

    const labels = screen
      .getAllByTestId("resource-flow-line")
      .map((el) => el.getAttribute("aria-label"));
    expect(labels.slice(0, costs.length).every((label) => label?.includes("-"))).toBe(
      true,
    );
    expect(
      labels.slice(costs.length).every((label) => label?.includes("+")),
    ).toBe(true);

    const sum = Math.round(
      breakdown.reduce((total, line) => total + line.amount, 0),
    );
    const sumRow = screen.getByTestId("resource-flow-sum");
    expect(sumRow).toHaveTextContent(formatSignedNumber(sum));
    expect(sumRow.querySelector(".font-bold")).not.toBeNull();
  });

  it("skips the empty costs block when a resource is only produced", () => {
    const current = useGameStore.getState();
    useGameStore.setState({
      villagers: {
        ...current.villagers,
        gatherer: 0,
        hunter: 0,
        free: 0,
        iron_miner: 1,
      },
    });
    const breakdown = getResourceProductionBreakdown(
      useGameStore.getState(),
      "iron",
    );
    expect(breakdown.every((line) => line.amount > 0)).toBe(true);
    expect(breakdown.length).toBeGreaterThan(0);

    const { container } = render(<ResourceFlowTooltip resourceId="iron" />);
    expect(sectionOrder(container)).toEqual([
      ...breakdown.map(() => "resource-flow-line"),
      "resource-flow-divider",
      "resource-flow-sum",
    ]);
  });

  it("skips the empty output block when a resource is only spent", () => {
    const current = useGameStore.getState();
    useGameStore.setState({
      villagers: {
        ...current.villagers,
        gatherer: 0,
        hunter: 0,
        iron_miner: 0,
        free: 2,
      },
      story: {
        ...current.story,
        seen: { ...current.story.seen, hasHunted: true },
      },
    });
    const breakdown = getResourceProductionBreakdown(
      useGameStore.getState(),
      "wood",
    );
    expect(breakdown.every((line) => line.amount < 0)).toBe(true);
    expect(breakdown.length).toBeGreaterThan(0);

    const { container } = render(<ResourceFlowTooltip resourceId="wood" />);
    expect(sectionOrder(container)).toEqual([
      ...breakdown.map(() => "resource-flow-line"),
      "resource-flow-divider",
      "resource-flow-sum",
    ]);
  });
});
