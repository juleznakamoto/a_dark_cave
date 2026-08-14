import { describe, expect, it } from "vitest";
import { basicChartConfig } from "./basic";

/** Materials the player typically has not found yet when basic rings complete. */
const LATE_MATERIALS = [
  "silver",
  "steel",
  "gold",
  "insight",
  "obsidian",
  "adamant",
  "moonstone",
  "blacksteel",
] as const;

describe("basic achievement rewards", () => {
  it("gifts era-relevant materials instead of later-age discoveries", () => {
    const segments = basicChartConfig.rings.flat();
    expect(segments.length).toBeGreaterThan(0);

    for (const seg of segments) {
      const keys = Object.keys(seg.rewards ?? {});
      for (const key of LATE_MATERIALS) {
        expect(
          keys,
          `${seg.segmentId} (${seg.label}) should not gift ${key}`,
        ).not.toContain(key);
      }
    }
  });
});
