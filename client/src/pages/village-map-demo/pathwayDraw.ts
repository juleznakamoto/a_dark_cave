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
  approachOpen,
  gridRoute,
  prefixTo,
  rotateVector,
  unitVector,
  vectorAngle,
} from "@/pages/village-map-demo/pathwayJoins";
import {
  CELL,
  DOOR_APPROACH,
  DOOR_OUTSET,
  GENTLE_RUNS,
  PATH_CLEARANCE,
  PATH_HALF,
  PATH_HALF_SWING,
  PATH_JITTER,
  PATH_RIBBON_REACH,
  beyondShapeBox,
  shapeBoxes,
  slotShapes,
  type Grid,
  type PathEdgeBase,
  type Shape,
} from "@/pages/village-map-demo/pathways";

/**
 * Walk out through this building's own padding, around other buildings,
 * until the path reaches the shared road. Used when no straight leave exists.
 */
export function doorRoute(
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

export function connectDoor(
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
export function doorLeave(
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

export function shapesNear(
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
export function nearestWallNormal(shapes: Shape[], door: Point): Point {
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

export function sampleCubic(from: Point, controlA: Point, controlB: Point, to: Point, steps: number): Point[] {
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
export function smoothTurn(
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
export function worstTurn(points: Point[]): number {
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
export function reverses(points: Point[]): boolean {
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
export function bendsBack(points: Point[], distance: number): boolean {
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
export function roadBeyond(base: Point[], tail: Point[]): Point[] {
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
export function rightAngleJoin(
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
export function pathClearsOwn(points: Point[], door: Point, shapes: Shape[]): boolean {
  for (const point of samplePolyline(points, 4)) {
    const gap = distanceToShapes(point, shapes);
    if (gap >= PATH_CLEARANCE - CELL) continue;
    if (gap > 0.4 && Math.hypot(point.x - door.x, point.y - door.y) <= 80) continue;
    return false;
  }
  return true;
}

/** The centerline keeps the same gap from other buildings as the rest of the road. */
export function routeClearsOthers(points: Point[], door: Point, nearby: Shape[][]): boolean {
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

export function chordCutsBuilding(from: Point, to: Point, shapes: Shape[]): boolean {
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
export function nearestReachable(grid: Grid, parent: Int32Array, point: Point, rings: number): number | null {
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

export function nearestFree(grid: Grid, point: Point, rings: number): number | null {
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

export function cellPoint(grid: Grid, key: number): Point {
  const gx = key % grid.width;
  const gy = Math.floor(key / grid.width);
  return {
    x: grid.originX + (gx + 0.5) * grid.cell,
    y: grid.originY + (gy + 0.5) * grid.cell,
  };
}

export function trimAtHeart(points: Point[], radius: number): Point[] {
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

export function ribbonPath(points: Point[], seed: number): string {
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

export function stonesAlong(points: Point[], seed: number): Array<{ d: string; tone: 0 | 1 }> {
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

export function resample(points: Point[], spacing: number): Point[] {
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

export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index++) {
    total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return total;
}

export function pointFromEnd(points: readonly Point[], distance: number): Point | null {
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

export function pointAt(points: Point[], distance: number): Point | null {
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

export function samplePolyline(points: Point[], spacing: number): Point[] {
  return resample(points, spacing);
}

export function midpoint(points: Point[]): Point {
  const at = pointAt(points, polylineLength(points) / 2);
  return at ?? points[0] ?? { x: MAP_CENTER, y: MAP_CENTER };
}

export function closestOnShape(shape: Shape, target: Point): Point {
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

export function distanceToShapes(point: Point, shapes: Shape[]): number {
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

export function distanceToPolygon(point: Point, poly: Point[]): number {
  let best = Infinity;
  for (let index = 0; index < poly.length; index++) {
    best = Math.min(best, distanceToSegment(point, poly[index], poly[(index + 1) % poly.length]));
  }
  return best;
}

export function pointInPolygon(point: Point, poly: Point[]): boolean {
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
export function doorPastWall(slot: PlacedSlot, onWall: Point): Point {
  const out = Math.hypot(onWall.x - slot.x, onWall.y - slot.y) + DOOR_OUTSET;
  return nudgeToward(slot, onWall, out);
}

export function nudgeToward(from: Point, to: Point, distance: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / length) * distance, y: from.y + (dy / length) * distance };
}

export function lerp(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

export function dedupePoints(points: Point[]): Point[] {
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

export function polylinesCrossAny(points: Point[], others: readonly { points: Point[] }[]): boolean {
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

export function polylinesCross(a: Point[], b: Point[]): boolean {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentsCross(a[i - 1], a[i], b[j - 1], b[j])) return true;
    }
  }
  return false;
}

export function samePoint(a: Point, b: Point): boolean {
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

export function mixSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function heapPush(heap: Array<{ key: number; cost: number }>, node: { key: number; cost: number }) {
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

export function heapPop(heap: Array<{ key: number; cost: number }>): { key: number; cost: number } {
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
