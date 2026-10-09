/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  getSegmentFillFlashDelayMs,
  SegmentedProgress,
} from "./progress-bar";

function renderBar(value: number) {
  return render(
    <SegmentedProgress
      value={value}
      segments={8}
      animate={false}
      flashOnFill
      showPercentage={false}
      label="Demo Progress"
      data-testid="footer-demo-progress"
    />,
  );
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("SegmentedProgress flashOnFill", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not flash stages that are already filled", () => {
    renderBar((3 / 8) * 100);
    advance(getSegmentFillFlashDelayMs(7, false));

    expect(screen.queryByTestId("segment-fill-flash-0")).toBeNull();
    expect(screen.queryByTestId("segment-fill-flash-2")).toBeNull();
  });

  it("flashes only the new stage, after its fill transition", () => {
    const { rerender } = renderBar((3 / 8) * 100);
    const delay = getSegmentFillFlashDelayMs(3, false);

    rerender(
      <SegmentedProgress
        value={(4 / 8) * 100}
        segments={8}
        animate={false}
        flashOnFill
        showPercentage={false}
        label="Demo Progress"
        data-testid="footer-demo-progress"
      />,
    );

    expect(screen.queryByTestId("segment-fill-flash-3")).toBeNull();
    advance(delay - 1);
    expect(screen.queryByTestId("segment-fill-flash-3")).toBeNull();
    advance(1);

    expect(screen.getByTestId("segment-fill-flash-3").className).toContain(
      "demo-stage-flash",
    );
    expect(screen.queryByTestId("segment-fill-flash-2")).toBeNull();
    expect(screen.queryByTestId("segment-fill-flash-4")).toBeNull();
  });

  it("flashes each new stage once its own fill transition ends", () => {
    const { rerender } = renderBar(0);

    rerender(
      <SegmentedProgress
        value={(2 / 8) * 100}
        segments={8}
        animate={false}
        flashOnFill
        showPercentage={false}
        label="Demo Progress"
      />,
    );

    advance(getSegmentFillFlashDelayMs(0, false));
    expect(screen.getByTestId("segment-fill-flash-0")).toBeTruthy();
    expect(screen.queryByTestId("segment-fill-flash-1")).toBeNull();

    advance(
      getSegmentFillFlashDelayMs(1, false) - getSegmentFillFlashDelayMs(0, false),
    );
    expect(screen.getByTestId("segment-fill-flash-1")).toBeTruthy();
    expect(screen.queryByTestId("segment-fill-flash-2")).toBeNull();
  });

  it("does not flash when progress stays the same or drops", () => {
    const { rerender } = renderBar((2 / 8) * 100);

    rerender(
      <SegmentedProgress
        value={(2 / 8) * 100}
        segments={8}
        animate={false}
        flashOnFill
        showPercentage={false}
        label="Demo Progress"
      />,
    );
    advance(getSegmentFillFlashDelayMs(1, false));
    expect(screen.queryByTestId("segment-fill-flash-1")).toBeNull();

    rerender(
      <SegmentedProgress
        value={(1 / 8) * 100}
        segments={8}
        animate={false}
        flashOnFill
        showPercentage={false}
        label="Demo Progress"
      />,
    );
    advance(getSegmentFillFlashDelayMs(0, false));
    expect(screen.queryByTestId("segment-fill-flash-0")).toBeNull();
  });

  it("removes a flash when that stage unfills, then flashes again if it refills", () => {
    const { rerender } = renderBar((3 / 8) * 100);
    const stage = 3;

    rerender(
      <SegmentedProgress
        value={((stage + 1) / 8) * 100}
        segments={8}
        animate={false}
        flashOnFill
        showPercentage={false}
        label="Demo Progress"
      />,
    );
    advance(getSegmentFillFlashDelayMs(stage, false));
    expect(screen.getByTestId(`segment-fill-flash-${stage}`)).toBeTruthy();

    rerender(
      <SegmentedProgress
        value={(stage / 8) * 100}
        segments={8}
        animate={false}
        flashOnFill
        showPercentage={false}
        label="Demo Progress"
      />,
    );
    expect(screen.queryByTestId(`segment-fill-flash-${stage}`)).toBeNull();
    expect(screen.queryByTestId("segment-fill-flash-2")).toBeNull();

    rerender(
      <SegmentedProgress
        value={((stage + 1) / 8) * 100}
        segments={8}
        animate={false}
        flashOnFill
        showPercentage={false}
        label="Demo Progress"
      />,
    );
    expect(screen.queryByTestId(`segment-fill-flash-${stage}`)).toBeNull();
    advance(getSegmentFillFlashDelayMs(stage, false));
    expect(screen.getByTestId(`segment-fill-flash-${stage}`)).toBeTruthy();
  });
});
