import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import {
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
});
