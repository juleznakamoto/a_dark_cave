import { describe, expect, it } from "vitest";
import {
  getTimedEventTimeBarFillPercent,
  shouldPulseTimedEventTimeBar,
  TIMED_EVENT_TIME_BAR_PULSE_MS,
} from "./timedEventTimeBar";

describe("shouldPulseTimedEventTimeBar", () => {
  it("pulses only while the last 5 seconds are still counting down", () => {
    expect(shouldPulseTimedEventTimeBar(TIMED_EVENT_TIME_BAR_PULSE_MS + 1)).toBe(
      false,
    );
    expect(shouldPulseTimedEventTimeBar(TIMED_EVENT_TIME_BAR_PULSE_MS)).toBe(
      true,
    );
    expect(shouldPulseTimedEventTimeBar(1)).toBe(true);
    expect(shouldPulseTimedEventTimeBar(0)).toBe(false);
  });
});

describe("getTimedEventTimeBarFillPercent", () => {
  it("fills from elapsed time over the visit", () => {
    expect(
      getTimedEventTimeBarFillPercent({
        startTime: 1_000,
        now: 2_000,
        remainingMs: 3_000,
      }),
    ).toBe(25);
  });

  it("stays put while the countdown is paused", () => {
    expect(
      getTimedEventTimeBarFillPercent({
        startTime: 1_000,
        now: 11_000,
        pauseStartedAt: 6_000,
        pauseAccumMs: 0,
        remainingMs: 5_000,
      }),
    ).toBe(50);
  });

  it("subtracts accumulated pause from elapsed time", () => {
    expect(
      getTimedEventTimeBarFillPercent({
        startTime: 1_000,
        now: 6_000,
        pauseAccumMs: 2_000,
        remainingMs: 4_000,
      }),
    ).toBeCloseTo((3_000 / 7_000) * 100);
  });

  it("returns 0 when the visit has no start time", () => {
    expect(
      getTimedEventTimeBarFillPercent({
        now: 5_000,
        remainingMs: 1_000,
      }),
    ).toBe(0);
  });
});
