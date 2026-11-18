/**
 * @vitest-environment jsdom
 */
import React, { useRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LogEntry } from "@/game/rules/events";
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
    {
      children: React.ReactNode;
      openClickLockKey?: string | number;
      openClickLockMs?: number;
    }
  >(function DialogContent(
    { children, openClickLockKey, openClickLockMs },
    ref,
  ) {
    openClickLockKeys.push(openClickLockKey);
    openClickLockMsValues.push(openClickLockMs);
    return <div ref={ref}>{children}</div>;
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
