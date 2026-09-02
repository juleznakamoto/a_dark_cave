import { afterEach, describe, expect, it } from "vitest";
import { overallChartConfig } from "./configs/overall";
import {
  filterWebOnlyAchievements,
  getAchievementConfigForEdition,
  getAchievementConfigForSteam,
} from "./achievementEdition";
import {
  listSteamAchievementMappings,
  toSteamApiName,
} from "./steamAchievements";
import { setDevGameModeOverride } from "@/lib/edition";
import { getAchievementRows } from "./achievementHelpers";
import { createInitialState } from "@/game/state";

describe("web-only achievements (Steam)", () => {
  afterEach(() => {
    setDevGameModeOverride("normal");
  });

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
    expect(ids).toContain("0-caveVeteran");
    expect(ids).toContain("0-resourceMaxer");
    expect(ids).toContain("0-upgradeMaxer");
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

  it("hides web-only rows in Steam Game Mode even if the module override is Normal", () => {
    setDevGameModeOverride("normal");
    const filtered = getAchievementConfigForEdition(
      overallChartConfig,
      "steamGame",
    );
    const ids = filtered.rings.flat().map((s) => s.segmentId);
    expect(ids).not.toContain("0-supporter");
    expect(ids).toContain("0-winNormal");
    expect(ids).toContain("0-resourceMaxer");
  });

  it("keeps web-only rows in Normal Mode", () => {
    setDevGameModeOverride("normal");
    const filtered = getAchievementConfigForEdition(overallChartConfig, "normal");
    expect(filtered.rings.flat().some((s) => s.segmentId === "0-supporter")).toBe(
      true,
    );
  });

  it("hides Supporter from achievement rows when the store is in Steam Mode", () => {
    setDevGameModeOverride("normal");
    const state = {
      ...createInitialState(),
      devGameMode: "steamGame" as const,
      claimedAchievements: [],
    };
    const rows = getAchievementRows(overallChartConfig, state, []);
    expect(rows.some((row) => row.segmentId === "0-supporter")).toBe(false);
    expect(rows.some((row) => row.segmentId === "0-winNormal")).toBe(true);
  });
});
