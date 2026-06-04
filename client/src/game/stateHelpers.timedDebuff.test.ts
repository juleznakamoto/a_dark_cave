import { describe, expect, it } from "vitest";
import { stackTimedDebuff } from "./stateHelpers";

describe("stackTimedDebuff", () => {
  const now = 1_000_000;

  it("starts a fresh window when inactive", () => {
    const result = stackTimedDebuff(
      { isActive: false, endTime: 0 },
      10 * 60 * 1000,
      now,
    );
    expect(result).toEqual({
      isActive: true,
      endTime: now + 10 * 60 * 1000,
      duration: 10 * 60 * 1000,
    });
  });

  it("stacks onto an active debuff instead of resetting", () => {
    const currentEnd = now + 5 * 60 * 1000;
    const result = stackTimedDebuff(
      { isActive: true, endTime: currentEnd, duration: 5 * 60 * 1000 },
      10 * 60 * 1000,
      now,
    );
    expect(result.endTime).toBe(currentEnd + 10 * 60 * 1000);
    expect(result.duration).toBe(15 * 60 * 1000);
  });

  it("starts fresh when the previous debuff expired", () => {
    const result = stackTimedDebuff(
      { isActive: true, endTime: now - 1, duration: 10 * 60 * 1000 },
      10 * 60 * 1000,
      now,
    );
    expect(result.endTime).toBe(now + 10 * 60 * 1000);
    expect(result.duration).toBe(10 * 60 * 1000);
  });
});
