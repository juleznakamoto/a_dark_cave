import { describe, expect, it } from "vitest";
import {
  BUILDINGS,
  BUILDING_BY_ID,
  DEFAULT_TUNING,
  GROWTH_STEPS,
  MAP_CENTER,
  applyGrowth,
  stageForPreset,
} from "@/pages/village-map-demo/catalog";
import {
  BASE_TRAP_COUNT,
  MOAT_STROKE,
  buildingClearance,
  buildingShapes,
  closestSlotGap,
  finalFramePoints,
  fittedViewBox,
  minWobbleFactor,
  markSize,
  palisadeTowers,
  circleMeetsPalisade,
  circleMeetsBuilding,
  buildingReach,
  wallPolygon,
  PALISADE_TOWER_STROKE,
  pitOutline,
  pitContourScales,
  pitScale,
  constrainMove,
  containSlots,
  footprintsOverlap,
  hitsPalisadeTower,
  innerWallPolygon,
  layoutWallRadius,
  moatCenterRadius,
  moatBandEdges,
  MOAT_GROUND_PAD,
  furthestVillageGround,
  pointInPolygon,
  treeMeetsTrap,
  treeMeetsMoat,
  villageGroundPoints,
  moatOuterOffset,
  moatOuterOffsetAt,
  moatOuterOffsetMax,
  moatThicknessWave,
  moatRadiusAt,
  ovalRadius,
  placedSlots,
  pointOnWall,
  wallAngle,
  ringPoints,
  smoothClosedPath,
  staysPut,
  sitsOnWall,
  boneyardOutline,
  quarryOutline,
  timberMillOutline,
  pillarOutline,
  boneTempleOutline,
  boneTempleCorners,
  boneTempleSpikes,
  boneTempleSpikedCorners,
  trapPoints,
  trapArmLength,
  trapHitRadius,
  trapMarkReach,
  trapMarkScale,
  trapWallOutset,
  trapsClearOfBuildings,
  mapFramePoints,
  wallClearance,
  wallChitinPolygon,
  wallChitinSpikes,
  CHITIN_SPIKE_BASE,
  CHITIN_SPIKE_LENGTH,
  CHITIN_SPIKE_SPACING,
  CHITIN_OUTLINE,
  WALL_CHITIN_STROKE,
  wallFitLevel,
  wallRadius,
  wallStrokeWidth,
  wobbleAt,
  chitinSpikesAlongPolyline,
  palisadeTowerRim,
  palisadeTowerChitinOutset,
  polyOutsideChitinChains,
  BASTION_DEPTH,
  BASTION_LENGTH,
  bastionChitinPaths,
  bastionChitinChains,
  bastionDrawbridge,
  drawbridgeChitinGap,
  radialAngle,
  watchtowerChitinPaths,
  watchtowerWidth,
  storageBorder,
  storageScale,
  buildingHutSize,
  storageTowers,
  estateOutline,
  blacksmithAnnex,
  blacksmithFurnace,
  blacksmithOutline,
  blacksmithScale,
  blacksmithWing,
  cabinLengthScale,
  cabinOutline,
  cabinTower,
  cabinWidthScale,
  cabinWing,
  tanneryLengthScale,
  tanneryOutline,
  tanneryWidthScale,
  innerSidePoint,
  alchemistHall,
  alchemistHallDoor,
  clerksHut,
  archiveOutline,
  foundryFurnaceDomes,
  foundryFurnacePlates,
  foundryOutline,
  foundryScale,
  coinhouseLayout,
  coinhouseScale,
  buildersOutline,
  buildersHole,
  buildersWing,
  buildersScale,
  tradeOutline,
  tradeScale,
  tradeCircles,
  altarOutline,
  altarSpan,
  altarCircles,
  sanctumCircles,
  heartfireBorderTriangles,
  templeKnightCross,
  templeKnightCrossRays,
  LONGHOUSE_LENGTH,
  longhouseDoor,
  longhouseOutline,
} from "@/pages/village-map-demo/geometry";

describe("watchtower", () => {
  it("grows 10% at each level", () => {
    const hut = 28;
    expect(watchtowerWidth(hut, 1)).toBeCloseTo(hut * 2);
    expect(watchtowerWidth(hut, 2)).toBeCloseTo(hut * 2 * 1.1);
    expect(watchtowerWidth(hut, 3)).toBeCloseTo(hut * 2 * 1.1 ** 2);
    expect(watchtowerWidth(hut, 4)).toBeCloseTo(hut * 2 * 1.1 ** 3);
  });
});

describe("bone temple", () => {
  it("is twice a hut square, a 12-sided polygon, with a 5-sided polygon on every corner", () => {
    const hut = 40;
    const size = markSize("boneTemple", hut);
    expect(size).toBeCloseTo(hut * 2);
    const outline = boneTempleOutline(size);
    expect(outline).toHaveLength(12);
    const radii = outline.map((point) => Math.hypot(point.x, point.y));
    expect(radii.every((radius) => Math.abs(radius - radii[0]) < 1e-6)).toBe(true);
    expect(radii[0] * Math.cos(Math.PI / 12)).toBeCloseTo(size / 2);
    const corners = boneTempleCorners(size);
    expect(corners).toHaveLength(12);
    const cornerRadius = ((size / 3) * 0.8) / 2;
    for (const corner of corners) {
      expect(corner).toHaveLength(5);
      const cx = corner.reduce((sum, point) => sum + point.x, 0) / corner.length;
      const cy = corner.reduce((sum, point) => sum + point.y, 0) / corner.length;
      for (const point of corner) {
        expect(Math.hypot(point.x - cx, point.y - cy)).toBeCloseTo(cornerRadius);
      }
    }
    const spikes = boneTempleSpikes(size);
    expect(spikes).toHaveLength(12);
    const spikeLength = cornerRadius * 0.7;
    for (let index = 0; index < corners.length; index++) {
      const pentagon = corners[index];
      const spike = spikes[index];
      expect(spike).toHaveLength(3);
      const cx = pentagon.reduce((sum, point) => sum + point.x, 0) / pentagon.length;
      const cy = pentagon.reduce((sum, point) => sum + point.y, 0) / pentagon.length;
      const outer = pentagon[0];
      const tip = spike[1];
      const ray = Math.hypot(outer.x - cx, outer.y - cy);
      expect(Math.hypot(tip.x - outer.x, tip.y - outer.y)).toBeCloseTo(spikeLength);
      expect(Math.hypot(tip.x - cx, tip.y - cy)).toBeCloseTo(ray + spikeLength);
      const cross = (outer.x - cx) * (tip.y - cy) - (outer.y - cy) * (tip.x - cx);
      expect(Math.abs(cross)).toBeLessThan(1e-6);
      const base = Math.hypot(spike[0].x - spike[2].x, spike[0].y - spike[2].y);
      const span = Math.hypot(pentagon[1].x - pentagon[4].x, pentagon[1].y - pentagon[4].y);
      expect(base).toBeCloseTo(span * 0.36 * 1.3);
    }
    const spiked = boneTempleSpikedCorners(size);
    expect(spiked).toHaveLength(12);
    for (let index = 0; index < spiked.length; index++) {
      expect(spiked[index]).toHaveLength(7);
      const tip = spikes[index][1];
      const drawnTip = spiked[index][6];
      expect(drawnTip.x).toBeCloseTo(tip.x);
      expect(drawnTip.y).toBeCloseTo(tip.y);
    }
    const shapes = buildingShapes("boneTemple", { x: 10, y: 20 }, hut);
    expect(shapes).toHaveLength(13);
    expect(shapes.every((shape) => shape.kind === "poly")).toBe(true);
  });
});

describe("pillar of clarity", () => {
  it("is a regular hexagon, 25% larger than the old mark, matching the monolith", () => {
    const hut = 40;
    const size = markSize("pillarOfClarity", hut);
    expect(size).toBeCloseTo(hut * 0.75 * 1.25);
    expect(markSize("blackMonolith", hut)).toBeCloseTo(size);
    const outline = pillarOutline(size);
    expect(outline).toHaveLength(6);
    const radii = outline.map((point) => Math.hypot(point.x, point.y));
    expect(radii.every((radius) => Math.abs(radius - radii[0]) < 1e-6)).toBe(true);
    expect(radii[0] * Math.cos(Math.PI / 6)).toBeCloseTo(size / 2);
    const shape = buildingShapes("pillarOfClarity", { x: 10, y: 20 }, hut)[0];
    expect(shape.kind).toBe("poly");
    if (shape.kind !== "poly") return;
    expect(shape.points).toHaveLength(6);
  });
});

describe("timber mill", () => {
  it("is 15% larger, 25% wider, with an outer square on the left", () => {
    const size = 40;
    const depth = size * 1.15;
    const width = depth * 1.25;
    const wing = depth * (2 / 3);
    const outline = timberMillOutline(size);
    expect(Math.max(...outline.map((point) => point.x))).toBeCloseTo(width / 2);
    expect(Math.min(...outline.map((point) => point.x))).toBeCloseTo(-width / 2 - wing);
    expect(Math.min(...outline.map((point) => point.y))).toBeCloseTo(-depth / 2);
    expect(Math.max(...outline.map((point) => point.y))).toBeCloseTo(depth / 2);
    expect(outline).toContainEqual({ x: -width / 2 - wing, y: depth / 2 });
    expect(outline).toContainEqual({ x: -width / 2 - wing, y: depth / 2 - wing });
    expect(outline).toContainEqual({ x: -width / 2, y: depth / 2 - wing });
  });
});

describe("quarry", () => {
  it("matches the boneyard in size, with rounded irregular edges", () => {
    const hut = 40;
    const size = markSize("quarry", hut);
    expect(size).toBeCloseTo(markSize("boneyard", hut));
    const outline = quarryOutline(size);
    const xs = outline.map((point) => point.x);
    const ys = outline.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(width / height).toBeGreaterThan(0.9);
    expect(width / height).toBeLessThan(1.1);
    const radii = outline.map((point) => Math.hypot(point.x, point.y));
    const farthest = Math.max(...radii);
    const nearest = Math.min(...radii);
    expect(farthest).toBeLessThan((size / 2) * Math.SQRT2 * 0.92);
    expect(farthest).toBeGreaterThan(size / 2);
    expect(farthest / nearest).toBeGreaterThan(1.05);
  });
});

describe("boneyard", () => {
  it("is 20% longer than it is wide, with an uneven rim", () => {
    const hut = 40;
    const size = markSize("boneyard", hut);
    expect(size).toBeCloseTo(hut * 1.8);
    const outline = boneyardOutline(size);
    const xs = outline.map((point) => point.x);
    const ys = outline.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(height / width).toBeGreaterThan(1.15);
    expect(height / width).toBeLessThan(1.3);
    expect(width).toBeGreaterThan(size * 0.9);
    expect(width).toBeLessThan(size * 1.15);
    expect(height).toBeGreaterThan(size * 1.2 * 0.9);
    const radii = outline.map((point) => Math.hypot(point.x, point.y));
    expect(Math.max(...radii)).toBeGreaterThan(size / 2 * 1.3);
    expect(Math.min(...radii)).toBeLessThan(size / 2 * 1.1);
  });
});

describe("altar upgrades", () => {
  const size = 40;

  it("starts half as long, then grows 35% and adds a cut outer rectangle", () => {
    expect(altarSpan(size, 1)).toEqual({ width: size * 1.1, depth: (size / 2) * 1.1 });
    const altar = altarOutline(size, 1);
    expect(altar).toHaveLength(4);
    expect(Math.max(...altar.map((point) => point.y)) - Math.min(...altar.map((point) => point.y))).toBeCloseTo((size / 2) * 1.1);

    const shrine = altarSpan(size, 2);
    expect(shrine.width).toBeCloseTo(size * 1.1);
    expect(shrine.depth).toBeCloseTo((size / 2) * 1.1);
    const outline = altarOutline(size, 2);
    const cut = shrine.depth / 12;
    const porchDepth = shrine.width / 2;
    const porchRight = (shrine.width * 0.7) / 2;
    expect(outline).toContainEqual({ x: -shrine.width / 2 + cut, y: -shrine.depth / 2 });
    expect(outline).toContainEqual({ x: shrine.width / 2 - cut, y: shrine.depth / 2 });
    expect(Math.max(...outline.map((point) => point.y))).toBeCloseTo(shrine.depth / 2 + porchDepth);
    expect(Math.min(...outline.map((point) => point.y))).toBeCloseTo(-(shrine.depth / 2 + porchDepth));
    expect(Math.max(...outline.map((point) => point.x))).toBeCloseTo(shrine.width / 2);
    expect(outline).toContainEqual({
      x: porchRight - porchDepth / 12,
      y: shrine.depth / 2 + porchDepth,
    });
    expect(outline).toContainEqual({
      x: -(porchRight - porchDepth / 12),
      y: -(shrine.depth / 2 + porchDepth),
    });

    const temple = altarOutline(size, 3);
    const wing = shrine.depth * 0.4;
    const octagon = shrine.depth * 3;
    expect(temple).toContainEqual({ x: shrine.width / 2 + wing, y: -shrine.depth / 2 });
    expect(Math.min(...temple.map((point) => point.x))).toBeCloseTo(-shrine.width / 2 - wing - octagon);
    expect(Math.max(...temple.map((point) => point.x))).toBeCloseTo(shrine.width / 2 + wing + octagon);
    expect(Math.max(...temple.map((point) => point.y))).toBeCloseTo(octagon / 2);
    expect(altarCircles(size, 3)).toHaveLength(0);

    const sanctum = altarOutline(size, 4);
    const porchOuter = shrine.depth / 2 + shrine.width / 2;
    expect(Math.max(...sanctum.map((point) => point.y))).toBeCloseTo(porchOuter + octagon);
    expect(Math.min(...sanctum.map((point) => point.y))).toBeCloseTo(-(porchOuter + octagon));
    expect(altarCircles(size, 4)).toHaveLength(4 * 8);
    expect(altarCircles(size, 4)[0]?.r).toBeCloseTo(wing * 0.5);
    const lobes = sanctumCircles(size, 4);
    expect(lobes.map((lobe) => lobe.god)).toEqual(["flame", "raven", "dagon", "ash"]);
    expect(lobes[0]?.y).toBeGreaterThan(0);
    expect(lobes[0]?.x).toBeCloseTo(0);
    expect(lobes[1]?.x).toBeGreaterThan(0);
    expect(lobes[2]?.y).toBeLessThan(0);
    expect(lobes[3]?.x).toBeLessThan(0);
    for (const lobe of lobes) {
      expect(lobe.corners).toHaveLength(8);
      expect(lobe.rim).toHaveLength(8);
    }
  });
});

describe("temple knight cross", () => {
  it("is a symmetric cross pattée with flared ends", () => {
    const cross = templeKnightCross(10);
    expect(cross).toHaveLength(12);
    const reach = Math.max(...cross.map((point) => Math.hypot(point.x, point.y)));
    expect(reach).toBeCloseTo(Math.hypot(10, 4.6));
    for (const point of cross) {
      expect(cross.some((other) => other.x === -point.x && other.y === -point.y)).toBe(true);
      expect(cross.some((other) => other.x === point.y && other.y === -point.x)).toBe(true);
    }
  });

  it("puts a short tick outward from each arm", () => {
    const size = 10;
    const rays = templeKnightCrossRays(size, 1);
    expect(rays).toHaveLength(4);
    for (const [from, to] of rays) {
      const along = Math.abs(from.x) > 0 ? "x" : "y";
      expect(Math.abs(from[along])).toBeCloseTo(size + 1);
      expect(Math.abs(to[along]) - Math.abs(from[along])).toBeCloseTo(size * 0.38);
      expect(Math.sign(to[along])).toBe(Math.sign(from[along]));
      expect(from[along === "x" ? "y" : "x"]).toBe(0);
    }
  });
});
describe("ebon grace", () => {
  it("rings the heartfire with flatter triangles and a rounded outer tip", () => {
    const radius = 20;
    const border = 2;
    const triangles = heartfireBorderTriangles(radius, border);
    expect(triangles).toHaveLength(16);
    const outer = radius + border;
    const step = (2 * Math.PI) / 16;
    const base = 2 * outer * Math.sin(step / 2);
    const chordMid = (outer - 0.35) * Math.cos(step / 2);
    const fullAltitude = outer + base * 0.36 - chordMid;
    for (let index = 0; index < triangles.length; index++) {
      const triangle = triangles[index];
      const next = triangles[(index + 1) % triangles.length];
      const right = triangle[triangle.length - 1];
      expect(right.x).toBeCloseTo(next[0].x);
      expect(right.y).toBeCloseTo(next[0].y);
      const span = Math.hypot(right.x - triangle[0].x, right.y - triangle[0].y);
      const farthest = Math.max(...triangle.map((point) => Math.hypot(point.x, point.y)));
      const altitude = farthest - chordMid;
      expect(altitude).toBeCloseTo(fullAltitude * 0.75, 5);
      expect(altitude).toBeGreaterThan(0);
      expect(altitude).toBeLessThan(span);
      expect(triangle.length).toBeGreaterThan(3);
    }
    const tooth = triangles[0];
    const radii = tooth.map((point) => Math.hypot(point.x, point.y));
    const peak = Math.max(...radii);
    expect(radii.filter((value) => peak - value < 0.2).length).toBeGreaterThan(1);
    let rising = true;
    for (let index = 1; index < radii.length; index++) {
      if (rising && radii[index] < radii[index - 1] - 1e-6) rising = false;
      if (!rising) expect(radii[index]).toBeLessThanOrEqual(radii[index - 1] + 1e-4);
    }
    const straight = Math.hypot(tooth[1].x - tooth[0].x, tooth[1].y - tooth[0].y);
    const side = Math.hypot(tooth[0].x - peak, tooth[0].y);
    const cap = Math.hypot(tooth[1].x - tooth[tooth.length - 2].x, tooth[1].y - tooth[tooth.length - 2].y);
    const width = Math.hypot(tooth[tooth.length - 1].x - tooth[0].x, tooth[tooth.length - 1].y - tooth[0].y);
    expect(straight / side).toBeGreaterThan(0.4);
    expect(cap / width).toBeGreaterThan(0.35);
    expect(cap / width).toBeLessThan(0.6);
  });
});

describe("estate outline", () => {
  const size = 40;

  it("joins the hall, towers, and porch into one edge", () => {
    const outline = estateOutline(size, 1);
    const hx = (size * 4) / 2;
    const hy = (size * 3) / 2;
    const ys = outline.map((point) => point.y);
    const xs = outline.map((point) => point.x);
    expect(outline).toHaveLength(41);
    expect(Math.min(...ys)).toBeCloseTo(-hy - size / 2 * 1.25);
    expect(Math.max(...ys)).toBeCloseTo(hy + size / 2);
    const porchHalf = ((size * 4) * (2 / 5)) / 2;
    const porchTip = hy + ((size * 3) / 4) * 0.55;
    const porchCut = (porchTip - hy) * 0.28;
    const porchBottom = outline.filter((point) => Math.abs(point.y - porchTip) < 1e-6);
    expect(porchBottom.map((point) => point.x).sort((a, b) => a - b)).toEqual([
      expect.closeTo(-porchHalf + porchCut, 5),
      expect.closeTo(porchHalf - porchCut, 5),
    ]);
    expect(outline).toContainEqual({ x: porchHalf + porchCut, y: hy });
    expect(outline).toContainEqual({ x: porchHalf, y: hy + porchCut });
    expect(outline).toContainEqual({ x: porchHalf, y: porchTip - porchCut });
    expect(outline).toContainEqual({ x: porchHalf - porchCut, y: porchTip });
    expect(outline).toContainEqual({ x: -porchHalf + porchCut, y: porchTip });
    expect(outline).toContainEqual({ x: -porchHalf, y: porchTip - porchCut });
    expect(outline).toContainEqual({ x: -porchHalf - porchCut, y: hy });
    expect(outline).toContainEqual({ x: -porchHalf, y: hy + porchCut });
    expect(outline.some((point) => point.x === porchHalf && point.y === hy)).toBe(false);
    expect(outline.some((point) => point.x === porchHalf && point.y === porchTip)).toBe(false);
    expect(Math.min(...xs)).toBeCloseTo(-hx - size / 2);
    expect(Math.max(...xs)).toBeCloseTo(hx + size / 2);
    expect(outline.some((point) => point.x === -hx && point.y === -hy)).toBe(false);
    expect(outline.some((point) => point.x === hx && point.y === 0)).toBe(false);
  });

  it("adds the side half-octagons on the black estate", () => {
    const outline = estateOutline(size, 2);
    const hx = (size * 4) / 2;
    const sideRadius = (size / 4) * 1.5;
    expect(outline).toHaveLength(51);
    expect(outline).toContainEqual({ x: hx + sideRadius, y: 0 });
    expect(outline).toContainEqual({ x: -hx - sideRadius, y: 0 });
  });
});
