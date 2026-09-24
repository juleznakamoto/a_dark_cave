/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { useGameStore } from "@/game/state";
import LogPanel from "./LogPanel";

const LINE = "The fire cracks.";

function lineRow() {
  const text = Array.from(document.querySelectorAll("span")).find(
    (el) => el.textContent === LINE,
  );
  if (!text) throw new Error("missing log line");
  const row = text.closest(".group");
  if (!(row instanceof HTMLElement)) throw new Error("missing log row");
  return { text, row };
}

function touchPointer(
  row: HTMLElement,
  type: "pointerDown" | "pointerUp" | "pointerCancel",
) {
  fireEvent[type](row, { pointerType: "touch", pointerId: 1, bubbles: true });
}

describe("LogPanel mark read", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.setState({
      log: [
        {
          id: "log-short-tap",
          message: LINE,
          timestamp: 1,
          type: "system",
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    useGameStore.setState({ log: [] });
  });

  it("marks a log line read on a short touch tap", async () => {
    render(<LogPanel />);
    const { text, row } = lineRow();
    expect(text.className).toContain("animate-pulse");

    await act(async () => {
      touchPointer(row, "pointerDown");
      touchPointer(row, "pointerUp");
      fireEvent.click(row);
    });

    expect(lineRow().text.className).not.toContain("animate-pulse");
  });

  it("keeps a log line unread when the touch is cancelled, as in a scroll", async () => {
    render(<LogPanel />);
    const { row } = lineRow();

    await act(async () => {
      touchPointer(row, "pointerDown");
      touchPointer(row, "pointerCancel");
      vi.advanceTimersByTime(300);
    });

    expect(lineRow().text.className).toContain("animate-pulse");
  });

  it("still marks a log line read when a touch is held", async () => {
    render(<LogPanel />);
    const { row } = lineRow();

    await act(async () => {
      touchPointer(row, "pointerDown");
      vi.advanceTimersByTime(300);
    });

    expect(lineRow().text.className).not.toContain("animate-pulse");
  });

  it("does not mark a log line read on a mouse click", async () => {
    render(<LogPanel />);
    const { row } = lineRow();

    await act(async () => {
      fireEvent.click(row);
    });

    expect(lineRow().text.className).toContain("animate-pulse");
  });
});
