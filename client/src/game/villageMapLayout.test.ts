import { describe, expect, it } from "vitest";
import {
  VILLAGE_MAP_PATH_OVERRIDES,
  VILLAGE_MAP_POSITIONS,
  VILLAGE_MAP_TREES,
} from "@/game/villageMapLayout";
import {
  applyGrowth,
  DEFAULT_TUNING,
  GROWTH_STEPS,
} from "@/pages/village-map-demo/catalog";
import {
  containSlots,
  layoutWallRadius,
  placedSlots,
  wallStrokeWidth,
} from "@/pages/village-map-demo/geometry";

describe("village map layout", () => {
  it("draws the village-map demo arrangement without moving buildings", () => {
    const tuning = DEFAULT_TUNING;
    const build = applyGrowth(GROWTH_STEPS.length);
    const radius = layoutWallRadius(tuning);
    const thickness = wallStrokeWidth(build.wall, tuning.wallThickness);
    const slots = containSlots(
      placedSlots(build, tuning, VILLAGE_MAP_POSITIONS),
      radius,
      tuning,
      thickness,
      build.wall,
    );
    expect(Object.keys(VILLAGE_MAP_POSITIONS)).toHaveLength(slots.length);
    for (const slot of slots) {
      const saved = VILLAGE_MAP_POSITIONS[slot.id];
      expect(saved, slot.id).toBeTruthy();
      expect(saved.x).toBeCloseTo(slot.x, 3);
      expect(saved.y).toBeCloseTo(slot.y, 3);
    }
    expect(VILLAGE_MAP_POSITIONS["bastion:0"]).toEqual({ x: 41, y: 316 });
    expect(VILLAGE_MAP_POSITIONS["quarry:0"]).toEqual({ x: 179, y: 818 });
    expect(VILLAGE_MAP_POSITIONS["alchemistHall:0"]).toEqual({ x: 779, y: 583 });
    expect(VILLAGE_MAP_POSITIONS["boneTemple:0"]).toEqual({ x: 924, y: 609 });
    for (const saved of Object.values(VILLAGE_MAP_POSITIONS)) {
      expect(saved.x).toBe(Math.round(saved.x));
      expect(saved.y).toBe(Math.round(saved.y));
    }
    expect(VILLAGE_MAP_PATH_OVERRIDES["cabin:0"]).toEqual({ x: 274, y: 605 });
    expect(VILLAGE_MAP_PATH_OVERRIDES["woodenHut:10+woodenHut:5"]).toEqual({ x: 461, y: 504 });
    expect(VILLAGE_MAP_TREES).toHaveLength(68);
    expect(VILLAGE_MAP_TREES[0]).toEqual({
      id: "tree-c6a0c205-34e6-4fa2-aa3b-80d50064a7ff",
      variant: "puff",
      x: 599,
      y: 418,
      turn: 17,
    });
  });
});
