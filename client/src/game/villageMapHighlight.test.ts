import { describe, expect, it } from "vitest";
import {
  mapHighlightFromSidePanelHover,
  sidePanelBuildingToMapId,
  sidePanelRowFromMapBuilding,
} from "@/game/villageMapHighlight";

describe("village map highlight", () => {
  it("lights every copy of a stacked building", () => {
    expect(sidePanelBuildingToMapId("woodenHut")).toBe("woodenHut");
    expect(mapHighlightFromSidePanelHover("buildings:woodenHut")).toBe("woodenHut");
  });

  it("lights the one mark for an upgrade chain", () => {
    expect(sidePanelBuildingToMapId("bottomlessPit")).toBe("pit");
    expect(sidePanelBuildingToMapId("greatVault")).toBe("storage");
    expect(sidePanelBuildingToMapId("treasury")).toBe("coinhouse");
    expect(sidePanelBuildingToMapId("blackEstate")).toBe("estate");
    expect(mapHighlightFromSidePanelHover("buildings:grandHunterLodge")).toBe("cabin");
  });

  it("lights fortification marks and ignores other side-panel rows", () => {
    expect(mapHighlightFromSidePanelHover("fortifications:bastion")).toBe("bastion");
    expect(mapHighlightFromSidePanelHover("fortifications:fortifiedMoat")).toBe(
      "fortifiedMoat",
    );
    expect(mapHighlightFromSidePanelHover("buildings:traps")).toBe("traps");
    expect(mapHighlightFromSidePanelHover("buildings:improvedTraps")).toBe("traps");
    expect(mapHighlightFromSidePanelHover("fortifications:palisades")).toBe("palisades");
    expect(mapHighlightFromSidePanelHover("resources:wood")).toBeNull();
    expect(mapHighlightFromSidePanelHover(null)).toBeNull();
  });

  it("points a map mark at the side-panel row the player owns", () => {
    expect(sidePanelRowFromMapBuilding("woodenHut", { woodenHut: 2 })).toBe("woodenHut");
    expect(
      sidePanelRowFromMapBuilding("coinhouse", { coinhouse: 1, treasury: 1 }),
    ).toBe("treasury");
    expect(sidePanelRowFromMapBuilding("pit", { bottomlessPit: 1 })).toBe("bottomlessPit");
    expect(sidePanelRowFromMapBuilding("bastion", { bastion: 1 })).toBe("bastion");
    expect(sidePanelRowFromMapBuilding("fortifiedMoat", { fortifiedMoat: 1 })).toBe(
      "fortifiedMoat",
    );
    expect(sidePanelRowFromMapBuilding("palisades", { palisades: 2 })).toBe("palisades");
    expect(sidePanelRowFromMapBuilding("traps", { traps: 1 })).toBe("traps");
    expect(sidePanelRowFromMapBuilding("traps", { traps: 1, improvedTraps: 1 })).toBe(
      "improvedTraps",
    );
    expect(sidePanelRowFromMapBuilding("heartfire", {})).toBeNull();
  });
});
