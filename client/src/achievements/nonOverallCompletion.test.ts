import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import {
  getNonOverallAchievementTotal,
  getNonOverallAchievementsCompletedCount,
  isAllNonOverallAchievementsComplete,
  NON_OVERALL_ACHIEVEMENT_CONFIGS,
} from "./nonOverallCompletion";
import { overallChartConfig } from "./configs/overall";

describe("nonOverallCompletion", () => {
  it("excludes overall / general achievements from the tally configs", () => {
    expect(
      NON_OVERALL_ACHIEVEMENT_CONFIGS.some((c) => c.idPrefix === "overall"),
    ).toBe(false);
    expect(
      overallChartConfig.rings.flat().some((s) => s.segmentId.includes("Maxer")),
    ).toBe(true);
  });

  it("is incomplete on a fresh save", () => {
    expect(isAllNonOverallAchievementsComplete(createInitialState())).toBe(
      false,
    );
  });

  it("exposes a positive total used as Achievement Maxer Y", () => {
    const total = getNonOverallAchievementTotal();
    expect(total).toBeGreaterThan(20);
    expect(getNonOverallAchievementsCompletedCount(createInitialState())).toBe(
      0,
    );
    const maxer = overallChartConfig.rings
      .flat()
      .find((s) => s.segmentId === "0-achievementMaxer");
    expect(maxer?.maxCount).toBe(total);
    expect(maxer?.segments).toBe(20);
  });
});
