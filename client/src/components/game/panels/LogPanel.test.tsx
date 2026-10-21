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

function unreadMarker(row: HTMLElement) {
  return row.querySelector("canvas");
}

describe("LogPanel mark read", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.setState({
      log: [
        {
          id: "log-short-tap",
          message: LINE,
          timestamp: Date.now(),
          type: "system",
        },
      ],
      readLogIds: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    useGameStore.setState({ log: [], readLogIds: [] });
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

  it("drops read ids for lines that are no longer in the log", () => {
    useGameStore.setState({
      readLogIds: ["old-line", "log-short-tap"],
    });
    useGameStore.getState().markLogEntryRead("log-short-tap");
    expect(useGameStore.getState().readLogIds).toEqual(["log-short-tap"]);
  });

  it("keeps a log line read after the panel remounts", async () => {
    const view = render(<LogPanel />);
    const { row } = lineRow();

    await act(async () => {
      touchPointer(row, "pointerDown");
      touchPointer(row, "pointerUp");
      fireEvent.click(row);
    });

    expect(useGameStore.getState().readLogIds).toEqual(["log-short-tap"]);
    view.unmount();
    render(<LogPanel />);

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

  it("stops flashing an unread line after 15 minutes and keeps the marker", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    render(<LogPanel />);
    const { text, row } = lineRow();
    expect(text.className).toContain("animate-pulse");
    expect(unreadMarker(row)).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(15 * 60 * 1000);
    });

    const after = lineRow();
    expect(after.text.className).not.toContain("animate-pulse");
    expect(unreadMarker(after.row)).not.toBeNull();
  });

  it("does not flash an unread line that is already 15 minutes old", () => {
    useGameStore.setState({
      log: [
        {
          id: "log-short-tap",
          message: LINE,
          timestamp: Date.now() - 15 * 60 * 1000,
          type: "system",
        },
      ],
    });
    render(<LogPanel />);
    const { text, row } = lineRow();
    expect(text.className).not.toContain("animate-pulse");
    expect(unreadMarker(row)).not.toBeNull();
  });
});

describe("LogPanel type filter", () => {
  beforeEach(() => {
    useGameStore.setState({
      log: [
        {
          id: "log-other-1",
          message: "Other line",
          timestamp: Date.now(),
          type: "system",
        },
        {
          id: "log-villager-1",
          message: "A stranger approaches and joins the village.",
          timestamp: Date.now() + 1,
          type: "system",
          newVillagers: true,
        },
      ],
      readLogIds: ["log-other-1", "log-villager-1"],
    });
  });

  afterEach(() => {
    useGameStore.setState({ log: [], readLogIds: [] });
  });

  it("hides other lines when the red filter is toggled off", () => {
    const { getByTestId, queryByText } = render(<LogPanel />);
    expect(queryByText("Other line")).not.toBeNull();
    expect(
      queryByText("A stranger approaches and joins the village."),
    ).not.toBeNull();

    fireEvent.click(getByTestId("log-filter-other"));

    expect(queryByText("Other line")).toBeNull();
    expect(
      queryByText("A stranger approaches and joins the village."),
    ).not.toBeNull();
  });

  it("hides new-villager lines when the white filter is toggled off", () => {
    const { getByTestId, queryByText } = render(<LogPanel />);

    fireEvent.click(getByTestId("log-filter-new-villagers"));

    expect(
      queryByText("A stranger approaches and joins the village."),
    ).toBeNull();
    expect(queryByText("Other line")).not.toBeNull();
  });

  it("shows an empty log when both filters are off", () => {
    const { getByTestId, queryByText } = render(<LogPanel />);

    fireEvent.click(getByTestId("log-filter-new-villagers"));
    fireEvent.click(getByTestId("log-filter-other"));

    expect(queryByText("Other line")).toBeNull();
    expect(
      queryByText("A stranger approaches and joins the village."),
    ).toBeNull();
    expect(queryByText("No messages for this filter.")).toBeNull();
  });
});
