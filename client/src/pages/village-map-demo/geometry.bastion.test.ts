import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING, GROWTH_STEPS, MAP_CENTER, applyGrowth } from "@/pages/village-map-demo/catalog";
import {
  BASTION_DEPTH,
  BASTION_LENGTH,
  HIGH_BASTION_WIDTH_SCALE,
  HIGH_BASTION_TOWER_SCALE,
  bastionDrawbridge,
  bastionChitinChains,
  bastionGateTowers,
  bastionHallOutline,
  bastionLayout,
  bastionMouth,
  bastionTowers,
  layoutWallRadius,
  markSize,
  moatBandEdges,
  moatCenterRadius,
  placedSlots,
  pointOnWall,
  wallAngle,
  wallChitinPolygon,
  wallStrokeWidth,
} from "@/pages/village-map-demo/geometry";

describe("high bastion mark", () => {
  const size = 28;

  it("grows the body wider by 15% and leaves the depth alone", () => {
    const first = bastionLayout(size, 1);
    const high = bastionLayout(size, 2);
    expect(high.length).toBeCloseTo(first.length * HIGH_BASTION_WIDTH_SCALE);
    expect(high.depth).toBeCloseTo(first.depth);
    expect(high.length).toBeCloseTo(size * BASTION_LENGTH * HIGH_BASTION_WIDTH_SCALE);
    expect(high.depth).toBeCloseTo(size * BASTION_DEPTH);
    expect(bastionTowers(size, 2)[0].r).toBeCloseTo((size / 2) * HIGH_BASTION_TOWER_SCALE);
    expect(bastionTowers(size, 1)[0].r).toBeCloseTo(size / 2);

    const previousWidth = first.length * 1.1 * 0.55;
    const previousStick = first.depth * 1.1 * 0.22;
    expect(high.porch).toBeTruthy();
    expect(high.porch!.village.half * 2).toBeCloseTo(previousWidth);
    expect(high.porch!.village.depth).toBeCloseTo(previousStick * 0.75 * 0.8 * 0.9);
    expect(high.porch!.moat.half * 2).toBeCloseTo(previousWidth * 0.85 * 0.85);
    expect(high.porch!.moat.depth).toBeCloseTo(previousStick);
  });

  it("adds a porch on the village side and the moat side, with gate towers toward the moat", () => {
    const high = bastionLayout(size, 2);
    const outline = bastionHallOutline(size, 2);
    const ys = outline.map((point) => point.y);
    const body = high.depth / 2;
    expect(Math.min(...ys)).toBeLessThan(-body);
    expect(Math.max(...ys)).toBeGreaterThan(body);
    expect(bastionHallOutline(size, 1)).toHaveLength(4);

    const gates = bastionGateTowers(size, 2);
    expect(gates).toHaveLength(2);
    expect(gates[0].y).toBeCloseTo(bastionMouth(size, 2));
    expect(gates[1].y).toBeCloseTo(bastionMouth(size, 2));
    expect(gates[0].x).toBeLessThan(0);
    expect(gates[1].x).toBeGreaterThan(0);
    expect(bastionGateTowers(size, 1)).toHaveLength(0);
  });

  it("still lowers a drawbridge from the moat porch to the far bank", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const anchor = DEFAULT_TUNING.wallThickness * 1.52;
    const full = applyGrowth(GROWTH_STEPS.length);
    const saved = placedSlots(full, DEFAULT_TUNING, {}).find((slot) => slot.buildingId === "bastion");
    expect(saved?.tier).toBe(2);
    const bastion = pointOnWall(wallAngle(saved!, DEFAULT_TUNING.wallOval), radius, DEFAULT_TUNING);
    const hut = DEFAULT_TUNING.squareSize;
    const bridge = bastionDrawbridge(bastion, hut, radius, anchor, DEFAULT_TUNING, 2);
    expect(bridge).toBeTruthy();
    const mouth = bastionMouth(markSize("bastion", hut), 2);
    expect(bridge!.mouth).toBeCloseTo(mouth);
    expect(bridge!.far).toBeGreaterThan(mouth + 16);

    const centerDist = Math.hypot(bastion.x - MAP_CENTER, bastion.y - MAP_CENTER);
    const edges = moatBandEdges(moatCenterRadius(radius, anchor), DEFAULT_TUNING);
    const ux = (bastion.x - MAP_CENTER) / centerDist;
    const uy = (bastion.y - MAP_CENTER) / centerDist;
    let innerAlong = Infinity;
    for (const point of edges.inner) {
      const along = (point.x - MAP_CENTER) * ux + (point.y - MAP_CENTER) * uy;
      const side = Math.hypot(point.x - MAP_CENTER - ux * along, point.y - MAP_CENTER - uy * along);
      if (side < 12 && along > 0) innerAlong = Math.min(innerAlong, along);
    }
    expect(centerDist + mouth).toBeLessThan(innerAlong);

    const stroke = wallStrokeWidth(4, DEFAULT_TUNING.wallThickness);
    const wall = wallChitinPolygon(radius, DEFAULT_TUNING, stroke, 5);
    const chains = bastionChitinChains(bastion, markSize("bastion", hut), 4, 5, wall, 0, 2);
    expect(chains).toHaveLength(1);
    const gate = {
      x: bastion.x + ux * (mouth + 4),
      y: bastion.y + uy * (mouth + 4),
    };
    let nearest = Infinity;
    for (const chain of chains) {
      for (let index = 0; index < chain.length - 1; index++) {
        const start = chain[index];
        const end = chain[index + 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSq = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((gate.x - start.x) * dx + (gate.y - start.y) * dy) / lengthSq));
        nearest = Math.min(nearest, Math.hypot(gate.x - (start.x + dx * t), gate.y - (start.y + dy * t)));
      }
    }
    expect(nearest).toBeLessThan(8);
  });
});
