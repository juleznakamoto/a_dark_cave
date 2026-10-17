import { describe, expect, it } from "vitest";
import {
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
