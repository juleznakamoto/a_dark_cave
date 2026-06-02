/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { composeActionTooltip } from "./actionTooltipLayout";

describe("composeActionTooltip", () => {
  it("orders cost, description, and effects with separators", () => {
    const node = composeActionTooltip({
      header: <span data-testid="cost">-10 Wood</span>,
      description: "A fine bow.",
      effects: <span data-testid="effects">Strength: +2</span>,
    });
    render(<>{node}</>);

    expect(screen.getByTestId("cost")).toBeTruthy();
    expect(screen.getByText("A fine bow.")).toBeTruthy();
    expect(screen.getByTestId("effects")).toBeTruthy();
    expect(document.querySelectorAll(".border-t").length).toBe(2);
  });

  it("omits title from description section", () => {
    const node = composeActionTooltip({
      header: <span>-5 Gold</span>,
      description: "Flavour only.",
    });
    const { container } = render(<>{node}</>);
    expect(container.querySelector(".font-bold")).toBeNull();
  });
});
