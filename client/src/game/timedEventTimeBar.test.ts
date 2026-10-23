import { describe, expect, it } from "vitest";
import {
  getTimedDialogTimeBarFillStyle,
  shouldPulseTimedEventTimeBar,
  TIMED_DIALOG_TIME_BAR_FILL_CLASS,
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

describe("getTimedDialogTimeBarFillStyle", () => {
  it("seeks a fill wipe with a negative delay", () => {
    const wipe = getTimedDialogTimeBarFillStyle({
      startMs: 1_000,
      durationMs: 10_000,
      nowMs: 6_000,
    });
    expect(wipe.className).toBe(TIMED_DIALOG_TIME_BAR_FILL_CLASS);
    expect(wipe.style.animationDuration).toBe("10000ms");
    expect(wipe.style.animationDelay).toBe("-5000ms");
    expect(wipe.style.transform).toBe("translateX(-50%)");
  });

  it("snaps to full when time is up", () => {
    const wipe = getTimedDialogTimeBarFillStyle({
      startMs: 0,
      durationMs: 1_000,
      nowMs: 1_000,
    });
    expect(wipe.className).toBe("");
    expect(wipe.style.transform).toBe("translateX(0%)");
  });
});

