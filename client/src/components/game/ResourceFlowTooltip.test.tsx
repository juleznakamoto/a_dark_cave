/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@/i18n";
import { useGameStore } from "@/game/state";
import { getResourceAmountCap } from "@/game/resourceLimits";
import { formatNumber } from "@/lib/utils";
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
