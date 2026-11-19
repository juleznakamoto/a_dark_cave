/**
 * @vitest-environment jsdom
 */
import React, { useRef } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LogEntry } from "@/game/rules/events";
import { useGameStore } from "@/game/state";
import CubeDialog from "./CubeDialog";

const { openClickLockKeys, openClickLockMsValues } = vi.hoisted(() => ({
  openClickLockKeys: [] as Array<string | number | undefined>,
  openClickLockMsValues: [] as Array<number | undefined>,
}));

vi.mock("@/lib/audio", () => ({
  audioManager: {
    startEventAmbience: vi.fn(),
    stopEventAmbience: vi.fn(),
    getLoopFraction: vi.fn(() => null),
  },
  SOUND_VOLUME: { whisperingCube: 1, heartbeat: 1 },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
      children: React.ReactNode;
      openClickLockKey?: string | number;
      openClickLockMs?: number;
    }
  >(function DialogContent(
    { children, openClickLockKey, openClickLockMs, ...rest },
    ref,
  ) {
    openClickLockKeys.push(openClickLockKey);
    openClickLockMsValues.push(openClickLockMs);
    return (
      <div ref={ref} {...rest}>
        {children}
      </div>
    );
  }),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

function cubeEvent(id: string, viewOnly = false): LogEntry {
  return {
    id,
    eventId: id.split("-")[0],
    title: "Cube",
    message: "It hums.",
    timestamp: 1,
    type: "event",
    viewOnly,
    choices: [{ id: "close", label: "Close", effect: () => ({}) }],
  };
}

function Harness({ event }: { event: LogEntry }) {
  const fallbackExecutedRef = useRef(false);
  return (
    <CubeDialog
      isOpen
      event={event}
      onChoice={() => {}}
      fallbackExecutedRef={fallbackExecutedRef}
    />
  );
}

describe("CubeDialog open click lock", () => {
  afterEach(() => {
    openClickLockKeys.length = 0;
    openClickLockMsValues.length = 0;
    cleanup();
  });

  it("passes the current event id when a later cube replaces the first", () => {
    const view = render(<Harness event={cubeEvent("cube1a-1")} />);
    expect(openClickLockKeys.at(-1)).toBe("cube1a-1");
    expect(openClickLockMsValues.at(-1)).toBeUndefined();

    view.rerender(<Harness event={cubeEvent("cube2a-2")} />);
    expect(openClickLockKeys.at(-1)).toBe("cube2a-2");
    expect(openClickLockMsValues.at(-1)).toBeUndefined();
  });

  it("does not lock Close or paging arrows on an estate memory", () => {
    const view = render(<Harness event={cubeEvent("cube1a-1", true)} />);
    expect(openClickLockMsValues.at(-1)).toBe(0);

    view.rerender(<Harness event={cubeEvent("cube2a-2", true)} />);
    expect(openClickLockMsValues.at(-1)).toBe(0);
  });
});

function fireTouch(
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
  target: Element,
  x: number,
  y: number,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: x, clientY: y, identifier: 1 };
  Object.defineProperty(event, "touches", {
    value: type === "touchend" || type === "touchcancel" ? [] : [point],
  });
  Object.defineProperty(event, "changedTouches", { value: [point] });
  target.dispatchEvent(event);
  return event;
}

describe("CubeDialog estate swipe", () => {
  afterEach(() => {
    cleanup();
  });

  it("claims a swipe on the card so iOS does not wait for an arrow tap", () => {
    render(<Harness event={cubeEvent("cubeDiscovery", true)} />);
    const surface = document.querySelector("[data-testid='cube-memory-surface']");
    expect(surface).toBeTruthy();
    const start = fireTouch("touchstart", surface as Element, 120, 80);
    expect(start.defaultPrevented).toBe(true);
  });

  it("does not claim a tap on Close or an arrow", () => {
    render(<Harness event={cubeEvent("cubeDiscovery", true)} />);
    const button = document.querySelector(
      "[data-testid='cube-memory-surface'] button",
    );
    expect(button).toBeTruthy();
    const start = fireTouch("touchstart", button as Element, 20, 80);
    expect(start.defaultPrevented).toBe(false);
  });

  it("pages from the move when iOS reports the lift back at the start", () => {
    const before = useGameStore.getState();
    act(() => {
      useGameStore.setState((state) => ({
        relics: { ...state.relics, whispering_cube: true },
        events: { ...state.events, cube01: true },
        eventDialog: {
          ...state.eventDialog,
          isOpen: true,
          currentEvent: cubeEvent("cubeDiscovery", true),
        },
      }));
    });

    try {
      render(<Harness event={cubeEvent("cubeDiscovery", true)} />);
      const surface = document.querySelector(
        "[data-testid='cube-memory-surface']",
      ) as Element;
      act(() => {
        fireTouch("touchstart", surface, 200, 100);
        fireTouch("touchmove", surface, 100, 104);
        // Lift reported at the start point. The move already traveled left.
        fireTouch("touchend", surface, 200, 100);
      });
      expect(useGameStore.getState().eventDialog.currentEvent?.eventId).toBe(
        "cube01",
      );
    } finally {
      act(() => {
        useGameStore.setState({
          relics: before.relics,
          events: before.events,
          eventDialog: before.eventDialog,
          clickAnalytics: before.clickAnalytics,
        });
      });
    }
  });
});
