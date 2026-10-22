import { describe, expect, it } from "vitest";
import {
  shouldPulseTimerUrgency,
  TIMER_URGENCY_PULSE_MS,
} from "./timerUrgencyPulse";

describe("shouldPulseTimerUrgency", () => {
  it("pulses only while the last 30 seconds are still counting down", () => {
    expect(shouldPulseTimerUrgency(TIMER_URGENCY_PULSE_MS + 1)).toBe(false);
    expect(shouldPulseTimerUrgency(TIMER_URGENCY_PULSE_MS)).toBe(true);
    expect(shouldPulseTimerUrgency(1)).toBe(true);
    expect(shouldPulseTimerUrgency(0)).toBe(false);
  });
});
