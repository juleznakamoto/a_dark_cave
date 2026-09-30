import {
  BUILDING_BY_ID,
  BUILDINGS,
  GROWTH_STEPS,
  MAP_CENTER,
  applyGrowth,
  type BuildState,
  type BuildingDef,
  type SanctumGod,
  type Tuning,
  slotLabel,
} from "@/pages/village-map-demo/catalog";

import {
  ALTAR_OCTAGON,
  ALTAR_PORCH_DEPTH,
  BASTION_DEPTH,
  BASTION_LENGTH,
  ESTATE_DEPTH,
  ESTATE_LENGTH,
  ESTATE_PORCH_CORNER,
  HUT_LENGTH,
  TANNERY_DEEP,
  TANNERY_WING_REACH,
  altarCircles,
  altarOutline,
  altarSpan,
  bastionOutlineWidth,
  bastionTowers,
  blacksmithScale,
  boneTempleOutline,
  boneTempleSpikedCorners,
  boneyardOutline,
  cabinOutline,
  cabinTower,
  coinhouseLayout,
  estateBottomRect,
  estateCornerOctagons,
  estateOuterOctagon,
  estateSideHalfOctagons,
  herbGardenBeds,
  longhouseOutline,
  markSize,
  pillarOutline,
  pitOutline,
  pitScale,
  placedSlots,
  quarryOutline,
  sitsOnWall,
  snapToLegalPixel,
  snapToPixel,
  staysPut,
  storageScale,
  storageTowers,
  tanneryCourt,
  tanneryOutline,
  timberMillOutline,
  tradeCircles,
  tradeOutline,
  tradeScale,
  watchtowerOutline,
  watchtowerWidth,
  wizardTowerPentagons,
  wobbleAt,
  type PlacedSlot,
  type Point,
} from "@/pages/village-map-demo/geometry";
import {
  WALL_CHITIN_STROKE,
  alchemistHall,
  archiveOutline,
  archiveScale,
  bastionDrawbridge,
  blacksmithAnnex,
  blacksmithFurnace,
  blacksmithOutline,
  buildersParts,
  clerksHut,
  densifyClosed,
  foundryOutline,
  innerWallPolygon,
  layoutWallRadius,
  moatCenterRadius,
  moatRingPoints,
  offsetFromCentroid,
  ringPoints,
  trapAreaLevel,
  trapPoints,
  trapWallOutset,
  villageGroundPoints,
  wallPolygon,
  wallStrokeWidth,
} from "@/pages/village-map-demo/geometryBuildings";

/**
 * Points that set the map frame. Before palisades, the watchtower, the bastion,
 * or traps exist, the frame stops at the city edge (and the moat, when that
 * ditch is already there). Those fortifications reserve the trap band.
 */
export function mapFramePoints(build: BuildState, tuning: Tuning, slots: PlacedSlot[]): Point[] {
  const radius = layoutWallRadius(tuning);
  const anchor = tuning.wallThickness * 1.52;
  const areaLevel = trapAreaLevel(build);
  const groundTraps =
    areaLevel > 0
      ? trapPoints(
        radius,
        tuning,
        areaLevel,
        anchor,
        trapWallOutset(
          build.wall,
          wallStrokeWidth(build.wall, tuning.wallThickness),
          tuning.squareSize,
          build.chitin ? WALL_CHITIN_STROKE : 0,
        ),
      )
      : [];
  const points: Point[] = [
    ...slots.map((slot) => ({ x: slot.x, y: slot.y })),
    ...ringPoints(radius, tuning),
    ...villageGroundPoints(radius, tuning, { ...build, traps: areaLevel }, groundTraps),
  ];
  const cityOnly = (build.counts.bastion ?? 0) <= 0 && build.traps <= 0;
  if (build.moat && build.wall > 0) {
    const center = moatCenterRadius(radius, anchor);
    points.push(...moatRingPoints(center, tuning));
  }
  if (groundTraps.length > 0) {
    points.push(...groundTraps);
  }
  if (build.moat && build.wall > 0) {
    for (const slot of slots) {
      if (slot.buildingId !== "bastion") continue;
      const bridge = bastionDrawbridge(slot, tuning.squareSize, radius, anchor, tuning);
      if (bridge) points.push(...bridge.deck);
    }
  }
  for (const slot of slots) {
    if (!sitsOnWall(slot.buildingId)) continue;
    if (cityOnly && slot.buildingId === "bastion") continue;
    for (const shape of buildingShapes(slot.buildingId, slot, tuning.squareSize, slot.tier)) {
      if (shape.kind === "circle") {
        points.push(
          { x: shape.c.x - shape.r, y: shape.c.y },
          { x: shape.c.x + shape.r, y: shape.c.y },
          { x: shape.c.x, y: shape.c.y - shape.r },
          { x: shape.c.x, y: shape.c.y + shape.r },
        );
      } else {
        points.push(...shape.points);
      }
    }
  }
  return points;
}

/**
 * Points that set the finished map frame: the full village, the moat, and
 * improved traps. Basic and improved traps share this size because both sit
 * inside the ditch.
 */
export function finalFramePoints(tuning: Tuning): Point[] {
  const full = applyGrowth(GROWTH_STEPS.length);
  return mapFramePoints(full, tuning, placedSlots(full, tuning, {}));
}

/** Square viewBox around the given points. */
export function fittedViewBox(points: Point[], pad: number): string {
  if (points.length === 0) return "0 0 1000 1000";
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const span = Math.max(maxX - minX, maxY - minY, 140) + pad * 2;
  return `${(cx - span / 2).toFixed(1)} ${(cy - span / 2).toFixed(1)} ${span.toFixed(1)} ${span.toFixed(1)}`;
}

/** Flat-topped octagon whose width matches a square of `size`. */
export function tentOutline(size: number): Point[] {
  const radius = size / (2 * Math.cos(Math.PI / 8));
  const points: Point[] = [];
  for (let index = 0; index < 8; index++) {
    const angle = -Math.PI / 2 + Math.PI / 8 + (index * Math.PI) / 4;
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return points;
}

function crossMetrics(size: number) {
  const height = size * 1.35;
  const barWidth = size * 0.92;
  const thick = size * 0.24;
  const top = -height / 2;
  const barTop = top + height * 0.28;
  const barBottom = barTop + thick;
  return { height, barWidth, thick, top, barTop, barBottom, bottom: height / 2 };
}

/** Latin cross: long upright, shorter crossbar in the upper third. */
export function crossOutline(size: number): Point[] {
  const { barWidth, thick, top, barTop, barBottom, bottom } = crossMetrics(size);
  return [
    { x: -thick / 2, y: top },
    { x: thick / 2, y: top },
    { x: thick / 2, y: barTop },
    { x: barWidth / 2, y: barTop },
    { x: barWidth / 2, y: barBottom },
    { x: thick / 2, y: barBottom },
    { x: thick / 2, y: bottom },
    { x: -thick / 2, y: bottom },
    { x: -thick / 2, y: barBottom },
    { x: -barWidth / 2, y: barBottom },
    { x: -barWidth / 2, y: barTop },
    { x: -thick / 2, y: barTop },
  ];
}

type CircleShape = { kind: "circle"; c: Point; r: number };
type PolyShape = { kind: "poly"; points: Point[] };
export type Shape = CircleShape | PolyShape;

/** Edges may meet. Anything past this counts as one building covering another. */
const TOUCH_PX = 0.2;

export function rectLocal(length: number, depth: number): Point[] {
  const hx = length / 2;
  const hy = depth / 2;
  return [
    { x: -hx, y: -hy },
    { x: hx, y: -hy },
    { x: hx, y: hy },
    { x: -hx, y: hy },
  ];
}

function crossParts(size: number): Point[][] {
  const { height, barWidth, thick, barTop, barBottom } = crossMetrics(size);
  return [
    rectLocal(thick, height),
    [
      { x: -barWidth / 2, y: barTop },
      { x: barWidth / 2, y: barTop },
      { x: barWidth / 2, y: barBottom },
      { x: -barWidth / 2, y: barBottom },
    ],
  ];
}

/** Angle that points a building's long side at the village center. */
export function radialAngle(at: Point): number {
  return Math.atan2(at.y - MAP_CENTER, at.x - MAP_CENTER);
}

/** Angle that aims a building's local -y (front) at the village center. */
export function tangentAngle(at: Point): number {
  return radialAngle(at) - Math.PI / 2;
}

export function placePoints(local: Point[], at: Point, angle: number): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return local.map((point) => ({
    x: at.x + point.x * cos - point.y * sin,
    y: at.y + point.x * sin + point.y * cos,
  }));
}

/**
 * Middle of the village-facing edge, in map coordinates.
 * Local +y points away from the village, so the inner edge is local -y.
 * Null for buildings whose door is just the nearest point on the silhouette.
 */
export function innerSidePoint(
  buildingId: string,
  at: Point,
  hutSize: number,
  level: number,
): Point | null {
  const size = markSize(buildingId, hutSize);
  let local: Point | null = null;
  if (buildingId === "bastion") {
    local = { x: 0, y: -(size * BASTION_DEPTH) / 2 };
  } else if (buildingId === "watchtower") {
    local = { x: 0, y: -watchtowerWidth(hutSize, level) / 2 };
  } else if (buildingId === "storage") {
    local = { x: 0, y: -(size * storageScale(level)) / 2 };
  } else if (buildingId === "clerksHut") {
    local = { x: 0, y: clerksHut(size, level).body[0].y };
  } else if (buildingId === "coinhouse") {
    const layout = coinhouseLayout(size, level);
    local = layout.gate
      ? { x: 0, y: layout.gate.y - layout.gate.h / 2 }
      : { x: 0, y: -layout.house.h / 2 };
  } else if (buildingId === "tannery") {
    const inner = -(size * TANNERY_DEEP) / 2;
    // High Tannery is a U open toward the village. Meet the mouth.
    // Master Tannery is an L. Meet the hall's village-facing wall.
    local = level >= 3 ? { x: 0, y: inner - size * TANNERY_WING_REACH } : { x: 0, y: inner };
  } else if (buildingId === "trade") {
    local = { x: 0, y: -(size * tradeScale(level)) / 2 };
  } else if (buildingId === "quarry") {
    local = { x: 0, y: -size / 2 };
  } else if (buildingId === "boneyard") {
    local = { x: 0, y: -(size / 2) * 1.2 };
  } else if (buildingId === "blacksmith") {
    local = { x: 0, y: -(size * blacksmithScale(level)) / 2 };
  } else if (buildingId === "archive") {
    const span = size * archiveScale(level);
    const inner = -span / 2;
    // The U is open toward the village. Records Hall and the Grand Archive
    // continue to the hall face. The approach fades over its last stretch,
    // so the solid track reaches the middle of the court.
    local = level >= 2 ? { x: 0, y: inner - 1.5 } : { x: 0, y: inner };
  } else if (buildingId === "altar") {
    const { width, depth } = altarSpan(size, level);
    const inner = -depth / 2;
    const porchInner = inner - width * ALTAR_PORCH_DEPTH;
    // The Sanctum's inner octagon faces the village. Meet the middle of that flat.
    local = level >= 4
      ? { x: 0, y: porchInner - depth * ALTAR_OCTAGON }
      : level >= 2
        ? { x: 0, y: porchInner }
        : { x: 0, y: inner };
  }
  if (!local) return null;
  return placePoints([local], at, tangentAngle(at))[0];
}

function isRound(buildingId: string): boolean {
  return buildingId === "heartfire" || buildingId === "blackMonolith";
}

/** Collision shapes for one building, in map coordinates. */
export function buildingShapes(
  buildingId: string,
  at: Point,
  hutSize: number,
  level = 1,
): Shape[] {
  const size = markSize(buildingId, hutSize);
  if (buildingId === "watchtower") {
    return [{
      kind: "poly",
      points: placePoints(watchtowerOutline(watchtowerWidth(hutSize, level), level), at, tangentAngle(at)),
    }];
  }
  if (buildingId === "wizardTower") {
    // Unrotated local group: first rim pentagon sits on local -y.
    const towerRadius = size / 2;
    const pentagons = wizardTowerPentagons(towerRadius).map((pentagon) => ({
      kind: "poly" as const,
      points: placePoints(pentagon, at, 0),
    }));
    return [{ kind: "circle", c: at, r: towerRadius }, ...pentagons];
  }
  if (buildingId === "pillarOfClarity") {
    return [{ kind: "poly", points: placePoints(pillarOutline(size), at, tangentAngle(at)) }];
  }
  if (buildingId === "boneTemple") {
    const facing = tangentAngle(at);
    return [
      { kind: "poly", points: placePoints(boneTempleOutline(size), at, facing) },
      ...boneTempleSpikedCorners(size).map((corner) => ({
        kind: "poly" as const,
        points: placePoints(corner, at, facing),
      })),
    ];
  }
  if (isRound(buildingId)) return [{ kind: "circle", c: at, r: size / 2 }];
  const facing = tangentAngle(at);
  if (buildingId === "furTents") return [{ kind: "poly", points: placePoints(tentOutline(size), at, facing) }];
  if (buildingId === "herbGarden") {
    return herbGardenBeds(size).map((bed) => ({
      kind: "poly" as const,
      points: placePoints(
        [
          { x: bed.x, y: bed.y },
          { x: bed.x + bed.w, y: bed.y },
          { x: bed.x + bed.w, y: bed.y + bed.h },
          { x: bed.x, y: bed.y + bed.h },
        ],
        at,
        facing,
      ),
    }));
  }
  if (buildingId === "pit") {
    const grown = size * pitScale(level);
    // Match the smoothed path drawn on the map, not just the control points.
    return [{ kind: "poly", points: placePoints(densifyClosed(pitOutline(grown), 4), at, facing) }];
  }
  if (buildingId === "paleCross") {
    // Upright on the map; Consecrated (level > 1) flips 180° around its own center.
    const turn = level > 1 ? Math.PI : 0;
    return crossParts(size).map((part) => ({
      kind: "poly" as const,
      points: placePoints(part, at, turn),
    }));
  }
  if (buildingId === "longhouse") {
    return [{ kind: "poly", points: placePoints(longhouseOutline(size), at, facing) }];
  }
  if (buildingId === "boneyard") {
    return [{ kind: "poly", points: placePoints(boneyardOutline(size), at, facing) }];
  }
  if (buildingId === "quarry") {
    return [{ kind: "poly", points: placePoints(quarryOutline(size), at, facing) }];
  }
  if (buildingId === "timberMill") {
    return [{ kind: "poly", points: placePoints(timberMillOutline(size), at, facing) }];
  }
  if (buildingId === "woodenHut" || buildingId === "stoneHut") {
    return [{ kind: "poly", points: placePoints(rectLocal(size * HUT_LENGTH, size), at, facing) }];
  }
  if (buildingId === "bastion") {
    const body = placePoints(rectLocal(size * BASTION_LENGTH, size * BASTION_DEPTH), at, facing);
    const towers = bastionTowers(size).map((tower) => {
      const [center] = placePoints([{ x: tower.x, y: tower.y }], at, facing);
      return { kind: "circle" as const, c: center, r: tower.r };
    });
    return [{ kind: "poly", points: body }, ...towers];
  }
  if (buildingId === "storage") {
    const body = size * storageScale(level);
    const shapes: Shape[] = [
      { kind: "poly", points: placePoints(rectLocal(body, body), at, facing) },
    ];
    for (const tower of storageTowers(body, level)) {
      if (tower.kind === "octagon") {
        shapes.push({ kind: "poly", points: placePoints(tower.points, at, facing) });
      } else {
        const rect = rectLocal(tower.w, tower.h).map((point) => ({
          x: point.x + tower.x,
          y: point.y + tower.y,
        }));
        shapes.push({ kind: "poly", points: placePoints(rect, at, facing) });
      }
    }
    return shapes;
  }
  if (buildingId === "cabin") {
    const shapes: Shape[] = [
      { kind: "poly", points: placePoints(cabinOutline(size, level), at, facing) },
    ];
    const tower = cabinTower(size, level);
    if (tower) {
      const [center] = placePoints([{ x: tower.x, y: tower.y }], at, facing);
      shapes.push({ kind: "circle", c: center, r: tower.r });
    }
    return shapes;
  }
  if (buildingId === "tannery") {
    const court = tanneryCourt(size, level);
    const outline = { kind: "poly" as const, points: placePoints(tanneryOutline(size, level), at, facing) };
    if (!court) return [outline];
    return [outline, { kind: "poly", points: placePoints(court, at, facing) }];
  }
  if (buildingId === "alchemistHall") {
    const hall = alchemistHall(size);
    return [
      { kind: "poly", points: placePoints(rectLocal(hall.width, hall.depth), at, facing) },
      { kind: "poly", points: placePoints(hall.tower, at, facing) },
    ];
  }
  if (buildingId === "clerksHut") {
    const hut = clerksHut(size, level);
    return [
      { kind: "poly", points: placePoints(hut.body, at, facing) },
      ...hut.circles.map((circle) => {
        const [center] = placePoints([{ x: circle.x, y: circle.y }], at, facing);
        return { kind: "circle" as const, c: center, r: circle.r };
      }),
    ];
  }
  if (buildingId === "archive") {
    return [{ kind: "poly", points: placePoints(archiveOutline(size, level), at, facing) }];
  }
  if (buildingId === "builders") {
    const parts = buildersParts(size, level);
    const turned = facing + Math.PI;
    return [
      { kind: "poly", points: placePoints(parts.outer, at, turned) },
      ...(parts.wing ? [{ kind: "poly" as const, points: placePoints(parts.wing, at, turned) }] : []),
    ];
  }
  if (buildingId === "foundry") {
    return [{ kind: "poly", points: placePoints(foundryOutline(size, level), at, facing) }];
  }
  if (buildingId === "coinhouse") {
    const layout = coinhouseLayout(size, level);
    const rects = [...layout.walls, ...(layout.gate ? [layout.gate] : [])];
    return [
      { kind: "poly", points: placePoints(rectLocal(layout.house.w, layout.house.h), at, facing) },
      ...layout.octagons.map((octagon) => ({
        kind: "poly" as const,
        points: placePoints(octagon, at, facing),
      })),
      ...rects.map((rect) => ({
        kind: "poly" as const,
        points: placePoints(
          rectLocal(rect.w, rect.h).map((point) => ({ x: point.x + rect.x, y: point.y + rect.y })),
          at,
          facing,
        ),
      })),
    ];
  }
  if (buildingId === "trade") {
    return [
      { kind: "poly", points: placePoints(tradeOutline(size, level), at, facing) },
      ...tradeCircles(size, level).map((circle) => {
        const [center] = placePoints([{ x: circle.x, y: circle.y }], at, facing);
        return { kind: "circle" as const, c: center, r: circle.rx };
      }),
    ];
  }
  if (buildingId === "altar") {
    return [
      { kind: "poly", points: placePoints(altarOutline(size, level), at, facing) },
      ...altarCircles(size, level).map((circle) => {
        const [center] = placePoints([{ x: circle.x, y: circle.y }], at, facing);
        return { kind: "circle" as const, c: center, r: circle.r };
      }),
    ];
  }
  if (buildingId === "blacksmith") {
    const span = size * blacksmithScale(level);
    const furnace = blacksmithFurnace(span, span);
    const annex = blacksmithAnnex(span, span, level);
    const placedRect = (box: { x: number; y: number; w: number; h: number }) =>
      placePoints(
        rectLocal(box.w, box.h).map((point) => ({ x: point.x + box.x, y: point.y + box.y })),
        at,
        facing,
      );
    return [
      { kind: "poly", points: placePoints(blacksmithOutline(span, span, level), at, facing) },
      { kind: "poly", points: placedRect(furnace) },
      ...(annex ? [{ kind: "poly" as const, points: placedRect(annex) }] : []),
    ];
  }
  if (buildingId === "estate") {
    // Same 180° flip as markRotation: outer octagon faces away from MAP_CENTER.
    const facingOut = facing + Math.PI;
    const body = placePoints(rectLocal(size * ESTATE_LENGTH, size * ESTATE_DEPTH), at, facingOut);
    const octagons = [
      ...estateCornerOctagons(size),
      estateOuterOctagon(size),
    ].map((octagon) => ({
      kind: "poly" as const,
      points: placePoints(octagon, at, facingOut),
    }));
    const sides =
      level > 1
        ? estateSideHalfOctagons(size).map((half) => ({
          kind: "poly" as const,
          points: placePoints(half, at, facingOut),
        }))
        : [];
    const porch = estateBottomRect(size);
    const porchCut = porch.h * ESTATE_PORCH_CORNER;
    const porchLeft = porch.x;
    const porchRight = porch.x + porch.w;
    const porchNear = porch.y;
    const porchFar = porch.y + porch.h;
    const porchPoly = placePoints(
      [
        { x: porchRight - porchCut, y: porchNear },
        { x: porchRight, y: porchNear + porchCut },
        { x: porchRight, y: porchFar - porchCut },
        { x: porchRight - porchCut, y: porchFar },
        { x: porchLeft + porchCut, y: porchFar },
        { x: porchLeft, y: porchFar - porchCut },
        { x: porchLeft, y: porchNear + porchCut },
        { x: porchLeft + porchCut, y: porchNear },
      ],
      at,
      facingOut,
    );
    return [{ kind: "poly", points: body }, ...octagons, ...sides, { kind: "poly", points: porchPoly }];
  }
  return [{ kind: "poly", points: placePoints(rectLocal(size, size), at, facing) }];
}

function circleSamples(center: Point, radius: number, count: number): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }
  return points;
}

function pointInPoly(point: Point, poly: Point[]): boolean {
  let sign = 0;
  for (let index = 0; index < poly.length; index++) {
    const start = poly[index];
    const end = poly[(index + 1) % poly.length];
    const cross =
      (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
    if (Math.abs(cross) <= 1e-6) continue;
    const next = Math.sign(cross);
    if (sign === 0) sign = next;
    else if (next !== sign) return false;
  }
  return true;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

function circleOverlapsPoly(circle: CircleShape, points: Point[]): boolean {
  if (pointInPoly(circle.c, points)) return true;
  for (let index = 0; index < points.length; index++) {
    const gap = distanceToSegment(circle.c, points[index], points[(index + 1) % points.length]);
    if (gap < circle.r - TOUCH_PX) return true;
  }
  return false;
}

function projectSpan(points: Point[], axis: Point): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    const value = point.x * axis.x + point.y * axis.y;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}

function polysOverlap(a: Point[], b: Point[]): boolean {
  const axes: Point[] = [];
  for (const poly of [a, b]) {
    for (let index = 0; index < poly.length; index++) {
      const start = poly[index];
      const end = poly[(index + 1) % poly.length];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length < 1e-6) continue;
      axes.push({ x: -dy / length, y: dx / length });
    }
  }
  for (const axis of axes) {
    const spanA = projectSpan(a, axis);
    const spanB = projectSpan(b, axis);
    if (spanA.max <= spanB.min + TOUCH_PX || spanB.max <= spanA.min + TOUCH_PX) return false;
  }
  return true;
}

export function shapesOverlap(a: Shape, b: Shape): boolean {
  if (a.kind === "circle" && b.kind === "circle") {
    return Math.hypot(a.c.x - b.c.x, a.c.y - b.c.y) < a.r + b.r - TOUCH_PX;
  }
  if (a.kind === "circle" && b.kind === "poly") return circleOverlapsPoly(a, b.points);
  if (a.kind === "poly" && b.kind === "circle") return circleOverlapsPoly(b, a.points);
  if (a.kind === "poly" && b.kind === "poly") return polysOverlap(a.points, b.points);
  return false;
}

export function footprintsOverlap(
  buildingId: string,
  at: Point,
  otherId: string,
  otherAt: Point,
  hutSize: number,
  level = 1,
  otherLevel = 1,
): boolean {
  const shapes = buildingShapes(buildingId, at, hutSize, level);
  const others = buildingShapes(otherId, otherAt, hutSize, otherLevel);
  return shapes.some((shape) => others.some((other) => shapesOverlap(shape, other)));
}

/** Angle of a point on the oval the palisade uses. */
export function wallAngle(point: Point, oval: number): number {
  return Math.atan2((point.y - MAP_CENTER) / (oval || 1), point.x - MAP_CENTER);
}

/** Point on the palisade centerline at this angle. */
export function pointOnWall(angle: number, radius: number, tuning: Tuning): Point {
  const local = radius * wobbleAt(angle, tuning.wallWobble, tuning.wallLobes);
  return {
    x: MAP_CENTER + Math.cos(angle) * local,
    y: MAP_CENTER + Math.sin(angle) * local * tuning.wallOval,
  };
}

/** Palisade towers are drawn this much larger than their base diameter. */
export const PALISADE_TOWER_SCALE = 1.15;
/** Palisade tower outline is a 2px stroke centered on the circle. */
export const PALISADE_TOWER_STROKE = 2;
/** Black edge outside the palisade stroke. */
export const PALISADE_BORDER = 2;

/** Towers spaced around the palisade. Diameter is in hut-widths, before the scale above. */
export const PALISADE_TOWERS: Array<{ count: number; diameter: number } | null> = [
  null,
  null,
  { count: 5, diameter: 0.825 },
  { count: 7, diameter: 1.35 },
  { count: 9, diameter: 2.025 },
];

export function palisadeTowers(
  level: number,
  radius: number,
  tuning: Tuning,
  hutSize: number,
): Array<Point & { r: number }> {
  const step = PALISADE_TOWERS[Math.min(Math.max(level, 0), 4)] ?? null;
  if (!step) return [];
  const r = (hutSize * step.diameter * PALISADE_TOWER_SCALE) / 2;
  const offset = 0.4;
  return Array.from({ length: step.count }, (_, index) => {
    const angle = offset + (index / step.count) * Math.PI * 2;
    return { ...pointOnWall(angle, radius, tuning), r };
  });
}

/** Sides on the sampled rim. Enough that chitin along it reads as a circle. */
const PALISADE_TOWER_RIM_STEPS = 48;

/**
 * Closed rim of a round palisade tower. `outset` grows the radius past `r`
 * (ink stroke and chitin sit outside the fill).
 */
export function palisadeTowerRim(tower: Point & { r: number }, outset = 0): Point[] {
  const radius = Math.max(0, tower.r + outset);
  // Seam faces the village, so the outside arc is one run and its ends land on the wall.
  const inward = Math.atan2(MAP_CENTER - tower.y, MAP_CENTER - tower.x);
  const points: Point[] = [];
  for (let index = 0; index < PALISADE_TOWER_RIM_STEPS; index++) {
    const angle = inward + (index / PALISADE_TOWER_RIM_STEPS) * Math.PI * 2;
    points.push({
      x: tower.x + Math.cos(angle) * radius,
      y: tower.y + Math.sin(angle) * radius,
    });
  }
  return points;
}

/** How far the chitin centerline sits outside the tower fill. */
export function palisadeTowerChitinOutset(chitinStroke: number): number {
  return PALISADE_TOWER_STROKE / 2 + chitinStroke / 2;
}

/**
 * A crown overlaps the palisade stroke or a round tower on that stroke.
 * `halfStroke` is how far the drawn wall reaches past its centerline.
 * `towerPad` is the ink (and plating) past each tower's fill radius.
 */
export function circleMeetsPalisade(
  center: Point,
  reach: number,
  wall: readonly Point[],
  halfStroke: number,
  towers: ReadonlyArray<Point & { r: number }>,
  towerPad = PALISADE_TOWER_STROKE / 2,
): boolean {
  if (wall.length >= 2 && distanceToPolygon(center, wall) <= reach + halfStroke) return true;
  for (const tower of towers) {
    if (Math.hypot(center.x - tower.x, center.y - tower.y) <= reach + tower.r + towerPad) return true;
  }
  return false;
}

/** How far a mark reaches from its slot, including the border outside the fill. */
export function buildingReach(buildingId: string, hutSize: number, level = 1): number {
  let reach = 0;
  for (const shape of buildingShapes(buildingId, { x: 0, y: 0 }, hutSize, level)) {
    if (shape.kind === "circle") {
      reach = Math.max(reach, Math.hypot(shape.c.x, shape.c.y) + shape.r);
      continue;
    }
    for (const point of shape.points) {
      reach = Math.max(reach, Math.hypot(point.x, point.y));
    }
  }
  return reach + fortBorderPad(buildingId, level);
}

/** A crown overlaps a building mark, including the border drawn outside the fill. */
export function circleMeetsBuilding(
  center: Point,
  reach: number,
  buildingId: string,
  at: Point,
  hutSize: number,
  level: number,
): boolean {
  const crown: CircleShape = {
    kind: "circle",
    c: center,
    r: reach + fortBorderPad(buildingId, level),
  };
  return buildingShapes(buildingId, at, hutSize, level).some((shape) => shapesOverlap(shape, crown));
}

export function pointInPolygon(point: Point, poly: Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = poly.length - 1; index < poly.length; previous = index++) {
    const current = poly[index];
    const prior = poly[previous];
    const crosses = (current.y > point.y) !== (prior.y > point.y);
    if (!crosses) continue;
    const xAtY =
      ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
    if (point.x < xAtY) inside = !inside;
  }
  return inside;
}

function circleSegmentHits(center: Point, radius: number, start: Point, end: Point): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const fx = start.x - center.x;
  const fy = start.y - center.y;
  const a = dx * dx + dy * dy;
  if (a < 1e-12) return [];
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < -1e-9) return [];
  const root = Math.sqrt(Math.max(0, disc));
  const hits: Point[] = [];
  for (const sign of [-1, 1]) {
    const t = (-b + sign * root) / (2 * a);
    if (t < -1e-9 || t > 1 + 1e-9) continue;
    const clamped = Math.min(1, Math.max(0, t));
    hits.push({ x: start.x + clamped * dx, y: start.y + clamped * dy });
  }
  return hits;
}

function pointOutsideBoundary(point: Point, boundary: Point[]): boolean {
  return !pointInPolygon(point, boundary);
}

export type ChitinBlocker =
  | { kind: "circle"; x: number; y: number; r: number }
  | { kind: "poly"; points: Point[] };

function pointInChitinBlocker(point: Point, blocker: ChitinBlocker): boolean {
  if (blocker.kind === "circle") {
    return Math.hypot(point.x - blocker.x, point.y - blocker.y) < blocker.r - 1e-6;
  }
  return pointInPolygon(point, blocker.points);
}

function pointInChitinBlockers(point: Point, blockers: ChitinBlocker[]): boolean {
  return blockers.some((blocker) => pointInChitinBlocker(point, blocker));
}

/** Exact entry/exit parameters of a segment against circle/poly blockers. */
function segmentBlockerCuts(
  start: Point,
  end: Point,
  blockers: ChitinBlocker[],
): number[] {
  const ts = [0, 1];
  for (const blocker of blockers) {
    if (blocker.kind === "circle") {
      for (const hit of circleSegmentHits(blocker, blocker.r, start, end)) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSq = dx * dx + dy * dy || 1;
        const t = ((hit.x - start.x) * dx + (hit.y - start.y) * dy) / lengthSq;
        if (t >= -1e-6 && t <= 1 + 1e-6) ts.push(Math.min(1, Math.max(0, t)));
      }
      continue;
    }
    // Poly edges × wall segment.
    for (let index = 0; index < blocker.points.length; index++) {
      const a = blocker.points[index];
      const b = blocker.points[(index + 1) % blocker.points.length];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const fx = a.x - start.x;
      const fy = a.y - start.y;
      const t = (fx * ey - fy * ex) / den;
      const u = (fx * dy - fy * dx) / den;
      if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) continue;
      ts.push(Math.min(1, Math.max(0, t)));
    }
  }
  ts.sort((a, b) => a - b);
  const unique: number[] = [];
  for (const t of ts) {
    if (unique.every((other) => Math.abs(other - t) > 1e-6)) unique.push(t);
  }
  return unique;
}

/** A stretch of wall chitin replaced by a fort's outer chain. `via` picks which arc. */
export type WallChitinSpan = { from: Point; to: Point; via: Point };

function closestLoopParam(point: Point, loop: Point[]): number {
  let bestEdge = 0;
  let bestT = 0;
  let bestDist = Infinity;
  for (let index = 0; index < loop.length; index++) {
    const start = loop[index];
    const end = loop[(index + 1) % loop.length];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
    const dist = Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
    if (dist < bestDist) {
      bestDist = dist;
      bestEdge = index;
      bestT = t;
    }
  }
  return bestEdge + bestT;
}

function pointOnLoop(loop: Point[], param: number): Point {
  const count = loop.length;
  const wrapped = ((param % count) + count) % count;
  const edge = Math.floor(wrapped) % count;
  const t = wrapped - Math.floor(wrapped);
  const start = loop[edge];
  const end = loop[(edge + 1) % count];
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
}

type RemovedWallArc = { start: number; end: number; removeForward: boolean; count: number };

function removedWallArcs(loop: Point[], spans: WallChitinSpan[]): RemovedWallArc[] {
  const count = loop.length;
  const arcs: RemovedWallArc[] = [];
  for (const span of spans) {
    const start = closestLoopParam(span.from, loop);
    const end = closestLoopParam(span.to, loop);
    const forward = (end - start + count) % count;
    if (forward < 1e-4 || count - forward < 1e-4) continue;
    const forwardMid = pointOnLoop(loop, start + forward / 2);
    const backMid = pointOnLoop(loop, end + (count - forward) / 2);
    const forwardDist = Math.hypot(forwardMid.x - span.via.x, forwardMid.y - span.via.y);
    const backDist = Math.hypot(backMid.x - span.via.x, backMid.y - span.via.y);
    arcs.push({ start, end, removeForward: forwardDist <= backDist, count });
  }
  return arcs;
}

function pointOnRemovedWallArc(param: number, arc: RemovedWallArc): boolean {
  const forward = (param - arc.start + arc.count) % arc.count;
  const forwardEnd = (arc.end - arc.start + arc.count) % arc.count;
  const onForward = forward > 1e-4 && forward < forwardEnd - 1e-4;
  return arc.removeForward ? onForward : !onForward && forward > 1e-4;
}

/**
 * Closed wall chitin as open strokes. Tower circles drop the rim they replace.
 * `spans` drop only the wall arc between a fort chain's ends (the arc nearer
 * `via`), so the plates on either side of a bastion stay put.
 */
export function wallChitinOpenChains(
  wallBoundary: Point[],
  blockers: ChitinBlocker[],
  spans: WallChitinSpan[] = [],
): Point[][] {
  if (wallBoundary.length < 2) return [];
  const arcs = removedWallArcs(wallBoundary, spans);
  const chains: Point[][] = [];
  let current: Point[] = [];
  const pushCurrent = () => {
    if (current.length >= 2) chains.push(current);
    current = [];
  };
  for (let index = 0; index < wallBoundary.length; index++) {
    const start = wallBoundary[index];
    const end = wallBoundary[(index + 1) % wallBoundary.length];
    const cuts = segmentBlockerCuts(start, end, blockers);
    for (const arc of arcs) {
      for (const bound of [arc.start, arc.end]) {
        const edge = Math.floor(bound) % wallBoundary.length;
        if (edge !== index) continue;
        const t = bound - Math.floor(bound);
        if (cuts.every((other) => Math.abs(other - t) > 1e-6)) cuts.push(t);
      }
    }
    cuts.sort((left, right) => left - right);
    for (let step = 0; step < cuts.length - 1; step++) {
      const t0 = cuts[step];
      const t1 = cuts[step + 1];
      if (t1 - t0 < 1e-8) continue;
      const mid = {
        x: start.x + (end.x - start.x) * ((t0 + t1) / 2),
        y: start.y + (end.y - start.y) * ((t0 + t1) / 2),
      };
      const midParam = index + (t0 + t1) / 2;
      if (
        pointInChitinBlockers(mid, blockers) ||
        arcs.some((arc) => pointOnRemovedWallArc(midParam, arc))
      ) {
        pushCurrent();
        continue;
      }
      const from = {
        x: start.x + (end.x - start.x) * t0,
        y: start.y + (end.y - start.y) * t0,
      };
      const to = {
        x: start.x + (end.x - start.x) * t1,
        y: start.y + (end.y - start.y) * t1,
      };
      if (
        current.length > 0 &&
        Math.hypot(current[current.length - 1].x - from.x, current[current.length - 1].y - from.y) <
        0.15
      ) {
        current.push(to);
      } else {
        pushCurrent();
        current = [from, to];
      }
    }
  }
  pushCurrent();
  return chains;
}

export function wallChitinOpenPaths(
  wallBoundary: Point[],
  blockers: ChitinBlocker[],
  spans: WallChitinSpan[] = [],
): string[] {
  return wallChitinOpenChains(wallBoundary, blockers, spans)
    .map(pathFromOpenChain)
    .filter((path): path is string => Boolean(path));
}

function segmentWallCrossings(start: Point, end: Point, wall: Point[]): number[] {
  const ts = [0, 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  for (let index = 0; index < wall.length; index++) {
    const a = wall[index];
    const b = wall[(index + 1) % wall.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const fx = a.x - start.x;
    const fy = a.y - start.y;
    const t = (fx * ey - fy * ex) / den;
    const u = (fx * dy - fy * dx) / den;
    if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) continue;
    ts.push(Math.min(1, Math.max(0, t)));
  }
  ts.sort((left, right) => left - right);
  const unique: number[] = [];
  for (const t of ts) {
    if (unique.every((other) => Math.abs(other - t) > 1e-6)) unique.push(t);
  }
  return unique;
}

/** Keep only the parts of a segment that lie outside the wall chitin boundary. */
export function clipSegmentOutsideWall(
  start: Point,
  end: Point,
  wallBoundary: Point[],
): Array<[Point, Point]> {
  const ts = segmentWallCrossings(start, end, wallBoundary);
  const parts: Array<[Point, Point]> = [];
  for (let index = 0; index < ts.length - 1; index++) {
    const t0 = ts[index];
    const t1 = ts[index + 1];
    if (t1 - t0 < 1e-8) continue;
    const midT = (t0 + t1) / 2;
    const mid = {
      x: start.x + (end.x - start.x) * midT,
      y: start.y + (end.y - start.y) * midT,
    };
    if (!pointOutsideBoundary(mid, wallBoundary)) continue;
    parts.push([
      { x: start.x + (end.x - start.x) * t0, y: start.y + (end.y - start.y) * t0 },
      { x: start.x + (end.x - start.x) * t1, y: start.y + (end.y - start.y) * t1 },
    ]);
  }
  return parts;
}

function pathFromOpenChain(points: Point[]): string | null {
  if (points.length < 2) return null;
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index++) {
    path += ` L ${points[index].x.toFixed(2)} ${points[index].y.toFixed(2)}`;
  }
  return path;
}

/**
 * Open white strokes along a closed polygon, only where the edge sits outside
 * the wall's outer chitin centerline.
 */
export function polyOutsideChitinPaths(poly: Point[], wallBoundary: Point[]): string[] {
  return polyOutsideChitinChains(poly, wallBoundary)
    .map(pathFromOpenChain)
    .filter((path): path is string => Boolean(path));
}

/** Outside-wall chains of a closed polygon (point lists, not SVG). */
export function polyOutsideChitinChains(poly: Point[], wallBoundary: Point[]): Point[][] {
  if (poly.length < 2) return [];
  const chains: Point[][] = [];
  let current: Point[] = [];
  const pushCurrent = () => {
    if (current.length >= 2) chains.push(current);
    current = [];
  };
  for (let index = 0; index < poly.length; index++) {
    const start = poly[index];
    const end = poly[(index + 1) % poly.length];
    const parts = clipSegmentOutsideWall(start, end, wallBoundary);
    for (const [from, to] of parts) {
      if (
        current.length > 0 &&
        Math.hypot(current[current.length - 1].x - from.x, current[current.length - 1].y - from.y) <
        0.15
      ) {
        current.push(to);
      } else {
        pushCurrent();
        current = [from, to];
      }
    }
    if (parts.length === 0) pushCurrent();
  }
  pushCurrent();
  return chains;
}

/** Sweep from `a0` to `a1` without taking a shortcut the other way. */
function arcPointsDirected(
  cx: number,
  cy: number,
  radius: number,
  a0: number,
  a1: number,
  steps = 22,
): Point[] {
  const delta = a1 - a0;
  const points: Point[] = [];
  for (let index = 0; index <= steps; index++) {
    const theta = a0 + (delta * index) / steps;
    points.push({ x: cx + Math.cos(theta) * radius, y: cy + Math.sin(theta) * radius });
  }
  return points;
}

/**
 * Open chitin centerline around the bastion's outer face.
 * Local +y is outward. The line follows the side walls, bows out around the
 * two outer towers, and runs the outer wall between those towers. The ends
 * continue inward so the caller can cut them where the city wall crosses.
 */
function bastionOuterWrapLocal(size: number, dilate: number): Point[] {
  const hx = (size * BASTION_LENGTH) / 2;
  const hy = (size * BASTION_DEPTH) / 2;
  const radius = size / 2 + dilate;
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  const sideAbs = Math.acos(clamp(-dilate / radius));
  const outerAbs = Math.asin(clamp(dilate / radius));
  const leftArc = arcPointsDirected(-hx, hy, radius, -sideAbs, outerAbs - Math.PI * 2);
  const rightArc = arcPointsDirected(
    hx,
    hy,
    radius,
    Math.PI - outerAbs,
    -Math.acos(clamp(dilate / radius)),
  );
  return [
    { x: -(hx + dilate), y: -hy },
    ...leftArc,
    ...rightArc,
    { x: hx + dilate, y: -hy },
  ];
}

/** Outside-wall pieces of an open polyline. Does not close the last edge. */
function openPolylineOutsideChains(poly: Point[], wallBoundary: Point[]): Point[][] {
  if (poly.length < 2) return [];
  const chains: Point[][] = [];
  let current: Point[] = [];
  const pushCurrent = () => {
    if (current.length >= 2) chains.push(current);
    current = [];
  };
  for (let index = 0; index < poly.length - 1; index++) {
    const parts = clipSegmentOutsideWall(poly[index], poly[index + 1], wallBoundary);
    for (const [from, to] of parts) {
      if (
        current.length > 0 &&
        Math.hypot(current[current.length - 1].x - from.x, current[current.length - 1].y - from.y) <
        0.15
      ) {
        current.push(to);
      } else {
        pushCurrent();
        current = [from, to];
      }
    }
    if (parts.length === 0) pushCurrent();
  }
  pushCurrent();
  return chains;
}

function farthestOutsideChain(outline: Point[], wallBoundary: Point[]): Point[] | null {
  const chains = openPolylineOutsideChains(outline, wallBoundary);
  let best: Point[] | null = null;
  let bestScore = -Infinity;
  for (const chain of chains) {
    const mid = chain[Math.floor(chain.length / 2)];
    const score = Math.hypot(mid.x - MAP_CENTER, mid.y - MAP_CENTER);
    if (score > bestScore) {
      bestScore = score;
      best = chain;
    }
  }
  return best;
}

/**
 * Chitin around the part of the bastion that sits outside the city wall:
 * the outer side, the two outer towers, and the outer part of each side wall.
 * The chain ends where that outline meets the wall.
 */
function bastionOuterCapChain(
  at: Point,
  size: number,
  strokeWidth: number,
  chitinStroke: number,
  wallBoundary: Point[],
): Point[] | null {
  const dilate = strokeWidth + chitinStroke / 2;
  const world = placePoints(bastionOuterWrapLocal(size, dilate), at, tangentAngle(at));
  return farthestOutsideChain(world, wallBoundary);
}

function localAxis(point: Point, at: Point, cos: number, sin: number): Point {
  const dx = point.x - at.x;
  const dy = point.y - at.y;
  return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
}

/** Parts of a segment that stay outside a vertical local strip. */
function clipOutsideLocalStrip(
  a: Point,
  b: Point,
  ax: number,
  bx: number,
  half: number,
): Array<[Point, Point]> {
  const dx = bx - ax;
  const cuts = [0, 1];
  if (Math.abs(dx) > 1e-9) {
    for (const edge of [-half, half]) {
      const t = (edge - ax) / dx;
      if (t > 1e-4 && t < 1 - 1e-4) cuts.push(t);
    }
  }
  cuts.sort((left, right) => left - right);
  const pointAt = (t: number): Point => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  const pieces: Array<[Point, Point]> = [];
  for (let index = 0; index < cuts.length - 1; index++) {
    const t0 = cuts[index];
    const t1 = cuts[index + 1];
    if (t1 - t0 < 1e-4) continue;
    if (Math.abs(ax + dx * ((t0 + t1) / 2)) < half) continue;
    pieces.push([pointAt(t0), pointAt(t1)]);
  }
  return pieces;
}

/** Drops the outer-wall run that crosses the drawbridge. Side walls stay. */
function splitChainAroundGate(chain: Point[], at: Point, half: number): Point[][] {
  const angle = tangentAngle(at);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const chains: Point[][] = [];
  let current: Point[] = [];
  const pushCurrent = () => {
    if (current.length >= 2) chains.push(current);
    current = [];
  };
  for (let index = 0; index < chain.length - 1; index++) {
    const a = chain[index];
    const b = chain[index + 1];
    const aLocal = localAxis(a, at, cos, sin);
    const bLocal = localAxis(b, at, cos, sin);
    const pieces =
      aLocal.y > 0 || bLocal.y > 0
        ? clipOutsideLocalStrip(a, b, aLocal.x, bLocal.x, half)
        : ([[a, b]] as Array<[Point, Point]>);
    for (const [from, to] of pieces) {
      const last = current[current.length - 1];
      if (last && Math.hypot(last.x - from.x, last.y - from.y) < 0.15) {
        current.push(to);
      } else {
        pushCurrent();
        current = [from, to];
      }
    }
    if (pieces.length === 0) pushCurrent();
  }
  pushCurrent();
  return chains;
}

/**
 * World-space chitin for a bastion. Follows the towers and walls, and stops
 * at the city wall. `gapHalf` opens the outer gate for the drawbridge.
 */
export function bastionChitinPaths(
  at: Point,
  size: number,
  strokeWidth: number,
  chitinStroke: number,
  wallBoundary: Point[],
  gapHalf = 0,
): string[] {
  const chain = bastionOuterCapChain(at, size, strokeWidth, chitinStroke, wallBoundary);
  if (!chain) return [];
  const chains = gapHalf > 0 ? splitChainAroundGate(chain, at, gapHalf) : [chain];
  return chains.flatMap((part) => {
    const path = pathFromOpenChain(part);
    return path ? [path] : [];
  });
}

/** Polylines for bastion chitin spikes. `gapHalf` leaves the drawbridge gate clear. */
export function bastionChitinChains(
  at: Point,
  size: number,
  strokeWidth: number,
  chitinStroke: number,
  wallBoundary: Point[],
  gapHalf = 0,
): Point[][] {
  const chain = bastionOuterCapChain(at, size, strokeWidth, chitinStroke, wallBoundary);
  if (!chain) return [];
  if (gapHalf <= 0) return [chain];
  return splitChainAroundGate(chain, at, gapHalf);
}

/** World-space chitin strokes for a watchtower that sits on the palisade. */
export function watchtowerChitinPaths(
  at: Point,
  width: number,
  level: number,
  strokeWidth: number,
  chitinStroke: number,
  wallBoundary: Point[],
): string[] {
  const angle = tangentAngle(at);
  const chitinOutset = strokeWidth + chitinStroke / 2;
  const local = offsetFromCentroid(watchtowerOutline(width, level), chitinOutset);
  return polyOutsideChitinPaths(placePoints(local, at, angle), wallBoundary);
}

/** Polylines for watchtower chitin spikes. */
export function watchtowerChitinChains(
  at: Point,
  width: number,
  level: number,
  strokeWidth: number,
  chitinStroke: number,
  wallBoundary: Point[],
): Point[][] {
  const angle = tangentAngle(at);
  const chitinOutset = strokeWidth + chitinStroke / 2;
  const local = offsetFromCentroid(watchtowerOutline(width, level), chitinOutset);
  const world = placePoints(local, at, angle);
  if (world.length < 2) return [];
  const chains: Point[][] = [];
  let current: Point[] = [];
  const pushCurrent = () => {
    if (current.length >= 2) chains.push(current);
    current = [];
  };
  for (let index = 0; index < world.length; index++) {
    const start = world[index];
    const end = world[(index + 1) % world.length];
    const parts = clipSegmentOutsideWall(start, end, wallBoundary);
    for (const [from, to] of parts) {
      if (
        current.length > 0 &&
        Math.hypot(current[current.length - 1].x - from.x, current[current.length - 1].y - from.y) <
        0.15
      ) {
        current.push(to);
      } else {
        pushCurrent();
        current = [from, to];
      }
    }
    if (parts.length === 0) pushCurrent();
  }
  pushCurrent();
  return chains;
}

export function distanceToPolygon(point: Point, poly: Point[]): number {
  let nearest = Infinity;
  for (let index = 0; index < poly.length; index++) {
    nearest = Math.min(
      nearest,
      distanceToSegment(point, poly[index], poly[(index + 1) % poly.length]),
    );
  }
  return nearest;
}

function pointInsideWall(point: Point, boundary: Point[]): boolean {
  return wallClearanceOn(point, boundary) >= -TOUCH_PX;
}

/** Positive when the point is inside the palisade, negative when it has crossed the line. */
export function wallClearance(point: Point, radius: number, tuning: Tuning): number {
  return wallClearanceOn(point, wallPolygon(radius, tuning));
}

function wallClearanceOn(point: Point, boundary: Point[]): number {
  const gap = distanceToPolygon(point, boundary);
  return pointInPolygon(point, boundary) ? gap : -gap;
}

function shapeInsideWall(shape: Shape, boundary: Point[]): boolean {
  const points = shape.kind === "circle" ? circleSamples(shape.c, shape.r, 20) : shape.points;
  return points.every((point) => pointInsideWall(point, boundary));
}

function insideWall(
  buildingId: string,
  at: Point,
  boundary: Point[],
  hutSize: number,
  level: number,
): boolean {
  return buildingShapes(buildingId, at, hutSize, level).every((shape) => shapeInsideWall(shape, boundary));
}

function clearOfTowers(
  buildingId: string,
  at: Point,
  towers: Array<Point & { r: number }>,
  hutSize: number,
  level: number,
): boolean {
  return !hitsPalisadeTower(buildingId, at, level, towers, hutSize);
}

/** Slide a building toward the village center until it is inside the palisade and off its towers. */
function pullInside(
  buildingId: string,
  desired: Point,
  boundary: Point[],
  hutSize: number,
  level: number,
  towers: Array<Point & { r: number }>,
): Point {
  const fits = (at: Point) =>
    insideWall(buildingId, at, boundary, hutSize, level) &&
    clearOfTowers(buildingId, at, towers, hutSize, level);
  if (fits(desired)) return desired;
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 16; step++) {
    const mid = (lo + hi) / 2;
    const at = {
      x: MAP_CENTER + (desired.x - MAP_CENTER) * mid,
      y: MAP_CENTER + (desired.y - MAP_CENTER) * mid,
    };
    if (fits(at)) lo = mid;
    else hi = mid;
  }
  return {
    x: MAP_CENTER + (desired.x - MAP_CENTER) * lo,
    y: MAP_CENTER + (desired.y - MAP_CENTER) * lo,
  };
}

/** Keep a wall building on the palisade, shifted to the nearest gap between towers. */
function slideOffTowers(
  buildingId: string,
  at: Point,
  tier: number,
  radius: number,
  tuning: Tuning,
  towers: Array<Point & { r: number }>,
  hutSize: number,
): Point {
  if (clearOfTowers(buildingId, at, towers, hutSize, tier)) return at;
  const from = wallAngle(at, tuning.wallOval);
  let best = at;
  let bestShift = Infinity;
  for (const sign of [-1, 1]) {
    let lo = 0;
    let hi = Math.PI;
    let found = false;
    for (let step = 0; step < 18; step++) {
      const mid = (lo + hi) / 2;
      const candidate = pointOnWall(from + sign * mid, radius, tuning);
      if (clearOfTowers(buildingId, candidate, towers, hutSize, tier)) {
        hi = mid;
        found = true;
      } else {
        lo = mid;
      }
    }
    if (!found) continue;
    const candidate = pointOnWall(from + sign * hi, radius, tuning);
    if (hi < bestShift && clearOfTowers(buildingId, candidate, towers, hutSize, tier)) {
      best = candidate;
      bestShift = hi;
    }
  }
  return best;
}

function clearOfOthers(
  buildingId: string,
  at: Point,
  others: PlacedSlot[],
  hutSize: number,
  level: number,
): boolean {
  return others.every(
    (other) =>
      !footprintsOverlap(
        buildingId,
        at,
        other.buildingId,
        other,
        hutSize,
        level,
        other.tier,
      ),
  );
}

function lerp(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

function lerpAngle(from: number, to: number, t: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}

/** Open ground between a palisade tower and the watchtower or bastion border. */
const FORT_TOWER_GAP = 20;

/** How far the drawn border sits outside the collision shape. */
export function fortBorderPad(buildingId: string, tier: number): number {
  if (buildingId === "bastion" || buildingId === "watchtower") return bastionOutlineWidth(tier);
  return 0;
}

export function hitsPalisadeTower(
  buildingId: string,
  at: Point,
  tier: number,
  towers: Array<Point & { r: number }>,
  hutSize: number,
): boolean {
  if (towers.length === 0) return false;
  const border = fortBorderPad(buildingId, tier);
  // TOUCH_PX is the overlap slop. Adding it back keeps a full gap after that slop.
  const pad = border > 0 ? FORT_TOWER_GAP + border + PALISADE_TOWER_STROKE / 2 + TOUCH_PX : 0;
  const shapes = buildingShapes(buildingId, at, hutSize, tier);
  return towers.some((tower) => {
    const circle: CircleShape = {
      kind: "circle",
      c: tower,
      r: tower.r + pad,
    };
    return shapes.some((shape) => shapesOverlap(shape, circle));
  });
}

/**
 * Pull seed / override positions inside the wall's inner edge so the full mark
 * never covers the palisade or its towers. Bastion and watchtower stay on the
 * wall, shifted into the nearest gap between towers. Heartfire stays put.
 * The palisade radius itself still uses the first tier (estate excepted).
 */
export function containSlots(
  slots: PlacedSlot[],
  radius: number,
  tuning: Tuning,
  wallStroke: number,
  wallLevel = 0,
  hutSize = tuning.squareSize,
): PlacedSlot[] {
  const boundary = innerWallPolygon(radius, tuning, wallStroke);
  const towers = palisadeTowers(wallLevel, radius, tuning, tuning.squareSize);
  return slots.map((slot) => {
    if (staysPut(slot.buildingId)) {
      const at = snapToPixel(slot);
      if (at.x === slot.x && at.y === slot.y) return slot;
      return { ...slot, x: at.x, y: at.y };
    }
    const placed = sitsOnWall(slot.buildingId)
      ? slideOffTowers(slot.buildingId, slot, slot.tier, radius, tuning, towers, hutSize)
      : pullInside(slot.buildingId, slot, boundary, hutSize, slot.tier, towers);
    const at = snapToLegalPixel(placed, (point) =>
      clearOfTowers(slot.buildingId, point, towers, hutSize, slot.tier) &&
      (sitsOnWall(slot.buildingId) ||
        insideWall(slot.buildingId, point, boundary, hutSize, slot.tier)),
    );
    if (at.x === slot.x && at.y === slot.y) return slot;
    return { ...slot, x: at.x, y: at.y };
  });
}

/**
 * Where a dragged building may land.
 * Watchtower and bastion stay on the palisade line, clear of its towers.
 * Every other building stays inside the wall and off its towers, and no mark may cover another.
 */
export function constrainMove(
  moving: PlacedSlot,
  desired: Point,
  slots: PlacedSlot[],
  radius: number,
  tuning: Tuning,
  wallLevel = 0,
  hutSize = tuning.squareSize,
): Point {
  const others = slots.filter((slot) => slot.id !== moving.id);
  const here = staysPut(moving.buildingId)
    ? { x: MAP_CENTER, y: MAP_CENTER }
    : { x: moving.x, y: moving.y };
  if (staysPut(moving.buildingId)) return snapToPixel(here);
  const wallStroke = wallStrokeWidth(wallLevel, tuning.wallThickness);
  const boundary = innerWallPolygon(radius, tuning, wallStroke);
  const towers = palisadeTowers(wallLevel, radius, tuning, tuning.squareSize);
  const legal = (at: Point) =>
    clearOfOthers(moving.buildingId, at, others, hutSize, moving.tier) &&
    !hitsPalisadeTower(moving.buildingId, at, moving.tier, towers, tuning.squareSize) &&
    (sitsOnWall(moving.buildingId) ||
      insideWall(
        moving.buildingId,
        at,
        boundary,
        hutSize,
        moving.tier,
      ));

  if (sitsOnWall(moving.buildingId)) {
    const snapped = pointOnWall(wallAngle(desired, tuning.wallOval), radius, tuning);
    if (legal(snapped)) return snapToLegalPixel(snapped, legal);
    // The fitted palisade can sit off a seed point. Walk from the line itself.
    const origin = pointOnWall(wallAngle(here, tuning.wallOval), radius, tuning);
    const start = legal(origin) ? origin : here;
    if (!legal(start)) return snapToPixel(here);
    const from = wallAngle(start, tuning.wallOval);
    const to = wallAngle(desired, tuning.wallOval);
    let lo = 0;
    let hi = 1;
    for (let step = 0; step < 14; step++) {
      const mid = (lo + hi) / 2;
      const at = pointOnWall(lerpAngle(from, to, mid), radius, tuning);
      if (legal(at)) lo = mid;
      else hi = mid;
    }
    return snapToLegalPixel(pointOnWall(lerpAngle(from, to, lo), radius, tuning), legal);
  }

  const inside = pullInside(
    moving.buildingId,
    desired,
    boundary,
    hutSize,
    moving.tier,
    towers,
  );
  if (legal(inside)) return snapToLegalPixel(inside, legal);
  if (!legal(here)) return snapToPixel(here);
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 14; step++) {
    const mid = (lo + hi) / 2;
    const at = pullInside(
      moving.buildingId,
      lerp(here, inside, mid),
      boundary,
      hutSize,
      moving.tier,
      towers,
    );
    if (legal(at)) lo = mid;
    else hi = mid;
  }
  return snapToLegalPixel(
    pullInside(
      moving.buildingId,
      lerp(here, inside, lo),
      boundary,
      hutSize,
      moving.tier,
      towers,
    ),
    legal,
  );
}
