import { describe, expect, it } from "vitest";
import {
  buildingKeyToActionBuildSeenKey,
  hasBuildStoryFlags,
  overlayBuildingsFromStorySeen,
  overlayFlagsFromStorySeen,
  sumBuildingCounts,
} from "./rebuildBuildingsFromStorySeen";

describe("rebuildBuildingsFromStorySeen", () => {
  it("maps building keys to actionBuild seen keys", () => {
    expect(buildingKeyToActionBuildSeenKey("woodenHut")).toBe(
      "actionBuildWoodenHut",
    );
    expect(buildingKeyToActionBuildSeenKey("cabin")).toBe("actionBuildCabin");
  });

  it("detects build story flags", () => {
    expect(hasBuildStoryFlags({ actionBuildWoodenHut: true })).toBe(true);
    expect(hasBuildStoryFlags({ fireLit: true })).toBe(false);
    expect(hasBuildStoryFlags(null)).toBe(false);
  });

  it("sums building counts", () => {
    expect(sumBuildingCounts({ woodenHut: 3, cabin: 1, stoneHut: 0 })).toBe(4);
    expect(sumBuildingCounts({})).toBe(0);
  });

  it("overlays wiped buildings to at least 1 without lowering higher counts", () => {
    const result = overlayBuildingsFromStorySeen(
      { woodenHut: 0, cabin: 0, stoneHut: 5 },
      {
        actionBuildWoodenHut: true,
        actionBuildCabin: true,
        actionBuildStoneHut: true,
      },
    );
    expect(result.woodenHut).toBe(1);
    expect(result.cabin).toBe(1);
    expect(result.stoneHut).toBe(5);
  });

  it("restores sticky flags from story evidence", () => {
    const result = overlayFlagsFromStorySeen(
      {
        gameStarted: false,
        villageUnlocked: false,
        forestUnlocked: false,
        hasLitFire: false,
        villagerCapsEnabled: false,
      },
      {
        fireLit: true,
        actionBuildWoodenHut: true,
        tabUnlockBlinkSeen_forest: true,
      },
      60_000,
    );
    expect(result.gameStarted).toBe(true);
    expect(result.hasLitFire).toBe(true);
    expect(result.villageUnlocked).toBe(true);
    expect(result.forestUnlocked).toBe(true);
    expect(result.villagerCapsEnabled).toBe(true);
  });
});
