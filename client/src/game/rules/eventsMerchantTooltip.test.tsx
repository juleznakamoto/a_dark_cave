/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { composeMerchantSpecialItemTooltip } from "./eventsMerchantTooltip";

describe("composeMerchantSpecialItemTooltip", () => {
  it("orders cost, effects, and description for skull lantern", () => {
    const node = composeMerchantSpecialItemTooltip(
      { buyItem: "skull_lantern", buyResource: "tool" },
      <span data-testid="cost">-2'000 Gold</span>,
    );
    render(<>{node}</>);

    const cost = screen.getByTestId("cost");
    const effects = screen.getByText(/Mining: \+200% Bonus/);
    const description = screen.getByText(
      /Forged from cursed bone illuminating the deepest depths/,
    );
    expect(
      cost.compareDocumentPosition(effects) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      effects.compareDocumentPosition(description) &
      Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(document.querySelectorAll(".border-t").length).toBe(2);
  });

  it("shows cost and item description for crow harness", () => {
    const node = composeMerchantSpecialItemTooltip(
      { buyItem: "crow_harness", buyResource: "tool" },
      <span data-testid="cost">-2'000 Gold</span>,
    );
    render(<>{node}</>);

    expect(screen.getByTestId("cost")).toBeInTheDocument();
    expect(
      screen.getByText(/specially crafted harness for catching crows/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Unlocks Blackreach Canyon")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".border-t").length).toBe(1);
  });

  it("returns null for regular resource trades", () => {
    expect(
      composeMerchantSpecialItemTooltip(
        { buyItem: undefined, buyResource: "food" },
        <span>-10 Gold</span>,
      ),
    ).toBeNull();
  });

  it("shows cost and description for books without numeric effects", () => {
    const node = composeMerchantSpecialItemTooltip(
      { buyItem: "book_of_trials", buyResource: "book" },
      <span data-testid="cost">-50 Gold</span>,
    );
    render(<>{node}</>);

    expect(screen.getByTestId("cost")).toBeInTheDocument();
    expect(
      screen.getByText(/Unlocks rewards for those who prove themselves/i),
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".border-t").length).toBe(1);
  });
});
