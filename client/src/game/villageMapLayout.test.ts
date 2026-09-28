import { describe, expect, it } from "vitest";
import { VILLAGE_MAP_POSITIONS } from "@/game/villageMapLayout";
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
    expect(VILLAGE_MAP_POSITIONS["quarry:0"].y).toBe(809);
    expect(VILLAGE_MAP_POSITIONS["boneTemple:0"].x).toBe(923);
    for (const saved of Object.values(VILLAGE_MAP_POSITIONS)) {
      expect(saved.x).toBe(Math.round(saved.x));
      expect(saved.y).toBe(Math.round(saved.y));
    }
  });
});
