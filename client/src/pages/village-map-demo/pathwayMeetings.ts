import { MAP_CENTER } from "@/pages/village-map-demo/catalog";
import type { Point } from "@/pages/village-map-demo/geometry";
import { polylineLength, polylinesCross, samePoint } from "@/pages/village-map-demo/pathwayDraw";
import { aimedStreets, crossingStreetFits } from "@/pages/village-map-demo/pathwayLinks";
import { outwardContinuation, type RoadSplit } from "@/pages/village-map-demo/pathwayJoins";
import {
  INTERSECTION_REACH,
  directionAt,
  projectOnto,
  type Grid,
  type PathEdgeBase,
} from "@/pages/village-map-demo/pathways";

/**
 * Cross streets are placed after the roads have settled, off to the side of
 * existing forks. A street that lands near another road already joining that
 * stretch is pulled onto that join, so the two hits become one meeting.
 */

/** Placed streets stay this far from the heartfire. A pulled end keeps that. */
const LINK_HEART_CLEAR = 70;
/** An endpoint this close to a centerline is sitting on that road. */
const ON_ROAD = 2.5;

type Placed = { edge: PathEdgeBase; outerAlong: number };

type LinkHit = {
  kind: "link";
  along: number;
  link: PathEdgeBase;
  atEnd: boolean;
  at: Point;
  otherAt: Point;
  otherHost: PathEdgeBase;
  otherAlong: number;
};

type SplitHit = { kind: "split"; along: number; split: RoadSplit };

type Hit = LinkHit | SplitHit;

type Seat = { edge: PathEdgeBase; dist: number; along: number; at: Point; interior: boolean };

export function pullCrossingsIntoMeetings(grid: Grid, edges: PathEdgeBase[]): void {
  for (let pass = 0; pass < 6; pass++) {
    const walked = new Set<PathEdgeBase>();
    let changed = false;
    for (const root of heartRoots(edges)) {
      if (absorbAlong(grid, edges, root, walked)) {
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
}

function heartRoots(edges: readonly PathEdgeBase[]): PathEdgeBase[] {
  return edges.filter((edge) => {
    if (isLink(edge)) return false;
    const end = edge.points[edge.points.length - 1];
    if (!end) return false;
    return !edges.some((other) => {
      if (other === edge || isLink(other)) return false;
      const start = other.points[0];
      return start != null && samePoint(start, end);
    });
  });
}

function absorbAlong(grid: Grid, edges: PathEdgeBase[], root: PathEdgeBase, walked: Set<PathEdgeBase>): boolean {
  if (walked.has(root) || !edges.includes(root) || isLink(root)) return false;
  const chain = walkChain(edges, root);
  for (const placed of chain.placed) walked.add(placed.edge);
  const hits = chainHits(edges, chain.placed, chain.splits);
  let start = 0;
  while (start < hits.length) {
    let end = start;
    while (end + 1 < hits.length && hits[end + 1].along - hits[start].along <= INTERSECTION_REACH) end += 1;
    const cluster = hits.slice(start, end + 1);
    const splits = cluster.filter((hit) => hit.kind === "split").length;
    // Two forks of the tree stay as they are. Folding them here would move
    // door approaches that are already shaped.
    if (end > start && splits >= 2) {
      start = end + 1;
      continue;
    }
    const linked = cluster.some((hit) => hit.kind === "link");
    // A cross street next to one fork is two roads hitting the same stretch.
    const need = linked ? 2 : 3;
    if (end > start && sideCount(cluster) >= need && pullCluster(grid, edges, chain.placed, cluster)) return true;
    start += 1;
  }
  for (const split of chain.splits) {
    if (!edges.includes(split.split.heartward)) continue;
    for (const side of split.split.sides) {
      if (absorbAlong(grid, edges, side, walked)) return true;
    }
  }
  return false;
}

function walkChain(
  edges: readonly PathEdgeBase[],
  root: PathEdgeBase,
): { placed: Placed[]; splits: SplitHit[] } {
  const placed: Placed[] = [];
  const splits: SplitHit[] = [];
  let edge: PathEdgeBase | undefined = root;
  let outerAlong = 0;
  let fromPrev = 0;
  const seen = new Set<PathEdgeBase>();
  while (edge && !seen.has(edge)) {
    seen.add(edge);
    const length = polylineLength(edge.points);
    outerAlong += length;
    fromPrev += length;
    placed.push({ edge, outerAlong });
    const junction = edge.points[0];
    if (!junction) break;
    const children = treeChildren(edges, junction, edge);
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
    splits.push({
      kind: "split",
      along: outerAlong,
      split: { junction, heartward: edge, sides, onward, fromPrev },
    });
    fromPrev = 0;
    edge = onward;
  }
  return { placed, splits };
}

function chainHits(edges: readonly PathEdgeBase[], placed: readonly Placed[], splits: readonly SplitHit[]): Hit[] {
  const onChain = new Set(placed.map((item) => item.edge));
  const hits: Hit[] = [...splits];
  for (const link of edges) {
    if (!isLink(link)) continue;
    const hit = linkOnChain(edges, link, placed, onChain);
    if (hit) hits.push(hit);
  }
  hits.sort((a, b) => a.along - b.along || (a.kind === "split" ? -1 : 1));
  return hits;
}

function linkOnChain(
  edges: readonly PathEdgeBase[],
  link: PathEdgeBase,
  placed: readonly Placed[],
  onChain: ReadonlySet<PathEdgeBase>,
): LinkHit | null {
  const start = link.points[0];
  const end = link.points[link.points.length - 1];
  if (!start || !end) return null;
  const startSeat = closestHost(start, edges);
  const endSeat = closestHost(end, edges);
  const startOn = startSeat != null && onChain.has(startSeat.edge);
  const endOn = endSeat != null && onChain.has(endSeat.edge);
  if (startOn === endOn) return null;
  const here = endOn ? endSeat : startSeat;
  const there = endOn ? startSeat : endSeat;
  if (!here || !there) return null;
  const spot = placed.find((item) => item.edge === here.edge);
  if (!spot) return null;
  return {
    kind: "link",
    along: spot.outerAlong - here.along,
    link,
    atEnd: endOn,
    at: endOn ? end : start,
    otherAt: endOn ? start : end,
    otherHost: there.edge,
    otherAlong: there.along,
  };
}

function pullCluster(grid: Grid, edges: PathEdgeBase[], placed: readonly Placed[], cluster: readonly Hit[]): boolean {
  const linkHits = cluster.filter((hit): hit is LinkHit => hit.kind === "link");
  const splitHits = cluster.filter((hit): hit is SplitHit => hit.kind === "split");
  if (linkHits.length === 0 || splitHits.length >= 2) return false;
  const meet = splitHits[0]?.split.junction ?? medianPoint(linkHits);
  if (!meet) return false;
  const aims = aimsAt(grid, edges, placed, linkHits, meet);
  if (!aims || aims.size === 0) return false;
  for (const [edge, points] of aims) edge.points = points;
  return true;
}

function medianPoint(hits: readonly LinkHit[]): Point | null {
  const sorted = hits.slice().sort((a, b) => a.along - b.along);
  return sorted[Math.floor(sorted.length / 2)]?.at ?? null;
}

function aimsAt(
  grid: Grid,
  edges: readonly PathEdgeBase[],
  placed: readonly Placed[],
  linkHits: readonly LinkHit[],
  meet: Point,
): Map<PathEdgeBase, Point[]> | null {
  if (Math.hypot(meet.x - MAP_CENTER, meet.y - MAP_CENTER) <= LINK_HEART_CLEAR) return null;
  const seat = seatAt(placed, meet);
  if (!seat) return null;
  const movingLinks = new Set(linkHits.map((hit) => hit.link));
  const staticEdges = edges.filter((edge) => !movingLinks.has(edge));
  const sharing = edges.filter((edge) => !movingLinks.has(edge) && touches(edge, meet));
  const aims = new Map<PathEdgeBase, Point[]>();
  for (const hit of linkHits) {
    if (samePoint(hit.at, meet)) continue;
    const shaped = shapeLink(grid, staticEdges, hit, meet, seat, sharing);
    if (!shaped) return null;
    aims.set(hit.link, shaped);
  }
  const chosen = [...aims.values()];
  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      const left = chosen[i];
      const right = chosen[j];
      if (left && right && polylinesCross(left, right)) return null;
    }
  }
  return aims;
}

function shapeLink(
  grid: Grid,
  edges: readonly PathEdgeBase[],
  hit: LinkHit,
  meet: Point,
  seat: { edge: PathEdgeBase; dir: Point },
  sharing: readonly PathEdgeBase[],
): Point[] | null {
  const there = { x: hit.otherAt.x, y: hit.otherAt.y };
  const here = { x: meet.x, y: meet.y };
  const from = hit.atEnd ? there : here;
  const to = hit.atEnd ? here : there;
  const startSeat = hit.atEnd
    ? { at: there, dir: directionAt(hit.otherHost.points, hit.otherAlong), edge: hit.otherHost }
    : { at: here, dir: seat.dir, edge: seat.edge };
  const endSeat = hit.atEnd
    ? { at: here, dir: seat.dir, edge: seat.edge }
    : { at: there, dir: directionAt(hit.otherHost.points, hit.otherAlong), edge: hit.otherHost };
  for (const points of aimedStreets(from, to)) {
    if (points.some((point) => Math.hypot(point.x - MAP_CENTER, point.y - MAP_CENTER) <= LINK_HEART_CLEAR)) continue;
    if (!crossingStreetFits(grid, edges, points, startSeat, endSeat, sharing)) continue;
    return points;
  }
  return null;
}

function touches(edge: PathEdgeBase, point: Point): boolean {
  const start = edge.points[0];
  const end = edge.points[edge.points.length - 1];
  return (start != null && samePoint(start, point)) || (end != null && samePoint(end, point));
}

/** The road edge a meeting sits on, and the direction of that road. */
function seatAt(placed: readonly Placed[], meet: Point): { edge: PathEdgeBase; dir: Point } | null {
  let best: Seat | null = null;
  for (const item of placed) {
    const hit = projectOnto(meet, item.edge.points);
    if (hit.dist > ON_ROAD) continue;
    const length = polylineLength(item.edge.points);
    const interior = hit.along > 0.75 && hit.along < length - 0.75;
    const seat: Seat = { edge: item.edge, dist: hit.dist, along: hit.along, at: hit.at, interior };
    if (!best || seat.dist < best.dist - 0.05 || (Math.abs(seat.dist - best.dist) <= 0.05 && seat.interior && !best.interior)) {
      best = seat;
    }
  }
  if (!best) return null;
  return { edge: best.edge, dir: directionAt(best.edge.points, best.along) };
}

function closestHost(point: Point, edges: readonly PathEdgeBase[]): Seat | null {
  let best: Seat | null = null;
  for (const edge of edges) {
    if (isLink(edge)) continue;
    const hit = projectOnto(point, edge.points);
    if (hit.dist > ON_ROAD) continue;
    const length = polylineLength(edge.points);
    const interior = hit.along > 0.75 && hit.along < length - 0.75;
    const seat: Seat = { edge, dist: hit.dist, along: hit.along, at: hit.at, interior };
    if (!best || seat.dist < best.dist - 0.05 || (Math.abs(seat.dist - best.dist) <= 0.05 && seat.interior && !best.interior)) {
      best = seat;
    }
  }
  return best;
}

function treeChildren(edges: readonly PathEdgeBase[], junction: Point, self: PathEdgeBase): PathEdgeBase[] {
  return edges.filter((other) => {
    if (other === self || isLink(other)) return false;
    const end = other.points[other.points.length - 1];
    return end != null && samePoint(end, junction);
  });
}

function sideCount(hits: readonly Hit[]): number {
  let count = 0;
  for (const hit of hits) count += hit.kind === "split" ? hit.split.sides.length : 1;
  return count;
}

function isLink(edge: PathEdgeBase): boolean {
  return edge.id.startsWith("link:");
}
