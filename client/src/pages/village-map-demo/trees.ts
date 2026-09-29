import { smoothClosedPath, type Point } from "@/pages/village-map-demo/geometry";

const TAU = Math.PI * 2;
const SAMPLES = 72;
/** How far two arc ends may sit and still be the same corner of the outline. */
const JOIN = 3.6;

type Circle = { x: number; y: number; r: number };

export type Crown = {
  x: number;
  y: number;
  /** Puff size before the rim bumps. */
  r: number;
  lobes: number;
  seed: number;
  /** 1 is round. Larger values stretch the crown sideways. */
  stretch?: number;
};

export type TreeVariant = {
  id: string;
  label: string;
  crowns: Crown[];
};

export type DrawnTree = {
  outline: string;
  foliage: string;
  loops: number;
};

function hash(seed: number, index: number): number {
  const n = Math.sin(seed * 127.1 + index * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function pointOn(circle: Circle, angle: number): Point {
  return {
    x: circle.x + Math.cos(angle) * circle.r,
    y: circle.y + Math.sin(angle) * circle.r,
  };
}

/**
 * A crown is a handful of overlapping circles. The pen only draws the outside
 * of that pile, which is the scalloped cloud in the sketch.
 */
function bumpsForCrown(crown: Crown): Circle[] {
  const stretch = crown.stretch ?? 1;
  const circles: Circle[] = [];
  const hearts = Math.max(1, Math.round(stretch));
  for (let heart = 0; heart < hearts; heart++) {
    const t = hearts === 1 ? 0 : (heart / (hearts - 1) - 0.5) * 2;
    circles.push({
      x: crown.x + t * crown.r * Math.max(0, stretch - 0.55),
      y: crown.y,
      r: crown.r * 0.58,
    });
  }
  const bumpR = crown.r * 0.58;
  const orbit = crown.r * 0.5;
  for (let lobe = 0; lobe < crown.lobes; lobe++) {
    const spin = hash(crown.seed, lobe);
    const size = hash(crown.seed, lobe + 19);
    const angle = ((lobe + spin * 0.2) / crown.lobes) * TAU + (spin - 0.5) * 0.16;
    const reach = orbit * (0.92 + (size - 0.5) * 0.12);
    circles.push({
      x: crown.x + Math.cos(angle) * reach * stretch,
      y: crown.y + Math.sin(angle) * reach,
      r: bumpR * (0.78 + spin * 0.36),
    });
  }
  return circles;
}

function covered(point: Point, circles: Circle[], self: number): boolean {
  for (let index = 0; index < circles.length; index++) {
    if (index === self) continue;
    const circle = circles[index];
    if (Math.hypot(point.x - circle.x, point.y - circle.y) < circle.r - 0.3) return true;
  }
  return false;
}

type Run = { circle: number; start: number; end: number };

function exposedRuns(circles: Circle[]): Run[] {
  const runs: Run[] = [];
  for (let index = 0; index < circles.length; index++) {
    const exposed = Array.from({ length: SAMPLES }, (_, sample) => {
      const angle = (sample / SAMPLES) * TAU;
      return !covered(pointOn(circles[index], angle), circles, index);
    });
    if (exposed.every(Boolean)) {
      runs.push({ circle: index, start: 0, end: TAU });
      continue;
    }
    const origin = Math.max(0, exposed.findIndex((flag) => !flag));
    let walked = 0;
    while (walked < SAMPLES) {
      if (!exposed[(origin + walked) % SAMPLES]) {
        walked += 1;
        continue;
      }
      const startSample = (origin + walked) % SAMPLES;
      let length = 0;
      while (length < SAMPLES && exposed[(origin + walked) % SAMPLES]) {
        walked += 1;
        length += 1;
      }
      const start = (startSample / SAMPLES) * TAU;
      let end = (((startSample + length) % SAMPLES) / SAMPLES) * TAU;
      if (end <= start) end += TAU;
      if (end - start > 0.22) runs.push({ circle: index, start, end });
    }
  }
  return runs;
}

function arcPoints(circle: Circle, start: number, end: number): Point[] {
  const span = end - start;
  const steps = Math.max(2, Math.round(span / (Math.PI / 9)));
  const points: Point[] = [];
  for (let step = 0; step < steps; step++) {
    points.push(pointOn(circle, start + (span * step) / steps));
  }
  return points;
}

function circleAtRim(point: Point, circles: Circle[], exclude: number): number {
  let best = -1;
  let bestGap = 2;
  for (let index = 0; index < circles.length; index++) {
    if (index === exclude) continue;
    const circle = circles[index];
    const gap = Math.abs(Math.hypot(point.x - circle.x, point.y - circle.y) - circle.r);
    if (gap < bestGap) {
      best = index;
      bestGap = gap;
    }
  }
  return best;
}

function dedupe(points: Point[]): Point[] {
  const cleaned: Point[] = [];
  for (const point of points) {
    const previous = cleaned[cleaned.length - 1];
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.4) continue;
    cleaned.push(point);
  }
  if (cleaned.length > 2) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 0.4) cleaned.pop();
  }
  return cleaned;
}

function polygonArea(points: Point[]): number {
  let sum = 0;
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

function nearestRun(tail: Point, runs: Run[], circles: Circle[], unused: Set<number>, only: number): number {
  let best = -1;
  let bestDist = JOIN;
  for (const index of unused) {
    if (only >= 0 && runs[index].circle !== only) continue;
    const start = pointOn(circles[runs[index].circle], runs[index].start);
    const dist = Math.hypot(start.x - tail.x, start.y - tail.y);
    if (dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  }
  return best;
}

function chainLoops(circles: Circle[], runs: Run[]): Point[][] {
  const unused = new Set(runs.map((_, index) => index));
  const loops: Point[][] = [];
  while (unused.size > 0) {
    const first = unused.values().next().value;
    if (first == null) break;
    unused.delete(first);
    const order = [first];
    for (let guard = 0; guard < runs.length + 1; guard++) {
      const run = runs[order[order.length - 1]];
      const tail = pointOn(circles[run.circle], run.end);
      const head = pointOn(circles[runs[order[0]].circle], runs[order[0]].start);
      if (Math.hypot(tail.x - head.x, tail.y - head.y) < JOIN) break;
      const neighbor = circleAtRim(tail, circles, run.circle);
      let next = nearestRun(tail, runs, circles, unused, neighbor);
      if (next < 0) next = nearestRun(tail, runs, circles, unused, -1);
      if (next < 0) break;
      unused.delete(next);
      order.push(next);
    }
    const points = dedupe(
      order.flatMap((index) => arcPoints(circles[runs[index].circle], runs[index].start, runs[index].end)),
    );
    if (points.length >= 8 && polygonArea(points) >= 14) loops.push(points);
  }
  return loops;
}

function arcPath(cx: number, cy: number, radius: number, start: number, sweep: number): string {
  const x1 = cx + Math.cos(start) * radius;
  const y1 = cy + Math.sin(start) * radius;
  const x2 = cx + Math.cos(start + sweep) * radius;
  const y2 = cy + Math.sin(start + sweep) * radius;
  const large = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep > 0 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${large} ${sweepFlag} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function strokeInside(cx: number, cy: number, radius: number, start: number, sweep: number, circles: Circle[]): boolean {
  for (let step = 0; step <= 5; step++) {
    const angle = start + sweep * (step / 5);
    const point = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    const inside = circles.some((circle) => Math.hypot(point.x - circle.x, point.y - circle.y) < circle.r - 1.4);
    if (!inside) return false;
  }
  return true;
}

/** Short curves inside the puff. The sketch never fills the crown solid. */
function foliageForCrown(crown: Crown, circles: Circle[]): string[] {
  const marks: string[] = [];
  const heartMarks = crown.r > 12 ? 3 : 2;
  for (let mark = 0; mark < heartMarks; mark++) {
    const start = hash(crown.seed, 40 + mark) * TAU;
    const sweep = (0.55 + hash(crown.seed, 60 + mark) * 0.7) * (hash(crown.seed, 80 + mark) > 0.5 ? 1 : -1);
    const radius = crown.r * (0.22 + hash(crown.seed, 100 + mark) * 0.22);
    if (strokeInside(crown.x, crown.y, radius, start, sweep, circles)) {
      marks.push(arcPath(crown.x, crown.y, radius, start, sweep));
    }
  }
  const lobeCount = crown.lobes;
  for (let lobe = 0; lobe < lobeCount; lobe++) {
    if (hash(crown.seed, 120 + lobe) < 0.62) continue;
    const spin = hash(crown.seed, lobe);
    const angle = ((lobe + spin * 0.2) / lobeCount) * TAU;
    const reach = crown.r * 0.62 * (crown.stretch ?? 1);
    const cx = crown.x + Math.cos(angle) * reach * 0.55;
    const cy = crown.y + Math.sin(angle) * crown.r * 0.34;
    const start = angle - 0.45;
    const sweep = 0.5 + hash(crown.seed, 160 + lobe) * 0.55;
    const radius = crown.r * (0.28 + hash(crown.seed, 180 + lobe) * 0.16);
    if (strokeInside(cx, cy, radius, start, sweep, circles)) {
      marks.push(arcPath(cx, cy, radius, start, sweep));
    }
  }
  return marks;
}

/** How far the crown reaches from its own center, in map units. */
export function treeReach(variant: TreeVariant): number {
  let reach = 8;
  for (const crown of variant.crowns) {
    const stretch = crown.stretch ?? 1;
    const edge = Math.hypot(crown.x, crown.y) + crown.r * Math.max(stretch, 1) * 1.15;
    reach = Math.max(reach, edge);
  }
  return reach;
}

export function drawTree(variant: TreeVariant): DrawnTree {
  const circles = variant.crowns.flatMap(bumpsForCrown);
  const loops = chainLoops(circles, exposedRuns(circles));
  const foliage = variant.crowns.flatMap((crown) => foliageForCrown(crown, circles)).join(" ");
  return {
    outline: loops.map((points) => smoothClosedPath(points, 0.42)).join(" "),
    foliage,
    loops: loops.length,
  };
}

function ring(count: number, orbit: number, radius: number, seed: number): Crown[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * TAU - Math.PI / 2;
    return {
      x: Math.cos(angle) * orbit,
      y: Math.sin(angle) * orbit,
      r: radius,
      lobes: 6,
      seed: seed + index * 3,
    };
  });
}

/** Ten plan-view crowns. Sizes are in the same units as a wooden hut on the map. */
export const TREE_VARIANTS: TreeVariant[] = [
  {
    id: "puff",
    label: "Small puff",
    crowns: [{ x: 0, y: 0, r: 9, lobes: 6, seed: 3 }],
  },
  {
    id: "round",
    label: "Round crown",
    crowns: [{ x: 0, y: 0, r: 16, lobes: 7, seed: 8 }],
  },
  {
    id: "twin",
    label: "Twin crowns",
    crowns: [
      { x: -11, y: 1, r: 12, lobes: 7, seed: 11 },
      { x: 11, y: -2, r: 11, lobes: 7, seed: 14 },
    ],
  },
  {
    id: "trio",
    label: "Three together",
    crowns: [
      { x: 0, y: -11, r: 11, lobes: 7, seed: 21 },
      { x: -12, y: 8, r: 10, lobes: 6, seed: 24 },
      { x: 12, y: 7, r: 11, lobes: 7, seed: 27 },
    ],
  },
  {
    id: "sprigs",
    label: "Large with sprigs",
    crowns: [
      { x: -4, y: 0, r: 14, lobes: 8, seed: 31 },
      { x: 18, y: -14, r: 8, lobes: 6, seed: 34 },
      { x: 16, y: 15, r: 7.5, lobes: 5, seed: 37 },
    ],
  },
  {
    id: "hedge",
    label: "Field hedge",
    crowns: [-30, -15, 0, 15, 30].map((x, index) => ({
      x,
      y: Math.sin(index * 0.9) * 3,
      r: 10,
      lobes: 6,
      seed: 41 + index * 2,
    })),
  },
  {
    id: "grove",
    label: "Grove",
    crowns: [
      { x: -10, y: -6, r: 12, lobes: 7, seed: 51 },
      { x: 10, y: -8, r: 11, lobes: 6, seed: 54 },
      { x: -16, y: 10, r: 10, lobes: 6, seed: 57 },
      { x: 4, y: 12, r: 12, lobes: 7, seed: 60 },
      { x: 18, y: 4, r: 9, lobes: 6, seed: 63 },
    ],
  },
  {
    id: "long",
    label: "Long crown",
    crowns: [{ x: 0, y: 0, r: 13, lobes: 11, seed: 71, stretch: 1.65 }],
  },
  {
    id: "ring",
    label: "Ring of crowns",
    crowns: ring(6, 16, 10, 81),
  },
  {
    id: "saplings",
    label: "Three saplings",
    crowns: [
      { x: -28, y: 4, r: 8, lobes: 6, seed: 91 },
      { x: 0, y: -6, r: 9, lobes: 7, seed: 94 },
      { x: 26, y: 5, r: 7, lobes: 6, seed: 97 },
    ],
  },
];

const TREE_BY_ID = new Map(TREE_VARIANTS.map((variant) => [variant.id, variant]));

export function treeVariant(id: string): TreeVariant | undefined {
  return TREE_BY_ID.get(id);
}
