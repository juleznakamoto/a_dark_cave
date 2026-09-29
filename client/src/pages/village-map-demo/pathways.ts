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

/**
 * Gravel tracks from each building's door to the heartfire.
 * Routes share a shortest-path tree, so they join instead of crossing.
 * Nothing leads to the pale cross, monolith, or pillar. They only block the way.
 */

/** Drawn half-width. Stones and joins use this. Full width is twice it. */
const PATH_HALF = 3.9;
/** Narrowest and widest half the edge wave reaches. */
const PATH_HALF_SWING: readonly [number, number] = [2.75, 4];
/** Side-to-side bend of one edge, on top of the wave. */
const PATH_JITTER = 0.6;
/** Furthest a drawn edge sits from the centerline. */
export const PATH_RIBBON_REACH = PATH_HALF_SWING[1] + PATH_JITTER;
/** Centerline stays this far from a building, so a gap remains after the wobble. */
const ROUTE_PAD = 4.6;
/** Open ground between the track's edge and a building. */
export const PATH_GAP = 8;
/** How far the centerline stays from a building. Wobble stays inside the gap. */
const PATH_CLEARANCE = PATH_GAP + ROUTE_PAD * 1.22;
/** Fully clear this close to a door or the heartfire. */
export const PATH_DOOR_CLEAR = 2;
/** Fully solid this far from a door or the heartfire. The fade runs from here in to the clear distance. */
export const PATH_DOOR_FADE = 8;
/** Straight run out from a door, perpendicular to the wall, before the path may turn. */
const DOOR_APPROACH = 18;
/**
 * How far the path stays on that straight run when there is room.
 * The turn toward the road happens out here, not against the wall.
 */
const GENTLE_RUNS = [52, 40, 32, 24, 16];
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
const CELL = 6;
const NO_PATH = new Set([
  "heartfire",
  "paleCross",
  "blackMonolith",
  "pillarOfClarity",
]);

type Shape =
  | { kind: "circle"; c: Point; r: number }
  | { kind: "poly"; points: Point[] };

type ShapeBox = { minX: number; minY: number; maxX: number; maxY: number };

/** Shapes for the current field build. Cleared at the start of each build. */
const shapeCache = new Map<string, Shape[]>();
const shapeBoxes = new WeakMap<Shape[], ShapeBox>();

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

function slotShapes(slot: PlacedSlot, hutSize: number): Shape[] {
  const hit = shapeCache.get(slot.id);
  if (hit) return hit;
  const shapes = buildingShapes(slot.buildingId, slot, hutSize, slot.tier) as Shape[];
  shapeBox(shapes);
  shapeCache.set(slot.id, shapes);
  return shapes;
}

/** True when the point is farther than `gap` from every point in the box. */
function beyondShapeBox(point: Point, shapes: Shape[], gap: number): boolean {
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

type Grid = {
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
    const drawn = softenCenterline(ribbons.get(edge.id) ?? edge.points, seed);
    return {
      id: edge.id,
      slotIds: edge.slotIds,
      points: edge.points,
      ribbon: ribbonPath(drawn, seed),
      stones: stonesAlong(drawn, seed),
      handle,
      doorFade: doorFade(edge.slotIds, edge.points),
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
function continuation(points: readonly Point[], distance: number): Point[] {
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
  if (inner) return nudgeToward(inner, heart, 1.5);
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
  return nudgeToward(best, heart, 1.5);
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

function projectOnto(point: Point, poly: Point[]): { dist: number; along: number; at: Point } {
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

function directionAt(poly: Point[], along: number): Point {
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

function slicePolyline(points: Point[], fromAlong: number, toAlong: number): Point[] {
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

type RoadSplit = {
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

function middleSplit(cluster: readonly RoadSplit[]): number {
  let total = 0;
  for (let index = 1; index < cluster.length; index++) total += cluster[index].fromPrev;
  const mid = total / 2;
  let along = 0;
  let best = 0;
  let bestDist = Infinity;
  for (let index = 0; index < cluster.length; index++) {
    if (index > 0) along += cluster[index].fromPrev;
    const dist = Math.abs(along - mid);
    if (dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  }
  return best;
}

/** The existing road from `from` to the meeting split, so a branch can leave that line. */
function roadToMeet(cluster: readonly RoadSplit[], from: number, meetIndex: number): Point[] {
  if (from === meetIndex) return [cluster[from].junction];
  const heartward: Point[] = [];
  const upper = Math.max(from, meetIndex);
  const lower = Math.min(from, meetIndex);
  for (let index = upper; index > lower; index--) {
    const part = cluster[index].heartward.points;
    heartward.push(...(heartward.length === 0 ? part : part.slice(1)));
  }
  if (from > meetIndex) return heartward;
  return [...heartward].reverse();
}

function stitchToMeet(cluster: readonly RoadSplit[], meetIndex: number): Point[] {
  const points: Point[] = [];
  for (let index = meetIndex; index >= 0; index--) {
    const part = cluster[index].heartward.points;
    points.push(...(points.length === 0 ? part : part.slice(1)));
  }
  return dedupePoints(points);
}

/**
 * Keep the door approach, and stop where it is still clear of the shared road,
 * so a short spur can turn toward the crossing without landing on the road early.
 */
function tipClearOfRoad(points: Point[], road: Point[], clear: number): Point[] | null {
  const start = points[0];
  if (!start || projectOnto(start, road).dist < clear) return null;
  const kept: Point[] = [start];
  for (let index = 1; index < points.length; index++) {
    const prev = points[index - 1];
    const point = points[index];
    if (!prev || !point) break;
    const dist = projectOnto(point, road).dist;
    if (dist >= clear) {
      kept.push(point);
      continue;
    }
    const prevDist = projectOnto(prev, road).dist;
    const span = prevDist - dist;
    const t = span < 0.01 ? 0 : (prevDist - clear) / span;
    const cut = { x: prev.x + (point.x - prev.x) * t, y: prev.y + (point.y - prev.y) * t };
    if (Math.hypot(cut.x - prev.x, cut.y - prev.y) > 0.8) kept.push(cut);
    break;
  }
  return kept.length >= 1 ? kept : null;
}

/**
 * Drop the old join and aim the branch at the shared point.
 * Points that were already riding the road are left off, so the branch does not
 * draw a second copy of that stretch.
 */
function pointBranchAt(points: Point[], meet: Point, road: Point[]): Point[] | null {
  const body = points.slice();
  if (body.length >= 2) body.pop();
  while (body.length >= 2) {
    const end = body[body.length - 1];
    if (!end || projectOnto(end, road).dist > 8) break;
    body.pop();
  }
  let approach = body;
  if (polylineLength(approach) < 8) {
    const lifted = tipClearOfRoad(points.slice(0, -1), road, 10);
    if (!lifted) return null;
    approach = lifted;
  }
  if (approach.length < 1 || reverses(approach)) return null;
  const next = dedupePoints([...approach, meet]);
  if (next.length < 2) return null;
  const end = next[next.length - 2];
  const prev = next.length >= 3 ? next[next.length - 3] : undefined;
  if (end && prev) {
    const ax = end.x - prev.x;
    const ay = end.y - prev.y;
    const bx = meet.x - end.x;
    const by = meet.y - end.y;
    const ar = Math.hypot(ax, ay);
    const br = Math.hypot(bx, by);
    // The last bend may turn past a right angle to reach the shared crossing.
    if (ar > 0.8 && br > 0.8 && (ax * bx + ay * by) / (ar * br) < -0.45) return null;
  }
  if (end && Math.hypot(meet.x - end.x, meet.y - end.y) > INTERSECTION_REACH + 14) return null;
  return next;
}

/** Bow the last step around a building so the branch can still reach the crossing. */
function openLastLeg(grid: Grid, points: Point[], road: Point[], ignoreId: string): Point[] | null {
  const meet = points[points.length - 1];
  const from = points[points.length - 2];
  if (!meet || !from) return null;
  const dx = meet.x - from.x;
  const dy = meet.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const roadAt = projectOnto(from, road).at;
  const away = (from.x - roadAt.x) * px + (from.y - roadAt.y) * py;
  const sides = away >= 0 ? [1, -1] : [-1, 1];
  for (const side of sides) {
    for (const bulge of [16, 28, 42]) {
      const mid = {
        x: (from.x + meet.x) / 2 + px * bulge * side,
        y: (from.y + meet.y) / 2 + py * bulge * side,
      };
      const next = dedupePoints([...points.slice(0, -1), mid, meet]);
      if (next.length < 3 || reverses(next.slice(0, -1))) continue;
      const end = next[next.length - 2];
      const prev = next[next.length - 3];
      if (!end || !prev) continue;
      const ax = end.x - prev.x;
      const ay = end.y - prev.y;
      const bx = meet.x - end.x;
      const by = meet.y - end.y;
      const ar = Math.hypot(ax, ay);
      const br = Math.hypot(bx, by);
      if (ar > 0.8 && br > 0.8 && (ax * bx + ay * by) / (ar * br) < -0.45) continue;
      if (!forkStretchOpen(grid, next.slice(-4), ignoreId)) continue;
      return next;
    }
  }
  return null;
}

function mergeSplitCluster(grid: Grid, edges: PathEdgeBase[], cluster: RoadSplit[]): boolean {
  const preferred = middleSplit(cluster);
  const order = [preferred, ...cluster.map((_, index) => index).filter((index) => index !== preferred)];
  for (const meetIndex of order) {
    if (mergeAt(grid, edges, cluster, meetIndex)) return true;
  }
  return false;
}

function mergeAt(grid: Grid, edges: PathEdgeBase[], cluster: RoadSplit[], meetIndex: number): boolean {
  const meet = cluster[meetIndex].junction;
  const proposals = new Map<PathEdgeBase, Point[]>();
  for (let index = 0; index < cluster.length; index++) {
    if (index === meetIndex) continue;
    const road = roadToMeet(cluster, index, meetIndex);
    for (const side of cluster[index].sides) {
      const ignoreId = side.slotIds.length === 1 ? side.slotIds[0] : "";
      let next = pointBranchAt(side.points, meet, road);
      if (next && !forkStretchOpen(grid, next.slice(-3), ignoreId)) next = openLastLeg(grid, next, road, ignoreId);
      if (!next || !forkStretchOpen(grid, next.slice(-3), ignoreId)) return false;
      proposals.set(side, next);
    }
  }
  const last = cluster.length - 1;
  const onward = cluster[last].onward;
  if (last > meetIndex && onward) {
    const approach = roadToMeet(cluster, last, meetIndex);
    const next = dedupePoints([...onward.points, ...approach.slice(1)]);
    if (next.length < 2 || reverses(next)) return false;
    proposals.set(onward, next);
  }
  const heartward = cluster[0].heartward;
  if (meetIndex > 0) {
    const stitched = stitchToMeet(cluster, meetIndex);
    if (stitched.length < 2 || reverses(stitched)) return false;
    proposals.set(heartward, stitched);
  }
  const removed = new Set(cluster.slice(1).map((split) => split.heartward));
  for (const [edge, points] of proposals) {
    const others = edges.filter((other) => other !== edge && !removed.has(other));
    const rest = others.map((other) => ({ points: proposals.get(other) ?? other.points }));
    if (polylinesCrossAny(points, rest)) return false;
  }
  for (const [edge, points] of proposals) edge.points = points;
  const covered = new Set<string>();
  for (const edge of edges) {
    if (removed.has(edge)) continue;
    for (const id of edge.slotIds) covered.add(id);
  }
  for (const edge of removed) {
    for (const id of edge.slotIds) {
      if (!covered.has(id)) {
        heartward.slotIds.push(id);
        covered.add(id);
      }
    }
    const index = edges.indexOf(edge);
    if (index >= 0) edges.splice(index, 1);
  }
  return true;
}

/** How much further this split should sit, measured along the road from the heartfire. */
function splitDelay(id: string, along: number, first: boolean): number {
  const roll = mixSeed(`${id}:later`);
  let target = along;
  if (first) target = Math.max(target, HEART_SPLIT_CLEAR);
  // About half the branches that are still on the way out from the center leave later.
  if (along < 200 && roll % 2 === 0) target = Math.max(target, along + 22 + (roll % 16));
  return target - along;
}

function continuationForShift(
  parent: PathEdgeBase,
  children: readonly PathEdgeBase[],
  junction: Point,
  needed: number,
): PathEdgeBase | undefined {
  const outwardFrom = parent.points[1];
  if (!outwardFrom) return children[0];
  const outward = unitVector(junction.x - outwardFrom.x, junction.y - outwardFrom.y);
  const ranked: Array<{ child: PathEdgeBase; dot: number; spare: number }> = [];
  for (const child of children) {
    const prev = child.points[child.points.length - 2];
    if (!prev) continue;
    const dir = unitVector(prev.x - junction.x, prev.y - junction.y);
    const dot = outward.x * dir.x + outward.y * dir.y;
    if (dot < 0.05) continue;
    const keep = child.slotIds.length === 1 ? 22 : 12;
    ranked.push({ child, dot, spare: polylineLength(child.points) - keep });
  }
  if (ranked.length === 0) return outwardContinuation(parent, children, junction);
  const aligned = outwardContinuation(parent, children, junction);
  const alignedSpare = ranked.find((item) => item.child === aligned)?.spare ?? -1;
  if (aligned && (needed < 1 || alignedSpare >= needed - 0.5)) return aligned;
  const pool = ranked.slice().sort((a, b) => b.spare - a.spare || b.dot - a.dot);
  return pool[0].child;
}

function outwardContinuation(
  parent: PathEdgeBase,
  children: readonly PathEdgeBase[],
  junction: Point,
): PathEdgeBase | undefined {
  const outwardFrom = parent.points[1];
  if (!outwardFrom) return children[0];
  const outward = unitVector(junction.x - outwardFrom.x, junction.y - outwardFrom.y);
  let best = children[0];
  let score = -2;
  for (const child of children) {
    const prev = child.points[child.points.length - 2];
    if (!prev) continue;
    const dir = unitVector(prev.x - junction.x, prev.y - junction.y);
    const dot = outward.x * dir.x + outward.y * dir.y;
    if (dot > score) {
      score = dot;
      best = child;
    }
  }
  return best;
}

function pushSplitFurther(
  grid: Grid,
  edges: PathEdgeBase[],
  parent: PathEdgeBase,
  junction: Point,
  children: readonly PathEdgeBase[],
  extra: number,
  floor: number,
): number {
  const continuation = continuationForShift(parent, children, junction, floor);
  if (!continuation || children.length < 2) return 0;
  const keep = continuation.slotIds.length === 1 ? 22 : 12;
  const room = polylineLength(continuation.points) - keep;
  const aligned = outwardContinuation(parent, children, junction);
  const cap = continuation === aligned ? extra : Math.max(floor, 0);
  let shift = Math.min(cap, Math.max(0, room));
  while (shift >= 1) {
    if (applySplitShift(grid, edges, parent, children, continuation, shift, true)) return shift;
    if (applySplitShift(grid, edges, parent, children, continuation, shift, false)) return shift;
    shift -= 2;
  }
  return 0;
}

/** Keep the part of a branch that is still outside the new split, so the join runs inward. */
function trimSideOutsideKnee(points: Point[], knee: Point, doorKeep: number): Point[] {
  const kneeRadius = Math.hypot(knee.x - MAP_CENTER, knee.y - MAP_CENTER);
  const target = kneeRadius + 2;
  let walked = 0;
  for (let index = 1; index < points.length; index++) {
    const prev = points[index - 1];
    const point = points[index];
    if (!prev || !point) break;
    const step = Math.hypot(point.x - prev.x, point.y - prev.y);
    const prevRadius = Math.hypot(prev.x - MAP_CENTER, prev.y - MAP_CENTER);
    const pointRadius = Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER);
    if (prevRadius >= target && pointRadius < target && step > 0.01) {
      const span = prevRadius - pointRadius;
      const t = span < 0.01 ? 0 : (prevRadius - target) / span;
      const along = walked + step * t;
      if (along < doorKeep) {
        const atDoor = slicePolyline(points, 0, Math.min(doorKeep, polylineLength(points) - 1));
        const end = atDoor[atDoor.length - 1];
        if (end && Math.hypot(end.x - MAP_CENTER, end.y - MAP_CENTER) >= kneeRadius + 0.5) return atDoor;
        break;
      }
      const cut = { x: prev.x + (point.x - prev.x) * t, y: prev.y + (point.y - prev.y) * t };
      return [...points.slice(0, index), cut];
    }
    walked += step;
  }
  return points.slice(0, -1);
}

/**
 * How gently the branch is already heading into the new split.
 * A low value means the join would kink, and the two roads would close into a loop.
 */
function approachDot(body: Point[], knee: Point, source: Point[]): number | null {
  const end = body[body.length - 1];
  if (!end) return null;
  let prev = body.length >= 2 ? body[body.length - 2] : undefined;
  if (!prev) {
    for (let index = 1; index < source.length; index++) {
      const point = source[index];
      if (point && samePoint(point, end)) {
        prev = source[index - 1];
        break;
      }
    }
  }
  if (!prev) return null;
  const ax = end.x - prev.x;
  const ay = end.y - prev.y;
  const bx = knee.x - end.x;
  const by = knee.y - end.y;
  const ar = Math.hypot(ax, ay);
  const br = Math.hypot(bx, by);
  if (ar < 0.8 || br < 0.8) return null;
  return (ax * bx + ay * by) / (ar * br);
}

/**
 * The side road climbs off its line to touch the split, and the road toward
 * the heartfire drops straight back. That bump draws as a loop.
 */
function kneeIsSpike(side: Point[], parent: Point[]): boolean {
  const knee = parent[0];
  const before = side.length >= 2 ? side[side.length - 2] : undefined;
  if (!knee || !before) return false;
  let walked = 0;
  for (let index = 1; index < parent.length; index++) {
    const prev = parent[index - 1];
    const point = parent[index];
    if (!prev || !point) break;
    walked += Math.hypot(point.x - prev.x, point.y - prev.y);
    if (walked > 22) break;
    const span = Math.hypot(point.x - before.x, point.y - before.y);
    if (span < 4 || span > 22) continue;
    const off =
      Math.abs((knee.x - before.x) * (point.y - before.y) - (knee.y - before.y) * (point.x - before.x)) / span;
    if (off >= 6) return true;
  }
  return false;
}

/** Drop the tail of a branch when it has run past the new split and would have to hook back. */
function aimIntoKnee(body: Point[], knee: Point): Point[] {
  const points = body.slice();
  while (points.length >= 3) {
    const end = points[points.length - 1];
    const prev = points[points.length - 2];
    if (!end || !prev) break;
    const ax = end.x - prev.x;
    const ay = end.y - prev.y;
    const bx = knee.x - end.x;
    const by = knee.y - end.y;
    const ar = Math.hypot(ax, ay);
    const br = Math.hypot(bx, by);
    if (ar < 0.8 || br < 0.8) break;
    if ((ax * bx + ay * by) / (ar * br) >= 0.75) break;
    points.pop();
  }
  return points;
}

function applySplitShift(
  grid: Grid,
  edges: readonly PathEdgeBase[],
  parent: PathEdgeBase,
  children: readonly PathEdgeBase[],
  continuation: PathEdgeBase,
  shift: number,
  strict: boolean,
): boolean {
  const total = polylineLength(continuation.points);
  const cutAt = total - shift;
  if (cutAt < 4) return false;
  const bridge = slicePolyline(continuation.points, cutAt, total);
  const kept = slicePolyline(continuation.points, 0, cutAt);
  const knee = bridge[0];
  if (!knee || bridge.length < 2 || kept.length < 2) return false;
  const nextParent = dedupePoints([...bridge, ...parent.points.slice(1)]);
  if (nextParent.length < 2 || reverses(nextParent)) return false;
  const before = kept[kept.length - 2];
  const outward = before ? unitVector(before.x - knee.x, before.y - knee.y) : { x: 0, y: 1 };
  const sides: Array<{ edge: PathEdgeBase; points: Point[] }> = [];
  let sideIndex = 0;
  for (const child of children) {
    if (child === continuation) continue;
    const doorKeep = child.slotIds.length === 1 ? 22 : 8;
    const trimmed = trimSideOutsideKnee(child.points, knee, doorKeep);
    const body = aimIntoKnee(trimmed, knee);
    if (body.length === 0) return false;
    const sign = sideIndex % 2 === 0 ? 1 : -1;
    sideIndex += 1;
    let next: Point[] | null = null;
    const straight = dedupePoints([...body, knee]);
    const straightArrived = forkArrivalSigned(straight, knee, outward);
    const meeting = approachDot(body, knee, child.points);
    if (
      straight.length >= 2 &&
      !reverses(straight) &&
      (meeting == null || meeting >= 0.75) &&
      straightArrived != null &&
      Math.abs(straightArrived) >= FORK_MIN - 0.08 &&
      Math.abs(straightArrived) <= FORK_MAX + 0.1 &&
      !(child.slotIds.length === 1 && bendsBack(straight, 90)) &&
      forkStretchOpen(grid, straight.slice(-3))
    ) {
      next = straight;
    }
    if (!next && strict) {
      const dir = rotateVector(outward, sign * FORK_NEUTRAL);
      const approach = { x: knee.x + dir.x * 11, y: knee.y + dir.y * 11 };
      for (let drop = 0; drop < 5 && body.length - drop >= 1; drop++) {
        const keptBody = body.slice(0, body.length - drop);
        const from = keptBody[keptBody.length - 1];
        if (!from) continue;
        const candidate = dedupePoints([...keptBody, approach, knee]);
        if (candidate.length < 3 || reverses(candidate)) continue;
        // A body already heading the same way as the road would meet it
        // through a square jog. Leave that one to the straight join.
        const far = keptBody[Math.max(0, keptBody.length - 3)];
        if (far) {
          const away = unitVector(far.x - knee.x, far.y - knee.y);
          if (away.x * outward.x + away.y * outward.y > 0.4) continue;
        }
        if (child.slotIds.length === 1 && bendsBack(candidate, 90)) continue;
        if (!forkStretchOpen(grid, [from, approach, knee])) continue;
        const arrived = forkArrivalSigned(candidate, knee, outward);
        if (arrived == null || Math.abs(arrived) < FORK_MIN - 0.08 || Math.abs(arrived) > FORK_MAX + 0.1) continue;
        next = candidate;
        break;
      }
    }
    if (!next) {
      if (strict) return false;
      const straight = dedupePoints([...body, knee]);
      const meeting = approachDot(body, knee, child.points);
      if (straight.length < 2 || reverses(straight)) return false;
      if (meeting != null && meeting < 0.75) return false;
      if (child.slotIds.length === 1 && bendsBack(straight, 90)) return false;
      if (!forkStretchOpen(grid, straight.slice(-3))) return false;
      next = straight;
    }
    sides.push({ edge: child, points: next });
  }
  const moving = new Set<PathEdgeBase>([parent, continuation, ...sides.map((side) => side.edge)]);
  const others = edges.filter((edge) => !moving.has(edge));
  if (polylinesCrossAny(nextParent, others)) return false;
  if (polylinesCrossAny(kept, [...others, { points: nextParent }])) return false;
  for (const side of sides) {
    if (kneeIsSpike(side.points, nextParent)) return false;
    const rest = sides.filter((other) => other !== side).map((other) => ({ points: other.points }));
    if (polylinesCrossAny(side.points, [...others, { points: nextParent }, { points: kept }, ...rest])) return false;
  }
  parent.points = nextParent;
  continuation.points = kept;
  for (const side of sides) side.edge.points = side.points;
  return true;
}

/**
 * Pull every drawn track back to the heartfire rim.
 * The cut stays on the existing line, so a road does not swing into a building.
 */
function retractHeartTrunks(edges: PathEdgeBase[], heartRadius: number): void {
  const stop = heartRadius;
  let pending = edges.filter((edge) => edge.points.some((point) => Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER) < stop - 0.01));
  const seen = new Set<PathEdgeBase>();
  while (pending.length > 0) {
    const edge = pending.pop();
    if (!edge || seen.has(edge) || !edges.includes(edge)) continue;
    seen.add(edge);
    const trimmed = trimAtHeart(edge.points, stop);
    if (trimmed.length >= 2) {
      edge.points = trimmed;
      continue;
    }
    const joint = edge.points[0];
    const index = edges.indexOf(edge);
    if (index >= 0) edges.splice(index, 1);
    if (!joint) continue;
    const incoming = edges.filter((other) => samePoint(other.points[other.points.length - 1], joint));
    pending.push(...incoming);
  }
}

/** Perpendicular to the road that comes from the heartfire. */
const FORK_NEUTRAL = Math.PI / 2;
/** 60° either side of that. 30° still comes from the heartfire. 150° comes back from the other side. */
const FORK_MIN = Math.PI / 6;
const FORK_MAX = (Math.PI * 5) / 6;

/**
 * Runs after parallel roads have been bundled, so the fan is the final shape.
 * A branch off a road from the heartfire used to be the next grid diagonal,
 * and every split at a junction hooked the same way.
 * Most now land near a right angle, from 30° to 150°, and siblings take opposite sides.
 * The junction itself stays put.
 */
function spreadForks(grid: Grid, edges: PathEdgeBase[]): void {
  const pending = new Set(edges.map((edge) => edge.id));
  for (const child of edges) {
    const opened = openFork(grid, child, edges, pending);
    pending.delete(child.id);
    if (opened) child.points = opened;
  }
}

/**
 * Peaks at a right angle. Low values still leave toward the heartfire.
 * High values turn past vertical and come from the other side.
 */
function forkAim(rand: () => number): number {
  const towardMiddle = (rand() + rand()) / 2;
  return FORK_MIN + towardMiddle * (FORK_MAX - FORK_MIN);
}

function forkAngles(side: number, aim: number): number[] {
  const magnitudes = [
    aim,
    FORK_NEUTRAL,
    (Math.PI * 2) / 3,
    (Math.PI * 5) / 12,
    (Math.PI * 7) / 12,
    Math.PI / 3,
    FORK_MAX,
    FORK_MIN,
  ];
  const angles: number[] = [];
  for (const magnitude of magnitudes) {
    for (const flip of [1, -1]) {
      const theta = flip * side * magnitude;
      if (angles.some((kept) => Math.abs(kept - theta) < 0.04)) continue;
      angles.push(theta);
    }
  }
  return angles;
}

/** Branches off one junction take opposite sides, so the center does not all hook the same way. */
function forkSign(
  child: PathEdgeBase,
  edges: readonly PathEdgeBase[],
  junction: Point,
  outward: Point,
): number {
  const branches: PathEdgeBase[] = [];
  for (const other of edges) {
    const end = other.points[other.points.length - 1];
    const prev = other.points[other.points.length - 2];
    if (!end || !prev || !samePoint(end, junction)) continue;
    const heading = unitVector(prev.x - end.x, prev.y - end.y);
    if (vectorAngle(outward, heading) < 0.35) continue;
    branches.push(other);
  }
  branches.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const index = branches.findIndex((other) => other.id === child.id);
  if (branches.length >= 2 && index >= 0) return index % 2 === 0 ? 1 : -1;
  return mixSeed(child.id) % 2 === 0 ? 1 : -1;
}

/** True when a rewritten branch travels along another road instead of leaving it. */
function runsBeside(points: Point[], others: readonly { points: Point[] }[]): boolean {
  const end = points[points.length - 1];
  let run = 0;
  for (let index = 1; index < points.length; index++) {
    const prev = points[index - 1];
    const point = points[index];
    if (!prev || !point) break;
    const span = Math.hypot(point.x - prev.x, point.y - prev.y);
    if (span < 0.4) continue;
    if (end && Math.hypot(point.x - end.x, point.y - end.y) < 14) {
      run = 0;
      continue;
    }
    const dir = unitVector(point.x - prev.x, point.y - prev.y);
    let near = false;
    for (const other of others) {
      if (other.points.length < 2) continue;
      const hit = projectOnto(point, other.points);
      if (hit.dist > 12) continue;
      const host = directionAt(other.points, hit.along);
      if (Math.abs(dir.x * host.x + dir.y * host.y) > 0.82) near = true;
    }
    run = near ? run + span : 0;
    if (run >= 8) return true;
  }
  return false;
}

function openFork(
  grid: Grid,
  child: PathEdgeBase,
  edges: readonly PathEdgeBase[],
  pending: ReadonlySet<string>,
): Point[] | null {
  const points = child.points;
  if (points.length < 2) return null;
  const junction = points[points.length - 1];
  const before = points[points.length - 2];
  const parent = edges.find(
    (other) => other !== child && other.points.length >= 2 && samePoint(other.points[0], junction),
  );
  if (!parent) return null;
  const outward = unitVector(junction.x - parent.points[1].x, junction.y - parent.points[1].y);
  const branch = unitVector(before.x - junction.x, before.y - junction.y);
  const fork = vectorAngle(outward, branch);
  const diagonal = Math.PI / 4;
  if (fork < 0.35) return null;
  if (Math.abs(fork - diagonal) > 0.09) return null;
  const side = forkSign(child, edges, junction, outward);

  const doorSpur = child.slotIds.length === 1 && !child.id.endsWith("#door");
  const others = edges.filter((other) => {
    if (other === child) return false;
    const end = other.points[other.points.length - 1];
    return !(end && samePoint(end, junction) && pending.has(other.id));
  });
  const beside = edges.filter((other) => other !== child && other !== parent);
  const clear = (candidate: Point[] | null) => (candidate && !runsBeside(candidate, beside) ? candidate : null);
  const aim = forkAim(mulberry32(mixSeed(child.id)));
  const swing = () => clear(swingLastLeg(grid, points, junction, outward, side, aim, doorSpur, others));

  const total = polylineLength(points);
  const keep = doorSpur ? 22 : 6;
  if (total < keep + 8) return swing();
  const rejoin = Math.min(56, total - keep);
  if (rejoin < 14) return swing();
  const head = prefixTo(points, total - rejoin);
  const far = head[head.length - 1];
  const prior = head.length >= 2 ? head[head.length - 2] : null;
  if (!far || !prior || Math.hypot(far.x - prior.x, far.y - prior.y) < 1) return swing();
  const fromDir = unitVector(far.x - prior.x, far.y - prior.y);

  let wide: { points: Point[]; gap: number } | null = null;
  let closest: { points: Point[]; gap: number } | null = null;
  for (const scale of [1, 0.72, 0.5]) {
    for (const theta of forkAngles(side, aim)) {
      const dir = rotateVector(outward, theta);
      const curve = smoothTurn(far, fromDir, junction, { x: -dir.x, y: -dir.y }, 16, scale).slice(1);
      const candidate = dedupePoints([...head, ...curve]);
      const joined = dedupePoints([prior, far, ...curve]);
      if (candidate.length < 2 || reverses(joined)) continue;
      if (doorSpur && bendsBack(candidate, 70)) continue;
      const arrivedAngle = forkArrivalSigned(candidate, junction, outward);
      if (arrivedAngle == null) continue;
      const arrived = Math.abs(arrivedAngle);
      if (arrived < FORK_MIN - 0.08 || arrived > FORK_MAX + 0.1) continue;
      if (!forkStretchOpen(grid, candidate.slice(Math.max(0, head.length - 1)))) continue;
      if (polylinesCrossAny(candidate, others)) continue;
      if (runsBeside(candidate, beside)) continue;
      const gap = Math.abs(arrivedAngle - theta);
      if (arrived >= 1.25 && (!wide || gap < wide.gap)) wide = { points: candidate, gap };
      if (!closest || gap < closest.gap) closest = { points: candidate, gap };
    }
  }
  if (wide && wide.gap < 0.5) return wide.points;
  const swung = swing();
  if (swung) return swung;
  if (closest && closest.gap < 0.45) return closest.points;
  return clear(nudgeFork(grid, points, junction, outward, side, aim, keep, doorSpur, others));
}

/**
 * Some branches that still run outward get their last stretch turned past a right angle,
 * so they lean back toward the heartfire. The door end stays put.
 */
function leanSomeForksInward(grid: Grid, edges: PathEdgeBase[]): void {
  for (const child of edges) {
    const doorSpur = child.slotIds.length === 1 && !child.id.endsWith("#door");
    if (mixSeed(`${child.id}:inward`) % 2 !== 0) continue;
    const points = child.points;
    if (points.length < 3) continue;
    const junction = points[points.length - 1];
    const before = points[points.length - 2];
    if (!junction || !before) continue;
    const parent = edges.find(
      (other) => other !== child && other.points.length >= 2 && samePoint(other.points[0], junction),
    );
    if (!parent?.points[1]) continue;
    const outward = unitVector(junction.x - parent.points[1].x, junction.y - parent.points[1].y);
    const branch = unitVector(before.x - junction.x, before.y - junction.y);
    const fork = vectorAngle(outward, branch);
    if (fork < 0.55 || fork > FORK_NEUTRAL - 0.08) continue;
    const arrived = forkArrivalSigned(points, junction, outward);
    if (arrived == null || Math.abs(arrived) < 0.25) continue;
    const side = Math.sign(arrived) || 1;
    const others = edges.filter((other) => other !== child);
    const swung = swingLastLeg(
      grid,
      points,
      junction,
      outward,
      side,
      inwardAim(child.id),
      doorSpur,
      others,
      true,
    );
    if (
      swung &&
      !(doorSpur && openingHooks(swung, 90)) &&
      !(polylineLength(points) < 40 && worstTurn(swung) < 0.5) &&
      !runsBeside(
        swung,
        edges.filter((other) => other !== child && other !== parent),
      )
    ) {
      child.points = swung;
    }
  }
}

/** True when the leave from a door folds back inside the first stretch. */
function openingHooks(points: Point[], distance: number): boolean {
  let walked = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const prev = points[index - 1];
    const corner = points[index];
    const next = points[index + 1];
    if (!prev || !corner || !next) break;
    const ax = corner.x - prev.x;
    const ay = corner.y - prev.y;
    const bx = next.x - corner.x;
    const by = next.y - corner.y;
    const ar = Math.hypot(ax, ay);
    const br = Math.hypot(bx, by);
    walked += ar;
    if (walked > distance) break;
    if (ar < 0.8 || br < 0.8) continue;
    if ((ax * bx + ay * by) / (ar * br) < 0.15) return true;
  }
  return false;
}

/** Past a right angle, so the branch turns back toward the heartfire instead of running on outward. */
function inwardAim(id: string): number {
  const roll = mulberry32(mixSeed(`${id}:inward`))();
  const toward = (roll + mulberry32(mixSeed(`${id}:in2`))()) / 2;
  return FORK_NEUTRAL + 0.2 + toward * (FORK_MAX - FORK_NEUTRAL - 0.45);
}

function forkArrivalSigned(points: Point[], junction: Point, outward: Point): number | null {
  const beforeEnd = points[points.length - 2];
  if (!beforeEnd) return null;
  const arrived = unitVector(beforeEnd.x - junction.x, beforeEnd.y - junction.y);
  const dot = outward.x * arrived.x + outward.y * arrived.y;
  const cross = outward.x * arrived.y - outward.y * arrived.x;
  return Math.atan2(cross, dot);
}

/**
 * The new bend sits on a road this branch is not joining, then leaves it again.
 * That reads as a loop: the line touches one path, drops away, and comes back.
 */
function grazesOtherRoad(
  knee: Point,
  junction: Point,
  others: readonly { points: Point[] }[],
): boolean {
  for (const other of others) {
    if (other.points.length < 2) continue;
    if (projectOnto(knee, other.points).dist > 12) continue;
    if (projectOnto(junction, other.points).dist < 8) continue;
    return true;
  }
  return false;
}

/**
 * A short branch has no room for a curve. Turn the last stretch, far enough
 * that the new direction is visible, not just the final cell.
 * The junction stays put. The door stays put.
 */
function swingLastLeg(
  grid: Grid,
  points: Point[],
  junction: Point,
  outward: Point,
  side: number,
  aim: number,
  doorSpur: boolean,
  others: readonly PathEdgeBase[],
  inward = false,
): Point[] | null {
  if (points.length < 3) return null;
  let index = points.length - 2;
  let span = Math.hypot(points[index].x - junction.x, points[index].y - junction.y);
  while (index > 1 && span < 12) {
    index -= 1;
    span = Math.hypot(points[index].x - junction.x, points[index].y - junction.y);
  }
  const prior = points[index - 1];
  if (!prior || span < 8) return null;
  const reach = Math.min(span, inward ? 34 : 22);
  for (const minimum of inward ? [FORK_NEUTRAL] : [1.25, 0]) {
    for (const theta of forkAngles(side, aim)) {
      if (Math.abs(theta) < minimum) continue;
      const dir = rotateVector(outward, theta);
      const knee = { x: junction.x + dir.x * reach, y: junction.y + dir.y * reach };
      const intoOldX = points[index].x - prior.x;
      const intoOldY = points[index].y - prior.y;
      const intoNewX = knee.x - prior.x;
      const intoNewY = knee.y - prior.y;
      const oldRun = Math.hypot(intoOldX, intoOldY);
      const newRun = Math.hypot(intoNewX, intoNewY);
      if (oldRun < 1 || newRun < 1) continue;
      if ((intoOldX * intoNewX + intoOldY * intoNewY) / (oldRun * newRun) < (inward ? -0.25 : 0.15)) continue;
      const next = [...points.slice(0, index), knee, junction];
      if (reverses(next) && !(inward && worstTurn(next) > -0.45)) continue;
      if (doorSpur && bendsBack(next, 70)) continue;
      if (!forkStretchOpen(grid, [prior, knee, junction])) continue;
      if (polylinesCrossAny(next, others)) continue;
      const arrived = forkArrivalSigned(next, junction, outward);
      if (arrived == null || Math.abs(arrived) < FORK_MIN - 0.08 || Math.abs(arrived) > FORK_MAX + 0.1) continue;
      if (Math.abs(arrived) < minimum) continue;
      if (inward && Math.abs(arrived) < FORK_NEUTRAL + 0.12) continue;
      if (grazesOtherRoad(knee, junction, others)) continue;
      return next;
    }
  }
  return null;
}

/**
 * The grid step sits just under a diagonal, and every wider curve folded back.
 * A short last leg lifts that one fork without moving the junction.
 * The aim is tried first, then a right angle, then the old diagonal.
 */
function nudgeFork(
  grid: Grid,
  points: Point[],
  junction: Point,
  outward: Point,
  side: number,
  aim: number,
  keep: number,
  doorSpur: boolean,
  others: readonly PathEdgeBase[],
  inward = false,
): Point[] | null {
  const total = polylineLength(points);
  const back = Math.min(36, total - keep);
  if (back < 16) return null;
  const head = prefixTo(points, total - back);
  const far = head[head.length - 1];
  const prior = head.length >= 2 ? head[head.length - 2] : null;
  if (!far || !prior) return null;
  const fromDir = unitVector(far.x - prior.x, far.y - prior.y);
  for (const theta of forkAngles(side, aim)) {
    const dir = rotateVector(outward, theta);
    for (const step of [14, 22]) {
      const knee = { x: junction.x + dir.x * step, y: junction.y + dir.y * step };
      const chord = unitVector(knee.x - far.x, knee.y - far.y);
      if (fromDir.x * chord.x + fromDir.y * chord.y < 0.15) continue;
      const straight = dedupePoints([...head, knee, junction]);
      const straightJoined = dedupePoints([prior, far, knee, junction]);
      if (
        straight.length >= 3 &&
        !reverses(straightJoined) &&
        !(doorSpur && bendsBack(straight, 70)) &&
        forkStretchOpen(grid, straight.slice(Math.max(0, head.length - 1))) &&
        !polylinesCrossAny(straight, others)
      ) {
        const arrived = forkArrivalSigned(straight, junction, outward);
        if (
          arrived != null &&
          Math.abs(arrived) >= FORK_MIN - 0.08 &&
          Math.abs(arrived) <= FORK_MAX + 0.1 &&
          (!inward || Math.abs(arrived) >= FORK_NEUTRAL - 0.05)
        ) {
          return straight;
        }
      }
      const mid = smoothTurn(far, fromDir, knee, dir, 10).slice(1);
      const candidate = dedupePoints([...head, ...mid, junction]);
      const joined = dedupePoints([prior, far, ...mid, junction]);
      if (candidate.length < 3 || reverses(joined)) continue;
      if (doorSpur && bendsBack(candidate, 70)) continue;
      const arrived = forkArrivalSigned(candidate, junction, outward);
      if (arrived == null || Math.abs(arrived) < FORK_MIN - 0.08 || Math.abs(arrived) > FORK_MAX + 0.1) continue;
      if (inward && Math.abs(arrived) < FORK_NEUTRAL - 0.05) continue;
      if (!forkStretchOpen(grid, candidate.slice(Math.max(0, head.length - 1)))) continue;
      if (polylinesCrossAny(candidate, others)) continue;
      return candidate;
    }
  }
  return null;
}

/** A one-cell there-and-back spike from the grid. It reads as a hook beside the door. */
function dropSpikes(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const out: Point[] = [points[0]];
  for (let index = 1; index < points.length - 1; index++) {
    const prev = out[out.length - 1];
    const corner = points[index];
    const next = points[index + 1];
    const ax = corner.x - prev.x;
    const ay = corner.y - prev.y;
    const bx = next.x - corner.x;
    const by = next.y - corner.y;
    const ar = Math.hypot(ax, ay);
    const br = Math.hypot(bx, by);
    if (ar >= 0.8 && br >= 0.8 && br <= 12 && (ax * bx + ay * by) / (ar * br) < 0.2) continue;
    out.push(corner);
  }
  out.push(points[points.length - 1]);
  return dedupePoints(out);
}

/**
 * Near the heartfire, two branches sometimes leave on the same side of the road.
 * Bend the shortest one onto the other side. The junction stays put, and the bend
 * stays close to it so the branch does not cut across the next road out.
 */
function separateCrowdedForks(grid: Grid, edges: PathEdgeBase[]): void {
  const groups = new Map<string, PathEdgeBase[]>();
  for (const edge of edges) {
    const end = edge.points[edge.points.length - 1];
    if (!end || Math.hypot(end.x - MAP_CENTER, end.y - MAP_CENTER) > 60) continue;
    const key = `${Math.round(end.x)}:${Math.round(end.y)}`;
    const list = groups.get(key) ?? [];
    list.push(edge);
    groups.set(key, list);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const junction = group[0].points[group[0].points.length - 1];
    if (!junction) continue;
    const parent = edges.find(
      (other) => other.points[0] != null && samePoint(other.points[0], junction) && !group.includes(other),
    );
    if (!parent?.points[1]) continue;
    const outward = unitVector(junction.x - parent.points[1].x, junction.y - parent.points[1].y);
    const branches = group.flatMap((edge) => {
      const prev = edge.points[edge.points.length - 2];
      if (!prev) return [];
      const heading = unitVector(prev.x - junction.x, prev.y - junction.y);
      const angle = Math.atan2(
        outward.x * heading.y - outward.y * heading.x,
        outward.x * heading.x + outward.y * heading.y,
      );
      if (Math.abs(angle) < 0.4) return [];
      return [{ edge, angle }];
    });
    const positive = branches.filter((item) => item.angle > 0);
    const negative = branches.filter((item) => item.angle < 0);
    if ((positive.length > 0 && negative.length > 0) || branches.length < 2) continue;
    const pile = positive.length >= negative.length ? positive : negative;
    pile.sort((a, b) => a.edge.slotIds.length - b.edge.slotIds.length || (a.edge.id < b.edge.id ? -1 : 1));
    for (const flip of pile) {
      const side = flip.angle > 0 ? -1 : 1;
      const turned = turnBranchToSide(grid, flip.edge, edges, junction, outward, side);
      if (!turned) continue;
      flip.edge.points = turned;
      break;
    }
  }
}

/** Bend one branch onto `side` of the road. Only the last stretch moves, so the door stays put. */
function turnBranchToSide(
  grid: Grid,
  edge: PathEdgeBase,
  edges: readonly PathEdgeBase[],
  junction: Point,
  outward: Point,
  side: number,
): Point[] | null {
  const points = edge.points;
  if (points.length < 4) return null;
  const doorSpur = edge.slotIds.length === 1 && !edge.id.endsWith("#door");
  const dir = rotateVector(outward, side * FORK_NEUTRAL);
  const arrive = { x: -dir.x, y: -dir.y };
  const knee = { x: junction.x + dir.x * 12, y: junction.y + dir.y * 12 };
  const others = edges.filter((other) => other !== edge);
  let kept = 0;
  for (let index = 1; index < points.length - 2; index++) {
    kept += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
    if (doorSpur && kept < 22) continue;
    const from = points[index];
    const prior = points[index - 1];
    if (!from || !prior) continue;
    const span = Math.hypot(from.x - junction.x, from.y - junction.y);
    if (span < 16 || span > 34) continue;
    const fromDir = unitVector(from.x - prior.x, from.y - prior.y);
    for (const handle of [8, 12, 18]) {
      const curve = sampleCubic(
        from,
        { x: from.x + fromDir.x * handle, y: from.y + fromDir.y * handle },
        { x: knee.x - arrive.x * handle, y: knee.y - arrive.y * handle },
        knee,
        14,
      );
      const next = dedupePoints([...points.slice(0, index + 1), ...curve.slice(1), junction]);
      if (next.length < 3 || reverses(next)) continue;
      if (doorSpur && bendsBack(next, 70)) continue;
      if (!forkStretchOpen(grid, next.slice(Math.max(0, index - 1)))) continue;
      if (polylinesCrossAny(next, others)) continue;
      if (runsBeside(next, others)) continue;
      if (revisitsJunction(next, junction)) continue;
      if (tipFoldsBack(next)) continue;
      const arrived = forkArrivalSigned(next, junction, outward);
      if (arrived == null || Math.sign(arrived) !== side || Math.abs(arrived) < 1) continue;
      return next;
    }
  }
  const prev = points[points.length - 2];
  const joint = points[points.length - 1];
  if (!prev || !joint) return null;
  const seg = Math.hypot(joint.x - prev.x, joint.y - prev.y);
  if (seg < 18) return null;
  const back = Math.min(24, seg - 4);
  const from = {
    x: joint.x + ((prev.x - joint.x) * back) / seg,
    y: joint.y + ((prev.y - joint.y) * back) / seg,
  };
  const prior = points[points.length - 3] ?? prev;
  const fromDir = unitVector(from.x - prior.x, from.y - prior.y);
  const prefix = [...points.slice(0, -2), from];
  for (const handle of [8, 12, 18]) {
    const curve = sampleCubic(
      from,
      { x: from.x + fromDir.x * handle, y: from.y + fromDir.y * handle },
      { x: knee.x - arrive.x * handle, y: knee.y - arrive.y * handle },
      knee,
      14,
    );
    const next = dedupePoints([...prefix, ...curve.slice(1), junction]);
    if (next.length < 3 || reverses(next)) continue;
    if (doorSpur && bendsBack(next, 70)) continue;
    if (!forkStretchOpen(grid, next.slice(-6))) continue;
    if (polylinesCrossAny(next, others)) continue;
    if (runsBeside(next, others)) continue;
    if (revisitsJunction(next, junction)) continue;
    if (tipFoldsBack(next)) continue;
    const arrived = forkArrivalSigned(next, junction, outward);
    if (arrived == null || Math.sign(arrived) !== side || Math.abs(arrived) < 1) continue;
    return next;
  }
  return null;
}

/** The last stretch runs past the junction and comes back, so the road doubles on itself. */
function tipFoldsBack(points: Point[]): boolean {
  const end = points[points.length - 1];
  if (!end) return false;
  let walked = 0;
  let peak = 0;
  for (let index = points.length - 2; index >= 0; index--) {
    const point = points[index];
    const next = points[index + 1];
    if (!point || !next) break;
    walked += Math.hypot(next.x - point.x, next.y - point.y);
    if (walked > 36) break;
    const dist = Math.hypot(point.x - end.x, point.y - end.y);
    if (dist + 4 < peak) return true;
    if (dist > peak) peak = dist;
  }
  return false;
}
function revisitsJunction(points: Point[], junction: Point): boolean {
  for (let index = 0; index < points.length - 1; index++) {
    const point = points[index];
    if (point && Math.hypot(point.x - junction.x, point.y - junction.y) < 1.5) return true;
  }
  return false;
}

/**
 * A fork that stayed just under a diagonal after the heartfire trim.
 * Stand its last leg up to a right angle. The junction stays put.
 */
function liftShallowForks(grid: Grid, edges: PathEdgeBase[]): void {
  const diagonal = Math.PI / 4;
  for (const child of edges) {
    const points = child.points;
    if (points.length < 3) continue;
    const junction = points[points.length - 1];
    const before = points[points.length - 2];
    const prior = points[points.length - 3];
    if (!junction || !before || !prior) continue;
    const parent = edges.find(
      (other) => other !== child && other.points.length >= 2 && samePoint(other.points[0], junction),
    );
    if (!parent?.points[1]) continue;
    const outward = unitVector(junction.x - parent.points[1].x, junction.y - parent.points[1].y);
    const branch = unitVector(before.x - junction.x, before.y - junction.y);
    const fork = vectorAngle(outward, branch);
    if (fork < diagonal - 0.09 || fork >= diagonal - 0.02) continue;
    const side = forkSign(child, edges, junction, outward);
    if (side === 0) continue;
    const dir = rotateVector(outward, side * FORK_NEUTRAL);
    const span = Math.max(8, Math.hypot(before.x - junction.x, before.y - junction.y));
    const knee = { x: junction.x + dir.x * span, y: junction.y + dir.y * span };
    const intoOldX = before.x - prior.x;
    const intoOldY = before.y - prior.y;
    const intoNewX = knee.x - prior.x;
    const intoNewY = knee.y - prior.y;
    const oldRun = Math.hypot(intoOldX, intoOldY);
    const newRun = Math.hypot(intoNewX, intoNewY);
    if (oldRun < 1 || newRun < 1) continue;
    if ((intoOldX * intoNewX + intoOldY * intoNewY) / (oldRun * newRun) < 0.15) continue;
    const next = points.slice();
    next[next.length - 2] = knee;
    if (!forkStretchOpen(grid, [prior, knee, junction])) continue;
    if (polylinesCrossAny(next, edges.filter((other) => other !== child))) continue;
    child.points = next;
  }
}

function forkStretchOpen(grid: Grid, points: Point[], ignoreId = ""): boolean {
  for (const point of resample(points, 3)) {
    if (Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER) <= grid.heartRadius + 1.5) return false;
    if (grid.approachTight(point, ignoreId)) return false;
  }
  return true;
}

function prefixTo(points: Point[], distance: number): Point[] {
  if (points.length === 0) return [];
  const out: Point[] = [points[0]];
  let left = distance;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    if (span < 1e-6) continue;
    if (left <= span) {
      out.push(lerp(start, end, left / span));
      return out;
    }
    out.push(end);
    left -= span;
  }
  return out;
}

function unitVector(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function rotateVector(vector: Point, radians: number): Point {
  const turn = Math.cos(radians);
  const rise = Math.sin(radians);
  return { x: vector.x * turn - vector.y * rise, y: vector.x * rise + vector.y * turn };
}

function vectorAngle(a: Point, b: Point): number {
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y));
  return Math.acos(dot);
}

function walkBranch(
  grid: Grid,
  parent: Int32Array,
  users: Map<number, string[]>,
  startKey: number,
  emitted: Set<string>,
  edges: PathEdgeBase[],
) {
  let key = startKey;
  let ids = users.get(key);
  if (!ids) return;
  let setId = ids.join("+");
  if (emitted.has(setId)) return;
  let points: Point[] = [cellPoint(grid, key)];
  const seen = new Set<number>([key]);
  while (true) {
    const next = parent[key];
    if (next === -1) {
      const end = points[points.length - 1];
      const fromHeart = Math.hypot(end.x - MAP_CENTER, end.y - MAP_CENTER);
      if (fromHeart > grid.heartRadius + 0.5) {
        points.push({
          x: MAP_CENTER + ((end.x - MAP_CENTER) / fromHeart) * grid.heartRadius,
          y: MAP_CENTER + ((end.y - MAP_CENTER) / fromHeart) * grid.heartRadius,
        });
      }
      const trimmed = trimAtHeart(points, grid.heartRadius);
      if (trimmed.length >= 2) {
        emitted.add(setId);
        edges.push({ id: setId, slotIds: ids.slice(), points: trimmed });
      }
      return;
    }
    if (next < 0 || seen.has(next)) return;
    seen.add(next);
    const nextIds = users.get(next) ?? ids;
    const nextSet = nextIds.join("+");
    if (nextSet !== setId) {
      points.push(cellPoint(grid, next));
      const trimmed = trimAtHeart(points, grid.heartRadius);
      if (trimmed.length >= 2) {
        emitted.add(setId);
        edges.push({ id: setId, slotIds: ids.slice(), points: trimmed });
      }
      if (emitted.has(nextSet)) return;
      setId = nextSet;
      ids = nextIds;
      points = [cellPoint(grid, next)];
      key = next;
      continue;
    }
    points.push(cellPoint(grid, next));
    key = next;
  }
}

function resolveEdges(
  field: PathField,
  overrides: Record<string, Point>,
  skipId?: string,
): PathEdgeBase[] {
  const points = new Map<string, Point[]>(field.edges.map((edge) => [edge.id, edge.points]));
  if (field.grid) {
    for (const edge of field.edges) {
      if (edge.id === skipId) continue;
      const handle = overrides[edge.id];
      if (!handle) continue;
      const routed = routeVia(field.grid, edge.points[0], handle, edge.points[edge.points.length - 1]);
      if (!routed) continue;
      const others = field.edges
        .filter((other) => other.id !== edge.id && other.id !== skipId)
        .map((other) => ({ points: points.get(other.id) ?? other.points }));
      if (polylinesCrossAny(routed, others)) continue;
      points.set(edge.id, routed);
    }
  }
  const resolved: PathEdgeBase[] = [];
  for (const edge of field.edges) {
    if (edge.id === skipId) continue;
    resolved.push({ ...edge, points: points.get(edge.id) ?? edge.points });
  }
  return resolved;
}

function routeIsLegal(
  field: PathField,
  edge: PathEdgeBase,
  via: Point,
  others: readonly PathEdgeBase[],
): boolean {
  if (!field.grid) return false;
  const routed = routeVia(field.grid, edge.points[0], via, edge.points[edge.points.length - 1]);
  if (!routed) return false;
  return !polylinesCrossAny(routed, others);
}

function routeVia(grid: Grid, start: Point, via: Point, end: Point): Point[] | null {
  const viaKey = nearestFree(grid, via, 2);
  if (viaKey == null) return null;
  const viaPoint = cellPoint(grid, viaKey);
  if (Math.hypot(via.x - viaPoint.x, via.y - viaPoint.y) > CELL * 1.6) return null;
  const first = gridRoute(grid, start, viaPoint);
  const second = gridRoute(grid, viaPoint, end);
  if (!first || !second) return null;
  return dedupePoints([...first, ...second.slice(1)]);
}

function gridRoute(grid: Grid, from: Point, to: Point): Point[] | null {
  const startKey = nearestFree(grid, from, 6);
  const goalKey = nearestFree(grid, to, 6);
  if (startKey == null || goalKey == null) return null;
  if (startKey === goalKey) return dedupePoints([from, to]);
  const count = grid.width * grid.height;
  const dist = new Float64Array(count);
  dist.fill(Infinity);
  const parent = new Int32Array(count);
  parent.fill(-2);
  const goalAt = cellPoint(grid, goalKey);
  const rank = (key: number, traveled: number) => {
    const at = cellPoint(grid, key);
    return traveled + Math.hypot(at.x - goalAt.x, at.y - goalAt.y) / grid.cell;
  };
  dist[startKey] = 0;
  const heap: Array<{ key: number; cost: number }> = [{ key: startKey, cost: rank(startKey, 0) }];
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
  let found = false;
  while (heap.length > 0) {
    const current = heapPop(heap);
    if (current.cost !== rank(current.key, dist[current.key])) continue;
    if (current.key === goalKey) {
      found = true;
      break;
    }
    const gx = current.key % grid.width;
    const gy = Math.floor(current.key / grid.width);
    for (const [dx, dy, step] of dirs) {
      const nx = gx + dx;
      const ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
      const next = ny * grid.width + nx;
      if (grid.blocked[next]) continue;
      if (dx !== 0 && dy !== 0) {
        if (grid.blocked[gy * grid.width + nx] || grid.blocked[ny * grid.width + gx]) continue;
      }
      const traveled = dist[current.key] + step;
      if (traveled >= dist[next]) continue;
      dist[next] = traveled;
      parent[next] = current.key;
      heapPush(heap, { key: next, cost: rank(next, traveled) });
    }
  }
  if (!found) return null;
  const cells: Point[] = [];
  let cursor = goalKey;
  const seen = new Set<number>();
  while (cursor !== startKey && !seen.has(cursor)) {
    seen.add(cursor);
    cells.push(cellPoint(grid, cursor));
    cursor = parent[cursor];
    if (cursor < 0) return null;
  }
  cells.push(cellPoint(grid, startKey));
  cells.reverse();
  return dedupePoints([from, ...cells.slice(1, -1), to]);
}

/**
 * Step straight out from the door along the wall normal.
 * Stop before the line would enter this building or another one.
 */
function exitDoor(
  grid: Grid,
  door: Point,
  normal: Point,
  shapes: Shape[],
  ignoreId: string,
): Point {
  let exit = door;
  for (let distance = 4; distance <= DOOR_APPROACH; distance += 2) {
    const at = { x: door.x + normal.x * distance, y: door.y + normal.y * distance };
    if (chordCutsBuilding(door, at, shapes) || grid.approachBlocked(at, ignoreId)) break;
    if (!segmentClearsOwn(door, at, door, shapes)) break;
    exit = at;
  }
  return exit;
}

/** Past the doorway, the track has to stay as far off its own building as off any other. */
function segmentClearsOwn(from: Point, to: Point, door: Point, shapes: Shape[]): boolean {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / 4));
  const skip = PATH_CLEARANCE + CELL * 2;
  const gap = PATH_CLEARANCE - CELL;
  for (let step = 1; step <= steps; step++) {
    const point = lerp(from, to, step / steps);
    const gapToOwn = distanceToShapes(point, shapes);
    if (gapToOwn <= 0) return false;
    if (Math.hypot(point.x - door.x, point.y - door.y) <= skip) continue;
    if (gapToOwn < gap) return false;
  }
  return true;
}

/** Straight line that may cross this building's own doorway, but not another building. */
function approachOpen(
  grid: Grid,
  from: Point,
  to: Point,
  ignoreId: string,
  shapes: Shape[],
  door: Point,
): boolean {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / 4));
  for (let step = 1; step < steps; step++) {
    const point = lerp(from, to, step / steps);
    if (grid.approachBlocked(point, ignoreId)) return false;
  }
  return segmentClearsOwn(from, to, door, shapes);
}

/** Reachable cell whose straight join does not cut through this building or any other. */
function nearestApproach(
  grid: Grid,
  parent: Int32Array,
  door: Point,
  shapes: Shape[],
  rings: number,
): number | null {
  const usable = (key: number) => {
    const at = cellPoint(grid, key);
    return !chordCutsBuilding(door, at, shapes);
  };
  const reachable = nearestReachable(grid, parent, door, rings);
  if (reachable != null && usable(reachable)) return reachable;
  const gx = Math.round((door.x - grid.originX) / grid.cell - 0.5);
  const gy = Math.round((door.y - grid.originY) / grid.cell - 0.5);
  for (let ring = 0; ring <= rings; ring++) {
    let best: number | null = null;
    let bestDist = Infinity;
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (ring > 0 && Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = gx + dx;
        const y = gy + dy;
        if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue;
        const key = y * grid.width + x;
        if (grid.blocked[key] || parent[key] === -2) continue;
        if (!usable(key)) continue;
        const at = cellPoint(grid, key);
        const dist = Math.hypot(at.x - door.x, at.y - door.y);
        if (dist < bestDist) {
          best = key;
          bestDist = dist;
        }
      }
    }
    if (best != null) return best;
  }
  return null;
}

/**
 * Walk out through this building's own padding, around other buildings,
 * until the path reaches the shared road. Used when no straight leave exists.
 */
function doorRoute(
  grid: Grid,
  door: Point,
  shapes: Shape[],
  ignoreId: string,
  parent: Int32Array,
): { key: number; points: Point[] } | null {
  const gx = Math.round((door.x - grid.originX) / grid.cell - 0.5);
  const gy = Math.round((door.y - grid.originY) / grid.cell - 0.5);
  if (gx < 0 || gy < 0 || gx >= grid.width || gy >= grid.height) return null;
  const start = gy * grid.width + gx;
  const allowed = (key: number) => {
    const at = cellPoint(grid, key);
    const gap = distanceToShapes(at, shapes);
    if (gap <= 0.4) return false;
    if (Math.hypot(at.x - door.x, at.y - door.y) <= PATH_CLEARANCE + CELL * 2) return true;
    if (grid.approachTight(at, ignoreId)) return false;
    return gap >= PATH_CLEARANCE - CELL;
  };
  const prev = new Int32Array(grid.width * grid.height);
  prev.fill(-2);
  const queue = [start];
  prev[start] = -1;
  let goal = -1;
  for (let index = 0; index < queue.length && queue.length < 4000; index++) {
    const key = queue[index];
    if (key !== start && !grid.blocked[key] && parent[key] >= -1) {
      goal = key;
      break;
    }
    const x = key % grid.width;
    const y = Math.floor(key / grid.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
      const next = ny * grid.width + nx;
      if (prev[next] !== -2) continue;
      if (!allowed(next)) continue;
      prev[next] = key;
      queue.push(next);
    }
  }
  if (goal < 0) return null;
  const points: Point[] = [];
  let cursor = goal;
  const seen = new Set<number>();
  while (cursor >= 0 && !seen.has(cursor)) {
    seen.add(cursor);
    points.push(cellPoint(grid, cursor));
    const prior = prev[cursor];
    if (prior < 0) break;
    cursor = prior;
  }
  points.reverse();
  return { key: goal, points: dedupePoints([door, ...points]) };
}

function connectDoor(
  grid: Grid,
  door: Point,
  cell: Point,
  ignoreId: string,
  shapes: Shape[],
): Point[] | null {
  const routed = gridRoute(grid, door, cell);
  if (routed && routed.length >= 2) return routed;
  if (approachOpen(grid, door, cell, ignoreId, shapes, door) && !skimsBuilding(door, cell, shapes)) return [door, cell];
  return null;
}

/** A long chord that stays in this building's padding, past the doorway, is not a leave. */
function skimsBuilding(door: Point, cell: Point, shapes: Shape[]): boolean {
  const exempt = PATH_CLEARANCE + CELL * 2;
  const length = Math.hypot(cell.x - door.x, cell.y - door.y);
  const steps = Math.max(1, Math.ceil(length / 4));
  for (let step = 1; step < steps; step++) {
    const point = lerp(door, cell, step / steps);
    const gapToOwn = distanceToShapes(point, shapes);
    if (gapToOwn <= 0) return true;
    if (Math.hypot(point.x - door.x, point.y - door.y) <= exempt) continue;
    if (gapToOwn < PATH_CLEARANCE - CELL) return true;
  }
  return false;
}

type WallFace = { start: Point; end: Point; normal: Point; dist: number };

/** Walls the door is actually touching, including both faces of a corner. */
function touchedWalls(shapes: Shape[], door: Point): WallFace[] {
  const found: WallFace[] = [];
  let best = Infinity;
  for (const shape of shapes) {
    if (shape.kind === "circle") {
      const dx = door.x - shape.c.x;
      const dy = door.y - shape.c.y;
      const length = Math.hypot(dx, dy) || 1;
      const normal = { x: dx / length, y: dy / length };
      const on = { x: shape.c.x + normal.x * shape.r, y: shape.c.y + normal.y * shape.r };
      const dist = Math.max(0, length - shape.r);
      found.push({ start: on, end: on, normal, dist });
      best = Math.min(best, dist);
      continue;
    }
    for (let index = 0; index < shape.points.length; index++) {
      const start = shape.points[index];
      const end = shape.points[(index + 1) % shape.points.length];
      const dist = distanceToSegment(door, start, end);
      found.push({ start, end, normal: outwardNormal(door, start, end), dist });
      best = Math.min(best, dist);
    }
  }
  return found.filter((wall) => wall.dist <= best + 2);
}

function outwardNormal(door: Point, start: Point, end: Point): Point {
  const ex = end.x - start.x;
  const ey = end.y - start.y;
  const edge = Math.hypot(ex, ey) || 1;
  let nx = -ey / edge;
  let ny = ex / edge;
  const onEdge = closestOnSegment(door, start, end);
  const outward = nx * (door.x - onEdge.x) + ny * (door.y - onEdge.y);
  const towardHeart = nx * (MAP_CENTER - door.x) + ny * (MAP_CENTER - door.y);
  if ((Math.abs(outward) < 0.2 && towardHeart < 0) || outward < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: nx, y: ny };
}

/** How far a straight leave stays outside this building and its neighbors. */
function clearRun(at: Point, normal: Point, shapes: Shape[], nearby: Shape[][]): number {
  let room = 0;
  for (let distance = 2; distance <= DOOR_APPROACH; distance += 2) {
    const point = { x: at.x + normal.x * distance, y: at.y + normal.y * distance };
    if (distance > 4 && distanceToShapes(point, shapes) <= 0.4) break;
    let blocked = false;
    for (const other of nearby) {
      if (distanceToShapes(point, other) < 0.5) {
        blocked = true;
        break;
      }
    }
    if (blocked) break;
    room = distance;
  }
  return room;
}

/**
 * Where the path meets the building, and the direction straight out from that wall.
 * A corner door slides a short way along the wall so the leave is not into a neighbor.
 */
function doorLeave(
  shapes: Shape[],
  door: Point,
  nearby: Shape[][],
): { at: Point; normal: Point } {
  const walls = touchedWalls(shapes, door);
  if (walls.length === 0) {
    const dx = MAP_CENTER - door.x;
    const dy = MAP_CENTER - door.y;
    const length = Math.hypot(dx, dy) || 1;
    return { at: door, normal: { x: dx / length, y: dy / length } };
  }
  let bestAt = door;
  let bestNormal = walls[0].normal;
  let bestRoom = -1;
  let bestHeart = -Infinity;
  let bestShift = Infinity;
  const consider = (at: Point, normal: Point, room: number, shift: number) => {
    const heart = normal.x * (MAP_CENTER - at.x) + normal.y * (MAP_CENTER - at.y);
    const open = room >= 8;
    const bestOpen = bestRoom >= 8;
    let better = false;
    if (open && bestOpen) better = shift < bestShift - 0.5 || (Math.abs(shift - bestShift) <= 0.5 && heart > bestHeart);
    else if (open !== bestOpen) better = open;
    else better = room > bestRoom || (room === bestRoom && (shift < bestShift - 0.5 || heart > bestHeart));
    if (!better) return;
    bestRoom = room;
    bestHeart = heart;
    bestShift = shift;
    bestAt = at;
    bestNormal = normal;
  };
  for (const wall of walls) {
    consider(door, wall.normal, clearRun(door, wall.normal, shapes, nearby), 0);
  }
  if (bestRoom >= 8) return { at: door, normal: bestNormal };
  for (const wall of walls) {
    const span = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    const steps = Math.max(1, Math.ceil(span / 6));
    for (let step = 0; step <= steps; step++) {
      const on = span < 1 ? wall.start : lerp(wall.start, wall.end, step / steps);
      const at = { x: on.x + wall.normal.x * 1.5, y: on.y + wall.normal.y * 1.5 };
      const shift = Math.hypot(at.x - door.x, at.y - door.y);
      if (shift > 12) continue;
      consider(at, wall.normal, clearRun(at, wall.normal, shapes, nearby), shift);
    }
  }
  return { at: bestAt, normal: bestNormal };
}

function shapesNear(
  slot: PlacedSlot,
  slots: readonly PlacedSlot[],
  hutSize: number,
  reach = 220,
): Shape[][] {
  const nearby: Shape[][] = [];
  for (const other of slots) {
    if (other.id === slot.id || other.buildingId === "heartfire") continue;
    if (Math.hypot(other.x - slot.x, other.y - slot.y) > reach) continue;
    nearby.push(slotShapes(other, hutSize));
  }
  return nearby;
}

/** Outward normal of the single nearest wall. The road behind the doorway follows this. */
function nearestWallNormal(shapes: Shape[], door: Point): Point {
  const walls = touchedWalls(shapes, door);
  if (walls.length === 0) {
    const dx = MAP_CENTER - door.x;
    const dy = MAP_CENTER - door.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
  }
  let best = walls[0];
  for (const wall of walls) {
    if (wall.dist < best.dist) best = wall;
  }
  return best.normal;
}

/**
 * True when the path already leaves the wall and keeps that direction.
 * A short perpendicular step that turns straight away is a kink, not a natural leave.
 */
function headsOut(points: Point[], normal: Point): boolean {
  const aim = pointAt(points, 36) ?? points[points.length - 1];
  if (!aim) return false;
  const vx = aim.x - points[0].x;
  const vy = aim.y - points[0].y;
  const run = Math.hypot(vx, vy);
  if (run < 20) return false;
  if ((normal.x * vx + normal.y * vy) / run <= 0.7) return false;
  const early = pointAt(points, 14);
  const mid = pointAt(points, 32);
  if (!early || !mid) return true;
  const ex = early.x - points[0].x;
  const ey = early.y - points[0].y;
  const mx = mid.x - early.x;
  const my = mid.y - early.y;
  const earlyRun = Math.hypot(ex, ey);
  const midRun = Math.hypot(mx, my);
  if (earlyRun < 8 || midRun < 8) return true;
  return (ex * mx + ey * my) / (earlyRun * midRun) > 0.75;
}

function sampleCubic(from: Point, controlA: Point, controlB: Point, to: Point, steps: number): Point[] {
  const points: Point[] = [];
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const stay = 1 - t;
    const stay2 = stay * stay;
    const t2 = t * t;
    points.push({
      x: stay2 * stay * from.x + 3 * stay2 * t * controlA.x + 3 * stay * t2 * controlB.x + t2 * t * to.x,
      y: stay2 * stay * from.y + 3 * stay2 * t * controlA.y + 3 * stay * t2 * controlB.y + t2 * t * to.y,
    });
  }
  return points;
}

/**
 * A curve that leaves `from` along `fromDir` and arrives at `to` along `toDir`.
 * The handle matches a circular arc, and it is kept shorter than the chord's
 * reach along each tangent. A longer handle is what folded the bend back on itself.
 * Arrival is kept from pointing back along the chord.
 */
function smoothTurn(
  from: Point,
  fromDir: Point,
  to: Point,
  toDir: Point,
  steps: number,
  handleScale = 1,
): Point[] {
  const chord = unitVector(to.x - from.x, to.y - from.y);
  const arriveDot = chord.x * toDir.x + chord.y * toDir.y;
  const arrive = arriveDot < 0.25 ? chord : toDir;
  const span = Math.hypot(to.x - from.x, to.y - from.y);
  const leaveDot = Math.max(0, chord.x * fromDir.x + chord.y * fromDir.y);
  const usedArriveDot = Math.max(0, chord.x * arrive.x + chord.y * arrive.y);
  const shaped = arcHandle(span, vectorAngle(fromDir, arrive)) * handleScale;
  // A handle past the chord's reach folds the arc back. Tangents that already
  // face the chord can keep the full arc, so a fork still arrives on its angle.
  const room = Math.min(leaveDot, usedArriveDot) * span * 0.85;
  const handle = leaveDot > 0.3 && usedArriveDot > 0.3 ? shaped : Math.min(shaped, room);
  if (handle < 1) return [from, to];
  return sampleCubic(
    from,
    { x: from.x + fromDir.x * handle, y: from.y + fromDir.y * handle },
    { x: to.x - arrive.x * handle, y: to.y - arrive.y * handle },
    to,
    steps,
  );
}

function arcHandle(span: number, turn: number): number {
  const limited = Math.min(turn, 1.35);
  if (limited < 0.2) return Math.min(span * 0.3, 24);
  const handle = span * ((4 / 3) * Math.tan(limited / 4)) / (2 * Math.sin(limited / 2));
  return Math.max(8, Math.min(handle, span * 0.42, 48));
}

/** Both tangents face along the chord, so a circular arc can take the turn without folding back. */
function turnFits(from: Point, fromDir: Point, to: Point, toDir: Point): boolean {
  const span = Math.hypot(to.x - from.x, to.y - from.y);
  if (span < 18) return false;
  const chord = unitVector(to.x - from.x, to.y - from.y);
  const leave = fromDir.x * chord.x + fromDir.y * chord.y;
  const arrive = toDir.x * chord.x + toDir.y * chord.y;
  return leave > 0.2 && arrive > 0.12;
}

/** Most negative corner. 1 is straight, 0 is a right angle, negative turns back. */
function worstTurn(points: Point[]): number {
  let worst = 1;
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
    if (ar < 0.8 || br < 0.8) continue;
    worst = Math.min(worst, (ax * bx + ay * by) / (ar * br));
  }
  return worst;
}

/** A vertex that turns back the way it came. */
function reverses(points: Point[]): boolean {
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
    if (ar < 0.8 || br < 0.8) continue;
    if ((ax * bx + ay * by) / (ar * br) < -0.05) return true;
  }
  return false;
}

/** A vertex in the opening stretch that turns back on the step it just took. */
function bendsBack(points: Point[], distance: number): boolean {
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
    if (walked > distance) break;
    if (ar < 0.8 || br < 0.8) continue;
    if ((ax * bx + ay * by) / (ar * br) < 0.15) return true;
  }
  return false;
}

/** Largest heading change, in radians, across `reach` map units on either side. */
function windowTurn(points: Point[], distance: number, reach: number): number {
  const total = polylineLength(points);
  const end = Math.min(total - reach, distance);
  let worst = 0;
  for (let at = reach; at <= end; at += 4) {
    const before = pointAt(points, at - reach);
    const mid = pointAt(points, at);
    const after = pointAt(points, at + reach);
    if (!before || !mid || !after) continue;
    const ax = mid.x - before.x;
    const ay = mid.y - before.y;
    const bx = after.x - mid.x;
    const by = after.y - mid.y;
    const ar = Math.hypot(ax, ay);
    const br = Math.hypot(bx, by);
    if (ar < 1 || br < 1) continue;
    const dot = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (ar * br)));
    worst = Math.max(worst, Math.acos(dot));
  }
  return worst;
}

/** Where the ray `origin + dir * t` meets the ray `point + otherDir * s`. */
function lineHit(
  origin: Point,
  dir: Point,
  point: Point,
  otherDir: Point,
): { point: Point; t: number; s: number } | null {
  const det = dir.x * otherDir.y - dir.y * otherDir.x;
  if (Math.abs(det) < 1e-4) return null;
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    t: (dx * otherDir.y - dy * otherDir.x) / det,
    s: (dx * dir.y - dy * dir.x) / det,
    point: {
      x: origin.x + dir.x * ((dx * otherDir.y - dy * otherDir.x) / det),
      y: origin.y + dir.y * ((dx * otherDir.y - dy * otherDir.x) / det),
    },
  };
}

/**
 * A circular fillet from the wall normal onto the road's tangent.
 * The straight leave stays perpendicular, and the arc spreads the turn
 * so it does not snap or fold back beside the building.
 */
function filletFromDoor(
  door: Point,
  normal: Point,
  far: Point,
  roadDir: Point,
  minRun: number,
  tangentCap: number,
  minRadius = 26,
): Point[] | null {
  const phi = vectorAngle(normal, roadDir);
  if (phi < 0.28 || phi > 2.5) return null;
  const hit = lineHit(door, normal, far, { x: -roadDir.x, y: -roadDir.y });
  if (!hit || hit.t < minRun + 16 || hit.s < 16) return null;
  const tangent = Math.min(hit.t - minRun, hit.s * 0.9, tangentCap);
  if (tangent < 16) return null;
  const radius = tangent / Math.tan(phi / 2);
  if (radius < minRadius || radius > 160) return null;
  const side = Math.sign(normal.x * roadDir.y - normal.y * roadDir.x);
  if (side === 0) return null;
  const corner = hit.point;
  const start = { x: corner.x - normal.x * tangent, y: corner.y - normal.y * tangent };
  const end = { x: corner.x + roadDir.x * tangent, y: corner.y + roadDir.y * tangent };
  const inboard = { x: -normal.y * side, y: normal.x * side };
  const center = { x: start.x + inboard.x * radius, y: start.y + inboard.y * radius };
  const a0 = Math.atan2(start.y - center.y, start.x - center.x);
  let sweep = Math.atan2(end.y - center.y, end.x - center.x) - a0;
  if (side > 0) {
    while (sweep <= 0) sweep += Math.PI * 2;
  } else {
    while (sweep >= 0) sweep -= Math.PI * 2;
  }
  if (Math.abs(sweep) > phi + 0.45 || Math.abs(sweep) < phi * 0.55) return null;
  const steps = Math.max(4, Math.ceil((Math.abs(sweep) * radius) / 6));
  const arc: Point[] = [];
  for (let step = 0; step <= steps; step++) {
    const angle = a0 + sweep * (step / steps);
    arc.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }
  arc[0] = start;
  arc[arc.length - 1] = end;
  return dedupePoints([door, ...arc, far]);
}

/**
 * A straight leave, then a bend out in the yard onto the road.
 * The bend is a circular fillet when the wall normal and the road meet in
 * front of the door. A cubic is the fallback when that corner is blocked.
 * Returns null when there is not enough open ground for either.
 */
function gentleApproach(
  base: Point[],
  normal: Point,
  shapes: Shape[],
  taken: readonly { points: Point[] }[],
  nearby: Shape[][],
): Point[] | null {
  const door = base[0];
  const total = polylineLength(base);
  let best: Point[] | null = null;
  let bestTurn = Infinity;
  const consider = (candidate: Point[], farDist: number) => {
    if (bendsBack(candidate, farDist + 8)) return;
    if (polylinesCrossAny(candidate, taken)) return;
    if (!routeClearsOthers(candidate, door, nearby) || !pathClearsOwn(candidate, door, shapes)) return;
    const turn = windowTurn(candidate, Math.min(140, farDist), 18);
    if (turn < bestTurn - 0.02) {
      best = candidate;
      bestTurn = turn;
    }
  };
  for (const extra of [36, 52, 84, 124, 176]) {
    const farDist = Math.min(total - 0.4, extra);
    if (farDist < 28) continue;
    const suffix = suffixFrom(base, farDist);
    const far = suffix[0];
    const after = suffix[1];
    if (!far || !after) continue;
    const roadDir = unitVector(after.x - far.x, after.y - far.y);
    for (const minRun of [22, 16, 12]) {
      const minRadius = minRun >= 22 ? 26 : 16;
      for (const cap of [84, 56, 36, 24]) {
        const filleted = filletFromDoor(door, normal, far, roadDir, minRun, cap, minRadius);
        if (!filleted) continue;
        const start = filleted[1];
        if (!start) continue;
        if (chordCutsBuilding(door, start, shapes) || !stubClearsOthers(door, start, nearby)) continue;
        consider(dedupePoints([...filleted, ...suffix.slice(1)]), farDist);
      }
    }
  }
  for (const run of GENTLE_RUNS) {
    const launch = { x: door.x + normal.x * run, y: door.y + normal.y * run };
    if (chordCutsBuilding(door, launch, shapes) || !stubClearsOthers(door, launch, nearby)) continue;
    for (const extra of [40, 64, 96, 128]) {
      const farDist = Math.min(total - 0.4, run + extra);
      if (farDist < run + 20) continue;
      const suffix = suffixFrom(base, farDist);
      const far = suffix[0];
      if (!far) continue;
      const after = suffix[1];
      const roadDir = after
        ? unitVector(after.x - far.x, after.y - far.y)
        : unitVector(far.x - launch.x, far.y - launch.y);
      if (!turnFits(launch, normal, far, roadDir)) continue;
      const bend = smoothTurn(launch, normal, far, roadDir, 18).slice(1);
      consider(dedupePoints([door, launch, ...bend, ...suffix.slice(1)]), farDist);
    }
  }
  if (best) return best;
  return swingOnto(base, normal, shapes, taken, nearby);
}

/**
 * The road sits beside or behind the wall normal, so a single fillet has no
 * corner in front of the door. Walk a wide arc until it faces the road.
 */
function swingOnto(
  base: Point[],
  normal: Point,
  shapes: Shape[],
  taken: readonly { points: Point[] }[],
  nearby: Shape[][],
): Point[] | null {
  const door = base[0];
  const total = polylineLength(base);
  let best: Point[] | null = null;
  let bestTurn = Infinity;
  for (const run of [40, 30, 22]) {
    const launch = { x: door.x + normal.x * run, y: door.y + normal.y * run };
    if (chordCutsBuilding(door, launch, shapes) || !stubClearsOthers(door, launch, nearby)) continue;
    for (const extra of [80, 120, 170]) {
      const farDist = Math.min(total - 0.4, run + extra);
      if (farDist < run + 28) continue;
      const suffix = suffixFrom(base, farDist);
      const far = suffix[0];
      const after = suffix[1];
      if (!far || !after) continue;
      const roadDir = unitVector(after.x - far.x, after.y - far.y);
      for (const side of [1, -1] as const) {
        for (const radius of [96, 68, 46]) {
          const swung = arcUntilFacing(launch, normal, far, side, radius);
          if (!swung) continue;
          const end = swung[swung.length - 1];
          const prev = swung[swung.length - 2];
          if (!end || !prev) continue;
          const endDir = unitVector(end.x - prev.x, end.y - prev.y);
          const chord = unitVector(far.x - end.x, far.y - end.y);
          const arrive = chord.x * roadDir.x + chord.y * roadDir.y < 0.25 ? chord : roadDir;
          if (!turnFits(end, endDir, far, arrive)) continue;
          const bend = smoothTurn(end, endDir, far, arrive, 12).slice(1);
          const candidate = dedupePoints([door, ...swung, ...bend, ...suffix.slice(1)]);
          if (bendsBack(candidate, farDist + 8)) continue;
          if (polylinesCrossAny(candidate, taken)) continue;
          if (!routeClearsOthers(candidate, door, nearby) || !pathClearsOwn(candidate, door, shapes)) continue;
          const early = pointAt(candidate, 36);
          if (early) {
            const vx = early.x - door.x;
            const vy = early.y - door.y;
            const span = Math.hypot(vx, vy);
            if (span > 8 && (normal.x * vx + normal.y * vy) / span < 0.45) continue;
          }
          const turn = windowTurn(candidate, Math.min(140, farDist), 18);
          if (turn < bestTurn - 0.02) {
            best = candidate;
            bestTurn = turn;
          }
        }
      }
    }
  }
  return best;
}

/** Samples a circle from `from` along `fromDir` until the tangent faces `to`. */
function arcUntilFacing(
  from: Point,
  fromDir: Point,
  to: Point,
  side: 1 | -1,
  radius: number,
): Point[] | null {
  const center = {
    x: from.x - fromDir.y * side * radius,
    y: from.y + fromDir.x * side * radius,
  };
  const a0 = Math.atan2(from.y - center.y, from.x - center.x);
  const probe = (sign: number) => {
    const angle = a0 + sign * 0.03;
    const vx = center.x + Math.cos(angle) * radius - from.x;
    const vy = center.y + Math.sin(angle) * radius - from.y;
    return vx * fromDir.x + vy * fromDir.y;
  };
  const sweepSign = probe(1) >= probe(-1) ? 1 : -1;
  const step = sweepSign * (10 / radius);
  const points: Point[] = [from];
  const maxSteps = Math.ceil((3.05 * radius) / 10);
  for (let index = 1; index <= maxSteps; index++) {
    const angle = a0 + step * index;
    const point = {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
    points.push(point);
    const vx = to.x - point.x;
    const vy = to.y - point.y;
    const dist = Math.hypot(vx, vy);
    const prev = points[points.length - 2];
    const tx = point.x - prev.x;
    const ty = point.y - prev.y;
    const tl = Math.hypot(tx, ty) || 1;
    const aim = (tx * vx + ty * vy) / (tl * dist);
    if (dist > 22 && aim > 0.82) return points;
  }
  return null;
}

/** Keep walking from the end of the door link onto the private stretch of road. */
function roadBeyond(base: Point[], tail: Point[]): Point[] {
  const end = base[base.length - 1];
  if (!end || tail.length === 0) return base;
  const hit = tail.findIndex((point) => Math.hypot(point.x - end.x, point.y - end.y) < 1.5);
  if (hit < 0) return base;
  return dedupePoints([...base, ...tail.slice(hit + 1)]);
}

/**
 * The wall normal sometimes points away from the only road, which forces a
 * U-turn against the building. Rotate the leave toward that road, and stop
 * while it is still square to the wall.
 */
function aimedLeave(door: Point, normal: Point, road: Point, shapes: Shape[]): Point {
  const roadDir = unitVector(road.x - door.x, road.y - door.y);
  const facing = normal.x * roadDir.x + normal.y * roadDir.y;
  if (facing > 0.45) return normal;
  let best = normal;
  let bestFace = facing;
  for (let step = 1; step <= 8; step++) {
    const theta = (step / 8) * (Math.PI / 2);
    for (const sign of [1, -1] as const) {
      const dir = rotateVector(normal, sign * theta);
      if (!leavesWall(shapes, door, dir)) continue;
      const face = dir.x * roadDir.x + dir.y * roadDir.y;
      if (face > bestFace + 0.04) {
        best = dir;
        bestFace = face;
      }
    }
  }
  return best;
}

/** True when `dir` still leaves a touched wall at a right angle. */
function leavesWall(shapes: Shape[], door: Point, dir: Point): boolean {
  for (const wall of touchedWalls(shapes, door)) {
    let ex = wall.end.x - wall.start.x;
    let ey = wall.end.y - wall.start.y;
    if (Math.hypot(ex, ey) < 0.5) {
      ex = -wall.normal.y;
      ey = wall.normal.x;
    }
    const edge = Math.hypot(ex, ey) || 1;
    const parallel = Math.abs(ex * dir.x + ey * dir.y) / edge;
    const outward = wall.normal.x * dir.x + wall.normal.y * dir.y;
    if (parallel < 0.78 && outward > 0.5) return true;
  }
  return false;
}

/** Keep a leave that already heads out smoothly. Otherwise bend onto the road further out in the yard. */
function rightAngleJoin(
  base: Point[],
  normal: Point,
  shapes: Shape[],
  others: readonly PathEdgeBase[],
  slots: readonly PlacedSlot[],
  slotId: string,
  hutSize: number,
): Point[] {
  const taken = others.map((edge) => ({ points: edge.points }));
  const nearby = slots
    .filter((slot) => slot.id !== slotId && slot.buildingId !== "heartfire")
    .map((slot) => slotShapes(slot, hutSize));
  if (
    headsOut(base, normal) &&
    !bendsBack(base, 100) &&
    windowTurn(base, 100, 16) < 0.85 &&
    !polylinesCrossAny(base, taken)
  ) {
    return base;
  }
  const roadAt = pointAt(base, Math.min(Math.max(48, polylineLength(base) * 0.55), 150));
  const aimed = roadAt ? aimedLeave(base[0], normal, roadAt, shapes) : normal;
  const smoothed =
    gentleApproach(base, aimed, shapes, taken, nearby) ??
    (aimed === normal ? null : gentleApproach(base, normal, shapes, taken, nearby)) ??
    smoothCorner(base, shapes, taken, nearby);
  if (!smoothed || bendsBack(smoothed, 120)) return base;
  const baseHooks = bendsBack(base, 120);
  if (baseHooks || windowTurn(smoothed, 120, 18) + 0.04 < windowTurn(base, 120, 18)) return smoothed;
  return base;
}

/**
 * Round the first sharp corner so the path bends away from the wall
 * instead of snapping just before the building. The arc is cut with the
 * same setback on both legs, so it stays inside the corner the road already took.
 */
function smoothCorner(
  base: Point[],
  shapes: Shape[],
  taken: readonly { points: Point[] }[],
  nearby: Shape[][],
): Point[] | null {
  if (base.length < 3) return null;
  const door = base[0];
  const total = polylineLength(base);
  let walked = 0;
  let cornerDist = -1;
  for (let index = 1; index < base.length - 1; index++) {
    const prev = base[index - 1];
    const corner = base[index];
    const next = base[index + 1];
    const ar = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    walked += ar;
    if (walked > 88) break;
    const ax = corner.x - prev.x;
    const ay = corner.y - prev.y;
    const bx = next.x - corner.x;
    const by = next.y - corner.y;
    const br = Math.hypot(bx, by) || 1;
    if (ar < 0.8) continue;
    if ((ax * bx + ay * by) / (ar * br) < 0.55) {
      cornerDist = walked;
      break;
    }
  }
  if (cornerDist < 0) return null;
  for (const setback of [40, 30, 22, 16, 12]) {
    const fromDist = cornerDist - setback;
    const toDist = Math.min(total - 0.4, cornerDist + setback);
    if (fromDist < 6 || toDist < cornerDist + 10) continue;
    const head = prefixTo(base, fromDist);
    const from = head[head.length - 1];
    const prior = head.length >= 2 ? head[head.length - 2] : null;
    const suffix = suffixFrom(base, toDist);
    const to = suffix[0];
    const after = suffix[1];
    if (!from || !prior || !to || !after) continue;
    const fromDir = unitVector(from.x - prior.x, from.y - prior.y);
    const toDir = unitVector(after.x - to.x, after.y - to.y);
    if (!turnFits(from, fromDir, to, toDir)) continue;
    const bend = smoothTurn(from, fromDir, to, toDir, 16).slice(1);
    const candidate = dedupePoints([...head, ...bend, ...suffix.slice(1)]);
    if (bendsBack(candidate, cornerDist + setback)) continue;
    if (polylinesCrossAny(candidate, taken)) continue;
    if (!routeClearsOthers(candidate, door, nearby) || !pathClearsOwn(candidate, door, shapes)) continue;
    return candidate;
  }
  return null;
}

/** The path may hug its own doorway, then has to stand off its own walls. */
function pathClearsOwn(points: Point[], door: Point, shapes: Shape[]): boolean {
  for (const point of samplePolyline(points, 4)) {
    const gap = distanceToShapes(point, shapes);
    if (gap >= PATH_CLEARANCE - CELL) continue;
    if (gap > 0.4 && Math.hypot(point.x - door.x, point.y - door.y) <= 80) continue;
    return false;
  }
  return true;
}

/** The centerline keeps the same gap from other buildings as the rest of the road. */
function routeClearsOthers(points: Point[], door: Point, nearby: Shape[][]): boolean {
  const exempt = PATH_CLEARANCE + CELL * 2;
  const gap = PATH_CLEARANCE - CELL + 1.5;
  const samples: Point[] = [];
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(span / 2));
    for (let step = 1; step <= steps; step++) {
      const point = lerp(from, to, step / steps);
      if (Math.hypot(point.x - door.x, point.y - door.y) <= exempt) continue;
      samples.push(point);
    }
  }
  if (samples.length === 0) return true;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of samples) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  for (const other of nearby) {
    const box = shapeBoxes.get(other);
    if (box) {
      const dx = maxX < box.minX ? box.minX - maxX : minX > box.maxX ? minX - box.maxX : 0;
      const dy = maxY < box.minY ? box.minY - maxY : minY > box.maxY ? minY - box.maxY : 0;
      if (dx * dx + dy * dy >= gap * gap) continue;
    }
    for (const point of samples) {
      if (beyondShapeBox(point, other, gap)) continue;
      if (distanceToShapes(point, other) < gap) return false;
    }
  }
  return true;
}

/** The short step off the wall may pass close to another building, but not enter it. */
function stubClearsOthers(from: Point, to: Point, nearby: Shape[][]): boolean {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / 3));
  for (let step = 1; step <= steps; step++) {
    const point = lerp(from, to, step / steps);
    for (const shapes of nearby) {
      if (beyondShapeBox(point, shapes, 0.5)) continue;
      if (distanceToShapes(point, shapes) < 0.5) return false;
    }
  }
  return true;
}

function suffixFrom(points: Point[], distance: number): Point[] {
  let left = distance;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    if (span < 1e-6) continue;
    if (left <= span) {
      return [lerp(start, end, left / span), ...points.slice(index)];
    }
    left -= span;
  }
  const last = points[points.length - 1];
  return last ? [last] : [];
}

function chordCutsBuilding(from: Point, to: Point, shapes: Shape[]): boolean {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / 4));
  for (let step = 1; step < steps; step++) {
    const point = lerp(from, to, step / steps);
    if (Math.hypot(point.x - from.x, point.y - from.y) <= 4) continue;
    if (distanceToShapes(point, shapes) <= 0.4) return true;
  }
  return false;
}

/** Nearest free cell that can already reach the heartfire. */
function nearestReachable(grid: Grid, parent: Int32Array, point: Point, rings: number): number | null {
  const gx = Math.round((point.x - grid.originX) / grid.cell - 0.5);
  const gy = Math.round((point.y - grid.originY) / grid.cell - 0.5);
  let best: number | null = null;
  let bestDist = Infinity;
  for (let ring = 0; ring <= rings; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (ring > 0 && Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = gx + dx;
        const y = gy + dy;
        if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue;
        const key = y * grid.width + x;
        if (grid.blocked[key] || parent[key] === -2) continue;
        const at = cellPoint(grid, key);
        const dist = Math.hypot(at.x - point.x, at.y - point.y);
        if (dist < bestDist) {
          best = key;
          bestDist = dist;
        }
      }
    }
  }
  return best;
}

function nearestFree(grid: Grid, point: Point, rings: number): number | null {
  const gx = Math.round((point.x - grid.originX) / grid.cell - 0.5);
  const gy = Math.round((point.y - grid.originY) / grid.cell - 0.5);
  const keyAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return null;
    const key = y * grid.width + x;
    return grid.blocked[key] ? null : key;
  };
  const origin = keyAt(gx, gy);
  if (origin != null) return origin;
  let best: number | null = null;
  let bestDist = Infinity;
  for (let ring = 1; ring <= rings; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const key = keyAt(gx + dx, gy + dy);
        if (key == null) continue;
        const at = cellPoint(grid, key);
        const dist = Math.hypot(at.x - point.x, at.y - point.y);
        if (dist < bestDist) {
          best = key;
          bestDist = dist;
        }
      }
    }
    if (best != null) return best;
  }
  return null;
}

function cellPoint(grid: Grid, key: number): Point {
  const gx = key % grid.width;
  const gy = Math.floor(key / grid.width);
  return {
    x: grid.originX + (gx + 0.5) * grid.cell,
    y: grid.originY + (gy + 0.5) * grid.cell,
  };
}

function trimAtHeart(points: Point[], radius: number): Point[] {
  const kept: Point[] = [];
  for (const point of points) {
    const dist = Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER);
    if (dist <= radius) {
      const prev = kept[kept.length - 1];
      if (!prev) return [];
      const prevDist = Math.hypot(prev.x - MAP_CENTER, prev.y - MAP_CENTER);
      const span = prevDist - dist;
      const t = span === 0 ? 0 : (prevDist - radius) / span;
      kept.push({
        x: prev.x + (point.x - prev.x) * t,
        y: prev.y + (point.y - prev.y) * t,
      });
      return kept;
    }
    kept.push(point);
  }
  return kept;
}

/** The bowed part of a straight run has to be at least this long. */
const WANDER_MIN = 72;
/** Keep this much of each end straight, so the door and heartfire fades do not bend. */
const WANDER_HOLD = 22;

/**
 * A few long straight runs bow a little, so a road is not a ruler line.
 * Short runs stay straight. The bend is a few map units, and most runs are skipped.
 */
export function softenCenterline(points: readonly Point[], seed: number): Point[] {
  if (points.length < 2) return points.slice();
  const total = polylineLength(points);
  const bows = planBows(points, total, mulberry32(seed ^ 0x51a7));
  if (bows.length === 0) return points.slice();
  const out: Point[] = [];
  const push = (point: Point) => {
    const prev = out[out.length - 1];
    if (prev && Math.hypot(prev.x - point.x, prev.y - point.y) < 0.35) return;
    out.push(point);
  };
  push(points[0]);
  let walked = 0;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    if (span < 1e-6) continue;
    const segFrom = walked;
    const segTo = walked + span;
    const covering = bows.filter((bow) => bow.to > segFrom + 0.2 && bow.from < segTo - 0.2);
    if (covering.length === 0) {
      push(end);
    } else {
      const steps = Math.max(2, Math.ceil(span / 16));
      const nx = -(end.y - start.y) / span;
      const ny = (end.x - start.x) / span;
      for (let step = 1; step <= steps; step++) {
        const dist = segFrom + (span * step) / steps;
        const along = (dist - segFrom) / span;
        let x = start.x + (end.x - start.x) * along;
        let y = start.y + (end.y - start.y) * along;
        const bow = covering.find((item) => dist >= item.from - 0.01 && dist <= item.to + 0.01);
        if (bow && bow.to - bow.from > 1) {
          const sag = Math.sin(((dist - bow.from) / (bow.to - bow.from)) * Math.PI) * bow.offset;
          x += nx * sag;
          y += ny * sag;
        }
        push({ x, y });
      }
    }
    walked = segTo;
  }
  return out;
}

function planBows(
  points: readonly Point[],
  total: number,
  rand: () => number,
): Array<{ from: number; to: number; offset: number }> {
  const bows: Array<{ from: number; to: number; offset: number }> = [];
  let walked = 0;
  let runFrom = 0;
  let dirX = 0;
  let dirY = 0;
  let hasDir = false;
  const closeRun = (runTo: number) => {
    const from = Math.max(runFrom, WANDER_HOLD);
    const to = Math.min(runTo, total - WANDER_HOLD);
    const length = to - from;
    if (length < WANDER_MIN) return;
    const chance = length > 150 ? 0.45 : 0.22;
    if (rand() > chance) return;
    const side = rand() < 0.5 ? -1 : 1;
    bows.push({ from, to, offset: side * (4.2 + rand() * 2.2) });
  };
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    if (span < 1e-6) continue;
    const ux = (end.x - start.x) / span;
    const uy = (end.y - start.y) / span;
    if (hasDir && dirX * ux + dirY * uy < 0.95) {
      closeRun(walked);
      runFrom = walked;
    }
    dirX = ux;
    dirY = uy;
    hasDir = true;
    walked += span;
  }
  closeRun(walked);
  return bows;
}

function ribbonPath(points: Point[], seed: number): string {
  const sampled = resample(points, 8);
  if (sampled.length < 2) return "";
  const left: Point[] = [];
  const right: Point[] = [];
  let walked = 0;
  for (let index = 0; index < sampled.length; index++) {
    const prev = sampled[Math.max(0, index - 1)];
    const next = sampled[Math.min(sampled.length - 1, index + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const length = Math.hypot(tx, ty) || 1;
    tx /= length;
    ty /= length;
    const nx = -ty;
    const ny = tx;
    if (index > 0) {
      walked += Math.hypot(sampled[index].x - sampled[index - 1].x, sampled[index].y - sampled[index - 1].y);
    }
    const wave =
      0.75 * Math.sin(walked * 0.07 + seed * 0.017) + 0.25 * Math.sin(walked * 0.16 + seed * 0.011);
    const [narrow, wide] = PATH_HALF_SWING;
    const half = narrow + (wide - narrow) * ((wave + 1) / 2);
    const jitter = Math.sin(walked * 0.13 + seed * 0.023) * PATH_JITTER;
    left.push({
      x: sampled[index].x + nx * (half + jitter),
      y: sampled[index].y + ny * (half + jitter),
    });
    right.push({
      x: sampled[index].x - nx * (half - jitter * 0.35),
      y: sampled[index].y - ny * (half - jitter * 0.35),
    });
  }
  return smoothClosedPath([...left, ...right.reverse()]);
}

function stonesAlong(points: Point[], seed: number): Array<{ d: string; tone: 0 | 1 }> {
  const total = polylineLength(points);
  if (total < 14) return [];
  const stones: Array<{ d: string; tone: 0 | 1 }> = [];
  const rand = mulberry32(seed);
  let walked = 5 + rand() * 4;
  while (walked < total - 6) {
    const at = pointAt(points, walked);
    const normal = normalAt(points, walked);
    if (!at || !normal) break;
    const offset = (rand() - 0.5) * PATH_HALF * 0.9;
    const center = { x: at.x + normal.x * offset, y: at.y + normal.y * offset };
    const size = 1.05 + rand() * 2.3;
    const spin = rand() * Math.PI;
    const kind = rand();
    let outline: Point[];
    if (kind < 0.42) outline = pebble(center, size * (0.7 + rand() * 0.35), 5 + Math.floor(rand() * 3), spin, rand);
    else if (kind < 0.74) outline = slab(center, size * (0.9 + rand() * 0.45), size * (0.32 + rand() * 0.2), spin);
    else outline = chip(center, size * (0.65 + rand() * 0.35), spin);
    stones.push({ d: polygonPath(outline), tone: rand() < 0.55 ? 0 : 1 });
    walked += 3.6 + rand() * 4.2;
  }
  return stones;
}

function pebble(
  center: Point,
  radius: number,
  sides: number,
  spin: number,
  rand: () => number,
): Point[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = spin + (index / sides) * Math.PI * 2;
    const reach = radius * (0.72 + rand() * 0.5);
    return { x: center.x + Math.cos(angle) * reach, y: center.y + Math.sin(angle) * reach * 0.82 };
  });
}

function slab(center: Point, length: number, depth: number, spin: number): Point[] {
  const local = [
    { x: -length / 2, y: -depth / 2 },
    { x: length / 2, y: -depth * 0.42 },
    { x: length * 0.46, y: depth / 2 },
    { x: -length * 0.42, y: depth * 0.4 },
  ];
  const cos = Math.cos(spin);
  const sin = Math.sin(spin);
  return local.map((point) => ({
    x: center.x + point.x * cos - point.y * sin,
    y: center.y + point.x * sin + point.y * cos,
  }));
}

function chip(center: Point, size: number, spin: number): Point[] {
  const local = [
    { x: 0, y: -size },
    { x: size * 0.85, y: size * 0.55 },
    { x: -size * 0.7, y: size * 0.4 },
  ];
  const cos = Math.cos(spin);
  const sin = Math.sin(spin);
  return local.map((point) => ({
    x: center.x + point.x * cos - point.y * sin,
    y: center.y + point.x * sin + point.y * cos,
  }));
}

/** Closed outline that passes near each sample with rounded corners. */
function smoothClosedPath(points: Point[]): string {
  if (points.length < 3) return polygonPath(points);
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const first = mid(points[points.length - 1], points[0]);
  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const end = mid(current, next);
    path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }
  return `${path} Z`;
}

function polygonPath(points: Point[]): string {
  if (points.length === 0) return "";
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index++) {
    path += ` L ${points[index].x.toFixed(2)} ${points[index].y.toFixed(2)}`;
  }
  return `${path} Z`;
}

function resample(points: Point[], spacing: number): Point[] {
  if (points.length < 2) return points.slice();
  const out: Point[] = [points[0]];
  let cursor = spacing;
  const total = polylineLength(points);
  while (cursor < total) {
    const at = pointAt(points, cursor);
    if (at) out.push(at);
    cursor += spacing;
  }
  const last = points[points.length - 1];
  const prev = out[out.length - 1];
  if (Math.hypot(prev.x - last.x, prev.y - last.y) > 0.4) out.push(last);
  return out;
}

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index++) {
    total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return total;
}

function pointFromEnd(points: readonly Point[], distance: number): Point | null {
  let left = distance;
  for (let index = points.length - 1; index > 0; index--) {
    const end = points[index];
    const start = points[index - 1];
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    if (span < 1e-6) continue;
    if (left <= span) return lerp(start, end, (span - left) / span);
    left -= span;
  }
  return points[0] ?? null;
}

function pointAt(points: Point[], distance: number): Point | null {
  let left = distance;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    if (span < 1e-6) continue;
    if (left <= span) return lerp(start, end, left / span);
    left -= span;
  }
  return points[points.length - 1] ?? null;
}

function normalAt(points: Point[], distance: number): Point | null {
  let left = distance;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    if (span < 1e-6) continue;
    if (left <= span) {
      return { x: -(end.y - start.y) / span, y: (end.x - start.x) / span };
    }
    left -= span;
  }
  return null;
}

function samplePolyline(points: Point[], spacing: number): Point[] {
  return resample(points, spacing);
}

function midpoint(points: Point[]): Point {
  const at = pointAt(points, polylineLength(points) / 2);
  return at ?? points[0] ?? { x: MAP_CENTER, y: MAP_CENTER };
}

function closestOnShape(shape: Shape, target: Point): Point {
  if (shape.kind === "circle") {
    return nudgeToward(shape.c, target, shape.r);
  }
  let best = shape.points[0];
  let bestDist = Infinity;
  for (let index = 0; index < shape.points.length; index++) {
    const start = shape.points[index];
    const end = shape.points[(index + 1) % shape.points.length];
    const point = closestOnSegment(target, start, end);
    const dist = Math.hypot(point.x - target.x, point.y - target.y);
    if (dist < bestDist) {
      best = point;
      bestDist = dist;
    }
  }
  return best;
}

function closestOnSegment(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  return { x: start.x + dx * t, y: start.y + dy * t };
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const closest = closestOnSegment(point, start, end);
  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

/** The gravel ribbon reaches this circle. Used to drop a tree the track runs through. */
export function pathMeetsCircle(points: readonly Point[], center: Point, radius: number): boolean {
  const limit = radius + PATH_RIBBON_REACH;
  for (let index = 1; index < points.length; index++) {
    if (distanceToSegment(center, points[index - 1], points[index]) <= limit) return true;
  }
  return false;
}

function distanceToShapes(point: Point, shapes: Shape[]): number {
  let best = Infinity;
  for (const shape of shapes) {
    if (shape.kind === "circle") {
      best = Math.min(best, Math.max(0, Math.hypot(point.x - shape.c.x, point.y - shape.c.y) - shape.r));
    } else {
      best = Math.min(best, pointInPolygon(point, shape.points) ? 0 : distanceToPolygon(point, shape.points));
    }
  }
  return best;
}

function distanceToPolygon(point: Point, poly: Point[]): number {
  let best = Infinity;
  for (let index = 0; index < poly.length; index++) {
    best = Math.min(best, distanceToSegment(point, poly[index], poly[(index + 1) % poly.length]));
  }
  return best;
}

function pointInPolygon(point: Point, poly: Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = poly.length - 1; index < poly.length; previous = index++) {
    const current = poly[index];
    const prior = poly[previous];
    const crosses = current.y > point.y !== prior.y > point.y;
    if (!crosses) continue;
    const xAtY = ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
    if (point.x < xAtY) inside = !inside;
  }
  return inside;
}

/** A step past the wall point, along the line from the building center. */
function doorPastWall(slot: PlacedSlot, onWall: Point): Point {
  const out = Math.hypot(onWall.x - slot.x, onWall.y - slot.y) + 1.5;
  return nudgeToward(slot, onWall, out);
}

function nudgeToward(from: Point, to: Point, distance: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / length) * distance, y: from.y + (dy / length) * distance };
}

function lerp(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

function dedupePoints(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const prev = out[out.length - 1];
    if (prev && Math.hypot(prev.x - point.x, prev.y - point.y) < 0.4) continue;
    out.push(point);
  }
  return out;
}

const SEG_CELL = 48;
const segmentBuckets = new WeakMap<object, Map<number, Array<[Point, Point]>>>();

function segmentIndex(lines: readonly { points: Point[] }[]): Map<number, Array<[Point, Point]>> {
  const known = segmentBuckets.get(lines);
  if (known) return known;
  const buckets = new Map<number, Array<[Point, Point]>>();
  for (const line of lines) {
    const pts = line.points;
    for (let index = 1; index < pts.length; index++) {
      const a = pts[index - 1];
      const b = pts[index];
      const minX = Math.floor(Math.min(a.x, b.x) / SEG_CELL);
      const maxX = Math.floor(Math.max(a.x, b.x) / SEG_CELL);
      const minY = Math.floor(Math.min(a.y, b.y) / SEG_CELL);
      const maxY = Math.floor(Math.max(a.y, b.y) / SEG_CELL);
      const seg: [Point, Point] = [a, b];
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const key = x * 8192 + y;
          const list = buckets.get(key);
          if (list) list.push(seg);
          else buckets.set(key, [seg]);
        }
      }
    }
  }
  segmentBuckets.set(lines, buckets);
  return buckets;
}

function polylinesCrossAny(points: Point[], others: readonly { points: Point[] }[]): boolean {
  return indexedCross(points, others);
}

function indexedCross(points: Point[], others: readonly { points: Point[] }[]): boolean {
  const buckets = segmentIndex(others);
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1];
    const b = points[index];
    const minX = Math.floor(Math.min(a.x, b.x) / SEG_CELL);
    const maxX = Math.floor(Math.max(a.x, b.x) / SEG_CELL);
    const minY = Math.floor(Math.min(a.y, b.y) / SEG_CELL);
    const maxY = Math.floor(Math.max(a.y, b.y) / SEG_CELL);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const list = buckets.get(x * 8192 + y);
        if (!list) continue;
        for (const seg of list) {
          if (segmentsCross(a, b, seg[0], seg[1])) return true;
        }
      }
    }
  }
  return false;
}

function polylinesCross(a: Point[], b: Point[]): boolean {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentsCross(a[i - 1], a[i], b[j - 1], b[j])) return true;
    }
  }
  return false;
}

function samePoint(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < 0.75;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  if (samePoint(a, c) || samePoint(a, d) || samePoint(b, c) || samePoint(b, d)) return false;
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (Math.abs(o1) < 1e-4 || Math.abs(o2) < 1e-4 || Math.abs(o3) < 1e-4 || Math.abs(o4) < 1e-4) return false;
  return o1 > 0 !== o2 > 0 && o3 > 0 !== o4 > 0;
}

function orient(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function mixSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function heapPush(heap: Array<{ key: number; cost: number }>, node: { key: number; cost: number }) {
  heap.push(node);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = (index - 1) >> 1;
    if (heap[parent].cost <= heap[index].cost) break;
    const swap = heap[parent];
    heap[parent] = heap[index];
    heap[index] = swap;
    index = parent;
  }
}

function heapPop(heap: Array<{ key: number; cost: number }>): { key: number; cost: number } {
  const top = heap[0];
  const last = heap.pop();
  if (!last || heap.length === 0) return top;
  heap[0] = last;
  let index = 0;
  for (; ;) {
    const left = index * 2 + 1;
    const right = left + 1;
    let smallest = index;
    if (left < heap.length && heap[left].cost < heap[smallest].cost) smallest = left;
    if (right < heap.length && heap[right].cost < heap[smallest].cost) smallest = right;
    if (smallest === index) break;
    const swap = heap[index];
    heap[index] = heap[smallest];
    heap[smallest] = swap;
    index = smallest;
  }
  return top;
}
