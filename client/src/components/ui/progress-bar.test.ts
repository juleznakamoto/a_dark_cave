import { describe, expect, it } from "vitest";
import { getSegmentFill } from "./progress-bar";

describe("getSegmentFill", () => {
  it("does not bleed a rim onto the next wave at 5/12", () => {
    const value = (5 / 12) * 100;
    expect(getSegmentFill(value, 12, 4)).toBe(1);
    expect(getSegmentFill(value, 12, 5)).toBe(0);
  });

  it("keeps a true partial fill on the active segment", () => {
    expect(getSegmentFill(50, 3, 0)).toBe(1);
    expect(getSegmentFill(50, 3, 1)).toBeCloseTo(0.5);
    expect(getSegmentFill(50, 3, 2)).toBe(0);
  });

  it("fills every segment at 100", () => {
    expect(getSegmentFill(100, 12, 11)).toBe(1);
  });
});
