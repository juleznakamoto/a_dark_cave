/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { composeActionTooltip } from "./actionTooltipLayout";
import {
  TOOLTIP_MAX_WIDTH,
  TOOLTIP_MIN_WIDTH,
} from "@/game/tooltipMetrics";

describe("composeActionTooltip", () => {
  it("orders cost, effects, and description with dividers between sections", () => {
    const node = composeActionTooltip({
      header: <span data-testid="cost">-10 Wood</span>,
      description: "A fine bow.",
      effects: <span data-testid="effects">Strength: +2</span>,
    });
    render(<>{node}</>);

    const cost = screen.getByTestId("cost");
    const effects = screen.getByTestId("effects");
    const description = screen.getByText("A fine bow.");
    expect(cost.compareDocumentPosition(effects) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      effects.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(document.querySelectorAll(".border-t").length).toBe(2);
  });

  it("puts a divider above description when header is present", () => {
    const node = composeActionTooltip({
      header: <span data-testid="cost">-10 Wood</span>,
      description: "A fine bow.",
    });
    render(<>{node}</>);

    expect(document.querySelectorAll(".border-t").length).toBe(1);
  });

  it("puts a divider above effects when header is present", () => {
    const node = composeActionTooltip({
      header: <span data-testid="cost">-10 Wood</span>,
      effects: <span data-testid="effects">Strength: +2</span>,
    });
    render(<>{node}</>);

    expect(document.querySelectorAll(".border-t").length).toBe(1);
  });

  it("omits title from description section", () => {
    const node = composeActionTooltip({
      header: <span>-5 Gold</span>,
      description: "Flavour only.",
    });
    const { container } = render(<>{node}</>);
    expect(container.querySelector(".font-bold")).toBeNull();
  });

  it("lets flavour under other lines use the shared floor and cap", () => {
    const node = composeActionTooltip({
      header: <span>Gather Wood: +25% Bonus</span>,
      description: "Sturdy leather gloves that help with wood gathering",
    });
    render(<>{node}</>);
    const description = screen.getByText(
      "Sturdy leather gloves that help with wood gathering",
    );
    expect(description.style.width).toBe("0px");
    expect(description.style.minWidth).toBe(`max(100%, ${TOOLTIP_MIN_WIDTH})`);
    expect(description.style.maxWidth).toBe(TOOLTIP_MAX_WIDTH);
  });

  it("wraps description-only tips at the shared floor", () => {
    const node = composeActionTooltip({
      description: "Sturdy leather gloves that help with wood gathering",
    });
    render(<>{node}</>);
    const description = screen.getByText(
      "Sturdy leather gloves that help with wood gathering",
    );
    expect(description.style.width).toBe("max-content");
    expect(description.style.maxWidth).toBe(TOOLTIP_MIN_WIDTH);
  });
});
