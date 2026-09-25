/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getCraftItemDescription } from "./craftItemDescription";
import { renderItemTooltip } from "./itemTooltips";

describe("item unlock effect lines", () => {
  it("shows Unlocks Village as a Stone Axe effect, not in the description", () => {
    render(<>{renderItemTooltip("stone_axe", "tool")}</>);

    expect(screen.getByText("Unlocks Village")).toBeInTheDocument();
    expect(getCraftItemDescription("craftStoneAxe")).toBe(
      "Basic axe for chopping wood",
    );
    expect(screen.getByText("Basic axe for chopping wood")).toBeInTheDocument();
  });

  it("shows Unlocks Forest as a Crude Bow effect, not in the description", () => {
    render(<>{renderItemTooltip("crude_bow", "weapon")}</>);

    expect(screen.getByText("Unlocks Forest")).toBeInTheDocument();
    expect(getCraftItemDescription("craftCrudeBow")).toBe(
      "Simple bow, reliable for any challenge",
    );
    expect(
      screen.getByText("Simple bow, reliable for any challenge"),
    ).toBeInTheDocument();
  });

  it("moves book, notes, and fellowship unlocks out of the description", () => {
    const cases = [
      {
        id: "book_of_trials",
        type: "book" as const,
        effect: "Unlocks advanced achievements",
        description: /Book about navigating life.s challenges\./,
      },
      {
        id: "survivors_notes",
        type: "blessing" as const,
        effect: "Unlocks basic achievements",
        description:
          "Timeworn scroll filled with practical advice left by one who had lived here long ago.",
      },
      {
        id: "restless_knight",
        type: "fellowship" as const,
        effect: "Unlocks combat skill Crushing Strike",
        description: "Veteran of combat who has seen the remnants of the old world.",
      },
    ];

    for (const entry of cases) {
      const { unmount } = render(
        <>{renderItemTooltip(entry.id, entry.type)}</>,
      );
      const effect = screen.getByText(entry.effect);
      const description = screen.getByText(entry.description);
      expect(effect).toBeInTheDocument();
      expect(
        effect.compareDocumentPosition(description) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      unmount();
    }
  });
});
