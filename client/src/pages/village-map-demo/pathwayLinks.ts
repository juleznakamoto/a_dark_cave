import { MAP_CENTER } from "@/pages/village-map-demo/catalog";
import type { Point } from "@/pages/village-map-demo/geometry";
import {
  dedupePoints,
  polylineLength,
  polylinesCross,
  reverses,
} from "@/pages/village-map-demo/pathwayDraw";

/** Structural slice of a routed road. Kept local so this file does not import the router. */
type RoadEdge = {
  id: string;
  slotIds: string[];
  points: Point[];
};

type RoadGrid = {
  heartRadius: number;
  blockedPoint: (point: Point) => boolean;
};

/**
 * A few streets between roads that already lead to the heartfire.
 * The routes stay a tree. These links only tie neighboring roads together
 * where the gap is open, so the lanes read as a village instead of spokes.
 */

/** Shortest gap worth a street. Closer roads already read as one lane. */
const LINK_MIN = 36;
/** Longest gap that still reads as a lane between two roads, not a new highway. */
const LINK_MAX = 190;
const LINK_CAP = 10;
/** Stay off existing forks, so a new street does not pile onto a junction. */
const JOIN_MARGIN = 28;
/** Door spurs keep their straight leave. The link starts further out. */
const DOOR_MARGIN = 52;
/** Inside this radius the spokes are the heartfire's own branches. */
const MIN_RADIUS = 80;
/** Undirected angle between the street and each road, in degrees. */
const MIN_MEET = 42;
const SAMPLE_STEP = 18;
/** Chosen streets stay this far apart, so they do not clump in one quarter. */
const SPREAD = 58;
const BOW = 8;

type Sample = {
  edge: RoadEdge;
  along: number;
  at: Point;
  dir: Point;
};

type Candidate = {
  a: Sample;
  b: Sample;
  points: Point[];
  score: number;
  key: string;
};

/**
 * The routed street stops on the road's center. The drawn road can sit a
 * little to the side of that line, so the street's round end lands beside
 * the gravel and shows up as a bump. Move each end onto the middle of the
 * drawn road. Stopping there keeps the round end inside the lane.
 */
export function buryStreetEnds(points: readonly Point[], hosts: readonly Point[][], bury: number): Point[] {
  if (points.length < 2 || hosts.length === 0) return points.slice();
  const next = points.slice();
  next[0] = buriedEnd(points[0], points[1], hosts, bury);
  const last = points.length - 1;
  next[last] = buriedEnd(points[last], points[last - 1], hosts, bury);
  return next;
}

export function linkNearbyRoads(grid: RoadGrid, edges: RoadEdge[]): void {
  const parent = heartwardParents(edges);
  const samples = collectSamples(edges, parent);
  const chosen = pickLinks(grid, edges, samples, parent);
  for (let index = 0; index < chosen.length; index++) {
    const link = chosen[index];
    edges.push({
      id: `link:${index}`,
      slotIds: unionIds(link.a.edge.slotIds, link.b.edge.slotIds),
      points: link.points,
    });
  }
}

function unionIds(a: readonly string[], b: readonly string[]): string[] {
  const ids = new Set<string>();
  for (const id of a) ids.add(id);
  for (const id of b) ids.add(id);
  return [...ids].sort();
}

function heartwardParents(edges: readonly RoadEdge[]): Map<RoadEdge, RoadEdge> {
  const parent = new Map<RoadEdge, RoadEdge>();
  for (const edge of edges) {
    const end = edge.points[edge.points.length - 1];
    if (!end) continue;
    const next = edges.find((other) => {
      const start = other.points[0];
      return other !== edge && start != null && same(start, end);
    });
    if (next) parent.set(edge, next);
  }
  return parent;
}

function collectSamples(
  edges: readonly RoadEdge[],
  parent: ReadonlyMap<RoadEdge, RoadEdge>,
): Sample[] {
  const samples: Sample[] = [];
  for (const edge of edges) {
    const points = edge.points;
    const total = polylineLength(points);
    const margin = edge.slotIds.length === 1 ? DOOR_MARGIN : JOIN_MARGIN;
    if (total < margin + JOIN_MARGIN + SAMPLE_STEP) continue;
    const heartBase = chainLength(parent, edge);
    for (let along = margin; along <= total - JOIN_MARGIN; along += SAMPLE_STEP) {
      const fromHeart = heartBase + (total - along);
      if (fromHeart < 56) continue;
      const at = pointOn(points, along);
      const radius = Math.hypot(at.x - MAP_CENTER, at.y - MAP_CENTER);
      if (radius < MIN_RADIUS) continue;
      samples.push({ edge, along, at, dir: directionAt(points, along) });
    }
  }
  return samples;
}

function chainLength(parent: ReadonlyMap<RoadEdge, RoadEdge>, edge: RoadEdge): number {
  let length = 0;
  let cursor = parent.get(edge);
  const seen = new Set<RoadEdge>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    length += polylineLength(cursor.points);
    cursor = parent.get(cursor);
  }
  return length;
}

function pickLinks(
  grid: RoadGrid,
  edges: readonly RoadEdge[],
  samples: readonly Sample[],
  parent: ReadonlyMap<RoadEdge, RoadEdge>,
): Candidate[] {
  const best = new Map<string, Candidate>();
  const buckets = new Map<string, number[]>();
  const cell = LINK_MAX;
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];
    const key = bucketKey(sample.at, cell);
    const list = buckets.get(key);
    if (list) list.push(index);
    else buckets.set(key, [index]);
  }
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];
    const gx = Math.floor(sample.at.x / cell);
    const gy = Math.floor(sample.at.y / cell);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const list = buckets.get(`${gx + ox}:${gy + oy}`);
        if (!list) continue;
        for (const otherIndex of list) {
          if (otherIndex <= index) continue;
          const other = samples[otherIndex];
          const candidate = consider(grid, edges, sample, other, parent);
          if (!candidate) continue;
          const known = best.get(candidate.key);
          if (!known || candidate.score > known.score) best.set(candidate.key, candidate);
        }
      }
    }
  }
  const ranked = [...best.values()].sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1));
  const chosen: Candidate[] = [];
  const used: Array<{ edge: RoadEdge; along: number }> = [];
  for (const candidate of ranked) {
    if (chosen.length >= LINK_CAP) break;
    if (!seatFree(used, candidate.a) || !seatFree(used, candidate.b)) continue;
    if (chosen.some((link) => polylinesCross(link.points, candidate.points))) continue;
    const mid = midpoint(candidate.points);
    if (chosen.some((link) => Math.hypot(midpoint(link.points).x - mid.x, midpoint(link.points).y - mid.y) < SPREAD)) {
      continue;
    }
    chosen.push(candidate);
    used.push({ edge: candidate.a.edge, along: candidate.a.along }, { edge: candidate.b.edge, along: candidate.b.along });
  }
  return chosen;
}

function seatFree(used: readonly { edge: RoadEdge; along: number }[], sample: Sample): boolean {
  const hits = used.filter((item) => item.edge === sample.edge);
  if (hits.length >= 2) return false;
  return hits.every((item) => Math.abs(item.along - sample.along) >= 64);
}

function consider(
  grid: RoadGrid,
  edges: readonly RoadEdge[],
  a: Sample,
  b: Sample,
  parent: ReadonlyMap<RoadEdge, RoadEdge>,
): Candidate | null {
  if (a.edge === b.edge || sameChain(parent, a.edge, b.edge) || shareJunction(a.edge, b.edge)) return null;
  const gap = Math.hypot(b.at.x - a.at.x, b.at.y - a.at.y);
  if (gap < LINK_MIN || gap > LINK_MAX) return null;
  const points = streetBetween(a, b).find((shape) => streetFits(grid, edges, shape, a, b));
  if (!points) return null;
  const dx = b.at.x - a.at.x;
  const dy = b.at.y - a.at.y;
  const len = Math.hypot(dx, dy) || 1;
  const link = { x: dx / len, y: dy / len };
  const radialX = (a.at.x + b.at.x) / 2 - MAP_CENTER;
  const radialY = (a.at.y + b.at.y) / 2 - MAP_CENTER;
  const radial = Math.hypot(radialX, radialY) || 1;
  const tangential = Math.abs((radialX / radial) * link.y - (radialY / radial) * link.x);
  const meet = lineAngle(a.dir, link) + lineAngle(b.dir, link);
  const score = meet + tangential * 36 - Math.abs(gap - 86) * 0.18;
  const key = a.edge.id < b.edge.id ? `${a.edge.id}|${b.edge.id}` : `${b.edge.id}|${a.edge.id}`;
  return { a, b, points, score, key };
}

function streetBetween(a: Sample, b: Sample): Point[][] {
  return aimedStreets(a.at, b.at);
}

/** Bowed runs from `from` to `to`. Straight is last, so a bend is preferred. */
export function aimedStreets(from: Point, to: Point): Point[][] {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const outward = (mid.x - MAP_CENTER) * px + (mid.y - MAP_CENTER) * py;
  const sign = outward >= 0 ? 1 : -1;
  const bow = (amount: number): Point => ({
    x: mid.x + px * amount * sign,
    y: mid.y + py * amount * sign,
  });
  const start = { x: from.x, y: from.y };
  const end = { x: to.x, y: to.y };
  // Stop on each road's center. Riding along the road first makes the ribbon
  // corner flare into a bump where the street peels off.
  return [
    dedupePoints([start, bow(BOW), end]),
    dedupePoints([start, bow(-BOW), end]),
    dedupePoints([start, end]),
  ].filter((points) => points.length >= 2 && !reverses(points));
}

function streetFits(grid: RoadGrid, edges: readonly RoadEdge[], points: Point[], a: Sample, b: Sample): boolean {
  if (!meetsAtAngle(points, a, b)) return false;
  if (!centerlineOpen(grid, points, a.at, b.at)) return false;
  if (edges.some((edge) => edge !== a.edge && edge !== b.edge && polylinesCross(points, edge.points))) return false;
  if (polylinesCross(points, a.edge.points) || polylinesCross(points, b.edge.points)) return false;
  return middleStandsOff(points, edges, a.edge, b.edge, a.at, b.at);
}

/**
 * A street pulled onto an existing meeting may meet a little shallower than a
 * new street. Still a corner, not a slide along the road.
 */
const MEETING_JOIN = 30;

/** The street has to leave each road at a real corner, not slide along it. */
function meetsAtAngle(points: Point[], a: Sample, b: Sample, min = MIN_MEET): boolean {
  const leaveA = departDirection(points, a.at, false);
  const leaveB = departDirection(points, b.at, true);
  if (!leaveA || !leaveB) return false;
  return lineAngle(a.dir, leaveA) >= min && lineAngle(b.dir, leaveB) >= min;
}

/**
 * A cross street retargeted onto a meeting. `start` is the first point and
 * `end` is the last. Edges that are about to move can be left out of `edges`.
 */
export function crossingStreetFits(
  grid: RoadGrid,
  edges: readonly RoadEdge[],
  points: Point[],
  start: { at: Point; dir: Point; edge: RoadEdge },
  end: { at: Point; dir: Point; edge: RoadEdge },
  sharing: readonly RoadEdge[] = [],
): boolean {
  const sample = (seat: { at: Point; dir: Point; edge: RoadEdge }): Sample => ({
    edge: seat.edge,
    along: 0,
    at: seat.at,
    dir: seat.dir,
  });
  const a = sample(start);
  const b = sample(end);
  if (!meetsAtAngle(points, a, b, MEETING_JOIN)) return false;
  if (!centerlineOpen(grid, points, a.at, b.at)) return false;
  if (edges.some((edge) => edge !== a.edge && edge !== b.edge && polylinesCross(points, edge.points))) return false;
  if (polylinesCross(points, a.edge.points) || polylinesCross(points, b.edge.points)) return false;
  return middleStandsOff(points, edges, a.edge, b.edge, a.at, b.at, true, sharing);
}

function departDirection(points: readonly Point[], join: Point, atEnd: boolean): Point | null {
  const index = points.findIndex((point) => same(point, join));
  if (index < 0) return null;
  const other = points[atEnd ? index - 1 : index + 1];
  if (!other) return null;
  const dx = atEnd ? join.x - other.x : other.x - join.x;
  const dy = atEnd ? join.y - other.y : other.y - join.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  return { x: dx / len, y: dy / len };
}

function centerlineOpen(grid: RoadGrid, points: readonly Point[], joinA: Point, joinB: Point): boolean {
  let walked = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(span / 4));
    for (let step = 0; step <= steps; step++) {
      const point = {
        x: from.x + ((to.x - from.x) * step) / steps,
        y: from.y + ((to.y - from.y) * step) / steps,
      };
      const nearJoin =
        Math.hypot(point.x - joinA.x, point.y - joinA.y) < 10 ||
        Math.hypot(point.x - joinB.x, point.y - joinB.y) < 10;
      if (nearJoin) continue;
      if (tooCloseToHeart(grid, point) || grid.blockedPoint(point)) return false;
    }
    walked += span;
  }
  return walked > 0;
}

function tooCloseToHeart(grid: RoadGrid, point: Point): boolean {
  return Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER) <= grid.heartRadius + 16;
}

function middleStandsOff(
  points: readonly Point[],
  edges: readonly RoadEdge[],
  hostA: RoadEdge,
  hostB: RoadEdge,
  joinA: Point,
  joinB: Point,
  allowUnsampled = false,
  sharing: readonly RoadEdge[] = [],
): boolean {
  let checked = 0;
  let walked = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(span / 8));
    for (let step = 1; step <= steps; step++) {
      const point = {
        x: from.x + ((to.x - from.x) * step) / steps,
        y: from.y + ((to.y - from.y) * step) / steps,
      };
      if (Math.hypot(point.x - joinA.x, point.y - joinA.y) < 16) continue;
      if (Math.hypot(point.x - joinB.x, point.y - joinB.y) < 16) continue;
      checked += 1;
      for (const edge of edges) {
        const gap = edge === hostA || edge === hostB || sharing.includes(edge) ? 8 : 12;
        if (projectOnto(point, edge.points).dist < gap) return false;
      }
    }
    walked += span;
  }
  if (checked === 0) return allowUnsampled && walked > 0;
  return walked > 0;
}

function sameChain(parent: ReadonlyMap<RoadEdge, RoadEdge>, a: RoadEdge, b: RoadEdge): boolean {
  return reaches(parent, a, b) || reaches(parent, b, a);
}

function reaches(
  parent: ReadonlyMap<RoadEdge, RoadEdge>,
  from: RoadEdge,
  target: RoadEdge,
): boolean {
  let cursor: RoadEdge | undefined = from;
  const seen = new Set<RoadEdge>();
  while (cursor && !seen.has(cursor)) {
    if (cursor === target) return true;
    seen.add(cursor);
    cursor = parent.get(cursor);
  }
  return false;
}

function shareJunction(a: RoadEdge, b: RoadEdge): boolean {
  const aEnds = [a.points[0], a.points[a.points.length - 1]];
  const bEnds = [b.points[0], b.points[b.points.length - 1]];
  return aEnds.some((left) => left != null && bEnds.some((right) => right != null && same(left, right)));
}

function lineAngle(a: Point, b: Point): number {
  const dot = Math.abs(a.x * b.x + a.y * b.y);
  return (Math.acos(Math.min(1, dot)) * 180) / Math.PI;
}

function bucketKey(point: Point, cell: number): string {
  return `${Math.floor(point.x / cell)}:${Math.floor(point.y / cell)}`;
}

function midpoint(points: readonly Point[]): Point {
  const index = Math.floor(points.length / 2);
  return points[index] ?? points[0] ?? { x: MAP_CENTER, y: MAP_CENTER };
}

function directionAt(poly: readonly Point[], along: number): Point {
  let walked = 0;
  for (let index = 1; index < poly.length; index++) {
    const start = poly[index - 1];
    const end = poly[index];
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    if (span < 1e-6) continue;
    if (walked + span >= along || index === poly.length - 1) {
      const len = span || 1;
      return { x: (end.x - start.x) / len, y: (end.y - start.y) / len };
    }
    walked += span;
  }
  return { x: 1, y: 0 };
}

/** Drawn roads wander off the routed line, and a dragged road can sit further. Past this, the nearest line is some other road. */
const HOST_SNAP = 16;

function buriedEnd(end: Point, prev: Point, hosts: readonly Point[][], bury: number): Point {
  const hit = closestHostPoint(end, hosts);
  if (!hit || hit.dist > HOST_SNAP) return end;
  const dx = hit.at.x - prev.x;
  const dy = hit.at.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: hit.at.x + (dx / len) * bury, y: hit.at.y + (dy / len) * bury };
}

function closestHostPoint(point: Point, hosts: readonly Point[][]): { at: Point; dist: number } | null {
  let best: { at: Point; dist: number } | null = null;
  for (const host of hosts) {
    for (let index = 1; index < host.length; index++) {
      const start = host[index - 1];
      const end = host[index];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lenSq = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lenSq));
      const at = { x: start.x + dx * t, y: start.y + dy * t };
      const dist = Math.hypot(point.x - at.x, point.y - at.y);
      if (!best || dist < best.dist) best = { at, dist };
    }
  }
  return best;
}

function projectOnto(point: Point, poly: readonly Point[]): { dist: number } {
  let best = Infinity;
  for (let index = 1; index < poly.length; index++) {
    const start = poly[index - 1];
    const end = poly[index];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lenSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lenSq));
    const dist = Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
    if (dist < best) best = dist;
  }
  return { dist: best };
}

function pointOn(points: readonly Point[], distance: number): Point {
  let left = distance;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    if (span < 1e-6) continue;
    if (left <= span) {
      const t = left / span;
      return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    }
    left -= span;
  }
  return points[points.length - 1] ?? { x: MAP_CENTER, y: MAP_CENTER };
}

function same(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < 0.75;
}
