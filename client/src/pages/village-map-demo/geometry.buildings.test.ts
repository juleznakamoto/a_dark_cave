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

describe("supply hut upgrades", () => {
  const size = 40;

  it("grows 10% of the first size at each level and keeps a 1px border", () => {
    expect(storageScale(1)).toBeCloseTo(1.25 * 1.1 * 1.1);
    expect(storageScale(2)).toBeCloseTo(1.25 * 1.1 * 1.1);
    expect(storageScale(3)).toBeCloseTo(1.25 * 1.1 * 1.1);
    expect(storageScale(5)).toBeCloseTo(1.25 * 1.1 * 1.1);
    expect(storageScale(6)).toBeCloseTo(1.25 * 1.1 * 1.1);
    expect(storageBorder(1)).toBe(1);
    expect(storageBorder(3)).toBe(1);
    expect(storageBorder(5)).toBe(1);
    expect(storageBorder(6)).toBe(1);
  });

  it("grows every building by 5% once the great vault is built", () => {
    expect(buildingHutSize(28, 5)).toBe(28);
    expect(buildingHutSize(28, 6)).toBeCloseTo(28 * 1.05);
  });

  it("puts one outward tower, then corner octagons, then side rectangles", () => {
    expect(storageTowers(size, 1)).toHaveLength(0);

    const storehouse = storageTowers(size, 2);
    expect(storehouse.filter((tower) => tower.kind === "octagon")).toHaveLength(1);
    expect(storehouse.some((tower) => tower.kind === "rect")).toBe(false);

    const fortified = storageTowers(size, 3);
    expect(fortified.every((tower) => tower.kind === "octagon")).toBe(true);
    expect(fortified).toHaveLength(3);
    const innerCorners = fortified.filter(
      (tower) => tower.kind === "octagon" && tower.points.some((point) => point.y < -size / 2),
    );
    expect(innerCorners).toHaveLength(2);

    const corners = storageTowers(size, 4);
    expect(corners.filter((tower) => tower.kind === "octagon")).toHaveLength(5);
    expect(corners.some((tower) => tower.kind === "rect")).toBe(false);

    const repository = storageTowers(size, 5);
    const rects = repository.filter((tower) => tower.kind === "rect");
    expect(rects).toHaveLength(2);
    expect(rects.every((tower) => tower.kind === "rect" && tower.y === 0 && tower.h === size * 0.36 * 0.8)).toBe(true);
    expect(repository.filter((tower) => tower.kind === "octagon")).toHaveLength(5);

    const vault = storageTowers(size, 6);
    expect(vault.filter((tower) => tower.kind === "rect")).toHaveLength(2);
    expect(vault.every((tower) => tower.kind === "octagon" || tower.kind === "rect")).toBe(true);
    const along = size * 0.36 * 0.8;
    const depth = size * 0.22;
    const sideRadius = (along / 2) * 1.5;
    const outward = size / 2 + depth / 2;
    const sideOctagons = vault.filter((tower) => tower.kind === "octagon").slice(-2);
    expect(sideOctagons).toHaveLength(2);
    if (sideOctagons[0]?.kind !== "octagon" || sideOctagons[1]?.kind !== "octagon") return;
    const leftTip = sideOctagons[0].points.reduce((best, point) => (point.x < best.x ? point : best));
    const rightTip = sideOctagons[1].points.reduce((best, point) => (point.x > best.x ? point : best));
    expect(leftTip.x).toBeCloseTo(-(outward + sideRadius));
    expect(leftTip.y).toBeCloseTo(0);
    expect(rightTip.x).toBeCloseTo(outward + sideRadius);
    expect(rightTip.y).toBeCloseTo(0);
  });

  it("puts the tier 3 towers on the corners facing the village center", () => {
    const at = { x: MAP_CENTER + 200, y: MAP_CENTER };
    const shapes = buildingShapes("storage", at, size, 3);
    const closer = shapes.filter((shape) => {
      if (shape.kind !== "poly") return false;
      const cx = shape.points.reduce((sum, point) => sum + point.x, 0) / shape.points.length;
      const cy = shape.points.reduce((sum, point) => sum + point.y, 0) / shape.points.length;
      return Math.hypot(cx - MAP_CENTER, cy - MAP_CENTER) < 200;
    });
    expect(closer).toHaveLength(2);
  });
});

describe("hunter lodge upgrades", () => {
  it("adds 20% of the first width and 10% of the first length at each level", () => {
    expect(cabinWidthScale(1)).toBe(1);
    expect(cabinWidthScale(2)).toBe(1);
    expect(cabinWidthScale(3)).toBe(1);
    expect(cabinLengthScale(1)).toBe(1);
    expect(cabinLengthScale(2)).toBe(1);
    expect(cabinLengthScale(3)).toBe(1);
  });

  it("runs the width across the line to the center and the length along it", () => {
    const at = { x: MAP_CENTER + 200, y: MAP_CENTER };
    const shapes = buildingShapes("cabin", at, 40, 2);
    const body = shapes[0];
    expect(body?.kind).toBe("poly");
    if (body?.kind !== "poly") return;
    const xs = body.points.map((point) => point.x);
    const ys = body.points.map((point) => point.y);
    const size = markSize("cabin", 40);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(size * cabinWidthScale(2) * 1.3);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(size * cabinLengthScale(2));
  });

  it("puts a round tower on the outer right corner, 50% larger at level 3", () => {
    const size = 40;
    const width = size * cabinWidthScale(2) * 1.3;
    const depth = size * cabinLengthScale(2);
    expect(cabinTower(size, 1)).toBeNull();
    expect(cabinTower(size, 2)).toEqual({ x: width / 2, y: depth / 2, r: size * 0.22 });
    expect(cabinTower(size, 3)?.r).toBeCloseTo(size * 0.22);

    const at = { x: MAP_CENTER + 200, y: MAP_CENTER };
    const shapes = buildingShapes("cabin", at, size, 2);
    const tower = shapes.find((shape) => shape.kind === "circle");
    expect(tower && tower.kind === "circle" && tower.c.x).toBeGreaterThan(at.x);
    expect(tower && tower.kind === "circle" && tower.c.y).toBeLessThan(at.y);
  });

  it("adds a left-side rectangle on the grand lodge, flush with the inward edge", () => {
    const size = 40;
    expect(cabinWing(size, 1)).toBeNull();
    expect(cabinWing(size, 2)).toBeNull();

    const width = size * cabinWidthScale(3) * 1.3;
    const wingWidth = (size * cabinWidthScale(3)) / 3;
    const depth = size * cabinLengthScale(3);
    const wing = cabinWing(size, 3);
    expect(wing?.w).toBeCloseTo(wingWidth);
    expect(wing?.h).toBeCloseTo(depth * 0.75);
    expect(wing && wing.x + wing.w / 2).toBeCloseTo(-width / 2);
    expect(wing && wing.y - wing.h / 2).toBeCloseTo(-depth / 2);

    const outline = cabinOutline(size, 3);
    expect(outline).toHaveLength(6);
    expect(Math.min(...outline.map((point) => point.x))).toBeCloseTo(-width / 2 - wingWidth);
    expect(Math.min(...outline.map((point) => point.y))).toBeCloseTo(-depth / 2);
    expect(Math.max(...outline.map((point) => point.y)) - Math.min(...outline.map((point) => point.y))).toBeCloseTo(depth);

    const at = { x: MAP_CENTER + 200, y: MAP_CENTER };
    const shapes = buildingShapes("cabin", at, size, 3);
    expect(shapes.filter((shape) => shape.kind === "poly")).toHaveLength(1);
    const body = shapes[0];
    expect(body?.kind).toBe("poly");
    if (body?.kind !== "poly") return;
    const xs = body.points.map((point) => point.x);
    const ys = body.points.map((point) => point.y);
    const drawn = markSize("cabin", size);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(drawn * cabinLengthScale(3));
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(
      drawn * cabinWidthScale(3) * (1.3 + 1 / 3),
    );
    expect(Math.min(...xs)).toBeLessThan(at.x);
    expect(Math.max(...ys)).toBeGreaterThan(at.y);
  });
});

describe("tannery upgrades", () => {
  const spanOf = (points: { x: number; y: number }[]) => {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      x: Math.max(...xs) - Math.min(...xs),
      y: Math.max(...ys) - Math.min(...ys),
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
    };
  };

  it("keeps the hall the same size at every level", () => {
    expect(tanneryWidthScale(1)).toBe(1);
    expect(tanneryWidthScale(2)).toBe(1);
    expect(tanneryWidthScale(3)).toBe(1);
    expect(tanneryLengthScale(1)).toBe(1);
    expect(tanneryLengthScale(2)).toBe(1);
    expect(tanneryLengthScale(3)).toBe(1);
  });

  it("starts as a wide rectangle, then adds one wing, then a second wing open toward the center", () => {
    const size = 40;
    const wide = size * 1.7;
    const deep = wide * (12 / 40);
    const wing = wide * (12 / 40);
    const reach = wide * (26 / 40);
    const first = spanOf(tanneryOutline(size, 1));
    expect(first.x).toBeCloseTo(wide);
    expect(first.y).toBeCloseTo(deep);
    expect(tanneryOutline(size, 1)).toHaveLength(4);

    const second = spanOf(tanneryOutline(size, 2));
    expect(second.x).toBeCloseTo(wide);
    expect(second.y).toBeCloseTo(deep / 2 + reach + deep / 2);
    expect(second.minY).toBeCloseTo(-deep / 2 - reach);
    const leftTip = tanneryOutline(size, 2).filter((point) => point.y < -deep / 2);
    expect(leftTip.length).toBeGreaterThan(0);
    expect(Math.max(...leftTip.map((point) => point.x))).toBeCloseTo(-wide / 2 + wing);
    expect(Math.min(...leftTip.map((point) => point.x))).toBeCloseTo(-wide / 2);

    const third = spanOf(tanneryOutline(size, 3));
    expect(third.x).toBeCloseTo(wide);
    expect(third.minY).toBeCloseTo(second.minY);
    const tips = tanneryOutline(size, 3).filter((point) => point.y < -deep / 2);
    expect(Math.min(...tips.map((point) => point.x))).toBeCloseTo(-wide / 2);
    expect(Math.max(...tips.map((point) => point.x))).toBeCloseTo(wide / 2);
    const mouth = tips.filter((point) => Math.abs(point.x) < wide / 2 - wing);
    expect(mouth).toHaveLength(0);
  });

  it("meets the Master Tannery on the hall's village-facing wall, and the High Tannery at the mouth", () => {
    const hut = 40;
    const at = { x: MAP_CENTER, y: MAP_CENTER - 200 };
    const built = markSize("tannery", hut);
    const deep = built * 1.7 * (12 / 40);
    const reach = built * 1.7 * (26 / 40);
    const master = innerSidePoint("tannery", at, hut, 2);
    const first = innerSidePoint("tannery", at, hut, 1);
    const high = innerSidePoint("tannery", at, hut, 3);
    expect(master).toEqual(first);
    expect(master!.x).toBeCloseTo(at.x);
    expect(master!.y).toBeCloseTo(at.y + deep / 2);
    expect(high!.x).toBeCloseTo(at.x);
    expect(high!.y).toBeCloseTo(at.y + deep / 2 + reach);
  });
});

describe("scribe's office", () => {
  const hut = 40;

  it("starts as half a U, open toward the middle", () => {
    const stone = markSize("stoneHut", hut);
    const size = markSize("archive", hut);
    expect(size).toBeCloseTo(stone * 1.1);
    const outline = archiveOutline(size, 1);
    const span = size * 1.15 * 1.1;
    const arm = span / 2;
    expect(Math.min(...outline.map((point) => point.y))).toBeCloseTo(-span / 2 - arm);
    expect(Math.min(...outline.map((point) => point.x))).toBeCloseTo(-span / 2 - arm);
    expect(Math.max(...outline.map((point) => point.x))).toBeCloseTo(span / 2);
    expect(outline).toContainEqual({ x: span / 2, y: -span / 2 });
    expect(Math.max(...outline.map((point) => point.y))).toBeCloseTo(span / 2);
  });

  it("mirrors into a full U open toward the middle, then adds an outer half circle", () => {
    const size = markSize("archive", hut);
    const span = size * 1.15 * 1.1;
    const second = archiveOutline(size, 2);
    const tip = -span / 2 - span / 2;
    expect(Math.min(...second.map((point) => point.y))).toBeCloseTo(tip);
    expect(second).toContainEqual({ x: -span / 2, y: tip });
    expect(second).toContainEqual({ x: span / 2, y: tip });
    expect(second).toContainEqual({ x: -span / 2, y: -span / 2 });
    expect(second).toContainEqual({ x: span / 2, y: -span / 2 });
    expect(Math.max(...second.map((point) => point.y))).toBeCloseTo(span / 2);

    const grand = size * 1.15 * 1.1;
    const third = archiveOutline(size, 3);
    const outerEdge = grand / 2 + grand * 0.5;
    expect(third).toContainEqual({ x: grand / 2, y: outerEdge });
    expect(third).toContainEqual({ x: -grand / 2, y: outerEdge });
    const crown = third.find((point) => Math.abs(point.x) < 1e-6);
    expect(crown?.y).toBeCloseTo(outerEdge + grand / 2);
    const dome = third.filter((point) => point.y > outerEdge + 1);
    expect(dome.length).toBeGreaterThan(0);
    expect(dome.every((point) => Math.abs(point.x) <= grand / 2 + 1e-6)).toBe(true);
  });

  it("ends the Records Hall path at the hall face, the same as the Grand Archive", () => {
    const at = { x: MAP_CENTER, y: MAP_CENTER - 200 };
    const built = markSize("archive", hut);
    const span = built * 1.15 * 1.1;
    const hall = at.y + span / 2 + 1.5;
    const records = innerSidePoint("archive", at, hut, 2);
    const grand = innerSidePoint("archive", at, hut, 3);
    const office = innerSidePoint("archive", at, hut, 1);
    expect(records).toEqual(grand);
    expect(records!.x).toBeCloseTo(at.x);
    expect(records!.y).toBeCloseTo(hall);
    expect(office!.y).toBeCloseTo(at.y + span / 2);
  });
});

describe("builder's lodge", () => {
  const size = 40;

  it("is an L", () => {
    const span = size * buildersScale(1);
    const long = span * 1.7;
    const deep = long * 1.5;
    const thick = span * 0.28 * 1.3 * 1.75 * 0.85;
    const outline = buildersOutline(size, 1);
    expect(buildersHole(size, 1)).toBeNull();
    expect(outline).toHaveLength(6);
    expect(Math.max(...outline.map((point) => point.x)) - Math.min(...outline.map((point) => point.x))).toBeCloseTo(long);
    expect(Math.max(...outline.map((point) => point.y)) - Math.min(...outline.map((point) => point.y))).toBeCloseTo(deep);
    const minX = Math.min(...outline.map((point) => point.x));
    const maxX = Math.max(...outline.map((point) => point.x));
    const minY = Math.min(...outline.map((point) => point.y));
    const maxY = Math.max(...outline.map((point) => point.y));
    const corner = outline.find((point) => point.x > minX + 1 && point.x < maxX - 1 && point.y > minY + 1 && point.y < maxY - 1);
    expect(corner?.x).toBeCloseTo(-long / 2 + thick);
    expect(corner?.y).toBeCloseTo(deep / 2 - thick);
  });

  it("joins two of those L's into the same open rectangle, then sets an I beside it", () => {
    const span = size * buildersScale(1);
    const long = span * 1.7;
    const deep = long * 1.5;
    const wall = span * 0.28 * 1.3 * 1.75 * 0.85;
    const lodge = buildersOutline(size, 1);
    const hall = buildersOutline(size, 2);
    const hole = buildersHole(size, 2);
    const spanOf = (points: { x: number; y: number }[], axis: "x" | "y") =>
      Math.max(...points.map((point) => point[axis])) - Math.min(...points.map((point) => point[axis]));
    expect(spanOf(hall, "x")).toBeCloseTo(spanOf(lodge, "x"));
    expect(spanOf(hall, "y")).toBeCloseTo(spanOf(lodge, "y"));
    expect(spanOf(hall, "x")).toBeCloseTo(long);
    expect(hole).toHaveLength(4);
    expect(spanOf(hole!, "x")).toBeCloseTo(long - wall * 2);
    expect(spanOf(hole!, "y")).toBeCloseTo(deep - wall * 2);
    expect(buildersWing(size, 2)).toBeNull();

    const guild = buildersOutline(size, 3);
    const guildHole = buildersHole(size, 3);
    const wing = buildersWing(size, 3);
    expect(guild).toEqual(hall);
    expect(guildHole).toEqual(hole);
    expect(wing).toHaveLength(4);
    const courtRight = Math.max(...hall.map((point) => point.x));
    const wingLeft = Math.min(...wing!.map((point) => point.x));
    expect(wingLeft - courtRight).toBeCloseTo(span * 0.18 * 3);
    expect(spanOf(wing!, "x")).toBeCloseTo(span * 0.55);
    expect(spanOf(wing!, "y")).toBeCloseTo(deep);
    expect(Math.min(...wing!.map((point) => point.y))).toBeCloseTo(Math.min(...hall.map((point) => point.y)));
    expect(Math.max(...wing!.map((point) => point.y))).toBeCloseTo(Math.max(...hall.map((point) => point.y)));
  });

  it("turns the lodge toward the village center", () => {
    const at = { x: MAP_CENTER + 200, y: MAP_CENTER };
    const shapes = buildingShapes("builders", at, size, 1);
    const body = shapes[0];
    expect(body?.kind).toBe("poly");
    if (body?.kind !== "poly") return;
    const nearest = Math.min(...body.points.map((point) => Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER)));
    expect(nearest).toBeLessThan(200);
  });
});

describe("foundry", () => {
  const size = 40;

  it("is three times as wide as it is long, with a small cut on the short edge", () => {
    const depth = size * 0.9;
    const outline = foundryOutline(size, 1);
    const cut = depth * (0.45 / 4);
    expect(Math.max(...outline.map((point) => point.x)) - Math.min(...outline.map((point) => point.x))).toBeCloseTo(depth * 3);
    expect(Math.max(...outline.map((point) => point.y)) - Math.min(...outline.map((point) => point.y))).toBeCloseTo(depth);
    expect(outline).toContainEqual({ x: depth * 1.5 - cut, y: -depth / 2 });
    expect(outline).toContainEqual({ x: depth * 1.5, y: -depth / 2 + cut });
    expect(Math.max(...outline.map((point) => point.y))).toBeCloseTo(depth / 2);
  });

  it("grows 15% and adds a furnace on the left and the right", () => {
    const depth = size * 0.9;
    const width = depth * 3;
    const side = width / 4;
    const cut = side * (0.45 / 4);
    const outline = foundryOutline(size, 2);
    expect(outline.filter((point) => point.y > depth / 2 + 1)).toEqual([]);
    const end = width / 2 + side / 2;
    const half = side / 2;
    expect(outline).toContainEqual({ x: end, y: -half + cut });
    expect(outline).toContainEqual({ x: end - cut, y: -half });
    expect(outline).toContainEqual({ x: -end, y: half - cut });
    expect(outline).toContainEqual({ x: -end + cut, y: half });
    expect(Math.max(...outline.map((point) => point.x))).toBeCloseTo(end);
    expect(Math.min(...outline.map((point) => point.x))).toBeCloseTo(-end);
  });

  it("adds two furnaces on the outer edge at masterwork", () => {
    const depth = size * 0.9;
    const width = depth * 3;
    const side = width / 4;
    const cut = side * (0.45 / 4);
    const top = depth / 2 + side / 2;
    const rightEdge = width / 4 + side / 2;
    const leftEdge = width / 4 - side / 2;
    const outline = foundryOutline(size, 3);
    const bumps = outline.filter((point) => point.y > depth / 2 + 1);
    expect(bumps).toHaveLength(8);
    expect(Math.max(...bumps.map((point) => point.y))).toBeCloseTo(top);
    expect(outline).toContainEqual({ x: rightEdge, y: top - cut });
    expect(outline).toContainEqual({ x: rightEdge - cut, y: top });
    expect(outline).toContainEqual({ x: leftEdge + cut, y: top });
    expect(outline).toContainEqual({ x: leftEdge, y: top - cut });
    expect(Math.max(...outline.map((point) => point.x))).toBeCloseTo(width / 2 + side / 2);
  });

  it("puts two small half-circles on the outside of each furnace", () => {
    expect(foundryFurnaceDomes(size, 1)).toEqual([]);
    const prime = foundryFurnaceDomes(size, 2);
    expect(prime.every((dome) => dome.ny === 0)).toBe(true);
    expect(prime.filter((dome) => dome.nx === 1)).toHaveLength(2);
    expect(prime.filter((dome) => dome.nx === -1)).toHaveLength(2);
    const domes = foundryFurnaceDomes(size, 3);
    expect(domes).toHaveLength(8);
    const depth = size * foundryScale(2);
    const width = depth * 3;
    const side = width / 4;
    for (const dome of domes) {
      expect(dome.bulge).toBeCloseTo(dome.along);
      expect(dome.along * 2).toBeCloseTo(side * 0.25);
    }
    const outward = domes.filter((dome) => dome.ny === 1 && dome.nx === 0);
    const right = domes.filter((dome) => dome.nx === 1 && dome.ny === 0);
    const left = domes.filter((dome) => dome.nx === -1 && dome.ny === 0);
    expect(outward).toHaveLength(4);
    expect(right).toHaveLength(2);
    expect(left).toHaveLength(2);
    const top = depth / 2 + side / 2;
    for (const dome of outward) expect(dome.cy).toBeCloseTo(top);
    const out = width / 2 + side / 2;
    for (const dome of right) expect(dome.cx).toBeCloseTo(out);
    for (const dome of left) expect(dome.cx).toBeCloseTo(-out);
    const pair = outward.filter((dome) => dome.cx > 0).sort((a, b) => a.cx - b.cx);
    expect(pair[1].cx - pair[0].cx).toBeGreaterThan(pair[0].along + pair[1].along);
    expect(foundryFurnacePlates(size, 2)).toHaveLength(4);
    expect(foundryFurnacePlates(size, 3)).toHaveLength(8);
  });
});

describe("coinhouse", () => {
  const size = 40;
  const spanOf = (points: { x: number; y: number }[]) => {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return { x: Math.max(...xs) - Math.min(...xs), y: Math.max(...ys) - Math.min(...ys) };
  };

  it("grows 15%, then 10%, then 10%, with an octagon on every corner", () => {
    expect(coinhouseScale(1)).toBeCloseTo(1.15);
    expect(coinhouseScale(2)).toBeCloseTo(1.15);
    expect(coinhouseScale(3)).toBeCloseTo(1.15);
    const first = coinhouseLayout(size, 1);
    expect(first.house.w).toBeCloseTo(size * 1.15);
    expect(first.octagons).toHaveLength(4);
    expect(first.walls).toHaveLength(0);
    expect(first.wallCorner).toBeNull();
    expect(first.gate).toBeNull();
    for (const octagon of first.octagons) {
      expect(spanOf(octagon).x).toBeCloseTo((size * 1.15) / 3);
    }
  });

  it("adds a small wall and a long gate, then a bigger wall with corner octagons", () => {
    const second = coinhouseLayout(size, 2);
    expect(second.house.w).toBeCloseTo(second.side * 0.9);
    expect(second.octagons).toHaveLength(4);
    for (const octagon of second.octagons) {
      expect(spanOf(octagon).x).toBeCloseTo(second.house.w / 3);
    }
    expect(second.walls.length).toBeGreaterThan(0);
    expect(second.wallCorner).toBeTruthy();
    expect(second.gate).toBeTruthy();
    expect(second.gate && second.gate.w).toBeCloseTo(second.side * 0.6);
    expect(second.gate && second.gate.h).toBeCloseTo(second.side * 0.07 * 1.5 * 1.8);
    expect(second.gate && second.gate.y).toBeLessThan(0);
    const innerWall = Math.min(
      ...second.walls.filter((wall) => wall.w > wall.h).map((wall) => Math.abs(wall.y) - wall.h / 2),
    );
    expect(innerWall - second.house.h / 2).toBeCloseTo(second.side * 0.21 * 1.3);

    const third = coinhouseLayout(size, 3);
    expect(third.house.w).toBeCloseTo(third.side * 0.9);
    const secondOut = Math.max(...second.walls.map((wall) => Math.abs(wall.y) + wall.h / 2));
    const thirdOut = Math.max(...third.walls.map((wall) => Math.abs(wall.y) + wall.h / 2));
    expect(thirdOut / third.side).toBeGreaterThan(secondOut / second.side);
    expect(third.octagons).toHaveLength(8);
    expect(third.octagons.every((octagon) => octagon.length === 8)).toBe(true);
    for (const layout of [second, third]) {
      const corner = layout.wallCorner;
      expect(corner).toBeTruthy();
      if (!corner) continue;
      const thick = corner.out - corner.inn;
      expect(corner.innerRadius).toBeGreaterThan(0);
      expect(corner.outerRadius).toBeCloseTo(thick * 2.6 * 0.3);
      expect(corner.innerRadius).toBeCloseTo(thick * 1.6 * 0.3);
    }
    expect(third.gate && third.gate.w).toBeGreaterThan(third.gate.h);
  });
});

describe("scribe hut upgrades", () => {
  const size = 40;
  const spanOf = (points: { x: number; y: number }[]) => {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      x: Math.max(...xs) - Math.min(...xs),
      y: Math.max(...ys) - Math.min(...ys),
    };
  };

  it("cuts the outward corners, then widens and adds circles", () => {
    const base = size * 1.5 * 0.9 * 1.15;
    const first = clerksHut(size, 1);
    expect(first.circles).toHaveLength(0);
    expect(first.body).toHaveLength(6);
    expect(spanOf(first.body).x).toBeCloseTo(base);
    expect(spanOf(first.body).y).toBeCloseTo(base);
    const outer = first.body.filter((point) => point.y > base / 2 - 1);
    expect(Math.max(...outer.map((point) => point.x)) - Math.min(...outer.map((point) => point.x))).toBeCloseTo(
      base * 0.8,
    );

    const depth2 = base;
    const width2 = base * 1.25;
    const second = clerksHut(size, 2);
    expect(spanOf(second.body).x).toBeCloseTo(width2);
    expect(spanOf(second.body).y).toBeCloseTo(depth2);
    expect(second.circles).toEqual([{ x: 0, y: depth2 / 2, r: base / 3 }]);

    const depth3 = base;
    const width3 = base * 1.5;
    const third = clerksHut(size, 3);
    expect(spanOf(third.body).x).toBeCloseTo(width3);
    expect(spanOf(third.body).y).toBeCloseTo(depth3);
    expect(third.circles).toEqual([
      { x: 0, y: depth3 / 2, r: width3 / 6 },
      { x: -width3 / 2, y: 0, r: width3 / 6 },
      { x: width3 / 2, y: 0, r: width3 / 6 },
    ]);
  });
});

describe("alchemist hall", () => {
  const size = 40;

  it("is 50% larger than a normal building and three times as wide as it is long", () => {
    const hall = alchemistHall(size);
    expect(hall.depth).toBeCloseTo(size * 1.5);
    expect(hall.width).toBeCloseTo(hall.depth * 3 * 0.75);
  });

  it("puts a decagon on the left, 25% larger than the length", () => {
    const hall = alchemistHall(size);
    expect(hall.tower).toHaveLength(10);
    const left = Math.min(...hall.tower.map((point) => point.x));
    const right = Math.max(...hall.tower.map((point) => point.x));
    const top = Math.min(...hall.tower.map((point) => point.y));
    const bottom = Math.max(...hall.tower.map((point) => point.y));
    const across = hall.depth * 1.25 * 1.15;
    expect(right - left).toBeCloseTo(across);
    expect(bottom - top).toBeCloseTo(across * Math.cos(Math.PI / 10));
    expect((left + right) / 2).toBeCloseTo(-hall.width / 2);

    const at = { x: MAP_CENTER + 200, y: MAP_CENTER };
    const shapes = buildingShapes("alchemistHall", at, size, 1);
    const tower = shapes[1];
    expect(tower?.kind).toBe("poly");
    if (tower?.kind !== "poly") return;
    const cy = tower.points.reduce((sum, point) => sum + point.y, 0) / tower.points.length;
    expect(cy).toBeGreaterThan(at.y);
  });

  it("puts the entrance in the middle of the right wall, opposite the tower", () => {
    const at = { x: MAP_CENTER + 200, y: MAP_CENTER };
    const hall = alchemistHall(markSize("alchemistHall", 40));
    const door = alchemistHallDoor(at, 40);
    expect(door.x).toBeCloseTo(at.x);
    expect(at.y - door.y).toBeCloseTo(hall.width / 2);
  });
});

describe("blacksmith upgrades", () => {
  const depth = 40;

  it("grows 20% larger than the previous level and keeps a furnace on the outer right", () => {
    expect(blacksmithScale(1)).toBe(1);
    expect(blacksmithScale(2)).toBe(1);
    expect(blacksmithScale(3)).toBe(1);

    const furnace = blacksmithFurnace(depth, depth);
    expect(furnace.x).toBe(depth / 2);
    expect(furnace.y).toBe(depth / 2 - 4);
    expect(furnace.w).toBeCloseTo(depth * 0.64 * 0.8);
    expect(furnace.h).toBe(furnace.w);

    const wide = blacksmithFurnace(depth * 1.44, depth * 1.44);
    expect(wide.x).toBeCloseTo((depth * 1.44) / 2);
    expect(wide.y).toBeCloseTo((depth * 1.44) / 2 - 4);
    expect(wide.w).toBeCloseTo(depth * 1.44 * 0.64 * 0.8);
    expect(wide.h).toBe(wide.w);

    const span2 = depth * 1.2;
    const small = blacksmithWing(span2, span2, 2);
    expect(small?.w).toBeCloseTo((span2 / 3) * 0.5);
    expect(small?.h).toBeCloseTo(span2 * 1.15 * 0.5);
    expect(small && small.x + small.w / 2).toBeCloseTo(-span2 / 2);
    expect(small && small.y - small.h / 2).toBeCloseTo(-span2 / 2);
    expect(blacksmithOutline(span2, span2, 2)).toHaveLength(6);

    const span = depth * 1.44;
    const wing = blacksmithWing(span, span, 3);
    expect(wing?.w).toBeCloseTo((span / 3) * 2);
    expect(wing?.h).toBeCloseTo(span * 1.15);
    expect(wing && wing.x + wing.w / 2).toBeCloseTo(-span / 2);
    expect(wing && wing.y - wing.h / 2).toBeCloseTo(-span / 2);
    expect(blacksmithOutline(span, span, 3)).toHaveLength(6);
  });

  it("sets a square off the upper right of the advanced blacksmith", () => {
    expect(blacksmithAnnex(depth, depth, 1)).toBeNull();
    const annex = blacksmithAnnex(depth, depth, 2);
    expect(annex?.w).toBeCloseTo(depth * 0.42);
    expect(annex?.h).toBe(annex?.w);
    expect(annex && annex.x - annex.w / 2).toBeCloseTo(depth / 2 + depth * 0.14);
    expect(annex && annex.y + annex.h / 2).toBeCloseTo(-depth / 2 - depth * 0.14);
    expect(blacksmithAnnex(depth, depth, 3)).toEqual(annex);

    const at = { x: MAP_CENTER + 200, y: MAP_CENTER };
    expect(buildingShapes("blacksmith", at, depth, 1)).toHaveLength(2);
    expect(buildingShapes("blacksmith", at, depth, 2)).toHaveLength(3);
  });

  it("places the furnace farther from the village center than the building", () => {
    const at = { x: MAP_CENTER + 200, y: MAP_CENTER };
    const shapes = buildingShapes("blacksmith", at, depth, 1);
    const forge = shapes[1];
    expect(forge?.kind).toBe("poly");
    if (forge?.kind !== "poly") return;
    const cx = forge.points.reduce((sum, point) => sum + point.x, 0) / forge.points.length;
    const cy = forge.points.reduce((sum, point) => sum + point.y, 0) / forge.points.length;
    expect(Math.hypot(cx - MAP_CENTER, cy - MAP_CENTER)).toBeGreaterThan(200);
  });
});

describe("trade post upgrades", () => {
  const size = 40;

  it("grows 15% larger than the previous level", () => {
    expect(tradeScale(1)).toBe(1);
    expect(tradeScale(2)).toBe(1);
    expect(tradeScale(3)).toBe(1);
  });

  it("draws every trade post 10% smaller than the other storage marks", () => {
    const hut = DEFAULT_TUNING.squareSize;
    expect(markSize("trade", hut)).toBeCloseTo(hut * 1.2 * 0.9);
    expect(markSize("storage", hut)).toBeCloseTo(hut * 1.2);
  });

  it("cuts every corner, then adds a cut square on the left and the right", () => {
    const post = tradeOutline(size, 1);
    expect(post).toHaveLength(8);
    expect(post.some((point) => point.x === -size / 2 && point.y === -size / 2)).toBe(false);
    expect(post).toContainEqual({ x: -size / 2, y: -size / 2 + size / 12 });

    const bazaarSpan = size * tradeScale(2);
    const bazaar = tradeOutline(size, 2);
    const bazaarWing = bazaarSpan * 1.5;
    expect(Math.min(...bazaar.map((point) => point.x))).toBeCloseTo(-bazaarSpan / 2 - bazaarWing);
    expect(Math.max(...bazaar.map((point) => point.x))).toBeCloseTo(bazaarSpan / 2);
    expect(Math.min(...bazaar.map((point) => point.y))).toBeCloseTo(-bazaarWing / 2);
    expect(bazaar).toContainEqual({ x: -bazaarSpan / 2, y: -bazaarSpan / 2 });
    expect(bazaar).toContainEqual({ x: bazaarSpan / 2 - bazaarSpan / 12, y: -bazaarSpan / 2 });

    const guildSpan = size * tradeScale(3);
    const guild = tradeOutline(size, 3);
    const guildWing = guildSpan * 1.5;
    expect(Math.min(...guild.map((point) => point.x))).toBeCloseTo(-guildSpan / 2 - guildWing);
    expect(Math.max(...guild.map((point) => point.x))).toBeCloseTo(guildSpan / 2 + guildWing);
    expect(guild).toContainEqual({ x: -guildSpan / 2, y: -guildSpan / 2 });
    expect(guild).toContainEqual({ x: guildSpan / 2, y: -guildSpan / 2 });
    const guildCut = guildWing * (1 / 12) * 0.75;
    expect(guild).toContainEqual({ x: -guildSpan / 2 - guildWing + guildCut, y: -guildWing / 2 });
    expect(guild.some((point) => point.y === -guildSpan / 2 && point.x !== -guildSpan / 2 && point.x !== guildSpan / 2)).toBe(false);
    const circles = tradeCircles(size, 3);
    expect(circles).toHaveLength(4);
    expect(circles.every((circle) => circle.rx === guildWing / 3 && circle.ry === (guildWing / 3) * 0.8)).toBe(true);
    expect(circles.map((circle) => circle.y).sort((a, b) => a - b)).toEqual([-guildWing / 2, -guildWing / 2, guildWing / 2, guildWing / 2]);
    expect(tradeCircles(size, 2)).toHaveLength(0);
  });
});

describe("longhouse", () => {
  it("adds a wide rectangle on the inward and outward ends", () => {
    const size = 40;
    const outline = longhouseOutline(size);
    const width = size * LONGHOUSE_LENGTH * 1.25 * 1.15;
    const depth = size * 0.8;
    const endWidth = width * 0.7;
    const endLength = depth / 3;
    expect(Math.min(...outline.map((point) => point.y))).toBeCloseTo(-depth / 2 - endLength);
    expect(Math.max(...outline.map((point) => point.y))).toBeCloseTo(depth / 2 + endLength);
    expect(Math.max(...outline.map((point) => point.x))).toBeCloseTo(width / 2);
    const ends = outline.filter((point) => Math.abs(point.y) > size / 2);
    expect(Math.max(...ends.map((point) => point.x))).toBeCloseTo(endWidth / 2);
    expect(Math.min(...ends.map((point) => point.x))).toBeCloseTo(-endWidth / 2);
  });

  it("puts the entrance in the middle of the right wall", () => {
    const at = { x: MAP_CENTER + 200, y: MAP_CENTER };
    const door = longhouseDoor(at, 40);
    const width = 40 * LONGHOUSE_LENGTH * 1.25 * 1.15;
    expect(door.x).toBeCloseTo(at.x);
    expect(at.y - door.y).toBeCloseTo(width / 2);
  });
});
