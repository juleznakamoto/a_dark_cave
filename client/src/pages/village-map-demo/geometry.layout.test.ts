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

describe("village map growth", () => {
  it("starts empty and keeps earlier buildings as later steps arrive", () => {
    expect(applyGrowth(0).counts.woodenHut).toBe(0);
    const camp = applyGrowth(stageForPreset("camp"));
    expect(camp.counts.woodenHut).toBe(3);
    expect(camp.counts.heartfire).toBe(0);
    expect(camp.wall).toBe(0);

    const village = applyGrowth(stageForPreset("village"));
    expect(village.counts.woodenHut).toBe(8);
    expect(village.counts.heartfire).toBe(1);
    expect(village.counts.blacksmith).toBe(2);
    expect(village.counts.cabin).toBe(1);
    expect(village.wall).toBe(0);
    expect(village.traps).toBe(0);
  });

  it("ends with every building, a level 4 wall, and improved traps", () => {
    const full = applyGrowth(stageForPreset("full"));
    for (const building of BUILDINGS) {
      expect(full.counts[building.id], building.id).toBe(building.max);
    }
    expect(full.wall).toBe(4);
    expect(full.traps).toBe(2);
    expect(full.moat).toBe(true);
    expect(full.chitin).toBe(true);
    expect(full.brimstoneInfusion).toBe(true);
    expect(full.ebonGrace).toBe(true);
    expect(full.dedication).toEqual(["dagon", "flame", "raven", "ash"]);
  });

  it("only references real buildings in growth steps", () => {
    for (const step of GROWTH_STEPS) {
      for (const id of Object.keys(step.counts ?? {})) {
        expect(BUILDING_BY_ID[id], id).toBeTruthy();
      }
    }
  });

  it("adds or upgrades one building on each growth step", () => {
    let previous = applyGrowth(0);
    for (let stage = 1; stage <= GROWTH_STEPS.length; stage++) {
      const next = applyGrowth(stage);
      const label = GROWTH_STEPS[stage - 1]?.label ?? String(stage);
      let changes = 0;
      for (const building of BUILDINGS) {
        const delta = (next.counts[building.id] ?? 0) - (previous.counts[building.id] ?? 0);
        if (delta === 0) continue;
        expect(delta, label).toBe(1);
        changes += 1;
      }
      if (next.wall !== previous.wall) {
        expect(next.wall - previous.wall, label).toBe(1);
        changes += 1;
      }
      if (next.traps !== previous.traps) {
        expect(next.traps - previous.traps, label).toBe(1);
        changes += 1;
      }
      if (next.moat !== previous.moat) {
        expect(next.moat, label).toBe(true);
        changes += 1;
      }
      if (next.chitin !== previous.chitin) {
        expect(next.chitin, label).toBe(true);
        changes += 1;
      }
      if (next.ebonGrace !== previous.ebonGrace) {
        expect(next.ebonGrace, label).toBe(true);
        changes += 1;
      }
      if (next.brimstoneInfusion !== previous.brimstoneInfusion) {
        expect(next.brimstoneInfusion, label).toBe(true);
        changes += 1;
      }
      if (
        next.dedication.length !== previous.dedication.length ||
        next.dedication.some((god, index) => god !== previous.dedication[index])
      ) {
        changes += 1;
      }
      expect(changes, label).toBe(1);
      previous = next;
    }
  });
});

describe("village map geometry", () => {
  const full = applyGrowth(stageForPreset("full"));
  const slots = placedSlots(full, DEFAULT_TUNING, {});

  it("spreads the city 10% farther out and leaves hut marks the same size", () => {
    const hut = slots.find((slot) => slot.id === "woodenHut:0");
    const seed = BUILDINGS.find((building) => building.id === "woodenHut")?.slots[0];
    expect(hut).toBeTruthy();
    expect(seed).toBeTruthy();
    const distance = Math.hypot(
      hut!.x - MAP_CENTER,
      (hut!.y - MAP_CENTER) / DEFAULT_TUNING.wallOval,
    );
    expect(distance).toBeCloseTo(seed!.r * 1.1);
    expect(markSize("woodenHut", DEFAULT_TUNING.squareSize)).toBeCloseTo(DEFAULT_TUNING.squareSize * 0.63);
  });

  it("places one square per hut and one square per upgrade chain", () => {
    expect(slots.filter((slot) => slot.buildingId === "woodenHut")).toHaveLength(12);
    expect(slots.filter((slot) => slot.buildingId === "blacksmith")).toHaveLength(1);
    expect(slots.find((slot) => slot.buildingId === "blacksmith")?.tier).toBe(3);
    expect(slots.find((slot) => slot.buildingId === "woodenHut")?.tier).toBe(1);
  });

  it("aims wooden and stone huts at the village center", () => {
    for (const id of ["woodenHut", "stoneHut"] as const) {
      const hut = slots.find((slot) => slot.buildingId === id);
      expect(hut).toBeTruthy();
      const size = markSize(id, DEFAULT_TUNING.squareSize);
      const shape = buildingShapes(id, hut!, DEFAULT_TUNING.squareSize)[0];
      expect(shape.kind).toBe("poly");
      if (shape.kind !== "poly") continue;
      const angle = Math.atan2(hut!.y - MAP_CENTER, hut!.x - MAP_CENTER);
      const radial = { x: Math.cos(angle), y: Math.sin(angle) };
      const tangent = { x: -radial.y, y: radial.x };
      let along = 0;
      let across = 0;
      for (const point of shape.points) {
        const dx = point.x - hut!.x;
        const dy = point.y - hut!.y;
        along = Math.max(along, Math.abs(dx * radial.x + dy * radial.y));
        across = Math.max(across, Math.abs(dx * tangent.x + dy * tangent.y));
      }
      // Depth (local y) lies on the ray to the center; the long side stays across that ray.
      expect(along).toBeCloseTo(size / 2, 1);
      expect(across).toBeCloseTo((size * 1.5) / 2, 1);
      // Local -y is the front: a point ahead of the origin is closer to MAP_CENTER.
      const facing = angle - Math.PI / 2;
      const probe = {
        x: hut!.x - (-40) * Math.sin(facing),
        y: hut!.y + (-40) * Math.cos(facing),
      };
      const originDist = Math.hypot(hut!.x - MAP_CENTER, hut!.y - MAP_CENTER);
      const probeDist = Math.hypot(probe.x - MAP_CENTER, probe.y - MAP_CENTER);
      expect(probeDist).toBeLessThan(originDist - 20);
    }
  });

  it("keeps full-village squares from landing on each other", () => {
    expect(closestSlotGap(slots)).toBeGreaterThanOrEqual(DEFAULT_TUNING.squareSize + 4);
  });

  it("digs an irregular pit in the south, about four huts wide", () => {
    const pit = slots.find((slot) => slot.buildingId === "pit");
    expect(pit).toBeTruthy();
    expect(pit!.y).toBeGreaterThan(MAP_CENTER + 200);
    const base = pitOutline(DEFAULT_TUNING.squareSize);
    const baseWidth = Math.max(...base.map((point) => point.x)) - Math.min(...base.map((point) => point.x));
    expect(baseWidth).toBeGreaterThan(DEFAULT_TUNING.squareSize * 3.9);
    expect(baseWidth).toBeLessThan(DEFAULT_TUNING.squareSize * 4.6);
    expect(pitScale(1)).toBe(1);
    expect(pitScale(4)).toBe(1);
    expect(pitContourScales(1)).toHaveLength(1);
    expect(pitContourScales(4)).toHaveLength(4);
    const outline = pitOutline(DEFAULT_TUNING.squareSize * pitScale(pit!.tier));
    for (const point of outline) {
      const world = { x: pit!.x + point.x, y: pit!.y + point.y };
      for (const slot of slots) {
        if (slot.buildingId === "pit") continue;
        const half =
          slot.buildingId === "longhouse"
            ? (DEFAULT_TUNING.squareSize * LONGHOUSE_LENGTH * 1.25 * 1.15) / 2
            : buildingClearance(slot.buildingId, DEFAULT_TUNING.squareSize);
        expect(Math.hypot(world.x - slot.x, world.y - slot.y)).toBeGreaterThan(half);
      }
    }
  });

  it("fits a closed round wall around the buildings", () => {
    const radius = wallRadius(slots, DEFAULT_TUNING);
    const points = ringPoints(radius, DEFAULT_TUNING);
    const path = smoothClosedPath(points);
    expect(points).toHaveLength(DEFAULT_TUNING.wallSides);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith(" Z")).toBe(true);
    const floor = radius * minWobbleFactor(DEFAULT_TUNING.wallWobble, DEFAULT_TUNING.wallLobes);
    for (const slot of slots) {
      if (slot.buildingId === "bastion" || slot.buildingId === "watchtower") continue;
      expect(
        ovalRadius(slot, DEFAULT_TUNING.wallOval) +
        buildingClearance(
          slot.buildingId,
          DEFAULT_TUNING.squareSize,
          wallFitLevel(slot.buildingId, slot.tier),
        ),
      ).toBeLessThanOrEqual(floor + 0.02);
    }
  });

  it("keeps the heartfire at the center", () => {
    const heart = slots.find((slot) => slot.buildingId === "heartfire");
    expect(heart).toBeTruthy();
    expect(heart!.x).toBe(MAP_CENTER);
    expect(heart!.y).toBe(MAP_CENTER);
    const shifted = placedSlots(full, DEFAULT_TUNING, {
      "heartfire:0": { x: MAP_CENTER + 80, y: MAP_CENTER - 40 },
    });
    const pinned = shifted.find((slot) => slot.buildingId === "heartfire");
    expect(pinned!.x).toBe(MAP_CENTER);
    expect(pinned!.y).toBe(MAP_CENTER);
    const moved = constrainMove(
      heart!,
      { x: MAP_CENTER + 200, y: MAP_CENTER + 80 },
      slots,
      layoutWallRadius(DEFAULT_TUNING),
      DEFAULT_TUNING,
    );
    expect(moved).toEqual({ x: MAP_CENTER, y: MAP_CENTER });
    expect(staysPut("heartfire")).toBe(true);
    expect(markSize("heartfire", DEFAULT_TUNING.squareSize)).toBeCloseTo(DEFAULT_TUNING.squareSize * 1.25);
    const shape = buildingShapes("heartfire", heart!, DEFAULT_TUNING.squareSize)[0];
    expect(shape.kind).toBe("circle");
    if (shape.kind === "circle") {
      expect(shape.r).toBeCloseTo((DEFAULT_TUNING.squareSize * 1.25) / 2);
    }
  });

  it("gathers the pale cross, pillar, and monolith around the heartfire", () => {
    const heart = slots.find((slot) => slot.buildingId === "heartfire");
    expect(heart).toBeTruthy();
    for (const id of ["paleCross", "pillarOfClarity", "blackMonolith"]) {
      const slot = slots.find((item) => item.buildingId === id);
      expect(slot).toBeTruthy();
      const dist = Math.hypot(slot!.x - heart!.x, slot!.y - heart!.y);
      expect(dist).toBeGreaterThan(28);
      expect(dist).toBeLessThan(80);
    }
  });

  it("keeps the pale cross upright instead of facing the village center", () => {
    const cross = slots.find((slot) => slot.buildingId === "paleCross");
    expect(cross).toBeTruthy();
    // Stem is the tall upright rect; points stay axis-aligned at level 1.
    const stem = buildingShapes("paleCross", cross!, DEFAULT_TUNING.squareSize, 1)[0];
    expect(stem.kind).toBe("poly");
    if (stem.kind !== "poly") return;
    const xs = stem.points.map((point) => point.x);
    const ys = stem.points.map((point) => point.y);
    expect(Math.min(...xs)).toBeCloseTo(cross!.x - markSize("paleCross", DEFAULT_TUNING.squareSize) * 0.12, 1);
    expect(Math.max(...xs)).toBeCloseTo(cross!.x + markSize("paleCross", DEFAULT_TUNING.squareSize) * 0.12, 1);
    expect(Math.min(...ys)).toBeLessThan(cross!.y - 10);
    expect(Math.max(...ys)).toBeGreaterThan(cross!.y + 10);
    // A point on the upright axis is not pulled toward MAP_CENTER by building rotation.
    const upright = { x: cross!.x, y: cross!.y - 40 };
    const radial = Math.atan2(cross!.y - MAP_CENTER, cross!.x - MAP_CENTER);
    const facingCenter = {
      x: cross!.x + Math.cos(radial) * -40,
      y: cross!.y + Math.sin(radial) * -40,
    };
    expect(Math.hypot(upright.x - facingCenter.x, upright.y - facingCenter.y)).toBeGreaterThan(5);

    // Consecrated flip is 180° around the cross itself, still not radial.
    const flipped = buildingShapes("paleCross", cross!, DEFAULT_TUNING.squareSize, 2)[0];
    expect(flipped.kind).toBe("poly");
    if (flipped.kind !== "poly") return;
    const flippedXs = flipped.points.map((point) => point.x);
    expect(Math.min(...flippedXs)).toBeCloseTo(Math.min(...xs), 1);
    expect(Math.max(...flippedXs)).toBeCloseTo(Math.max(...xs), 1);
  });

  it("keeps the hand-placed bastion and watchtower, 10% farther out", () => {
    for (const id of ["bastion", "watchtower"] as const) {
      const slot = slots.find((item) => item.buildingId === id);
      const seed = BUILDINGS.find((building) => building.id === id)?.slots[0];
      expect(slot).toBeTruthy();
      expect(seed).toBeTruthy();
      const angle = (seed!.deg * Math.PI) / 180;
      const radius = seed!.r * 1.1;
      expect(slot!.x).toBeCloseTo(MAP_CENTER + Math.cos(angle) * radius, 1);
      expect(slot!.y).toBeCloseTo(
        MAP_CENTER + Math.sin(angle) * radius * DEFAULT_TUNING.wallOval,
        1,
      );
    }
  });

  it("gives the moat a slightly different outline than the wall", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const anchor = DEFAULT_TUNING.wallThickness * 1.52;
    const center = moatCenterRadius(radius, anchor);
    const wallInk = wallStrokeWidth(4, DEFAULT_TUNING.wallThickness) / 2;
    const ratios: number[] = [];
    for (let index = 0; index < 72; index++) {
      const angle = (index / 72) * Math.PI * 2;
      const wall = radius * wobbleAt(angle, DEFAULT_TUNING.wallWobble, DEFAULT_TUNING.wallLobes);
      const moat = moatRadiusAt(center, angle, DEFAULT_TUNING);
      ratios.push(moat / wall);
      expect(moat - MOAT_STROKE / 2).toBeGreaterThan(wall + wallInk + 4);
    }
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeGreaterThan(0.03);
  });

  it("varies the moat thickness from the base width up to 35% thicker", () => {
    const base = moatOuterOffset() + MOAT_STROKE / 2;
    const scales: number[] = [];
    for (let index = 0; index < 360; index++) {
      const angle = (index / 360) * Math.PI * 2;
      const thickness = moatOuterOffsetAt(angle) + MOAT_STROKE / 2;
      scales.push(thickness / base);
      expect(moatThicknessWave(angle)).toBeGreaterThanOrEqual(0);
      expect(moatThicknessWave(angle)).toBeLessThanOrEqual(1);
    }
    expect(Math.min(...scales)).toBeCloseTo(1, 2);
    expect(Math.max(...scales)).toBeCloseTo(1.35, 2);
    expect(moatOuterOffsetMax()).toBeCloseTo(base * 1.35 - MOAT_STROKE / 2);
  });

  it("puts more and larger towers on higher palisades", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    expect(palisadeTowers(1, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize)).toHaveLength(0);
    const small = palisadeTowers(2, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize);
    const medium = palisadeTowers(3, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize);
    const large = palisadeTowers(4, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize);
    expect(small).toHaveLength(5);
    expect(medium).toHaveLength(7);
    expect(large).toHaveLength(9);
    expect(wallStrokeWidth(1, DEFAULT_TUNING.wallThickness)).toBeCloseTo(DEFAULT_TUNING.wallThickness * 0.65 * 1.25);
    expect(wallStrokeWidth(4, DEFAULT_TUNING.wallThickness)).toBeCloseTo(DEFAULT_TUNING.wallThickness * 2.9 * 1.25);
    expect(small[0].r).toBeCloseTo((DEFAULT_TUNING.squareSize * 0.825 * 1.15) / 2, 5);
    expect(medium[0].r).toBeCloseTo((DEFAULT_TUNING.squareSize * 1.35 * 1.15) / 2, 5);
    expect(large[0].r).toBeCloseTo((DEFAULT_TUNING.squareSize * 2.025 * 1.15) / 2, 5);
    expect(small[0].r).toBeLessThan(medium[0].r);
    expect(medium[0].r).toBeLessThan(large[0].r);
    for (const tower of large) {
      const onWall = pointOnWall(wallAngle(tower, DEFAULT_TUNING.wallOval), radius, DEFAULT_TUNING);
      expect(tower.x).toBeCloseTo(onWall.x, 4);
      expect(tower.y).toBeCloseTo(onWall.y, 4);
      const rim = palisadeTowerRim(tower);
      expect(rim.length).toBeGreaterThan(8);
      for (const point of rim) {
        expect(Math.hypot(point.x - tower.x, point.y - tower.y)).toBeCloseTo(tower.r, 5);
      }
    }
  });

  it("covers a crown that meets the palisade or a tower on it", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const wall = wallPolygon(radius, DEFAULT_TUNING);
    const half = 10;
    const reach = 8;
    const onWall = pointOnWall(1.2, radius, DEFAULT_TUNING);
    expect(circleMeetsPalisade(onWall, reach, wall, half, [])).toBe(true);
    const dx = onWall.x - MAP_CENTER;
    const dy = onWall.y - MAP_CENTER;
    const span = Math.hypot(dx, dy) || 1;
    const ux = dx / span;
    const uy = dy / span;
    const clear = {
      x: onWall.x + ux * (half + reach + 4),
      y: onWall.y + uy * (half + reach + 4),
    };
    expect(circleMeetsPalisade(clear, reach, wall, half, [])).toBe(false);
    const grazing = {
      x: onWall.x + ux * (half + reach - 1),
      y: onWall.y + uy * (half + reach - 1),
    };
    expect(circleMeetsPalisade(grazing, reach, wall, half, [])).toBe(true);
    expect(circleMeetsPalisade({ x: MAP_CENTER, y: MAP_CENTER }, reach, wall, half, [])).toBe(false);

    const tower = palisadeTowers(4, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize)[0];
    const inward = Math.atan2(MAP_CENTER - tower.y, MAP_CENTER - tower.x);
    const hitDist = tower.r + PALISADE_TOWER_STROKE / 2 + reach - 1;
    const hitting = {
      x: tower.x + Math.cos(inward) * hitDist,
      y: tower.y + Math.sin(inward) * hitDist,
    };
    expect(circleMeetsPalisade(hitting, reach, wall, half, [])).toBe(false);
    expect(circleMeetsPalisade(hitting, reach, wall, half, [tower])).toBe(true);
    const missing = {
      x: tower.x + Math.cos(inward) * (hitDist + 4),
      y: tower.y + Math.sin(inward) * (hitDist + 4),
    };
    expect(circleMeetsPalisade(missing, reach, wall, half, [tower])).toBe(false);
  });

  it("covers a crown that meets the watchtower or the bastion", () => {
    const hut = DEFAULT_TUNING.squareSize;
    const at = { x: 400, y: 400 };
    expect(circleMeetsBuilding(at, 6, "watchtower", at, hut, 2)).toBe(true);
    expect(circleMeetsBuilding({ x: at.x + 500, y: at.y }, 6, "watchtower", at, hut, 2)).toBe(false);
    expect(circleMeetsBuilding(at, 6, "bastion", at, hut, 2)).toBe(true);
    expect(circleMeetsBuilding({ x: at.x, y: at.y + 500 }, 6, "bastion", at, hut, 2)).toBe(false);
    expect(circleMeetsBuilding(at, 6, "woodenHut", at, hut, 1)).toBe(true);
    expect(circleMeetsBuilding({ x: at.x + 80, y: at.y }, 6, "woodenHut", at, hut, 1)).toBe(false);
  });

  it("covers a crown on an estate corner farther out than two hut widths", () => {
    const hut = DEFAULT_TUNING.squareSize;
    const at = { x: 731, y: 809 };
    const reach = buildingReach("estate", hut, 2);
    expect(reach).toBeGreaterThan(markSize("estate", hut) * 2);
    let far = at;
    let best = 0;
    for (const shape of buildingShapes("estate", at, hut, 2)) {
      if (shape.kind !== "poly") continue;
      for (const point of shape.points) {
        const dist = Math.hypot(point.x - at.x, point.y - at.y);
        if (dist > best) {
          best = dist;
          far = point;
        }
      }
    }
    const span = Math.hypot(far.x - at.x, far.y - at.y) || 1;
    const crownReach = 10;
    const center = {
      x: at.x + ((far.x - at.x) / span) * (best + crownReach * 0.4),
      y: at.y + ((far.y - at.y) / span) * (best + crownReach * 0.4),
    };
    expect(Math.hypot(center.x - at.x, center.y - at.y)).toBeGreaterThan(markSize("estate", hut) * 2 + crownReach);
    expect(circleMeetsBuilding(center, crownReach, "estate", at, hut, 2)).toBe(true);
  });

  it("keeps a dragged building off the palisade towers", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const towers = palisadeTowers(4, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize);
    const moving = {
      id: "woodenHut:0",
      buildingId: "woodenHut",
      index: 0,
      tier: 1,
      label: "Wooden Hut",
      x: MAP_CENTER + 40,
      y: MAP_CENTER,
    };
    const moved = constrainMove(moving, towers[0], [moving], radius, DEFAULT_TUNING, 4);
    expect(hitsPalisadeTower("woodenHut", moved, 1, towers, DEFAULT_TUNING.squareSize)).toBe(false);
    expect(Math.hypot(moved.x - towers[0].x, moved.y - towers[0].y)).toBeGreaterThan(towers[0].r);
  });

  it("keeps the bastion and watchtower off the palisade towers", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const towers = palisadeTowers(4, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize);
    const gap = pointOnWall(0.4 + Math.PI / 9, radius, DEFAULT_TUNING);
    const target = towers[0];
    for (const buildingId of ["bastion", "watchtower"] as const) {
      const moving = {
        id: `${buildingId}:0`,
        buildingId,
        index: 0,
        tier: 1,
        label: buildingId,
        x: gap.x,
        y: gap.y,
      };
      const moved = constrainMove(moving, target, [moving], radius, DEFAULT_TUNING, 4);
      expect(
        hitsPalisadeTower(buildingId, moved, 1, towers, DEFAULT_TUNING.squareSize),
      ).toBe(false);
      const shapes = buildingShapes(buildingId, moved, DEFAULT_TUNING.squareSize, 1);
      let clearance = Infinity;
      for (const shape of shapes) {
        if (shape.kind === "circle") {
          clearance = Math.min(
            clearance,
            Math.hypot(shape.c.x - target.x, shape.c.y - target.y) - shape.r - target.r,
          );
          continue;
        }
        for (let index = 0; index < shape.points.length; index++) {
          const start = shape.points[index];
          const end = shape.points[(index + 1) % shape.points.length];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const lengthSq = dx * dx + dy * dy || 1;
          const t = Math.max(
            0,
            Math.min(1, ((target.x - start.x) * dx + (target.y - start.y) * dy) / lengthSq),
          );
          clearance = Math.min(
            clearance,
            Math.hypot(target.x - (start.x + dx * t), target.y - (start.y + dy * t)) - target.r,
          );
        }
      }
      // 20px of open ground, plus the 2px border and half of the tower's 2px stroke.
      expect(clearance).toBeGreaterThanOrEqual(22);
    }
  });

  it("holds the moat 15% farther from the wall", () => {
    const stroke = wallStrokeWidth(4, DEFAULT_TUNING.wallThickness);
    expect(moatCenterRadius(200, stroke) - 200).toBeCloseTo((stroke * 0.65 + 16) * 2.5 * 1.25 * 1.15 * 1.2 * 1.15, 5);
  });

  it("draws trap arms 25% longer without thickening the stroke", () => {
    const basic = trapMarkScale(1);
    const improved = trapMarkScale(2);
    expect(trapArmLength(DEFAULT_TUNING, 1)).toBeCloseTo(
      DEFAULT_TUNING.trapSize * 0.5 * basic * 1.25,
    );
    expect(trapArmLength(DEFAULT_TUNING, 2)).toBeCloseTo(
      DEFAULT_TUNING.trapSize * 0.5 * improved * 1.25,
    );
    expect(DEFAULT_TUNING.trapStroke * 0.5 * basic).toBeCloseTo(
      DEFAULT_TUNING.trapStroke * 0.5 * 1.3,
    );
    const arm = trapArmLength(DEFAULT_TUNING, 1);
    const stroke = DEFAULT_TUNING.trapStroke * 0.5 * basic;
    const tip = arm * Math.SQRT2 + stroke / 2;
    expect(trapHitRadius(DEFAULT_TUNING, 1)).toBeCloseTo(Math.hypot(tip, stroke / 2));
  });

  it("keeps traps a touch circle plus 5px apart", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const anchor = DEFAULT_TUNING.wallThickness * 1.52;
    const outset = trapWallOutset(4, wallStrokeWidth(4, DEFAULT_TUNING.wallThickness), DEFAULT_TUNING.squareSize, 5);
    for (const level of [1, 2]) {
      const traps = trapPoints(radius, DEFAULT_TUNING, level, anchor, outset);
      const gap = 2 * trapHitRadius(DEFAULT_TUNING, level) + 5;
      for (let i = 0; i < traps.length; i++) {
        for (let j = i + 1; j < traps.length; j++) {
          expect(Math.hypot(traps[i].x - traps[j].x, traps[i].y - traps[j].y)).toBeGreaterThanOrEqual(gap - 1e-6);
        }
      }
    }
  });

  it("places 40 traps between the wall and the moat, without touching either", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const anchor = DEFAULT_TUNING.wallThickness * 1.52;
    const visual = wallStrokeWidth(4, DEFAULT_TUNING.wallThickness);
    const outset = trapWallOutset(4, visual, DEFAULT_TUNING.squareSize, 0);
    const traps = trapPoints(radius, DEFAULT_TUNING, 1, anchor, outset);
    expect(traps).toHaveLength(BASE_TRAP_COUNT);
    const reach = trapMarkReach(DEFAULT_TUNING, 1);
    const distances = traps.map((trap) => ovalRadius(trap, DEFAULT_TUNING.wallOval));
    const wallGaps = traps.map((trap, index) => {
      const angle = wallAngle(trap, DEFAULT_TUNING.wallOval);
      let wall = 0;
      for (let offset = -0.06; offset <= 0.06 + 1e-9; offset += 0.02) {
        wall = Math.max(
          wall,
          radius * wobbleAt(angle + offset, DEFAULT_TUNING.wallWobble, DEFAULT_TUNING.wallLobes),
        );
      }
      return distances[index] - reach - (wall + outset);
    });
    const moatGaps = traps.map((trap, index) => {
      const angle = wallAngle(trap, DEFAULT_TUNING.wallOval);
      const center = moatCenterRadius(radius, anchor);
      let inner = Infinity;
      for (let offset = -0.06; offset <= 0.06 + 1e-9; offset += 0.02) {
        inner = Math.min(inner, moatRadiusAt(center, angle + offset, DEFAULT_TUNING));
      }
      return inner - MOAT_STROKE / 2 - reach - distances[index];
    });
    expect(Math.min(...wallGaps)).toBeGreaterThan(4);
    expect(Math.min(...moatGaps)).toBeGreaterThan(4);
    const spread = Math.max(...distances) - Math.min(...distances);
    expect(spread).toBeGreaterThan(8);

    const angles = traps
      .map((trap) => Math.atan2(trap.y - MAP_CENTER, trap.x - MAP_CENTER))
      .sort((a, b) => a - b);
    const gaps = angles.map((angle, index) => {
      const next = angles[(index + 1) % angles.length];
      const gap = next - angle;
      return gap < 0 ? gap + Math.PI * 2 : gap;
    });
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeGreaterThan(1.2);
  });

  it("keeps improved traps in two rows, with room between the touch circles", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const anchor = DEFAULT_TUNING.wallThickness * 1.52;
    const outset = trapWallOutset(4, wallStrokeWidth(4, DEFAULT_TUNING.wallThickness), DEFAULT_TUNING.squareSize, 0);
    const traps = trapPoints(radius, DEFAULT_TUNING, 2, anchor, outset);
    expect(traps.length).toBeGreaterThan(BASE_TRAP_COUNT);
    expect(traps.length).toBeLessThan(BASE_TRAP_COUNT * 2);
    const reach = trapMarkReach(DEFAULT_TUNING, 2);
    const radii = traps.map((trap) => ovalRadius(trap, DEFAULT_TUNING.wallOval));
    const mid = (Math.min(...radii) + Math.max(...radii)) / 2;
    const inner = radii.filter((value) => value < mid);
    const outer = radii.filter((value) => value >= mid);
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(inner.length).toBeGreaterThan(0);
    expect(outer.length).toBeGreaterThan(0);
    expect(mean(outer) - mean(inner)).toBeGreaterThan(reach);
  });

  it("keeps crosses off the bastion, the palisade, and the chitin", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const anchor = DEFAULT_TUNING.wallThickness * 1.52;
    const full = applyGrowth(GROWTH_STEPS.length);
    const stroke = wallStrokeWidth(4, DEFAULT_TUNING.wallThickness);
    const placed = containSlots(placedSlots(full, DEFAULT_TUNING, {}), radius, DEFAULT_TUNING, stroke, 4);
    const plating = WALL_CHITIN_STROKE + CHITIN_OUTLINE + CHITIN_SPIKE_LENGTH;
    const outset = trapWallOutset(4, stroke, DEFAULT_TUNING.squareSize, WALL_CHITIN_STROKE);
    const traps = trapsClearOfBuildings(
      trapPoints(radius, DEFAULT_TUNING, 2, anchor, outset),
      DEFAULT_TUNING,
      2,
      4,
      radius,
      placed,
      DEFAULT_TUNING.squareSize,
      [],
      WALL_CHITIN_STROKE,
    );
    expect(traps.length).toBeGreaterThan(BASE_TRAP_COUNT);
    expect(traps.length).toBeLessThan(BASE_TRAP_COUNT * 2);
    const towers = palisadeTowers(4, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize);
    const reach = trapMarkReach(DEFAULT_TUNING, 2);
    const air = 3;
    for (const trap of traps) {
      for (const tower of towers) {
        const gap =
          Math.hypot(trap.x - tower.x, trap.y - tower.y) -
          tower.r -
          PALISADE_TOWER_STROKE / 2 -
          plating -
          reach;
        expect(gap).toBeGreaterThan(air);
      }
      for (const slot of placed) {
        if (slot.buildingId !== "bastion" && slot.buildingId !== "watchtower") continue;
        const border = 2;
        for (const shape of buildingShapes(slot.buildingId, slot, DEFAULT_TUNING.squareSize, slot.tier)) {
          const limit = reach + border + plating + air;
          if (shape.kind === "circle") {
            expect(Math.hypot(trap.x - shape.c.x, trap.y - shape.c.y) - shape.r).toBeGreaterThan(limit);
            continue;
          }
          let nearest = Infinity;
          for (let index = 0; index < shape.points.length; index++) {
            const start = shape.points[index];
            const end = shape.points[(index + 1) % shape.points.length];
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const lengthSq = dx * dx + dy * dy || 1;
            const t = Math.max(0, Math.min(1, ((trap.x - start.x) * dx + (trap.y - start.y) * dy) / lengthSq));
            nearest = Math.min(nearest, Math.hypot(trap.x - (start.x + dx * t), trap.y - (start.y + dy * t)));
          }
          expect(nearest).toBeGreaterThan(limit);
        }
      }
    }
  });

  it("keeps one frame for basic traps and improved traps", () => {
    const full = applyGrowth(GROWTH_STEPS.length);
    const fullSlots = placedSlots(full, DEFAULT_TUNING, {});
    const pad = 40;
    const improved = fittedViewBox(mapFramePoints(full, DEFAULT_TUNING, fullSlots), pad);
    const basic = fittedViewBox(
      mapFramePoints({ ...full, traps: 1 }, DEFAULT_TUNING, fullSlots),
      pad,
    );
    expect(fittedViewBox(finalFramePoints(DEFAULT_TUNING), pad)).toBe(improved);
    expect(improved).toBe(basic);
  });

  it("sets the village paper past the traps, and 25 past the moat", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const anchor = DEFAULT_TUNING.wallThickness * 1.52;
    const reachOf = (points: { x: number; y: number }[]) =>
      Math.max(...points.map((point) => Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER)));
    const plain = villageGroundPoints(radius, DEFAULT_TUNING, { traps: 0, moat: false, wall: 0 }, []);
    expect(reachOf(plain)).toBeCloseTo(reachOf(ringPoints(radius, DEFAULT_TUNING)), 4);

    const basicTraps = trapPoints(radius, DEFAULT_TUNING, 1, anchor, 0);
    const basic = villageGroundPoints(radius, DEFAULT_TUNING, { traps: 1, moat: false, wall: 1 }, basicTraps);
    const basicReach = trapMarkReach(DEFAULT_TUNING, 1);
    for (const trap of basicTraps) {
      const nearest = basic.reduce((best, point) => {
        const gap = Math.hypot(point.x - trap.x, point.y - trap.y);
        return gap < best ? gap : best;
      }, Infinity);
      expect(nearest).toBeGreaterThan(basicReach);
    }

    const improvedTraps = trapPoints(radius, DEFAULT_TUNING, 2, anchor, 0);
    const improvedGround = villageGroundPoints(
      radius,
      DEFAULT_TUNING,
      { traps: 2, moat: false, wall: 1 },
      improvedTraps,
    );
    expect(reachOf(improvedGround)).toBeGreaterThan(reachOf(basic) + 8);

    const moat = villageGroundPoints(radius, DEFAULT_TUNING, { traps: 2, moat: true, wall: 1 }, improvedTraps);
    const outer = moatBandEdges(moatCenterRadius(radius, anchor), DEFAULT_TUNING).outer;
    expect(reachOf(moat)).toBeGreaterThan(reachOf(outer) + MOAT_GROUND_PAD - 1);
    expect(reachOf(moat)).toBeLessThan(reachOf(outer) + MOAT_GROUND_PAD + 8);
  });

  it("lets a tree wait on undrawn paper, and a trap covers a crown", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const early = villageGroundPoints(radius, DEFAULT_TUNING, { traps: 0, moat: false, wall: 0 }, []);
    const later = furthestVillageGround(radius, DEFAULT_TUNING);
    const reachOf = (points: { x: number; y: number }[]) =>
      Math.max(...points.map((point) => Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER)));
    expect(pointInPolygon({ x: MAP_CENTER, y: MAP_CENTER }, later)).toBe(true);
    expect(reachOf(later)).toBeGreaterThan(reachOf(early) + MOAT_GROUND_PAD);
    const outside = later.reduce((far, point) => {
      const dx = point.x - MAP_CENTER;
      const dy = point.y - MAP_CENTER;
      const length = Math.hypot(dx, dy) || 1;
      return { x: point.x + (dx / length) * 40, y: point.y + (dy / length) * 40 };
    }, later[0]);
    expect(pointInPolygon(outside, later)).toBe(false);
    const trap = { x: MAP_CENTER + 100, y: MAP_CENTER };
    expect(treeMeetsTrap({ x: MAP_CENTER + 110, y: MAP_CENTER }, 8, [trap], 6)).toBe(true);
    expect(treeMeetsTrap({ x: MAP_CENTER + 140, y: MAP_CENTER }, 8, [trap], 6)).toBe(false);
  });

  it("hides a crown that touches the moat", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const anchor = DEFAULT_TUNING.wallThickness * 1.52;
    const edges = moatBandEdges(moatCenterRadius(radius, anchor), DEFAULT_TUNING);
    const bank = edges.inner[0];
    const dx = bank.x - MAP_CENTER;
    const dy = bank.y - MAP_CENTER;
    const length = Math.hypot(dx, dy) || 1;
    const inward = { x: bank.x - (dx / length) * 4, y: bank.y - (dy / length) * 4 };
    const clear = { x: MAP_CENTER, y: MAP_CENTER };
    expect(treeMeetsMoat(bank, 8, edges)).toBe(true);
    expect(treeMeetsMoat(inward, 8, edges)).toBe(true);
    expect(treeMeetsMoat(clear, 8, edges)).toBe(false);
  });

  it("zooms toward the city edge before the bastion or traps exist", () => {
    const village = applyGrowth(stageForPreset("village"));
    const full = applyGrowth(stageForPreset("full"));
    const pad = 40;
    const tight = Number(
      fittedViewBox(mapFramePoints(village, DEFAULT_TUNING, placedSlots(village, DEFAULT_TUNING, {})), pad)
        .split(" ")[2],
    );
    const wide = Number(
      fittedViewBox(mapFramePoints(full, DEFAULT_TUNING, placedSlots(full, DEFAULT_TUNING, {})), pad)
        .split(" ")[2],
    );
    expect(tight).toBeLessThan(wide);
    expect(village.traps).toBe(0);
    expect(village.counts.bastion ?? 0).toBe(0);
    expect(village.wall).toBe(0);
    expect(village.counts.watchtower ?? 0).toBe(0);
  });

  it("reserves the trap band once palisades, the watchtower, or the bastion exist", () => {
    const village = applyGrowth(stageForPreset("village"));
    const pad = 40;
    const span = (build: typeof village) =>
      Number(
        fittedViewBox(mapFramePoints(build, DEFAULT_TUNING, placedSlots(build, DEFAULT_TUNING, {})), pad).split(
          " ",
        )[2],
      );
    const tight = span(village);
    const traps = span({ ...village, traps: 1 });
    expect(traps).toBeGreaterThan(tight);

    const palisades = { ...village, wall: 1 };
    const watchtower = { ...village, counts: { ...village.counts, watchtower: 1 } };
    const bastion = { ...village, counts: { ...village.counts, bastion: 1 } };
    expect(span(palisades)).toBeCloseTo(span({ ...palisades, traps: 1 }), 0);
    expect(span(watchtower)).toBeCloseTo(span({ ...watchtower, traps: 1 }), 0);
    expect(span(bastion)).toBeCloseTo(span({ ...bastion, traps: 1 }), 0);
    expect(span(palisades)).toBeGreaterThan(tight);
    expect(span(watchtower)).toBeGreaterThan(tight);
    expect(span(bastion)).toBeGreaterThan(tight);
  });

  it("keeps the watchtower and bastion on the wall, and other buildings inside it", () => {
    const slots = placedSlots(full, DEFAULT_TUNING, {});
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const stroke = wallStrokeWidth(4, DEFAULT_TUNING.wallThickness);
    const inner = innerWallPolygon(radius, DEFAULT_TUNING, stroke);
    const clearanceToInner = (point: { x: number; y: number }) => {
      let nearest = Infinity;
      let inside = false;
      // Ray cast for inside, then distance to edges.
      for (let index = 0, previous = inner.length - 1; index < inner.length; previous = index++) {
        const current = inner[index];
        const prior = inner[previous];
        const crosses = (current.y > point.y) !== (prior.y > point.y);
        if (crosses) {
          const xAtY =
            ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
          if (point.x < xAtY) inside = !inside;
        }
      }
      for (let index = 0; index < inner.length; index++) {
        const start = inner[index];
        const end = inner[(index + 1) % inner.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSq = dx * dx + dy * dy || 1;
        const t = Math.max(
          0,
          Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq),
        );
        nearest = Math.min(
          nearest,
          Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t)),
        );
      }
      return inside ? nearest : -nearest;
    };
    const bastion = slots.find((slot) => slot.buildingId === "bastion");
    const hut = slots.find((slot) => slot.id === "woodenHut:0");
    const neighbor = slots.find((slot) => slot.id === "woodenHut:1");
    expect(bastion).toBeTruthy();
    expect(hut).toBeTruthy();
    expect(neighbor).toBeTruthy();

    const onWall = constrainMove(
      bastion!,
      { x: MAP_CENTER + 30, y: MAP_CENTER - 900 },
      slots,
      radius,
      DEFAULT_TUNING,
    );
    const angle = wallAngle(onWall, DEFAULT_TUNING.wallOval);
    const limit = radius * wobbleAt(angle, DEFAULT_TUNING.wallWobble, DEFAULT_TUNING.wallLobes);
    const exact = pointOnWall(angle, radius, DEFAULT_TUNING);
    expect(Math.hypot(onWall.x - exact.x, onWall.y - exact.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(ovalRadius(onWall, DEFAULT_TUNING.wallOval) - limit)).toBeLessThanOrEqual(1);
    expect(onWall.x).toBe(Math.round(onWall.x));
    expect(onWall.y).toBe(Math.round(onWall.y));

    const alone = {
      id: "woodenHut:0",
      buildingId: "woodenHut",
      index: 0,
      tier: 1,
      label: "Wooden Hut",
      x: MAP_CENTER + 40,
      y: MAP_CENTER,
    };
    const outside = constrainMove(
      alone,
      { x: MAP_CENTER + 4000, y: MAP_CENTER },
      [alone],
      radius,
      DEFAULT_TUNING,
      4,
    );
    const shape = buildingShapes("woodenHut", outside, DEFAULT_TUNING.squareSize)[0];
    expect(shape.kind).toBe("poly");
    if (shape.kind !== "poly") return;
    let nearest = Infinity;
    for (const corner of shape.points) {
      const clearance = clearanceToInner(corner);
      expect(clearance).toBeGreaterThanOrEqual(-0.25);
      nearest = Math.min(nearest, clearance);
      // Still clear of the wall centerline by about half the stroke.
      expect(wallClearance(corner, radius, DEFAULT_TUNING)).toBeGreaterThan(stroke / 2 - 1);
    }
    expect(nearest).toBeLessThan(1.5);
    expect(outside.x).toBeGreaterThan(MAP_CENTER + 300);
    const stopped = constrainMove(
      { ...alone, x: outside.x, y: outside.y },
      { x: outside.x + 80, y: outside.y },
      [{ ...alone, x: outside.x, y: outside.y }],
      radius,
      DEFAULT_TUNING,
      4,
    );
    expect(stopped.x).toBeLessThanOrEqual(outside.x + 1);

    const blocked = constrainMove(
      hut!,
      { x: neighbor!.x, y: neighbor!.y },
      slots,
      radius,
      DEFAULT_TUNING,
      4,
    );
    expect(
      footprintsOverlap(
        "woodenHut",
        blocked,
        "woodenHut",
        neighbor!,
        DEFAULT_TUNING.squareSize,
      ),
    ).toBe(false);
    expect(Math.hypot(blocked.x - neighbor!.x, blocked.y - neighbor!.y)).toBeGreaterThan(8);

    const nudged = constrainMove(
      hut!,
      { x: hut!.x + 1, y: hut!.y },
      slots,
      radius,
      DEFAULT_TUNING,
      4,
    );
    expect(Math.abs(nudged.x - (hut!.x + 1))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(nudged.y - hut!.y)).toBeLessThanOrEqual(0.5);
    expect(nudged.x).toBe(Math.round(nudged.x));
    expect(nudged.y).toBe(Math.round(nudged.y));
  });

  it("pulls laid-out buildings inside the wall's inner edge", () => {
    const raw = placedSlots(full, DEFAULT_TUNING, {});
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const stroke = wallStrokeWidth(4, DEFAULT_TUNING.wallThickness);
    const slots = containSlots(raw, radius, DEFAULT_TUNING, stroke, 4);
    const towers = palisadeTowers(4, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize);
    const inner = innerWallPolygon(radius, DEFAULT_TUNING, stroke);
    const pointInside = (point: { x: number; y: number }) => {
      let inside = false;
      for (let index = 0, previous = inner.length - 1; index < inner.length; previous = index++) {
        const current = inner[index];
        const prior = inner[previous];
        const crosses = (current.y > point.y) !== (prior.y > point.y);
        if (!crosses) continue;
        const xAtY =
          ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
        if (point.x < xAtY) inside = !inside;
      }
      return inside;
    };
    for (const slot of slots) {
      if (sitsOnWall(slot.buildingId)) continue;
      const id = slot.buildingId;
      for (const shape of buildingShapes(
        id,
        slot,
        DEFAULT_TUNING.squareSize,
        slot.tier,
      )) {
        const points =
          shape.kind === "circle"
            ? Array.from({ length: 20 }, (_, index) => {
              const angle = (index / 20) * Math.PI * 2;
              return {
                x: shape.c.x + Math.cos(angle) * shape.r,
                y: shape.c.y + Math.sin(angle) * shape.r,
              };
            })
            : shape.points;
        for (const point of points) {
          expect(pointInside(point), `${id} overlaps wall`).toBe(true);
        }
      }
    }
    for (const id of ["bastion", "watchtower"] as const) {
      const slot = slots.find((item) => item.buildingId === id);
      const rawSlot = raw.find((item) => item.buildingId === id);
      expect(slot, id).toBeTruthy();
      const shifted = Math.hypot(slot!.x - rawSlot!.x, slot!.y - rawSlot!.y);
      expect(slot!.x).toBe(Math.round(slot!.x));
      expect(slot!.y).toBe(Math.round(slot!.y));
      if (shifted <= 0.75) {
        expect(slot!.x).toBe(Math.round(rawSlot!.x));
        expect(slot!.y).toBe(Math.round(rawSlot!.y));
        continue;
      }
      const onWall = pointOnWall(wallAngle(slot!, DEFAULT_TUNING.wallOval), radius, DEFAULT_TUNING);
      expect(Math.hypot(slot!.x - onWall.x, slot!.y - onWall.y)).toBeLessThanOrEqual(1);
    }
    for (const slot of slots) {
      expect(
        hitsPalisadeTower(slot.buildingId, slot, slot.tier, towers, DEFAULT_TUNING.squareSize),
        `${slot.id} overlaps a tower`,
      ).toBe(false);
    }
    const heart = slots.find((slot) => slot.buildingId === "heartfire");
    expect(heart!.x).toBe(MAP_CENTER);
    expect(heart!.y).toBe(MAP_CENTER);
  });

  it("frames a single building larger than a speck", () => {
    const box = fittedViewBox([{ x: 500, y: 500 }], 40);
    const [, , size] = box.split(" ").map(Number);
    expect(size).toBeGreaterThan(100);
    expect(size).toBeLessThan(400);
  });

  it("places small outward chitin spikes along the wall rim", () => {
    const chitinStroke = 5;
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const stroke = wallStrokeWidth(4, DEFAULT_TUNING.wallThickness);
    const rim = wallChitinPolygon(radius, DEFAULT_TUNING, stroke, chitinStroke);
    const towers = palisadeTowers(4, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize);
    const exclude = towers.map((tower) => ({
      x: tower.x,
      y: tower.y,
      r: tower.r + chitinStroke,
    }));
    const spikes = wallChitinSpikes(rim, chitinStroke, { exclude });
    expect(spikes.length).toBeGreaterThan(20);
    expect(spikes.length).toBeLessThan(Math.round((2 * Math.PI * radius) / 12));
    for (const spike of spikes) {
      const base = {
        x: (spike.left.x + spike.right.x) / 2,
        y: (spike.left.y + spike.right.y) / 2,
      };
      const tipDist = Math.hypot(spike.tip.x - MAP_CENTER, spike.tip.y - MAP_CENTER);
      const baseDist = Math.hypot(base.x - MAP_CENTER, base.y - MAP_CENTER);
      expect(tipDist).toBeGreaterThan(baseDist);
      const alongBase = {
        x: spike.right.x - spike.left.x,
        y: spike.right.y - spike.left.y,
      };
      const toTip = { x: spike.tip.x - base.x, y: spike.tip.y - base.y };
      const baseLen = Math.hypot(alongBase.x, alongBase.y);
      const tipLen = Math.hypot(toTip.x, toTip.y);
      expect(baseLen).toBeCloseTo(CHITIN_SPIKE_BASE, 5);
      expect(tipLen).toBeCloseTo(CHITIN_SPIKE_LENGTH, 5);
      // Spike axis is square to the wall tangent at the base.
      const cos = (alongBase.x * toTip.x + alongBase.y * toTip.y) / (baseLen * tipLen);
      expect(Math.abs(cos)).toBeLessThan(1e-9);
      for (const zone of exclude) {
        expect(Math.hypot(base.x - zone.x, base.y - zone.y)).toBeGreaterThanOrEqual(zone.r - 0.01);
      }
    }
    const withoutSkip = wallChitinSpikes(rim, chitinStroke);
    expect(withoutSkip.length).toBeGreaterThan(spikes.length);
    expect(withoutSkip.length).toBeGreaterThanOrEqual(
      Math.floor((2 * Math.PI * (radius + stroke / 2)) / CHITIN_SPIKE_SPACING) - 4,
    );
  });

  it("clips fort chitin so arc ends sit on the wall rim", () => {
    const chitinStroke = 5;
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const stroke = wallStrokeWidth(4, DEFAULT_TUNING.wallThickness);
    const wall = wallChitinPolygon(radius, DEFAULT_TUNING, stroke, chitinStroke);
    const distToWall = (point: { x: number; y: number }) => {
      let nearest = Infinity;
      for (let index = 0; index < wall.length; index++) {
        const start = wall[index];
        const end = wall[(index + 1) % wall.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSq = dx * dx + dy * dy || 1;
        const t = Math.max(
          0,
          Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq),
        );
        nearest = Math.min(
          nearest,
          Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t)),
        );
      }
      return nearest;
    };
    const towers = palisadeTowers(4, radius, DEFAULT_TUNING, DEFAULT_TUNING.squareSize);
    for (const tower of towers) {
      const rim = palisadeTowerRim(tower, palisadeTowerChitinOutset(chitinStroke));
      const chains = polyOutsideChitinChains(rim, wall);
      expect(chains.length).toBeGreaterThan(0);
      for (const chain of chains) {
        const from = chain[0];
        const to = chain[chain.length - 1];
        expect(distToWall(from)).toBeLessThan(1);
        expect(distToWall(to)).toBeLessThan(1);
        const mid = chain[Math.floor(chain.length / 2)];
        expect(ovalRadius(mid, DEFAULT_TUNING.wallOval)).toBeGreaterThan(
          ovalRadius(from, DEFAULT_TUNING.wallOval) - 0.5,
        );
      }
    }

    const savedBastion = slots.find((slot) => slot.buildingId === "bastion");
    const watchtower = slots.find((slot) => slot.buildingId === "watchtower");
    expect(savedBastion).toBeTruthy();
    expect(watchtower).toBeTruthy();
    const bastion = pointOnWall(
      wallAngle(savedBastion!, DEFAULT_TUNING.wallOval),
      radius,
      DEFAULT_TUNING,
    );
    const bastionSize = markSize("bastion", DEFAULT_TUNING.squareSize);
    const bastionStroke = 4;
    const bastionPaths = bastionChitinPaths(bastion, bastionSize, bastionStroke, chitinStroke, wall);
    // Side walls, outer towers, and the outer wall, cut where the palisade crosses.
    expect(bastionPaths.length).toBe(1);
    expect(bastionPaths[0].includes(" A ")).toBe(false);
    const bastionChain = bastionChitinChains(
      bastion,
      bastionSize,
      bastionStroke,
      chitinStroke,
      wall,
    )[0];
    expect(bastionChain.length).toBeGreaterThan(12);
    expect(distToWall(bastionChain[0])).toBeLessThan(1.5);
    expect(distToWall(bastionChain[bastionChain.length - 1])).toBeLessThan(1.5);
    const dilate = bastionStroke + chitinStroke / 2;
    const hx = (bastionSize * BASTION_LENGTH) / 2;
    const hy = (bastionSize * BASTION_DEPTH) / 2;
    const towerRadius = bastionSize / 2 + dilate;
    const facing = radialAngle(bastion) - Math.PI / 2;
    const cos = Math.cos(facing);
    const sin = Math.sin(facing);
    const world = (local: { x: number; y: number }) => ({
      x: bastion.x + local.x * cos - local.y * sin,
      y: bastion.y + local.x * sin + local.y * cos,
    });
    const distToChain = (local: { x: number; y: number }) => {
      const target = world(local);
      let nearest = Infinity;
      for (let index = 0; index < bastionChain.length - 1; index++) {
        const start = bastionChain[index];
        const end = bastionChain[index + 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSq = dx * dx + dy * dy || 1;
        const t = Math.max(
          0,
          Math.min(1, ((target.x - start.x) * dx + (target.y - start.y) * dy) / lengthSq),
        );
        nearest = Math.min(
          nearest,
          Math.hypot(target.x - (start.x + dx * t), target.y - (start.y + dy * t)),
        );
      }
      return nearest;
    };
    expect(distToChain({ x: -(hx + dilate), y: hy * 0.45 })).toBeLessThan(1.5);
    expect(distToChain({ x: 0, y: hy + dilate })).toBeLessThan(1.5);
    expect(distToChain({ x: -hx - towerRadius, y: hy })).toBeLessThan(3);
    expect(distToChain({ x: -(hx + towerRadius), y: 0 })).toBeGreaterThan(8);
    expect(distToChain({ x: 0, y: hy + towerRadius })).toBeGreaterThan(8);
    const spikes = chitinSpikesAlongPolyline(bastionChain, chitinStroke, { outside: "left" });
    expect(spikes.length).toBeGreaterThan(4);
    for (const spike of spikes) {
      const base = {
        x: (spike.left.x + spike.right.x) / 2,
        y: (spike.left.y + spike.right.y) / 2,
      };
      const fromCenter = Math.hypot(base.x - bastion.x, base.y - bastion.y);
      const tipFromCenter = Math.hypot(spike.tip.x - bastion.x, spike.tip.y - bastion.y);
      expect(tipFromCenter).toBeGreaterThan(fromCenter + 1);
      let nearest = Infinity;
      for (let index = 0; index < bastionChain.length - 1; index++) {
        const start = bastionChain[index];
        const end = bastionChain[index + 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSq = dx * dx + dy * dy || 1;
        const t = Math.max(
          0,
          Math.min(1, ((base.x - start.x) * dx + (base.y - start.y) * dy) / lengthSq),
        );
        nearest = Math.min(
          nearest,
          Math.hypot(base.x - (start.x + dx * t), base.y - (start.y + dy * t)),
        );
      }
      expect(nearest).toBeGreaterThan(chitinStroke / 2 - 1.2);
      expect(nearest).toBeLessThan(chitinStroke / 2 + 0.4);
    }
    const watchAt = pointOnWall(
      wallAngle(watchtower!, DEFAULT_TUNING.wallOval),
      radius,
      DEFAULT_TUNING,
    );
    const watchPaths = watchtowerChitinPaths(
      watchAt,
      watchtowerWidth(DEFAULT_TUNING.squareSize, watchtower!.tier),
      watchtower!.tier,
      watchtower!.tier,
      chitinStroke,
      wall,
    );
    expect(watchPaths.length).toBeGreaterThan(0);
    for (const path of watchPaths) {
      const nums = [...path.matchAll(/([-\d.]+)/g)].map((match) => Number(match[1]));
      expect(nums.length).toBeGreaterThanOrEqual(4);
      const start = { x: nums[0], y: nums[1] };
      const end = { x: nums[nums.length - 2], y: nums[nums.length - 1] };
      expect(distToWall(start)).toBeLessThan(1);
      expect(distToWall(end)).toBeLessThan(1);
    }
  });

  it("lowers a drawbridge from the bastion across the moat to the far bank", () => {
    const radius = layoutWallRadius(DEFAULT_TUNING);
    const anchor = DEFAULT_TUNING.wallThickness * 1.52;
    const full = applyGrowth(GROWTH_STEPS.length);
    const saved = placedSlots(full, DEFAULT_TUNING, {}).find((slot) => slot.buildingId === "bastion");
    expect(saved).toBeTruthy();
    const bastion = pointOnWall(wallAngle(saved!, DEFAULT_TUNING.wallOval), radius, DEFAULT_TUNING);
    const bridge = bastionDrawbridge(bastion, DEFAULT_TUNING.squareSize, radius, anchor, DEFAULT_TUNING);
    expect(bridge).toBeTruthy();
    const size = markSize("bastion", DEFAULT_TUNING.squareSize);
    const mouth = (size * BASTION_DEPTH) / 2;
    expect(bridge!.mouth).toBeCloseTo(mouth);
    expect(bridge!.near).toBeLessThan(mouth);
    expect(bridge!.far).toBeGreaterThan(mouth + 16);
    expect(bridge!.half).toBeLessThan((size * (BASTION_LENGTH - 1)) / 2);

    const centerDist = Math.hypot(bastion.x - MAP_CENTER, bastion.y - MAP_CENTER);
    const ux = (bastion.x - MAP_CENTER) / centerDist;
    const uy = (bastion.y - MAP_CENTER) / centerDist;
    const alongRay = (point: { x: number; y: number }) => {
      const px = point.x - MAP_CENTER;
      const py = point.y - MAP_CENTER;
      const along = px * ux + py * uy;
      const side = Math.hypot(px - ux * along, py - uy * along);
      return side < 12 && along > 0 ? along : null;
    };
    const edges = moatBandEdges(moatCenterRadius(radius, anchor), DEFAULT_TUNING);
    let outerAlong = 0;
    for (const point of edges.outer) {
      const along = alongRay(point);
      if (along != null) outerAlong = Math.max(outerAlong, along);
    }
    let innerAlong = Infinity;
    for (const point of edges.inner) {
      const along = alongRay(point);
      if (along != null) innerAlong = Math.min(innerAlong, along);
    }
    const farMid = {
      x: (bridge!.deck[2].x + bridge!.deck[3].x) / 2,
      y: (bridge!.deck[2].y + bridge!.deck[3].y) / 2,
    };
    expect(centerDist + mouth).toBeLessThan(innerAlong);
    expect(Math.hypot(farMid.x - MAP_CENTER, farMid.y - MAP_CENTER)).toBeGreaterThan(outerAlong + 6);

    const stroke = wallStrokeWidth(4, DEFAULT_TUNING.wallThickness);
    const wall = wallChitinPolygon(radius, DEFAULT_TUNING, stroke, 5);
    const outline = 4;
    const gap = drawbridgeChitinGap(bridge!.half, outline);
    const chains = bastionChitinChains(bastion, size, 4, 5, wall, gap);
    expect(chains.length).toBe(2);
    const facing = radialAngle(bastion) - Math.PI / 2;
    const cos = Math.cos(facing);
    const sin = Math.sin(facing);
    const gate = {
      x: bastion.x - (mouth + 4) * sin,
      y: bastion.y + (mouth + 4) * cos,
    };
    let nearest = Infinity;
    for (const chain of chains) {
      expect(chain.length).toBeGreaterThan(4);
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
    expect(nearest).toBeGreaterThan(bridge!.half + outline);

    const onDeck = {
      x: (bridge!.deck[0].x + bridge!.deck[2].x) / 2,
      y: (bridge!.deck[0].y + bridge!.deck[2].y) / 2,
    };
    const kept = trapsClearOfBuildings(
      [onDeck, { x: 0, y: 0 }],
      DEFAULT_TUNING,
      1,
      4,
      radius,
      [],
      DEFAULT_TUNING.squareSize,
      [bridge!.deck],
    );
    expect(kept).toEqual([{ x: 0, y: 0 }]);
  });
});
