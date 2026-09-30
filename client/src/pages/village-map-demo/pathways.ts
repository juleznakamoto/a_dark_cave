import {
  MAP_CENTER,
  type Tuning,
} from "@/pages/village-map-demo/catalog";
import {
  buildingShapes,
  innerSidePoint,
  alchemistHallDoor,
  longhouseDoor,
  innerWallPolygon,
  markSize,
  minWobbleFactor,
  ovalRadius,
  palisadeTowers,
  type PlacedSlot,
  type Point,
} from "@/pages/village-map-demo/geometry";

import {
  cellPoint,
  closestOnShape,
  connectDoor,
  dedupePoints,
  distanceToPolygon,
  distanceToShapes,
  doorLeave,
  doorPastWall,
  doorRoute,
  heapPop,
  heapPush,
  lerp,
  midpoint,
  mixSeed,
  nearestWallNormal,
  nudgeToward,
  pathClearsOwn,
  pointAt,
  pointFromEnd,
  pointInPolygon,
  polylineLength,
  polylinesCross,
  polylinesCrossAny,
  reverses,
  ribbonPath,
  rightAngleJoin,
  roadBeyond,
  routeClearsOthers,
  samePoint,
  samplePolyline,
  shapesNear,
  softenCenterline,
  stonesAlong,
} from "@/pages/village-map-demo/pathwayDraw";
import {
  dropSpikes,
  exitDoor,
  leanSomeForksInward,
  liftShallowForks,
  mergeSplitCluster,
  nearestApproach,
  outwardContinuation,
  prefixTo,
  pushSplitFurther,
  resolveEdges,
  retractHeartTrunks,
  routeIsLegal,
  separateCrowdedForks,
  splitDelay,
  spreadForks,
  unitVector,
  walkBranch,
} from "@/pages/village-map-demo/pathwayJoins";

/**
 * Gravel tracks from each building's door to the heartfire.
 * Routes share a shortest-path tree, so they join instead of crossing.
 * Nothing leads to the pale cross, monolith, or pillar. They only block the way.
 */

/** Drawn half-width. Stones and joins use this. Full width is twice it. */
export const PATH_HALF = 3.9;
/** Narrowest and widest half the edge wave reaches. */
export const PATH_HALF_SWING: readonly [number, number] = [2.75, 4];
/** Side-to-side bend of one edge, on top of the wave. */
export const PATH_JITTER = 0.6;
/** Furthest a drawn edge sits from the centerline. */
export const PATH_RIBBON_REACH = PATH_HALF_SWING[1] + PATH_JITTER;
/** Centerline stays this far from a building, so a gap remains after the wobble. */
const ROUTE_PAD = 4.6;
/** Open ground between the track's edge and a building. */
export const PATH_GAP = 8;
/** How far the centerline stays from a building. Wobble stays inside the gap. */
export const PATH_CLEARANCE = PATH_GAP + ROUTE_PAD * 1.22;
/** Fully clear this close to a door or the heartfire. */
export const PATH_DOOR_CLEAR = 2;
/** Fully solid this far from a door or the heartfire. The fade runs from here in to the clear distance. */
export const PATH_DOOR_FADE = 8;
/** The routed door sits this far outside the wall. */
export const DOOR_OUTSET = 1.5;
/** Solid gravel continues this far under the wall, so the road meets the building. */
const DOOR_TUCK = 5;
/** Straight run out from a door, perpendicular to the wall, before the path may turn. */
export const DOOR_APPROACH = 18;
/**
 * How far the path stays on that straight run when there is room.
 * The turn toward the road happens out here, not against the wall.
 */
export const GENTLE_RUNS = [52, 40, 32, 24, 16];
/** Trunks that leave the heartfire. Roads join one of these, then split further out. */
const HEART_BRANCHES = 10;
/** A road that has just left the heartfire runs this far before it may split.
 *  The split stops early when the next door is closer than this. */
export const HEART_SPLIT_CLEAR = 30;
/**
 * Side roads that leave within this distance along the same road share one
 * intersection, once three or more of them bunch up.
 */
export const INTERSECTION_REACH = 56;
export const CELL = 6;
const NO_PATH = new Set([
  "heartfire",
  "paleCross",
  "blackMonolith",
  "pillarOfClarity",
]);

export type Shape =
  | { kind: "circle"; c: Point; r: number }
  | { kind: "poly"; points: Point[] };

type ShapeBox = { minX: number; minY: number; maxX: number; maxY: number };

/** Shapes for the current field build. Cleared at the start of each build. */
const shapeCache = new Map<string, Shape[]>();
export const shapeBoxes = new WeakMap<Shape[], ShapeBox>();

function shapeBox(shapes: Shape[]): ShapeBox {
  const known = shapeBoxes.get(shapes);
  if (known) return known;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const shape of shapes) {
    if (shape.kind === "circle") {
      minX = Math.min(minX, shape.c.x - shape.r);
      minY = Math.min(minY, shape.c.y - shape.r);
      maxX = Math.max(maxX, shape.c.x + shape.r);
      maxY = Math.max(maxY, shape.c.y + shape.r);
    } else {
      for (const point of shape.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }
  }
  const box = { minX, minY, maxX, maxY };
  shapeBoxes.set(shapes, box);
  return box;
}

export function slotShapes(slot: PlacedSlot, hutSize: number): Shape[] {
  const hit = shapeCache.get(slot.id);
  if (hit) return hit;
  const shapes = buildingShapes(slot.buildingId, slot, hutSize, slot.tier) as Shape[];
  shapeBox(shapes);
  shapeCache.set(slot.id, shapes);
  return shapes;
}

/** True when the point is farther than `gap` from every point in the box. */
export function beyondShapeBox(point: Point, shapes: Shape[], gap: number): boolean {
  const box = shapeBoxes.get(shapes);
  if (!box) return false;
  const dx = point.x < box.minX ? box.minX - point.x : point.x > box.maxX ? point.x - box.maxX : 0;
  const dy = point.y < box.minY ? box.minY - point.y : point.y > box.maxY ? point.y - box.maxY : 0;
  return dx * dx + dy * dy >= gap * gap;
}

type Obstacle = {
  id: string;
  shapes: Shape[];
  /** Lane through this building's own padding, from the door toward the heartfire. */
  corridor: { a: Point; b: Point } | null;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type Grid = {
  originX: number;
  originY: number;
  cell: number;
  width: number;
  height: number;
  blocked: Uint8Array;
  heartRadius: number;
  blockedPoint: (point: Point) => boolean;
  /** Like blockedPoint, but this building's own footprint does not count. */
  approachBlocked: (point: Point, ignoreId: string) => boolean;
  /** Same, using the looser gap the clearance check allows. */
  approachTight: (point: Point, ignoreId: string) => boolean;
  /** True when the point is inside another building, ignoring padding. */
  insideOthers: (point: Point, ignoreId: string) => boolean;
};

export type PathEdgeBase = {
  id: string;
  /** Buildings whose track uses this stretch. A private spur lists one. */
  slotIds: string[];
  points: Point[];
};

export type PathField = {
  edges: PathEdgeBase[];
  grid: Grid | null;
  heartRadius: number;
};

/** Opacity fade at one end of a track. `from` is clear, `to` is solid. */
export type PathFade = { from: Point; to: Point; clear: number };

export type VillagePath = {
  id: string;
  slotIds: string[];
  /** Centerline, door side first, heartfire last. */
  points: Point[];
  ribbon: string;
  stones: Array<{ d: string; tone: 0 | 1 }>;
  /** Point that moves when this stretch is dragged. */
  handle: Point;
  /**
   * Fade along the approach to one building. `from` is the door and `to` is
   * {@link PATH_DOOR_FADE} back along the track (solid). `clear` is the
   * gradient offset where the track is still fully clear, {@link PATH_DOOR_CLEAR}
   * out from the door. Shared stretches have none.
   */
  doorFade: PathFade | null;
  /**
   * Same fade where a trunk stops at the heartfire rim. Stretches that stop at a junction have none.
   */
  heartFade: PathFade | null;
};

export type PathFieldInput = {
  slots: readonly PlacedSlot[];
  hutSize: number;
  wallLevel: number;
  radius: number;
  wallStroke: number;
  tuning: Tuning;
};

/** Last routed village. The map unmounts when its tab closes, so this is what the next open reuses. */
let pathFieldCache: { key: string; field: PathField } | null = null;

function pathFieldCacheKey(input: PathFieldInput): string {
  let key = JSON.stringify(input.tuning);
  key += `\0${input.hutSize}\0${input.wallLevel}\0${input.radius}\0${input.wallStroke}`;
  for (const slot of input.slots) {
    key += `\0${slot.id}\0${slot.buildingId}\0${slot.tier}\0${slot.x}\0${slot.y}`;
  }
  return key;
}

/** Drop the remembered roads. Tests use this so a timed build is always a cold route. */
export function clearVillagePathFieldCache(): void {
  pathFieldCache = null;
}

export function buildVillagePathField(input: PathFieldInput): PathField {
  const key = pathFieldCacheKey(input);
  if (pathFieldCache?.key === key) return pathFieldCache.field;
  const field = routeVillagePathField(input);
  pathFieldCache = { key, field };
  return field;
}

function routeVillagePathField(input: PathFieldInput): PathField {
  const heart = input.slots.find((slot) => slot.buildingId === "heartfire");
  const heartRadius = heart ? markSize("heartfire", input.hutSize) / 2 : 0;
  if (!heart || heartRadius <= 0) return { edges: [], grid: null, heartRadius: 0 };

  shapeCache.clear();
  const targets = input.slots.filter((slot) => !NO_PATH.has(slot.buildingId));
  const blockers = input.slots.filter((slot) => NO_PATH.has(slot.buildingId));
  const obstacles = collectObstacles(input, targets);
  const wallPoly =
    input.wallLevel > 0
      ? innerWallPolygon(input.radius, input.tuning, input.wallStroke)
      : null;
  const grid = buildGrid(input, obstacles, wallPoly, heartRadius);
  const parents = routeTree(grid);
  const edges = traceEdges(grid, parents, targets, input.hutSize, blockers);
  return { edges, grid, heartRadius };
}

export function villagePathDrawings(
  field: PathField,
  overrides: Record<string, Point>,
): VillagePath[] {
  const resolved = resolveEdges(field, overrides);
  const ribbons = extendIntoNext(resolved);
  return resolved.map((edge) => {
    const handle = overrides[edge.id] ?? midpoint(edge.points);
    const seed = mixSeed(edge.id);
    const route = ribbons.get(edge.id) ?? edge.points;
    const met = edge.slotIds.length === 1 ? extendThroughDoor(route) : route;
    const drawn = softenCenterline(met, seed);
    return {
      id: edge.id,
      slotIds: edge.slotIds,
      points: edge.points,
      ribbon: ribbonPath(drawn, seed),
      stones: stonesAlong(drawn, seed),
      handle,
      doorFade: doorFade(edge.slotIds, met),
      heartFade: heartFade(edge.points, field.heartRadius),
    };
  });
}

/** How far a stretch runs into the next one, so the join sits inside the merged track. */
const MERGE_OVERLAP = PATH_HALF * 2;

/**
 * Each edge ends where the next one starts. Continue the ribbon into that next
 * edge so the butt joint is buried and the drawn tracks read as one shape.
 */
function extendIntoNext(edges: readonly PathEdgeBase[]): Map<string, Point[]> {
  const out = new Map<string, Point[]>();
  for (const edge of edges) {
    const end = edge.points[edge.points.length - 1];
    if (!end) {
      out.set(edge.id, edge.points);
      continue;
    }
    const next = edges.find(
      (other) => other.id !== edge.id && other.points[0] != null && samePoint(other.points[0], end),
    );
    if (!next) {
      out.set(edge.id, edge.points);
      continue;
    }
    out.set(edge.id, [...edge.points, ...continuation(next.points, MERGE_OVERLAP)]);
  }
  return out;
}

/** Points of `points` after the start, stopping `distance` along the line. */
export function continuation(points: readonly Point[], distance: number): Point[] {
  const out: Point[] = [];
  let left = distance;
  for (let index = 1; index < points.length && left > 0.2; index++) {
    const start = points[index - 1];
    const end = points[index];
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    if (span < 1e-6) continue;
    if (left <= span) {
      out.push(lerp(start, end, left / span));
      return out;
    }
    left -= span;
    out.push(end);
  }
  return out;
}

/** Furthest legal place for a dragged stretch, between its current handle and the pointer. */
export function constrainVillagePath(
  field: PathField,
  edgeId: string,
  desired: Point,
  overrides: Record<string, Point>,
): Point {
  const base = field.edges.find((edge) => edge.id === edgeId);
  if (!base || !field.grid) return desired;
  const current = overrides[edgeId] ?? midpoint(base.points);
  const others = resolveEdges(field, overrides, edgeId);
  if (routeIsLegal(field, base, desired, others)) return { x: desired.x, y: desired.y };
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 12; step++) {
    const mid = (lo + hi) / 2;
    const at = lerp(current, desired, mid);
    if (routeIsLegal(field, base, at, others)) lo = mid;
    else hi = mid;
  }
  return lerp(current, desired, lo);
}

/** True when two centerlines cross away from a shared join. */
export function pathCenterlinesCross(paths: readonly { id?: string; points: Point[] }[]): boolean {
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      if (polylinesCross(paths[i].points, paths[j].points)) return true;
    }
  }
  return false;
}

/**
 * A centerline sample that sits on another building, ignoring the doorway
 * of a building this stretch already serves.
 */
export function pathClearanceViolation(
  paths: readonly { id: string; slotIds: string[]; points: Point[] }[],
  slots: readonly PlacedSlot[],
  hutSize: number,
): string | null {
  shapeCache.clear();
  const doors = new Map<string, Point>();
  for (const slot of slots) {
    if (NO_PATH.has(slot.buildingId)) continue;
    const door = buildingDoor(slot, hutSize);
    if (door) doors.set(slot.id, door);
  }
  for (const path of paths) {
    const samples = samplePolyline(path.points, 4);
    for (const point of samples) {
      for (const slot of slots) {
        if (slot.buildingId === "heartfire") continue;
        const shapes = slotShapes(slot, hutSize);
        const gap = distanceToShapes(point, shapes);
        if (gap >= PATH_CLEARANCE - CELL) continue;
        const servedDoor = path.slotIds.some((id) => {
          const at = doors.get(id);
          return at != null && Math.hypot(point.x - at.x, point.y - at.y) <= PATH_CLEARANCE + CELL * 2;
        });
        if (servedDoor && gap > 0.4) continue;
        const departing = path.slotIds.includes(slot.id) && gap > 0.4 && doors.get(slot.id) != null
          && Math.hypot(point.x - doors.get(slot.id)!.x, point.y - doors.get(slot.id)!.y) <= 80;
        if (departing) continue;
        return `${path.id} passes ${slot.id}`;
      }
    }
  }
  return null;
}

function collectObstacles(input: PathFieldInput, targets: readonly PlacedSlot[]): Obstacle[] {
  const obstacles: Obstacle[] = [];
  for (const slot of input.slots) {
    if (slot.buildingId === "heartfire") continue;
    const shapes = slotShapes(slot, input.hutSize);
    const door = targets.includes(slot) ? buildingDoor(slot, input.hutSize) : null;
    obstacles.push(obstacleFrom(slot.id, shapes, door));
  }
  if (input.wallLevel > 0) {
    const towers = palisadeTowers(input.wallLevel, input.radius, input.tuning, input.tuning.squareSize);
    towers.forEach((tower, index) => {
      obstacles.push(obstacleFrom(`tower:${index}`, [{ kind: "circle", c: tower, r: tower.r }], null));
    });
  }
  return obstacles;
}

function buildingDoor(slot: PlacedSlot, hutSize: number): Point | null {
  const heart = { x: MAP_CENTER, y: MAP_CENTER };
  if (slot.buildingId === "longhouse") return doorPastWall(slot, longhouseDoor(slot, hutSize));
  if (slot.buildingId === "alchemistHall") return doorPastWall(slot, alchemistHallDoor(slot, hutSize));
  const inner = innerSidePoint(slot.buildingId, slot, hutSize, slot.tier);
  if (inner) return nudgeToward(inner, heart, DOOR_OUTSET);
  const shapes = slotShapes(slot, hutSize);
  let best: Point | null = null;
  let bestDist = Infinity;
  for (const shape of shapes) {
    const point = closestOnShape(shape, heart);
    const dist = Math.hypot(point.x - heart.x, point.y - heart.y);
    if (dist < bestDist) {
      best = point;
      bestDist = dist;
    }
  }
  if (!best) return null;
  return nudgeToward(best, heart, DOOR_OUTSET);
}

/**
 * The route starts just outside the wall, and the fade then hides the first
 * stretch of it. Drawn as-is, that leaves open ground between the gravel and
 * the building. Pull the drawn start back through the wall so the fade is
 * solid under the wall, so the gravel meets the building.
 */
function extendThroughDoor(points: readonly Point[]): Point[] {
  const start = points[0];
  const line = points as Point[];
  const ahead = pointAt(line, Math.min(PATH_DOOR_FADE, polylineLength(line)));
  if (!start || !ahead) return points.slice();
  const span = Math.hypot(ahead.x - start.x, ahead.y - start.y);
  if (span < 1) return points.slice();
  const back = PATH_DOOR_FADE + DOOR_OUTSET + DOOR_TUCK;
  return [
    {
      x: start.x - ((ahead.x - start.x) / span) * back,
      y: start.y - ((ahead.y - start.y) / span) * back,
    },
    ...points,
  ];
}

/** Private spur only. Shared trunks stay solid at the building end. */
function doorFade(slotIds: readonly string[], points: readonly Point[]): PathFade | null {
  if (slotIds.length !== 1 || points.length < 2) return null;
  const from = points[0];
  const to = pointAt(points, PATH_DOOR_FADE);
  const clearAt = pointAt(points, PATH_DOOR_CLEAR);
  if (!to || !clearAt) return null;
  return fadeBetween(from, to, clearAt);
}

/** Trunks that stop short of the heartfire. Same clear and solid distances as a door. */
function heartFade(points: readonly Point[], heartRadius: number): PathFade | null {
  if (points.length < 2 || heartRadius <= 0) return null;
  const from = points[points.length - 1];
  if (Math.abs(Math.hypot(from.x - MAP_CENTER, from.y - MAP_CENTER) - heartRadius) > 1.5) return null;
  const to = pointFromEnd(points, PATH_DOOR_FADE);
  const clearAt = pointFromEnd(points, PATH_DOOR_CLEAR);
  if (!to || !clearAt) return null;
  return fadeBetween(from, to, clearAt);
}

function fadeBetween(from: Point, to: Point, clearAt: Point): PathFade | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.25) return null;
  const projected = ((clearAt.x - from.x) * dx + (clearAt.y - from.y) * dy) / lenSq;
  return { from, to, clear: Math.min(1, Math.max(0, projected)) };
}

function obstacleFrom(id: string, shapes: Shape[], door: Point | null): Obstacle {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (point: Point, pad: number) => {
    minX = Math.min(minX, point.x - pad);
    minY = Math.min(minY, point.y - pad);
    maxX = Math.max(maxX, point.x + pad);
    maxY = Math.max(maxY, point.y + pad);
  };
  for (const shape of shapes) {
    if (shape.kind === "circle") {
      grow(shape.c, shape.r + PATH_CLEARANCE);
    } else {
      for (const point of shape.points) grow(point, PATH_CLEARANCE);
    }
  }
  let corridor: Obstacle["corridor"] = null;
  if (door) {
    const heart = { x: MAP_CENTER, y: MAP_CENTER };
    corridor = { a: door, b: nudgeToward(door, heart, PATH_CLEARANCE + CELL * 2) };
    grow(corridor.a, CELL);
    grow(corridor.b, CELL);
  }
  return { id, shapes, corridor, minX, minY, maxX, maxY };
}

function buildGrid(
  input: PathFieldInput,
  obstacles: Obstacle[],
  wallPoly: Point[] | null,
  heartRadius: number,
): Grid {
  let minX = MAP_CENTER;
  let minY = MAP_CENTER;
  let maxX = MAP_CENTER;
  let maxY = MAP_CENTER;
  for (const slot of input.slots) {
    minX = Math.min(minX, slot.x);
    minY = Math.min(minY, slot.y);
    maxX = Math.max(maxX, slot.x);
    maxY = Math.max(maxY, slot.y);
  }
  const pad = 48;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const originX = Math.floor(minX / CELL) * CELL;
  const originY = Math.floor(minY / CELL) * CELL;
  const width = Math.max(1, Math.ceil((maxX - originX) / CELL));
  const height = Math.max(1, Math.ceil((maxY - originY) / CELL));
  const blocked = new Uint8Array(width * height);
  const safeWall =
    wallPoly == null
      ? 0
      : input.radius * minWobbleFactor(input.tuning.wallWobble, input.tuning.wallLobes) -
      input.wallStroke / 2 -
      PATH_CLEARANCE -
      4;
  for (let gy = 0; gy < height; gy++) {
    for (let gx = 0; gx < width; gx++) {
      const point = {
        x: originX + (gx + 0.5) * CELL,
        y: originY + (gy + 0.5) * CELL,
      };
      if (Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER) <= heartRadius) {
        blocked[gy * width + gx] = 1;
        continue;
      }
      if (cellBlocked(point, obstacles, wallPoly, input.tuning, safeWall)) {
        blocked[gy * width + gx] = 1;
      }
    }
  }
  return {
    originX,
    originY,
    cell: CELL,
    width,
    height,
    blocked,
    heartRadius,
    blockedPoint: (point: Point) => {
      if (Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER) <= heartRadius) return false;
      return cellBlocked(point, obstacles, wallPoly, input.tuning, safeWall);
    },
    approachBlocked: (point: Point, ignoreId: string) => {
      if (Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER) <= heartRadius) return false;
      return cellBlocked(point, obstacles, wallPoly, input.tuning, safeWall, ignoreId);
    },
    approachTight: (point: Point, ignoreId: string) => {
      if (Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER) <= heartRadius) return false;
      return cellBlocked(point, obstacles, wallPoly, input.tuning, safeWall, ignoreId, PATH_CLEARANCE - CELL);
    },
    insideOthers: (point: Point, ignoreId: string) => {
      if (Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER) <= heartRadius) return false;
      return cellBlocked(point, obstacles, wallPoly, input.tuning, safeWall, ignoreId, 0.5);
    },
  };
}

function cellBlocked(
  point: Point,
  obstacles: Obstacle[],
  wallPoly: Point[] | null,
  tuning: Tuning,
  safeWall: number,
  ignoreId?: string,
  clearance = PATH_CLEARANCE,
): boolean {
  if (wallPoly) {
    const reach = ovalRadius(point, tuning.wallOval);
    if (reach > safeWall) {
      if (!pointInPolygon(point, wallPoly)) return true;
      if (distanceToPolygon(point, wallPoly) < PATH_CLEARANCE) return true;
    }
  }
  for (const obstacle of obstacles) {
    if (obstacle.id === ignoreId) continue;
    if (point.x < obstacle.minX || point.x > obstacle.maxX || point.y < obstacle.minY || point.y > obstacle.maxY) {
      continue;
    }
    if (distanceToShapes(point, obstacle.shapes) >= clearance) continue;
    return true;
  }
  return false;
}

/** One open cell just outside the heartfire, close to this compass angle. */
function heartGateCell(grid: Grid, angle: number, used: ReadonlySet<number>): number | null {
  let best: number | null = null;
  let bestScore = Infinity;
  const reach = grid.heartRadius + CELL * 8;
  const count = grid.width * grid.height;
  for (let index = 0; index < count; index++) {
    if (grid.blocked[index] || used.has(index)) continue;
    const point = cellPoint(grid, index);
    const dx = point.x - MAP_CENTER;
    const dy = point.y - MAP_CENTER;
    const dist = Math.hypot(dx, dy);
    if (dist <= grid.heartRadius + 1 || dist > reach) continue;
    if (!radialLaneOpen(grid, point)) continue;
    const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle));
    const score = Math.abs(delta) * 400 + (dist - grid.heartRadius);
    if (score >= bestScore) continue;
    best = index;
    bestScore = score;
  }
  return best;
}

/** The straight run from this cell back to the heartfire rim stays on open ground. */
function radialLaneOpen(grid: Grid, point: Point): boolean {
  const dx = point.x - MAP_CENTER;
  const dy = point.y - MAP_CENTER;
  const dist = Math.hypot(dx, dy);
  const span = dist - grid.heartRadius;
  if (span <= CELL) return true;
  const steps = Math.ceil(span / (CELL / 2));
  for (let step = 1; step < steps; step++) {
    const radius = grid.heartRadius + span * (step / steps);
    const at = {
      x: MAP_CENTER + (dx / dist) * radius,
      y: MAP_CENTER + (dy / dist) * radius,
    };
    const gx = Math.round((at.x - grid.originX) / grid.cell - 0.5);
    const gy = Math.round((at.y - grid.originY) / grid.cell - 0.5);
    if (gx < 0 || gy < 0 || gx >= grid.width || gy >= grid.height) return false;
    if (grid.blocked[gy * grid.width + gx]) return false;
  }
  return true;
}

function heartGateKeys(grid: Grid): number[] {
  const keys: number[] = [];
  const used = new Set<number>();
  for (let branch = 0; branch < HEART_BRANCHES; branch++) {
    const key = heartGateCell(grid, (branch * Math.PI * 2) / HEART_BRANCHES, used);
    if (key == null) continue;
    used.add(key);
    keys.push(key);
  }
  return keys;
}

/** Which heartfire trunk this point belongs to. */
function routeTree(grid: Grid): Int32Array {
  const count = grid.width * grid.height;
  const parent = new Int32Array(count);
  parent.fill(-2);
  const dist = new Float64Array(count);
  dist.fill(Infinity);
  const heap: Array<{ key: number; cost: number }> = [];
  for (const index of heartGateKeys(grid)) {
    dist[index] = 0;
    parent[index] = -1;
    heapPush(heap, { key: index, cost: 0 });
  }
  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ];
  while (heap.length > 0) {
    const current = heapPop(heap);
    if (current.cost !== dist[current.key]) continue;
    const gx = current.key % grid.width;
    const gy = Math.floor(current.key / grid.width);
    for (const [dx, dy, step] of dirs) {
      const nx = gx + dx;
      const ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
      const next = ny * grid.width + nx;
      if (grid.blocked[next]) continue;
      if (dx !== 0 && dy !== 0) {
        const sideA = gy * grid.width + nx;
        const sideB = ny * grid.width + gx;
        if (grid.blocked[sideA] || grid.blocked[sideB]) continue;
      }
      const cost = current.cost + step;
      if (cost >= dist[next]) continue;
      dist[next] = cost;
      parent[next] = current.key;
      heapPush(heap, { key: next, cost });
    }
  }
  return parent;
}

function traceEdges(
  grid: Grid,
  parent: Int32Array,
  targets: readonly PlacedSlot[],
  hutSize: number,
  blockers: readonly PlacedSlot[] = [],
): PathEdgeBase[] {
  // Monuments block the road the same way a hut does. They are not path targets.
  const occupied = [...targets, ...blockers];
  const users = new Map<number, string[]>();
  const entranceKey = new Map<string, number>();
  const exitRoute = new Map<string, Point[]>();
  for (const slot of targets) {
    const door = buildingDoor(slot, hutSize);
    if (!door) continue;
    if (Math.hypot(door.x - MAP_CENTER, door.y - MAP_CENTER) <= grid.heartRadius) continue;
    const shapes = slotShapes(slot, hutSize);
    let key = nearestApproach(grid, parent, door, shapes, 18);
    if (key == null) {
      const routed = doorRoute(grid, door, shapes, slot.id, parent);
      if (routed) {
        exitRoute.set(slot.id, routed.points);
        key = routed.key;
      }
    }
    if (key == null) continue;
    entranceKey.set(slot.id, key);
    let cursor = key;
    const seen = new Set<number>();
    while (cursor >= 0 && !seen.has(cursor)) {
      seen.add(cursor);
      const list = users.get(cursor);
      if (list) list.push(slot.id);
      else users.set(cursor, [slot.id]);
      const next = parent[cursor];
      if (next < 0) break;
      cursor = next;
    }
  }
  for (const list of users.values()) {
    list.sort();
  }

  const edges: PathEdgeBase[] = [];
  const emitted = new Set<string>();
  for (const slot of targets) {
    const key = entranceKey.get(slot.id);
    if (key == null) continue;
    walkBranch(grid, parent, users, key, emitted, edges);
  }

  for (const slot of targets) {
    const door = buildingDoor(slot, hutSize);
    const key = entranceKey.get(slot.id);
    if (!door || key == null) continue;
    const preset = exitRoute.get(slot.id);
    const shapes = slotShapes(slot, hutSize);
    const nearby = shapesNear(slot, occupied, hutSize);
    const leave = doorLeave(shapes, door, nearby);
    const pinned = innerSidePoint(slot.buildingId, slot, hutSize, slot.tier) != null;
    const at = pinned ? door : leave.at;
    const towardHeartX = MAP_CENTER - door.x;
    const towardHeartY = MAP_CENTER - door.y;
    const towardHeart = Math.hypot(towardHeartX, towardHeartY) || 1;
    const normal = pinned
      ? { x: towardHeartX / towardHeart, y: towardHeartY / towardHeart }
      : leave.normal;
    const routeNormal = pinned ? normal : nearestWallNormal(shapes, door);
    const exit = exitDoor(grid, door, routeNormal, shapes, slot.id);
    const spur = edges.find((edge) => edge.slotIds.length === 1 && edge.slotIds[0] === slot.id);
    const cell = cellPoint(grid, key);
    const linked =
      Math.hypot(exit.x - cell.x, exit.y - cell.y) > 0.75
        ? connectDoor(grid, exit, cell, slot.id, shapes)
        : [exit, cell];
    const routed =
      preset && preset.length >= 2
        ? dedupePoints([at, ...preset.slice(1)])
        : dedupePoints([at, ...(linked ?? [exit])]);
    const withDoor = routed;
    const baseLine =
      withDoor.length >= 2 ? withDoor : dedupePoints([at, ...(spur?.points ?? [])]);
    const others = edges.filter((edge) => edge !== spur);
    const road = spur ? roadBeyond(baseLine, spur.points) : baseLine;
    const join =
      road.length >= 2
        ? dropSpikes(rightAngleJoin(dropSpikes(road), normal, shapes, others, occupied, slot.id, hutSize))
        : road;
    if (spur) {
      const tail = spur.points.slice(1);
      const end = join[join.length - 1];
      const continues = end != null && tail.some((point) => Math.hypot(point.x - end.x, point.y - end.y) < 1);
      const merged = continues ? join : dedupePoints([...join, ...tail]);
      const everyone = shapesNear(slot, occupied, hutSize, Infinity);
      if (routeClearsOthers(merged, door, everyone) && pathClearsOwn(merged, door, shapes)) spur.points = merged;
      else if (routeClearsOthers(join, door, everyone) && pathClearsOwn(join, door, shapes)) spur.points = join;
      else {
        const start = spur.points[0];
        const taken = others.map((edge) => ({ points: edge.points }));
        if (start && Math.hypot(start.x - at.x, start.y - at.y) > 0.75) {
          const linked = dedupePoints([at, ...spur.points]);
          if (
            routeClearsOthers(linked, door, everyone) &&
            pathClearsOwn(linked, door, shapes) &&
            !polylinesCrossAny(linked, taken)
          ) {
            spur.points = linked;
          }
        }
      }
      continue;
    }
    if (join.length >= 2) {
      edges.push({ id: `${slot.id}#door`, slotIds: [slot.id], points: join });
    }
  }

  retractHeartTrunks(edges, grid.heartRadius);
  bundleParallelEdges(grid, edges);
  delayHeartSplits(grid, edges);
  gatherCloseSplits(grid, edges);
  spreadForks(grid, edges);
  separateCrowdedForks(grid, edges);
  liftShallowForks(grid, edges);
  leanSomeForksInward(grid, edges);
  bundleParallelSpans(grid, edges);
  collapseRejoins(grid, edges);
  edges.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return edges;
}

/**
 * Two tracks that run side by side for a long way. The lesser one joins the
 * other and only leaves it again out by its own door.
 */
const BUNDLE_GAP = 18;
const BUNDLE_RUN = 32;
/** Private approach left at the door, so the peel does not sit on the wall. */
const DOOR_KEEP = 10;

function bundleParallelEdges(grid: Grid, edges: PathEdgeBase[]): void {
  const rank = (edge: PathEdgeBase) => edge.slotIds.length * 100000 + polylineLength(edge.points);
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    const order = edges.slice().sort((a, b) => rank(a) - rank(b));
    for (const spur of order) {
      let best: { points: Point[]; run: number } | null = null;
      for (const host of edges) {
        if (host === spur || rank(host) <= rank(spur)) continue;
        const ridden = rideAlongside(grid, spur.points, host.points, edges, spur);
        if (!ridden || (best && ridden.run <= best.run)) continue;
        best = ridden;
      }
      if (!best) continue;
      spur.points = best.points;
      changed = true;
    }
    if (!changed) break;
  }
}

/** Heart-side of `spur` rides on `host`. The private approach is what is left. */
function rideAlongside(
  grid: Grid,
  spur: Point[],
  host: Point[],
  edges: readonly PathEdgeBase[],
  owner: PathEdgeBase,
): { points: Point[]; run: number } | null {
  if (spur.length < 2 || host.length < 2) return null;
  const endHit = projectOnto(spur[spur.length - 1], host);
  if (endHit.dist > BUNDLE_GAP) return null;

  let split = spur.length - 1;
  let run = 0;
  let skipped = 0;
  let headLen = polylineLength(spur);
  for (let index = spur.length - 1; index >= 1; index--) {
    const here = spur[index];
    const prev = spur[index - 1];
    const hit = projectOnto(here, host);
    const span = Math.hypot(here.x - prev.x, here.y - prev.y);
    if (headLen - span < DOOR_KEEP) break;
    if (span < 0.8) {
      headLen -= span;
      split = index - 1;
      continue;
    }
    const dir = unitVector(here.x - prev.x, here.y - prev.y);
    const hostDir = directionAt(host, hit.along);
    const parallel = Math.abs(dir.x * hostDir.x + dir.y * hostDir.y);
    if (hit.dist > BUNDLE_GAP) break;
    if (parallel < 0.82) {
      if (run > 0 || skipped > 14) break;
      skipped += span;
      headLen -= span;
      split = index - 1;
      continue;
    }
    headLen -= span;
    run += span;
    split = index - 1;
  }
  if (run < BUNDLE_RUN) return null;
  return acceptRide(grid, edges, owner, spur, host, split, run);
}

function acceptRide(
  grid: Grid,
  edges: readonly PathEdgeBase[],
  owner: PathEdgeBase,
  spur: Point[],
  host: Point[],
  split: number,
  run: number,
): { points: Point[]; run: number } | null {
  const head = spur.slice(0, split + 1);
  if (head.length === 0) return null;
  const blended = blendOntoHost(spur, host, split);
  if (!blended || reverses(blended) || hooksInOpening(blended)) return null;
  if (!blendOpen(grid, blended, polylineLength(head))) return null;
  const others = edges.filter((edge) => edge !== owner && edge.points !== host);
  if (polylinesCrossAny(blended, others.map((edge) => ({ points: edge.points })))) return null;
  return { points: blended, run };
}

/** Slide from the spur onto the host, and finish on the spur's own heart joint. */
function blendOntoHost(spur: Point[], host: Point[], split: number): Point[] | null {
  const joint = spur[spur.length - 1];
  const jointHit = projectOnto(joint, host);
  if (!joint || jointHit.dist > 2.5) return null;
  const out = spur.slice(0, split + 1);
  let walked = 0;
  let joined = false;
  for (let index = split + 1; index < spur.length; index++) {
    const prev = spur[index - 1];
    const here = spur[index];
    const span = Math.hypot(here.x - prev.x, here.y - prev.y);
    const steps = Math.max(1, Math.ceil(span / 6));
    for (let step = 1; step <= steps; step++) {
      const point = lerp(prev, here, step / steps);
      walked += span / steps;
      const blend = Math.min(28, Math.max(16, runLength(spur, split)));
      const t = Math.min(1, walked / blend);
      const hit = projectOnto(point, host);
      out.push(lerp(point, hit.at, t));
      if (t >= 1) {
        joined = true;
        break;
      }
    }
    if (joined) break;
  }
  if (!joined) return null;
  const end = out[out.length - 1];
  const door = spur[0];
  if (Math.hypot(end.x - door.x, end.y - door.y) + 1 < Math.hypot(spur[split].x - door.x, spur[split].y - door.y)) {
    return null;
  }
  const hit = projectOnto(end, host);
  const tail = slicePolyline(host, hit.along, jointHit.along);
  const points = dedupePoints([...out, ...tail.slice(1), joint]);
  if (reverses(points)) return null;
  return points;
}

function runLength(points: Point[], fromIndex: number): number {
  let length = 0;
  for (let index = fromIndex + 1; index < points.length; index++) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return length;
}

function hooksInOpening(points: Point[]): boolean {
  let walked = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const prev = points[index - 1];
    const corner = points[index];
    const next = points[index + 1];
    const ax = corner.x - prev.x;
    const ay = corner.y - prev.y;
    const bx = next.x - corner.x;
    const by = next.y - corner.y;
    const ar = Math.hypot(ax, ay);
    const br = Math.hypot(bx, by);
    walked += ar;
    if (walked > 90) break;
    if (ar < 0.8 || br < 0.8) continue;
    if ((ax * bx + ay * by) / (ar * br) < 0.15) return true;
  }
  return false;
}

/**
 * A shallow split can leave two tracks side by side long after they should
 * have joined. The heart-side pass never sees that, because it starts at the
 * fire and gives up when the roads have already fanned apart.
 * The lesser road stops where the shared stretch begins. The greater one
 * already draws the rest. The door stays put.
 */
const SPAN_GAP = 18;
const SPAN_ALIGN = 0.9;
const SPAN_RUN = 36;
const SPAN_BLEND = 16;
/** One grid kink may sit in an otherwise straight shared stretch. */
const SPAN_SKIP = 10;

/**
 * Two roads that share an end should not meet, split apart, and meet again.
 * That draws a loop. The lesser one stops at the first meeting. The greater
 * one already continues to the shared end.
 */
const REJOIN_CLOSE = 6;
const REJOIN_APART = 12;
const REJOIN_LENS = 70;

function collapseRejoins(grid: Grid, edges: PathEdgeBase[]): void {
  const rank = (edge: PathEdgeBase) => edge.slotIds.length * 100000 + polylineLength(edge.points);
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    const order = edges.slice().sort((a, b) => rank(a) - rank(b));
    for (const spur of order) {
      const spurEnd = spur.points[spur.points.length - 1];
      if (!spurEnd) continue;
      let best: { points: Point[]; run: number } | null = null;
      for (const host of edges) {
        if (host === spur || rank(host) <= rank(spur)) continue;
        const hostEnd = host.points[host.points.length - 1];
        if (!hostEnd || !samePoint(hostEnd, spurEnd)) continue;
        const cut = rejoinCut(grid, spur, host, edges);
        if (!cut || (best && cut.run <= best.run)) continue;
        best = cut;
      }
      if (!best) continue;
      spur.points = best.points;
      changed = true;
    }
    if (!changed) break;
  }
}

function rejoinCut(
  grid: Grid,
  spur: PathEdgeBase,
  host: PathEdgeBase,
  edges: readonly PathEdgeBase[],
): { points: Point[]; run: number } | null {
  const points = spur.points;
  const hostPoints = host.points;
  if (points.length < 2 || hostPoints.length < 2) return null;
  const total = polylineLength(points);
  if (total < DOOR_APPROACH + 24) return null;
  let walked = 0;
  let closeAt = -1;
  let apartAt = -1;
  for (let index = 1; index < points.length; index++) {
    const prev = points[index - 1];
    const here = points[index];
    const span = Math.hypot(here.x - prev.x, here.y - prev.y);
    if (span < 1e-6) continue;
    const steps = Math.max(1, Math.ceil(span / 4));
    for (let step = 1; step <= steps; step++) {
      const along = walked + (span * step) / steps;
      if (along < DOOR_APPROACH || total - along < 24) continue;
      const point = lerp(prev, here, step / steps);
      const hit = projectOnto(point, hostPoints);
      if (closeAt < 0) {
        if (hit.dist <= REJOIN_CLOSE) closeAt = along;
      } else if (apartAt < 0 && hit.dist >= REJOIN_APART) {
        apartAt = along;
        break;
      }
    }
    walked += span;
    if (apartAt >= 0) break;
  }
  if (closeAt < 0 || apartAt < 0 || total - apartAt > REJOIN_LENS) return null;
  const stitched = cutOnto(points, hostPoints, closeAt);
  if (!stitched || stitched.length < 2 || reverses(stitched) || hooksInOpening(stitched)) return null;
  if (!samePoint(stitched[0], points[0])) return null;
  if (!blendOpen(grid, stitched, closeAt)) return null;
  const others = edges.filter((edge) => edge !== spur && edge !== host);
  if (polylinesCrossAny(stitched, others.map((edge) => ({ points: edge.points })))) return null;
  return { points: stitched, run: apartAt - closeAt };
}

function bundleParallelSpans(grid: Grid, edges: PathEdgeBase[]): void {
  const rank = (edge: PathEdgeBase) => edge.slotIds.length * 100000 + polylineLength(edge.points);
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    const order = edges.slice().sort((a, b) => rank(a) - rank(b));
    for (const spur of order) {
      let best: { points: Point[]; run: number } | null = null;
      for (const host of edges) {
        if (host === spur || rank(host) <= rank(spur)) continue;
        const ridden = rideSpan(grid, spur, host, edges);
        if (!ridden || (best && ridden.run <= best.run)) continue;
        best = ridden;
      }
      if (!best) continue;
      spur.points = best.points;
      changed = true;
    }
    if (!changed) break;
  }
}

function rideSpan(
  grid: Grid,
  spur: PathEdgeBase,
  host: PathEdgeBase,
  edges: readonly PathEdgeBase[],
): { points: Point[]; run: number } | null {
  const points = spur.points;
  const hostPoints = host.points;
  if (points.length < 2 || hostPoints.length < 2) return null;
  const total = polylineLength(points);
  if (total < SPAN_RUN + DOOR_APPROACH || polylineLength(hostPoints) < SPAN_RUN) return null;
  if (!hostCarriesOn(points, hostPoints, grid.heartRadius)) return null;
  const spurEnd = points[points.length - 1];
  const hostEnd = hostPoints[hostPoints.length - 1];
  const bothHearts =
    spurEnd != null &&
    hostEnd != null &&
    Math.abs(Math.hypot(spurEnd.x - MAP_CENTER, spurEnd.y - MAP_CENTER) - grid.heartRadius) <= 1.5 &&
    Math.abs(Math.hypot(hostEnd.x - MAP_CENTER, hostEnd.y - MAP_CENTER) - grid.heartRadius) <= 1.5;

  let bestStart = 0;
  let bestEnd = 0;
  let bestRun = 0;
  let start = -1;
  let skipped = 0;
  let walked = 0;
  const finish = (along: number) => {
    const end = along - skipped;
    const run = start < 0 ? 0 : end - start;
    if (run > bestRun) {
      bestRun = run;
      bestStart = start;
      bestEnd = end;
    }
  };
  for (let index = 1; index < points.length; index++) {
    const prev = points[index - 1];
    const here = points[index];
    const span = Math.hypot(here.x - prev.x, here.y - prev.y);
    if (span < 1e-6) continue;
    const dir = unitVector(here.x - prev.x, here.y - prev.y);
    const steps = Math.max(1, Math.ceil(span / 4));
    for (let step = 1; step <= steps; step++) {
      const along = walked + (span * step) / steps;
      const point = lerp(prev, here, step / steps);
      if (along < DOOR_APPROACH) continue;
      const hit = projectOnto(point, hostPoints);
      const hostDir = directionAt(hostPoints, hit.along);
      const aligned = Math.abs(dir.x * hostDir.x + dir.y * hostDir.y) >= SPAN_ALIGN;
      const beside = hit.dist <= SPAN_GAP && hit.dist > 1.5 && aligned;
      if (beside) {
        if (start < 0) start = along;
        skipped = 0;
      } else if (start >= 0 && skipped + span / steps <= SPAN_SKIP) {
        skipped += span / steps;
      } else {
        finish(along);
        start = -1;
        skipped = 0;
      }
    }
    walked += span;
  }
  finish(walked);
  const tail = total - bestEnd;
  if (bestRun < SPAN_RUN || tail > (bothHearts ? 56 : SPAN_BLEND)) return null;
  const oldEnd = points[points.length - 1];
  const carried = edges.find(
    (edge) => edge !== spur && edge.points[0] != null && oldEnd != null && samePoint(edge.points[0], oldEnd),
  );
  if (
    carried &&
    carried !== host &&
    hostEnd != null &&
    !samePoint(hostEnd, oldEnd) &&
    projectOnto(oldEnd, hostPoints).dist > 4
  ) {
    return null;
  }
  const stitched = cutOnto(points, hostPoints, bestStart);
  if (!stitched || stitched.length < 2 || reverses(stitched) || hooksInOpening(stitched)) return null;
  if (!samePoint(stitched[0], points[0])) return null;
  const door = points[0];
  const tip = stitched[stitched.length - 1];
  const meet = pointAt(points, bestStart);
  if (!door || !tip || !meet) return null;
  if (Math.hypot(tip.x - door.x, tip.y - door.y) + 1 < Math.hypot(meet.x - door.x, meet.y - door.y)) return null;
  if (!blendOpen(grid, stitched, bestStart)) return null;
  const others = edges.filter((edge) => edge !== spur && edge !== host);
  if (polylinesCrossAny(stitched, others.map((edge) => ({ points: edge.points })))) return null;
  return { points: stitched, run: bestRun };
}

/** The host already reaches this road's far end, or both of them reach the heartfire. */
function hostCarriesOn(spur: Point[], host: Point[], heartRadius: number): boolean {
  const spurEnd = spur[spur.length - 1];
  const hostEnd = host[host.length - 1];
  if (!spurEnd || !hostEnd) return false;
  if (projectOnto(spurEnd, host).dist <= SPAN_GAP) return true;
  const spurHeart = Math.abs(Math.hypot(spurEnd.x - MAP_CENTER, spurEnd.y - MAP_CENTER) - heartRadius) <= 1.5;
  const hostHeart = Math.abs(Math.hypot(hostEnd.x - MAP_CENTER, hostEnd.y - MAP_CENTER) - heartRadius) <= 1.5;
  return spurHeart && hostHeart;
}

/**
 * Keep the private approach and end on the host where the shared stretch begins.
 * The host already draws the rest, so this road does not copy it.
 */
function cutOnto(spur: Point[], host: Point[], fromAlong: number): Point[] | null {
  const out = prefixTo(spur, fromAlong);
  const total = polylineLength(spur);
  const blendEnd = Math.min(total, fromAlong + SPAN_BLEND);
  let walked = 0;
  let joined: Point | null = null;
  for (let index = 1; index < spur.length; index++) {
    const prev = spur[index - 1];
    const here = spur[index];
    const span = Math.hypot(here.x - prev.x, here.y - prev.y);
    if (span < 1e-6) continue;
    const steps = Math.max(1, Math.ceil(span / 4));
    for (let step = 1; step <= steps; step++) {
      const along = walked + (span * step) / steps;
      if (along < fromAlong - 0.01) continue;
      if (along > blendEnd) break;
      const point = lerp(prev, here, step / steps);
      const hit = projectOnto(point, host);
      const mix = Math.max(0, Math.min(1, (along - fromAlong) / SPAN_BLEND));
      joined = lerp(point, hit.at, mix);
      out.push(joined);
    }
    walked += span;
    if (walked > blendEnd) break;
  }
  if (!joined) return null;
  const landed = projectOnto(joined, host);
  if (landed.dist > 1.25) return null;
  out.push(landed.at);
  return dedupePoints(out);
}

function blendOpen(grid: Grid, points: Point[], fromAlong: number): boolean {
  let walked = 0;
  for (let index = 1; index < points.length; index++) {
    const span = Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
    const steps = Math.max(1, Math.ceil(span / 2));
    for (let step = 1; step <= steps; step++) {
      const along = walked + (span * step) / steps;
      if (along < fromAlong) continue;
      const point = lerp(points[index - 1], points[index], step / steps);
      if (grid.approachTight(point, "")) return false;
    }
    walked += span;
  }
  return true;
}

export function projectOnto(point: Point, poly: Point[]): { dist: number; along: number; at: Point } {
  let best = Infinity;
  let along = 0;
  let at = poly[0];
  let walked = 0;
  for (let index = 1; index < poly.length; index++) {
    const start = poly[index - 1];
    const end = poly[index];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lenSq = dx * dx + dy * dy || 1;
    const span = Math.sqrt(dx * dx + dy * dy);
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lenSq));
    const x = start.x + dx * t;
    const y = start.y + dy * t;
    const dist = Math.hypot(point.x - x, point.y - y);
    if (dist < best) {
      best = dist;
      along = walked + span * t;
      at = { x, y };
    }
    walked += span;
  }
  return { dist: best, along, at };
}

export function directionAt(poly: Point[], along: number): Point {
  let walked = 0;
  for (let index = 1; index < poly.length; index++) {
    const start = poly[index - 1];
    const end = poly[index];
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    if (walked + span >= along || index === poly.length - 1) return unitVector(end.x - start.x, end.y - start.y);
    walked += span;
  }
  return { x: 1, y: 0 };
}

export function slicePolyline(points: Point[], fromAlong: number, toAlong: number): Point[] {
  const reverse = toAlong < fromAlong;
  const start = Math.min(fromAlong, toAlong);
  const end = Math.max(fromAlong, toAlong);
  const out: Point[] = [];
  const push = (point: Point) => {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(prev.x - point.x, prev.y - point.y) > 0.4) out.push(point);
  };
  let walked = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    if (span < 1e-6) continue;
    const segStart = walked;
    const segEnd = walked + span;
    if (segEnd >= start && segStart <= end) {
      if (segStart < start) push(lerp(from, to, (start - segStart) / span));
      else if (out.length === 0) push(from);
      if (segEnd > end) push(lerp(from, to, (end - segStart) / span));
      else push(to);
    }
    walked = segEnd;
  }
  return reverse ? out.reverse() : out;
}

/**
 * Roads leave the heartfire together, then some of them split further out.
 * The first split on a heartfire road waits until {@link HEART_SPLIT_CLEAR}.
 * Further along that same road, some branches wait longer still, so not every
 * building peels off as soon as the road has left the fire.
 */
function delayHeartSplits(grid: Grid, edges: PathEdgeBase[]): void {
  for (const trunk of edges) {
    if (!isHeartEnd(trunk, grid.heartRadius)) continue;
    let edge: PathEdgeBase | undefined = trunk;
    let along = 0;
    let first = true;
    const seen = new Set<string>();
    for (let guard = 0; guard < 8 && edge && !seen.has(edge.id); guard++) {
      seen.add(edge.id);
      along += polylineLength(edge.points);
      const junction = edge.points[0];
      if (!junction) break;
      const children = edgesEndingAt(edges, junction);
      if (children.length < 2) {
        edge = children[0];
        continue;
      }
      const delay = splitDelay(edge.id, along, first);
      const floor = first ? Math.max(0, HEART_SPLIT_CLEAR - along) : 0;
      first = false;
      const moved = delay > 1 ? pushSplitFurther(grid, edges, edge, junction, children, delay, floor) : 0;
      along += moved;
      edge = outwardContinuation(edge, children, junction);
    }
  }
}

function isHeartEnd(edge: PathEdgeBase, heartRadius: number): boolean {
  const end = edge.points[edge.points.length - 1];
  if (!end) return false;
  const gap = Math.hypot(end.x - MAP_CENTER, end.y - MAP_CENTER) - heartRadius;
  return Math.abs(gap) <= 1.5;
}

function edgesEndingAt(edges: readonly PathEdgeBase[], junction: Point): PathEdgeBase[] {
  return edges.filter((other) => {
    const end = other.points[other.points.length - 1];
    return end != null && samePoint(end, junction);
  });
}

export type RoadSplit = {
  junction: Point;
  /** The stretch from this junction toward the heartfire. */
  heartward: PathEdgeBase;
  /** Roads that leave here, other than the one that keeps going out. */
  sides: PathEdgeBase[];
  /** The road that keeps going out, when there is one. */
  onward: PathEdgeBase | undefined;
  /** Distance along the road from the previous split, or from the heartfire. */
  fromPrev: number;
};

/**
 * Three or more side roads leaving the same stretch should meet at one point.
 * Separate joins a short way apart read as a run of forks, not a crossing.
 */
function gatherCloseSplits(grid: Grid, edges: PathEdgeBase[]): void {
  for (let pass = 0; pass < 6; pass++) {
    const walked = new Set<PathEdgeBase>();
    const roots = edges.filter((edge) => {
      const end = edge.points[edge.points.length - 1];
      if (!end) return false;
      return !edges.some((other) => {
        const start = other.points[0];
        return other !== edge && start != null && samePoint(start, end);
      });
    });
    let merged = false;
    for (const root of roots) {
      if (gatherAlong(grid, edges, root, walked)) merged = true;
    }
    if (!merged) break;
  }
}

function gatherAlong(grid: Grid, edges: PathEdgeBase[], root: PathEdgeBase, walked: Set<PathEdgeBase>): boolean {
  if (walked.has(root) || !edges.includes(root)) return false;
  const splits = collectSplits(edges, root);
  for (const split of splits) walked.add(split.heartward);
  let merged = false;
  let start = 0;
  while (start < splits.length) {
    let end = start;
    let span = 0;
    while (end + 1 < splits.length && span + splits[end + 1].fromPrev <= INTERSECTION_REACH) {
      end += 1;
      span += splits[end].fromPrev;
    }
    const cluster = splits.slice(start, end + 1);
    const sides = cluster.reduce((count, split) => count + split.sides.length, 0);
    if (end > start && sides >= 3 && mergeSplitCluster(grid, edges, cluster)) {
      merged = true;
      start = end + 1;
      continue;
    }
    start += 1;
  }
  for (const split of splits) {
    if (!edges.includes(split.heartward)) continue;
    for (const side of split.sides) {
      if (gatherAlong(grid, edges, side, walked)) merged = true;
    }
  }
  return merged;
}

function collectSplits(edges: readonly PathEdgeBase[], root: PathEdgeBase): RoadSplit[] {
  const splits: RoadSplit[] = [];
  let edge: PathEdgeBase | undefined = root;
  let fromPrev = 0;
  const seen = new Set<PathEdgeBase>();
  while (edge && !seen.has(edge)) {
    seen.add(edge);
    fromPrev += polylineLength(edge.points);
    const junction = edge.points[0];
    if (!junction) break;
    const children = edgesEndingAt(edges, junction).filter((child) => child !== edge);
    if (children.length < 2) {
      edge = children[0];
      continue;
    }
    const onward = outwardContinuation(edge, children, junction);
    const sides = children.filter((child) => child !== onward);
    if (sides.length === 0) {
      edge = onward ?? children[0];
      continue;
    }
    splits.push({ junction, heartward: edge, sides, onward, fromPrev });
    fromPrev = 0;
    edge = onward;
  }
  return splits;
}

export {
  pathMeetsCircle,
  softenCenterline,
} from "@/pages/village-map-demo/pathwayDraw";
