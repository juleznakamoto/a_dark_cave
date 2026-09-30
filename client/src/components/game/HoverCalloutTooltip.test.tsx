/**
 * @vitest-environment jsdom
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HoverCalloutTooltip } from "./HoverCalloutTooltip";
import { isModalDialogOpen, useGameStore } from "@/game/state";
import { Z_INDEX } from "@/lib/z-index";

function calloutZIndex(): number {
  const node = screen.getByText("Wishlist on Steam", { hidden: true });
  const host = node.closest("button");
  if (!host) throw new Error("wishlist callout button missing");
  return Number(host.style.zIndex);
}

describe("HoverCalloutTooltip modal stacking", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  afterEach(() => {
    cleanup();
    useGameStore.getState().initialize();
  });

  it("drops the wishlist callout under the dialog backdrop while a modal is open", () => {
    render(
      <HoverCalloutTooltip
        label="Wishlist on Steam"
        portal
        forceVisible
        onCalloutClick={() => {}}
      >
        <span>Steam</span>
      </HoverCalloutTooltip>,
    );

    expect(calloutZIndex()).toBe(Z_INDEX.hoverCallout);

    act(() => {
      useGameStore.setState({
        rewardDialog: { isOpen: true, data: null },
      });
    });
    expect(isModalDialogOpen(useGameStore.getState())).toBe(true);

    expect(calloutZIndex()).toBe(Z_INDEX.hoverCalloutUnderModal);
    expect(calloutZIndex()).toBeLessThan(Z_INDEX.dialogOverlay);
  });
});
