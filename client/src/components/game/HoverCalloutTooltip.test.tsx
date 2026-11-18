/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function pointerDown(
  target: Element,
  pointerType: string,
  point: { x: number; y: number } = { x: 8, y: 8 },
  pointerId = 1,
) {
  fireEvent.pointerDown(target, {
    pointerType,
    pointerId,
    clientX: point.x,
    clientY: point.y,
  });
}

function pointerUp(
  target: Element,
  pointerType: string,
  point: { x: number; y: number } = { x: 8, y: 8 },
  pointerId = 1,
) {
  fireEvent.pointerUp(target, {
    pointerType,
    pointerId,
    clientX: point.x,
    clientY: point.y,
  });
}

function shortPress(
  target: Element,
  pointerType: string,
  point: { x: number; y: number } = { x: 8, y: 8 },
) {
  pointerDown(target, pointerType, point);
  pointerUp(target, pointerType, point);
}

async function longPress(
  target: Element,
  pointerType: string,
  point: { x: number; y: number } = { x: 8, y: 8 },
) {
  pointerDown(target, pointerType, point);
  await act(async () => {
    vi.advanceTimersByTime(250);
  });
  pointerUp(target, pointerType, point);
}

describe("HoverCalloutTooltip touch press", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the callout during a long press and keeps it open after release", async () => {
    render(
      <HoverCalloutTooltip label="Pact choices unlocked">
        <span>rings</span>
      </HoverCalloutTooltip>,
    );

    const rings = screen.getByText("rings");
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");

    pointerDown(rings, "touch");
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-100");
    expect(calloutHost("Pact choices unlocked")).toHaveAttribute(
      "aria-hidden",
      "false",
    );

    pointerUp(rings, "touch");
    fireEvent.click(rings);
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-100");
  });

  it("opens on a short tap when openOnTap is set", () => {
    render(
      <HoverCalloutTooltip label="Pact choices unlocked" openOnTap>
        <span>rings</span>
      </HoverCalloutTooltip>,
    );

    shortPress(screen.getByText("rings"), "touch");
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-100");
  });

  it("does not open on a short tap", () => {
    render(
      <HoverCalloutTooltip label="Pact choices unlocked">
        <span>rings</span>
      </HoverCalloutTooltip>,
    );

    shortPress(screen.getByText("rings"), "touch");
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");
  });

  it("hides the callout on a tap outside", async () => {
    render(
      <HoverCalloutTooltip label="Pact choices unlocked">
        <span>rings</span>
      </HoverCalloutTooltip>,
    );

    await longPress(screen.getByText("rings"), "touch");
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-100");

    fireEvent.pointerDown(document.body, { pointerType: "touch", bubbles: true });
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");
  });

  it("ignores a finger slide and a touch hover", async () => {
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
    fireEvent.pointerMove(rings, {
      pointerType: "touch",
      pointerId: 1,
      clientX: 40,
      clientY: 0,
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    fireEvent.pointerUp(rings, {
      pointerType: "touch",
      pointerId: 1,
      clientX: 40,
      clientY: 0,
    });
    expect(calloutHost("Pact choices unlocked")).toHaveClass("opacity-0");
  });

  it("leaves buttons and links to their own press", async () => {
    render(
      <HoverCalloutTooltip label="Language">
        <button type="button">EN</button>
      </HoverCalloutTooltip>,
    );

    await longPress(screen.getByRole("button", { name: "EN" }), "touch");
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
