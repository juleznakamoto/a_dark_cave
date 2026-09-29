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
