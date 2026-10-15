import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { actionChartConfig } from "./action";

function wellRestedCount(heavySleeperHours: number, totalFocusEarned = 0): number {
  const seg = actionChartConfig.rings
    .flat()
    .find((s) => s.segmentId === "4-wellRested");
  return seg!.getCount({
    story: { heavySleeperHours, seen: {}, merchantPurchases: 0 },
    totalFocusEarned,
  } as GameState);
}

describe("Heavy Sleeper", () => {
  it("counts sleep hours and ignores Obsidian Orb focus", () => {
    expect(wellRestedCount(4, 20)).toBe(4);
    expect(wellRestedCount(0, 20)).toBe(0);
  });

  it("caps at 20 hours", () => {
    expect(wellRestedCount(25, 0)).toBe(20);
  });
});
