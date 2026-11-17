/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

function calloutHost(label: string): HTMLElement {
  const node = screen.getByText(label, { hidden: true });
  const host = node.parentElement;
  if (!host) throw new Error("callout host missing");
  return host;
}

function press(
  target: Element,
  pointerType: string,
  point: { x: number; y: number } = { x: 8, y: 8 },
) {
  fireEvent.pointerDown(target, {
    pointerType,
    pointerId: 1,
    clientX: point.x,
    clientY: point.y,
  });
  fireEvent.pointerUp(target, {
    pointerType,
    pointerId: 1,
    clientX: point.x,
    clientY: point.y,
  });
}

describe("HoverCalloutTooltip touch press", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the callout when a finger taps an informational mark", () => {
    render(
      <HoverCalloutTooltip label="Pact choices unlocked">
        <span>rings</span>
      </HoverCalloutTooltip>,
    );

    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");
    press(screen.getByText("rings"), "touch");
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-100");
    expect(calloutHost("Pact choices unlocked")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
  });

  it("hides the callout on a second tap and on a tap outside", () => {
    render(
      <HoverCalloutTooltip label="Pact choices unlocked">
        <span>rings</span>
      </HoverCalloutTooltip>,
    );

    const rings = screen.getByText("rings");
    press(rings, "touch");
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-100");

    press(rings, "touch");
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");

    press(rings, "touch");
    fireEvent.pointerDown(document.body, { pointerType: "touch", bubbles: true });
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");
  });

  it("does not toggle twice when the tap also synthesizes a click", () => {
    render(
      <HoverCalloutTooltip label="Pact choices unlocked">
        <span>rings</span>
      </HoverCalloutTooltip>,
    );

    const rings = screen.getByText("rings");
    press(rings, "touch");
    fireEvent.click(rings);
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-100");
  });

  it("ignores a finger slide and a touch hover", () => {
    render(
      <HoverCalloutTooltip label="Pact choices unlocked">
        <span>rings</span>
      </HoverCalloutTooltip>,
    );

    const rings = screen.getByText("rings");
    fireEvent.pointerEnter(rings, { pointerType: "touch" });
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");

    fireEvent.pointerDown(rings, {
      pointerType: "touch",
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerUp(rings, {
      pointerType: "touch",
      pointerId: 1,
      clientX: 40,
      clientY: 0,
    });
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");
  });

  it("leaves buttons and links to their own press", () => {
    render(
      <HoverCalloutTooltip label="Language">
        <button type="button">EN</button>
      </HoverCalloutTooltip>,
    );

    press(screen.getByRole("button", { name: "EN" }), "touch");
    expect(calloutHost("Language")).toHaveClass("opacity-0");
  });

  it("still shows on mouse hover and hides when the pointer leaves", () => {
    render(
      <HoverCalloutTooltip label="Pact choices unlocked">
        <span>rings</span>
      </HoverCalloutTooltip>,
    );

    const rings = screen.getByText("rings");
    fireEvent.pointerEnter(rings, { pointerType: "mouse" });
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-100");
    fireEvent.pointerLeave(rings, { pointerType: "mouse" });
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");
  });
});
