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

describe("basic achievement ring layout", () => {
  it("groups the twelve basics into Cave, Village, and Industry rings", () => {
    expect(basicChartConfig.rings.map((ring) => ring.map((s) => s.segmentId))).toEqual([
      ["0-woodGatherer", "0-stoneMiner", "1-explorer", "1-torchCrafter"],
      ["0-hunter", "1-toolCrafter", "1-builder", "1-communityBuilder"],
      ["0-ironMiner", "0-coalMiner", "0-steelForger", "0-tanner"],
    ]);
  });
});

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
