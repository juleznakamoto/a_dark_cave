import { describe, expect, it } from "vitest";
import { overallChartConfig } from "./configs/overall";
import {
  filterWebOnlyAchievements,
  getAchievementConfigForSteam,
} from "./achievementEdition";
import {
  listSteamAchievementMappings,
  toSteamApiName,
} from "./steamAchievements";

describe("web-only achievements (Steam)", () => {
  it("marks Supporter as webOnly", () => {
    const supporter = overallChartConfig.rings
      .flat()
      .find((s) => s.segmentId === "0-supporter");
    expect(supporter?.webOnly).toBe(true);
    expect(supporter?.label).toBe("Supporter");
  });

  it("strips webOnly segments from Steam configs", () => {
    const filtered = getAchievementConfigForSteam(overallChartConfig);
    const ids = filtered.rings.flat().map((s) => s.segmentId);
    expect(ids).not.toContain("0-supporter");
    expect(ids).toContain("0-winNormal");
    expect(ids).toContain("0-resourceMaxer");
  });

  it("keeps webOnly segments when not excluding", () => {
    const filtered = filterWebOnlyAchievements(overallChartConfig, false);
    expect(filtered).toBe(overallChartConfig);
    expect(
      filtered.rings.flat().some((s) => s.segmentId === "0-supporter"),
    ).toBe(true);
  });

  it("never lists Supporter in Steam achievement mappings", () => {
    const mappings = listSteamAchievementMappings();
    const supporterApi = toSteamApiName("overall-0-supporter");
    expect(mappings.some((m) => m.canonicalId === "overall-0-supporter")).toBe(
      false,
    );
    expect(mappings.some((m) => m.apiName === supporterApi)).toBe(false);
  });
});
