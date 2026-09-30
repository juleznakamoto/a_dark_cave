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
  bendsBack,
  cellPoint,
  chordCutsBuilding,
  dedupePoints,
  distanceToShapes,
  heapPop,
  heapPush,
  lerp,
  mixSeed,
  mulberry32,
  nearestFree,
  nearestReachable,
  polylineLength,
  polylinesCrossAny,
  resample,
  reverses,
  samePoint,
  sampleCubic,
  smoothTurn,
  trimAtHeart,
  worstTurn,
} from "@/pages/village-map-demo/pathwayDraw";
import {
  CELL,
  DOOR_APPROACH,
  HEART_SPLIT_CLEAR,
  INTERSECTION_REACH,
  PATH_CLEARANCE,
  continuation,
  directionAt,
  projectOnto,
  slicePolyline,
  type Grid,
  type PathEdgeBase,
  type PathField,
  type RoadSplit,
  type Shape,
} from "@/pages/village-map-demo/pathways";

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

export function mergeSplitCluster(grid: Grid, edges: PathEdgeBase[], cluster: RoadSplit[]): boolean {
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
export function splitDelay(id: string, along: number, first: boolean): number {
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

export function outwardContinuation(
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

export function pushSplitFurther(
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
export function retractHeartTrunks(edges: PathEdgeBase[], heartRadius: number): void {
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
export function spreadForks(grid: Grid, edges: PathEdgeBase[]): void {
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
export function leanSomeForksInward(grid: Grid, edges: PathEdgeBase[]): void {
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
export function dropSpikes(points: Point[]): Point[] {
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
export function separateCrowdedForks(grid: Grid, edges: PathEdgeBase[]): void {
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
export function liftShallowForks(grid: Grid, edges: PathEdgeBase[]): void {
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

export function prefixTo(points: Point[], distance: number): Point[] {
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

export function unitVector(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

export function rotateVector(vector: Point, radians: number): Point {
  const turn = Math.cos(radians);
  const rise = Math.sin(radians);
  return { x: vector.x * turn - vector.y * rise, y: vector.x * rise + vector.y * turn };
}

export function vectorAngle(a: Point, b: Point): number {
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y));
  return Math.acos(dot);
}

export function walkBranch(
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

export function resolveEdges(
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

export function routeIsLegal(
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

export function gridRoute(grid: Grid, from: Point, to: Point): Point[] | null {
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
export function exitDoor(
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
export function approachOpen(
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
export function nearestApproach(
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
