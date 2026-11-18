import { describe, expect, it } from "vitest";
import { feedFirePlaybackRate, PLAYBACK_RATE_STEP } from "./soundVolumes";

describe("feedFirePlaybackRate", () => {
  it("slows 2.5% per Heartfire level", () => {
    expect(PLAYBACK_RATE_STEP).toBe(0.025);
    expect(feedFirePlaybackRate(0)).toBe(1);
    expect(feedFirePlaybackRate(1)).toBe(0.975);
    expect(feedFirePlaybackRate(5)).toBe(0.875);
  });

  it("treats invalid levels as zero", () => {
    expect(feedFirePlaybackRate(Number.NaN)).toBe(1);
    expect(feedFirePlaybackRate(-2)).toBe(1);
  });
});
