import { describe, expect, it } from "vitest";
import {
  boneyardGraveLayout,
  graveCrossLocalPoints,
} from "@/pages/village-map-demo/boneyardCrosses";
import { boneyardOutline, markSize } from "@/pages/village-map-demo/geometry";
import { distanceToPolygon, pointInPolygon } from "@/pages/village-map-demo/geometryFrame";

function yardOf(hut: number): number {
  return markSize("boneyard", hut);
}

describe("boneyard grave crosses", () => {
  const yard = yardOf(28);

  it("draws one cross per madness point, and stops at 10", () => {
    expect(boneyardGraveLayout(yard, 0).crosses).toHaveLength(0);
    expect(boneyardGraveLayout(yard, 1).crosses).toHaveLength(1);
    expect(boneyardGraveLayout(yard, 4).crosses).toHaveLength(4);
    expect(boneyardGraveLayout(yard, 10).crosses).toHaveLength(10);
    expect(boneyardGraveLayout(yard, 40).crosses).toHaveLength(10);
  });

  it("keeps graves already placed when another madness point is added", () => {
    const three = boneyardGraveLayout(yard, 3).crosses;
    const ten = boneyardGraveLayout(yard, 10).crosses;
    expect(ten.slice(0, 3)).toEqual(three);
    expect(boneyardGraveLayout(yard, 3).markSize).toBe(boneyardGraveLayout(yard, 10).markSize);
  });

  it("stays inside the yard, clear of the rim and of each other", () => {
    for (const hut of [28, 28 * 1.05, 36]) {
      const size = yardOf(hut);
      const layout = boneyardGraveLayout(size, 10);
      expect(layout.crosses, `hut ${hut}`).toHaveLength(10);
      expect(layout.markSize * 1.35, `hut ${hut}`).toBeGreaterThan(6);
      const outline = boneyardOutline(size);
      let rim = Infinity;
      let gap = Infinity;
      let outside = 0;
      for (const facing of [0, 37, 90, 163]) {
        const shapes = layout.crosses.map((cross) => graveCrossLocalPoints(layout.markSize, cross, facing));
        for (const shape of shapes) {
          for (const point of shape) {
            if (!pointInPolygon(point, outline)) outside += 1;
            rim = Math.min(rim, distanceToPolygon(point, outline));
          }
        }
        for (let index = 0; index < shapes.length; index++) {
          for (let other = index + 1; other < shapes.length; other++) {
            for (const a of shapes[index]) {
              for (const b of shapes[other]) {
                gap = Math.min(gap, Math.hypot(a.x - b.x, a.y - b.y));
              }
            }
          }
        }
      }
      expect(outside, `hut ${hut}`).toBe(0);
      expect(rim, `hut ${hut}`).toBeGreaterThan(3);
      // Drawn 20% past the packed size, so the leftover air can be thin.
      expect(gap, `hut ${hut}`).toBeGreaterThan(0);
    }
  });
});
