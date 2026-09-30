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
  placePoints,
  rectLocal,
  tangentAngle,
} from "@/pages/village-map-demo/geometryFrame";

export type Point = { x: number; y: number };

/** Building positions sit on whole pixels. */
export function snapToPixel(point: Point): Point {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

/** Nearest whole pixel that is still a legal place to stand. */
export function snapToLegalPixel(point: Point, legal: (at: Point) => boolean): Point {
  const nearest = snapToPixel(point);
  if (legal(nearest)) return nearest;
  let best: Point | null = null;
  let bestDist = Infinity;
  for (let ring = 1; ring <= 2; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const candidate = { x: nearest.x + dx, y: nearest.y + dy };
        if (!legal(candidate)) continue;
        const dist = Math.hypot(candidate.x - point.x, candidate.y - point.y);
        if (dist < bestDist) {
          best = candidate;
          bestDist = dist;
        }
      }
    }
    if (best) return best;
  }
  return nearest;
}

export type PlacedSlot = {
  id: string;
  buildingId: string;
  index: number;
  tier: number;
  label: string;
  x: number;
  y: number;
};

/** Spreads the village. Building marks stay the same size. */
const CITY_SCALE = 1.1;

function ringScale(building: BuildingDef, tuning: Tuning): number {
  switch (building.ring) {
    case "hut":
      return tuning.ringHut;
    case "civic":
      return tuning.ringCivic;
    case "stone":
      return tuning.ringStone;
    case "outer":
      return tuning.ringOuter;
    default:
      return 1;
  }
}

export function placedSlots(
  build: BuildState,
  tuning: Tuning,
  overrides: Record<string, Point>,
): PlacedSlot[] {
  const slots: PlacedSlot[] = [];
  for (const building of BUILDINGS) {
    const count = build.counts[building.id] ?? 0;
    if (count <= 0) continue;
    const visible = building.kind === "stack" ? Math.min(count, building.slots.length) : 1;
    const tier = building.kind === "stack" ? 1 : count;
    const scale = ringScale(building, tuning);
    for (let index = 0; index < visible; index++) {
      const id = `${building.id}:${index}`;
      const seed = building.slots[index];
      const override = staysPut(building.id) ? undefined : overrides[id];
      let x = MAP_CENTER;
      let y = MAP_CENTER;
      if (override) {
        x = override.x;
        y = override.y;
      } else if (seed && seed.r > 0) {
        const radius = seed.r * scale * CITY_SCALE;
        const angle = (seed.deg * Math.PI) / 180;
        x = MAP_CENTER + Math.cos(angle) * radius;
        y = MAP_CENTER + Math.sin(angle) * radius * tuning.wallOval;
      }
      slots.push({
        id,
        buildingId: building.id,
        index,
        tier,
        label: slotLabel(building, index, tier),
        x,
        y,
      });
    }
  }
  return slots;
}

/** Watchtower and bastion sit on the palisade, so they do not push it out. */
export function sitsOnWall(buildingId: string): boolean {
  return buildingId === "bastion" || buildingId === "watchtower";
}

/** The heartfire stays at the village center. */
export function staysPut(buildingId: string): boolean {
  return buildingId === "heartfire";
}

export const LONGHOUSE_LENGTH = 1.65;
/** Side-to-side size, 25% wider than the first longhouse, then another 15%. */
const LONGHOUSE_WIDTH_SCALE = 1.25 * 1.15;
/** Toward-and-away size, 20% shorter than the first longhouse. */
const LONGHOUSE_DEPTH_SCALE = 0.8;
/** End rectangle length, as a fraction of the longhouse's length (toward and away). */
const LONGHOUSE_END_LENGTH = 1 / 3;
/** End rectangle width, as a fraction of the longhouse's width (side to side). */
const LONGHOUSE_END_WIDTH = 0.7;

/**
 * Longhouse with a wide rectangle on the inward edge and the outward edge.
 * Each is a third as long as the building and 70% as wide, centered on that edge.
 * Local +y is away from the village.
 */
export function longhouseOutline(size: number): Point[] {
  const width = size * LONGHOUSE_LENGTH * LONGHOUSE_WIDTH_SCALE;
  const depth = size * LONGHOUSE_DEPTH_SCALE;
  const endWidth = width * LONGHOUSE_END_WIDTH;
  const endLength = depth * LONGHOUSE_END_LENGTH;
  const left = -width / 2;
  const right = width / 2;
  const inner = -depth / 2;
  const outer = depth / 2;
  const endLeft = -endWidth / 2;
  const endRight = endWidth / 2;
  return [
    { x: endLeft, y: inner - endLength },
    { x: endRight, y: inner - endLength },
    { x: endRight, y: inner },
    { x: right, y: inner },
    { x: right, y: outer },
    { x: endRight, y: outer },
    { x: endRight, y: outer + endLength },
    { x: endLeft, y: outer + endLength },
    { x: endLeft, y: outer },
    { x: left, y: outer },
    { x: left, y: inner },
    { x: endLeft, y: inner },
  ];
}

/** Middle of the right wall. Local +x is the longhouse's right; the front faces the village. */
export function longhouseDoor(at: Point, hutSize: number): Point {
  const size = markSize("longhouse", hutSize);
  const width = size * LONGHOUSE_LENGTH * LONGHOUSE_WIDTH_SCALE;
  return placePoints([{ x: width / 2, y: 0 }], at, tangentAngle(at))[0];
}

export const ESTATE_LENGTH = 4;
export const ESTATE_DEPTH = 3;
/** Black Estate outline. One pixel heavier than the Dark Estate's 1px line. */
export const ESTATE_BORDER = 2;
export const BASTION_LENGTH = 4.4;
export const BASTION_DEPTH = 3;

/** Black rim outside the fill. The drawbridge rails use the same width. */
export function bastionOutlineWidth(_tier: number): number {
  return 2;
}
/** Huts are half again as long as they are wide. The long side runs across the line to the center. */
export const HUT_LENGTH = 1.5;

/** One octagon on each corner of the estate. A vertex points outward, one hut across. */
export function estateCornerOctagons(size: number, outset = 0): Point[][] {
  const length = size * ESTATE_LENGTH;
  const depth = size * ESTATE_DEPTH;
  const radius = size / 2 + outset;
  const corners = [
    { x: -length / 2, y: -depth / 2, rotation: Math.PI * 1.25 },
    { x: length / 2, y: -depth / 2, rotation: Math.PI * 0.25 },
    { x: length / 2, y: depth / 2, rotation: Math.PI * 0.75 },
    { x: -length / 2, y: depth / 2, rotation: Math.PI * 1.75 },
  ];
  return corners.map((corner) =>
    Array.from({ length: 8 }, (_, index) => {
      const angle = corner.rotation - Math.PI / 2 + (index / 8) * Math.PI * 2;
      return {
        x: corner.x + Math.cos(angle) * radius,
        y: corner.y + Math.sin(angle) * radius,
      };
    }),
  );
}

/**
 * Half-octagons on the left and right of the Black Estate, at mid-height.
 * A vertex points outward. The flat sits on the wall.
 * Half again as large as the semicircles they replace (those were half a corner tower).
 */
export function estateSideHalfOctagons(size: number): Point[][] {
  const length = size * ESTATE_LENGTH;
  const radius = (size / 4) * 1.5;
  const mid = radius * Math.SQRT1_2;
  const edge = length / 2;
  return [
    [
      { x: -edge, y: -radius },
      { x: -edge - mid, y: -mid },
      { x: -edge - radius, y: 0 },
      { x: -edge - mid, y: mid },
      { x: -edge, y: radius },
    ],
    [
      { x: edge, y: -radius },
      { x: edge + mid, y: -mid },
      { x: edge + radius, y: 0 },
      { x: edge + mid, y: mid },
      { x: edge, y: radius },
    ],
  ];
}

/**
 * Small rectangle on the village-facing edge of the Dark Estate and the Black Estate.
 * Width along the wall is 2/5 of the estate. How far it sticks out is a quarter
 * of the estate depth, then 45% shorter. All four corners are cut at 45°,
 * only a short nick, as a fraction of how far the porch sticks out.
 */
export const ESTATE_PORCH_WIDTH = 2 / 5;
export const ESTATE_PORCH_DEPTH = (1 / 4) * 0.55;
export const ESTATE_PORCH_CORNER = 0.28;

export function estateBottomRect(size: number): { x: number; y: number; w: number; h: number } {
  const length = size * ESTATE_LENGTH;
  const depth = size * ESTATE_DEPTH;
  const w = length * ESTATE_PORCH_WIDTH;
  const h = depth * ESTATE_PORCH_DEPTH;
  return { x: -w / 2, y: depth / 2, w, h };
}

/** Path between the nine herb garden beds, as a fraction of the whole garden. */
const HERB_GARDEN_GAP = 0.05 * 1.25;
/** Corner radius of one bed, as a fraction of that bed. Tighter than the old 0.22 garden. */
const HERB_GARDEN_CORNER = 0.16;

/** Nine beds in a 3 by 3. Together they fill the same square as the old garden. */
export function herbGardenBeds(size: number): Array<{ x: number; y: number; w: number; h: number; r: number }> {
  const gap = size * HERB_GARDEN_GAP;
  const cell = (size - 2 * gap) / 3;
  const radius = cell * HERB_GARDEN_CORNER;
  const origin = -size / 2;
  const beds: Array<{ x: number; y: number; w: number; h: number; r: number }> = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      beds.push({
        x: origin + col * (cell + gap),
        y: origin + row * (cell + gap),
        w: cell,
        h: cell,
        r: radius,
      });
    }
  }
  return beds;
}

/**
 * One closed outline for the estate. Corner towers, the outer octagon, the
 * side half-octagons, and the bottom rectangle are part of the same edge, so
 * nothing is drawn where those pieces meet the hall.
 * Local +y is the bottom of the unrotated mark.
 */
export function estateOutline(size: number, level: number): Point[] {
  const hx = (size * ESTATE_LENGTH) / 2;
  const hy = (size * ESTATE_DEPTH) / 2;
  const radius = size / 2;
  const mid = radius * Math.SQRT1_2;
  const outerRadius = radius * 1.25;
  const outerMid = outerRadius * Math.SQRT1_2;
  const porchHalf = (size * ESTATE_LENGTH * ESTATE_PORCH_WIDTH) / 2;
  const porchDepth = size * ESTATE_DEPTH * ESTATE_PORCH_DEPTH;
  const porchCut = porchDepth * ESTATE_PORCH_CORNER;
  const points: Point[] = [
    { x: -hx, y: -hy + radius },
    { x: -hx - mid, y: -hy + mid },
    { x: -hx - radius, y: -hy },
    { x: -hx - mid, y: -hy - mid },
    { x: -hx, y: -hy - radius },
    { x: -hx + mid, y: -hy - mid },
    { x: -hx + radius, y: -hy },
    { x: -outerRadius, y: -hy },
    { x: -outerMid, y: -hy - outerMid },
    { x: 0, y: -hy - outerRadius },
    { x: outerMid, y: -hy - outerMid },
    { x: outerRadius, y: -hy },
    { x: hx - radius, y: -hy },
    { x: hx - mid, y: -hy - mid },
    { x: hx, y: -hy - radius },
    { x: hx + mid, y: -hy - mid },
    { x: hx + radius, y: -hy },
    { x: hx + mid, y: -hy + mid },
    { x: hx, y: -hy + radius },
  ];
  if (level > 1) {
    const sideRadius = (size / 4) * 1.5;
    const sideMid = sideRadius * Math.SQRT1_2;
    points.push(
      { x: hx, y: -sideRadius },
      { x: hx + sideMid, y: -sideMid },
      { x: hx + sideRadius, y: 0 },
      { x: hx + sideMid, y: sideMid },
      { x: hx, y: sideRadius },
    );
  }
  points.push(
    { x: hx, y: hy - radius },
    { x: hx + mid, y: hy - mid },
    { x: hx + radius, y: hy },
    { x: hx + mid, y: hy + mid },
    { x: hx, y: hy + radius },
    { x: hx - mid, y: hy + mid },
    { x: hx - radius, y: hy },
    { x: porchHalf + porchCut, y: hy },
    { x: porchHalf, y: hy + porchCut },
    { x: porchHalf, y: hy + porchDepth - porchCut },
    { x: porchHalf - porchCut, y: hy + porchDepth },
    { x: -porchHalf + porchCut, y: hy + porchDepth },
    { x: -porchHalf, y: hy + porchDepth - porchCut },
    { x: -porchHalf, y: hy + porchCut },
    { x: -porchHalf - porchCut, y: hy },
    { x: -hx + radius, y: hy },
    { x: -hx + mid, y: hy + mid },
    { x: -hx, y: hy + radius },
    { x: -hx - mid, y: hy + mid },
    { x: -hx - radius, y: hy },
    { x: -hx - mid, y: hy - mid },
    { x: -hx, y: hy - radius },
  );
  if (level > 1) {
    const sideRadius = (size / 4) * 1.5;
    const sideMid = sideRadius * Math.SQRT1_2;
    points.push(
      { x: -hx, y: sideRadius },
      { x: -hx - sideMid, y: sideMid },
      { x: -hx - sideRadius, y: 0 },
      { x: -hx - sideMid, y: -sideMid },
      { x: -hx, y: -sideRadius },
    );
  }
  return points;
}

/** Octagon on the middle of the estate's outer edge, a quarter larger than the corner towers. */
export function estateOuterOctagon(size: number, outset = 0): Point[] {
  const radius = (size / 2) * 1.25 + outset;
  const y = (-size * ESTATE_DEPTH) / 2;
  return Array.from({ length: 8 }, (_, index) => {
    const angle = -Math.PI / 2 + (index / 8) * Math.PI * 2;
    return {
      x: Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    };
  });
}

/** One tower circle on each corner of the bastion. Radius is half a hut. */
export function bastionTowers(size: number): Array<{ x: number; y: number; r: number }> {
  const length = size * BASTION_LENGTH;
  const depth = size * BASTION_DEPTH;
  const radius = size / 2;
  return [
    { x: -length / 2, y: -depth / 2, r: radius },
    { x: length / 2, y: -depth / 2, r: radius },
    { x: length / 2, y: depth / 2, r: radius },
    { x: -length / 2, y: depth / 2, r: radius },
  ];
}

/** Circumradius of each rim pentagon, as a fraction of the wizard tower radius. */
export const WIZARD_TOWER_PENTAGON_SCALE = 0.35;

/**
 * Five regular pentagons on the wizard tower rim. Centers sit on the circle;
 * a vertex of each points outward. First rim seat is at local -y.
 */
export function wizardTowerPentagons(towerRadius: number, outset = 0): Point[][] {
  const pentRadius = towerRadius * WIZARD_TOWER_PENTAGON_SCALE + outset;
  return Array.from({ length: 5 }, (_, index) => {
    const rimAngle = -Math.PI / 2 + (index / 5) * Math.PI * 2;
    const cx = Math.cos(rimAngle) * towerRadius;
    const cy = Math.sin(rimAngle) * towerRadius;
    return Array.from({ length: 5 }, (_, vertex) => {
      const angle = rimAngle + (vertex / 5) * Math.PI * 2;
      return {
        x: cx + Math.cos(angle) * pentRadius,
        y: cy + Math.sin(angle) * pentRadius,
      };
    });
  });
}

/** Crossing of a segment with the tower circle (local origin). */
function segmentCircleHit(a: Point, b: Point, radius: number): Point | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const A = dx * dx + dy * dy;
  if (A < 1e-12) return null;
  const B = 2 * (a.x * dx + a.y * dy);
  const C = a.x * a.x + a.y * a.y - radius * radius;
  const disc = B * B - 4 * A * C;
  if (disc < -1e-9) return null;
  const root = Math.sqrt(Math.max(0, disc));
  let hit: Point | null = null;
  for (const sign of [-1, 1]) {
    const t = (-B + sign * root) / (2 * A);
    if (t < -1e-9 || t > 1 + 1e-9) continue;
    const clamped = Math.min(1, Math.max(0, t));
    hit = { x: a.x + clamped * dx, y: a.y + clamped * dy };
  }
  return hit;
}

/**
 * Outer silhouette of the wizard tower: circle arcs plus the pentagon tips that
 * stick outside the rim. One closed ring in local coordinates (CCW).
 */
export function wizardTowerOutline(towerRadius: number, arcSteps = 10): Point[] {
  if (towerRadius <= 0) return [];
  const pentagons = wizardTowerPentagons(towerRadius);
  type Tip = { enter: Point; exit: Point; mid: Point[]; enterAngle: number; exitAngle: number };
  const tips: Tip[] = [];
  for (const verts of pentagons) {
    // verts[0] tip out, [1]/[4] outer flanks, [2]/[3] inside the circle.
    const enter = segmentCircleHit(verts[3], verts[4], towerRadius);
    const exit = segmentCircleHit(verts[1], verts[2], towerRadius);
    if (!enter || !exit) continue;
    tips.push({
      enter,
      exit,
      mid: [verts[4], verts[0], verts[1]],
      enterAngle: Math.atan2(enter.y, enter.x),
      exitAngle: Math.atan2(exit.y, exit.x),
    });
  }
  tips.sort((a, b) => a.enterAngle - b.enterAngle);
  const points: Point[] = [];
  for (let index = 0; index < tips.length; index++) {
    const tip = tips[index];
    const next = tips[(index + 1) % tips.length];
    points.push(tip.enter, ...tip.mid, tip.exit);
    let a0 = tip.exitAngle;
    let a1 = next.enterAngle;
    if (a1 <= a0) a1 += Math.PI * 2;
    for (let step = 1; step <= arcSteps; step++) {
      const angle = a0 + ((a1 - a0) * step) / (arcSteps + 1);
      points.push({
        x: Math.cos(angle) * towerRadius,
        y: Math.sin(angle) * towerRadius,
      });
    }
  }
  return points;
}

/** Each later watchtower is 10% larger than the one before it. */
export function watchtowerLevelScale(level: number): number {
  const step = Math.max(1, Math.round(level));
  return 1.1 ** (step - 1);
}

/** Flat-to-flat width. The first watchtower is two huts across. */
export function watchtowerWidth(hutSize: number, level: number): number {
  return hutSize * 2 * watchtowerLevelScale(level);
}

const WATCHTOWER_SIDES = [4, 6, 8, 10];

/** Regular hexagon. A flat side sits on local -y. Width is flat to flat. */
export function pillarOutline(size: number): Point[] {
  return regularFlatPolygon(size, 6);
}

/** Bone temple. A regular 12-sided polygon, twice a hut square, with a 5-sided polygon on every corner. A flat side sits on local -y. */
const BONE_TEMPLE_CORNER = (1 / 3) * 0.8;

export function boneTempleOutline(size: number): Point[] {
  return regularFlatPolygon(size, 12);
}

/** One 5-sided polygon on each corner. Same reach as the old octagon. A vertex points outward. */
export function boneTempleCorners(size: number): Point[][] {
  const radius = (size * BONE_TEMPLE_CORNER) / 2;
  return boneTempleOutline(size).map((corner) =>
    regularPolygon(corner.x, corner.y, radius, 5, Math.atan2(corner.y, corner.x)),
  );
}

/** Spike length past the outer vertex, as a fraction of the pentagon circumradius. */
const BONE_TEMPLE_SPIKE = 0.7;
/** How far back along each flank the spike base sits. Further back is a wider, less pointed tip. */
const BONE_TEMPLE_SPIKE_BASE = 0.36 * 1.3;

/** One short triangle on each corner pentagon, continuing the outward vertex. */
export function boneTempleSpikes(size: number): Point[][] {
  const radius = (size * BONE_TEMPLE_CORNER) / 2;
  return boneTempleCorners(size).map((pentagon) => {
    const outer = pentagon[0];
    const cx = pentagon.reduce((sum, point) => sum + point.x, 0) / pentagon.length;
    const cy = pentagon.reduce((sum, point) => sum + point.y, 0) / pentagon.length;
    const dx = outer.x - cx;
    const dy = outer.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const base = (flank: Point): Point => ({
      x: outer.x + (flank.x - outer.x) * BONE_TEMPLE_SPIKE_BASE,
      y: outer.y + (flank.y - outer.y) * BONE_TEMPLE_SPIKE_BASE,
    });
    return [
      base(pentagon[4]),
      { x: outer.x + ux * radius * BONE_TEMPLE_SPIKE, y: outer.y + uy * radius * BONE_TEMPLE_SPIKE },
      base(pentagon[1]),
    ];
  });
}

/** Corner pentagon with the outward vertex pulled into a short spike. */
export function boneTempleSpikedCorners(size: number): Point[][] {
  const spikes = boneTempleSpikes(size);
  return boneTempleCorners(size).map((pentagon, index) => {
    const [towardPrevious, tip, towardNext] = spikes[index];
    return [towardNext, pentagon[1], pentagon[2], pentagon[3], pentagon[4], towardPrevious, tip];
  });
}

/** Width is flat to flat. A flat side sits on local -y. */
function regularFlatPolygon(size: number, sides: number): Point[] {
  const radius = size / 2 / Math.cos(Math.PI / sides);
  const start = -Math.PI / 2 + Math.PI / sides;
  return Array.from({ length: sides }, (_, step) => {
    const angle = start + (step / sides) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

/** Square, hexagon, octagon, then decagon. A flat side sits on local -y (toward the center). */
export function watchtowerOutline(width: number, level: number): Point[] {
  const index = Math.min(WATCHTOWER_SIDES.length - 1, Math.max(0, Math.round(level) - 1));
  return regularFlatPolygon(width, WATCHTOWER_SIDES[index]);
}

/** Craft, storage/trade, and records sit 20% larger than a plain hut square. */
const LARGE_MARK_GROUPS = new Set(["Craft", "Storage and trade", "Records"]);

/** Drawn size of one building, in the same units as a wooden hut's reference square. */
export function markSize(buildingId: string, hutSize: number): number {
  let size = hutSize;
  if (buildingId === "pillarOfClarity" || buildingId === "blackMonolith") size = hutSize * 0.75 * 1.25;
  else if (buildingId === "wizardTower") size = hutSize * 3.12;
  else if (buildingId === "stoneHut") size = hutSize * 0.9;
  else if (buildingId === "woodenHut") size = hutSize * 0.63;
  else if (buildingId === "paleCross") size = hutSize * 0.8 * 1.25;
  else if (buildingId === "herbGarden" || buildingId === "boneTemple") size = hutSize * 2;
  else if (buildingId === "boneyard" || buildingId === "quarry") size = hutSize * 1.8;
  else if (buildingId === "furTents") size = hutSize * 1.15;
  else if (buildingId === "archive") size = hutSize * 0.9 * 1.1;
  else if (buildingId === "heartfire") size = hutSize * 1.25;

  // Pit and quarry are Craft but keep their own outline scale.
  // The scribe's office matches a stone hut plus 10%, not the records bump.
  const group = BUILDING_BY_ID[buildingId]?.group;
  if (group && LARGE_MARK_GROUPS.has(group) && buildingId !== "pit" && buildingId !== "archive" && buildingId !== "quarry") {
    size *= 1.2;
  }
  // Trade Post, Grand Bazaar, and Merchants Guild share this mark.
  if (buildingId === "trade") size *= 0.9;
  return size;
}

/** How far a point sits from center, measured in the oval the wall uses. */
export function ovalRadius(point: Point, oval: number): number {
  const dx = point.x - MAP_CENTER;
  const dy = (point.y - MAP_CENTER) / (oval || 1);
  return Math.hypot(dx, dy);
}

export function wobbleAt(angle: number, wobble: number, lobes: number): number {
  return (
    1 +
    wobble * Math.sin(angle * lobes) +
    wobble * 0.35 * Math.sin(angle * (lobes + 2) + 1.3)
  );
}

/** Smallest scale the wobble applies, so a fitted wall still clears every building. */
export function minWobbleFactor(wobble: number, lobes: number): number {
  let min = 1;
  for (let index = 0; index < 72; index++) {
    const angle = (index / 72) * Math.PI * 2;
    min = Math.min(min, wobbleAt(angle, wobble, lobes));
  }
  return Math.max(0.55, min);
}

/**
 * Shallow pit, in hut-widths. A circle about five huts across, with a little
 * wobble so the rim stays uneven.
 */
const PIT_SHAPE: Point[] = Array.from({ length: 14 }, (_, index) => {
  const angle = -Math.PI / 2 + (index / 14) * Math.PI * 2;
  const radius = 2.42 * (1 + 0.06 * Math.sin(index * 1.9 + 0.6));
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
});

/** Pit rim wobble. The boneyard uses 30% less of it. */
const BONEYARD_WOBBLE = 0.06 * 0.7;

/**
 * Boneyard. A square with a quieter rim wobble than the pit, stretched 20%
 * along the line to the village. The sides stay uneven without turning it
 * into a circle. Local +y is away from the village.
 */
export function boneyardOutline(size: number): Point[] {
  const half = size / 2;
  const longHalf = half * 1.2;
  const perSide = 4;
  const points: Point[] = [];
  for (let side = 0; side < 4; side++) {
    for (let step = 0; step < perSide; step++) {
      const along = -1 + (2 * step) / perSide;
      const index = side * perSide + step;
      const wobble = 1 + BONEYARD_WOBBLE * Math.sin(index * 1.9 + 0.6);
      let x = 0;
      let y = 0;
      if (side === 0) {
        x = along * half;
        y = -longHalf;
      } else if (side === 1) {
        x = half;
        y = along * longHalf;
      } else if (side === 2) {
        x = -along * half;
        y = longHalf;
      } else {
        x = -half;
        y = -along * longHalf;
      }
      points.push({ x: x * wobble, y: y * wobble });
    }
  }
  return points;
}

/**
 * Quarry. Same size as the boneyard, with rounded corners and a little of
 * the same rim wobble, so the edge stays uneven.
 */
export function quarryOutline(size: number): Point[] {
  const half = size / 2;
  const corner = size * 0.22;
  const straight = half - corner;
  const sideSteps = 3;
  const arcSteps = 5;
  const points: Point[] = [];
  let index = 0;
  const add = (x: number, y: number) => {
    const wobble = 1 + BONEYARD_WOBBLE * Math.sin(index * 1.7 + 1.1);
    points.push({ x: x * wobble, y: y * wobble });
    index += 1;
  };
  for (let side = 0; side < 4; side++) {
    const turn = (side * Math.PI) / 2;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const place = (x: number, y: number) => add(x * cos - y * sin, x * sin + y * cos);
    for (let step = 0; step < sideSteps; step++) {
      const along = -straight + (2 * straight * step) / sideSteps;
      place(along, -half);
    }
    for (let step = 0; step < arcSteps; step++) {
      const angle = -Math.PI / 2 + (step / arcSteps) * (Math.PI / 2);
      place(straight + Math.cos(angle) * corner, -straight + Math.sin(angle) * corner);
    }
  }
  return points;
}

const TIMBER_GROWTH = 1.15;
const TIMBER_WIDTH = 1.25;
const TIMBER_WING = 2 / 3;

/**
 * Timber mill. 15% larger than its square, and 25% wider than that length.
 * A square sits on the left, flush with the outer edge, two thirds of the
 * length on each side. Local +y is away from the village.
 */
export function timberMillOutline(size: number): Point[] {
  const depth = size * TIMBER_GROWTH;
  const width = depth * TIMBER_WIDTH;
  const wing = depth * TIMBER_WING;
  const halfW = width / 2;
  const halfD = depth / 2;
  const outer = halfD;
  const left = -halfW;
  return [
    { x: left, y: -halfD },
    { x: halfW, y: -halfD },
    { x: halfW, y: outer },
    { x: left - wing, y: outer },
    { x: left - wing, y: outer - wing },
    { x: left, y: outer - wing },
  ];
}

/** Local outline of the shallow pit, centered on its slot. */
export function pitOutline(hutSize: number): Point[] {
  const scale = hutSize * 0.85;
  return PIT_SHAPE.map((point) => ({ x: point.x * scale, y: point.y * scale }));
}

/** Deeper pits add inner contours. The outline stays the size of the first pit. */
export function pitScale(_level: number): number {
  return 1;
}

/**
 * One inner contour per depth, nested like a topographic map.
 * Scales are fractions of the pit's current outline.
 */
export function pitContourScales(level: number): number[] {
  const count = Math.max(1, Math.round(level));
  const step = 0.14;
  return Array.from({ length: count }, (_, index) => 1 - (index + 1) * step);
}

const STORAGE_BORDER = 1;
/** Octagon turrets, as a fraction of the current square side. */
const STORAGE_TOWER = 0.22;
const STORAGE_RECT_ALONG = 0.36 * 0.8;
const STORAGE_RECT_DEPTH = 0.22;

/** Every supply hut is 25% larger, then 10%, then another 10%. Later levels add towers and wings at that size. */
export function storageScale(_level: number): number {
  return 1.25 * 1.1 * 1.1;
}

/** Storage count at which the Great Vault is the building on the map. */
export const GREAT_VAULT_STORAGE = 6;
/** Every building mark grows by this much once the Great Vault is built. */
export const GREAT_VAULT_MARK_SCALE = 1.05;

/** Hut size used for marks and clearance. Unchanged until the Great Vault exists. */
export function buildingHutSize(squareSize: number, storageCount: number): number {
  return storageCount >= GREAT_VAULT_STORAGE ? squareSize * GREAT_VAULT_MARK_SCALE : squareSize;
}

/** Black outline stays 1px. Upgrades do not thicken it. */
export function storageBorder(_level: number): number {
  return STORAGE_BORDER;
}

export type StorageTower =
  | { kind: "octagon"; points: Point[] }
  | { kind: "rect"; x: number; y: number; w: number; h: number };

export function regularPolygon(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  vertexAngle: number,
): Point[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = vertexAngle + (index / sides) * Math.PI * 2;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });
}

/**
 * Supply hut turrets, in local space. +y points away from the village center.
 * Level 2 is one octagon on the outer edge. Level 3 adds octagons on the
 * two corners that face the center. Level 4 adds the other two corners.
 * Side rectangles sit on the left and right edges from level 5.
 * The Great Vault adds an octagon on the outer face of each side rectangle.
 * Each octagon is half again the rectangle's length, with a vertex pointing out.
 */
export function storageTowers(size: number, level: number): StorageTower[] {
  const step = Math.max(1, Math.round(level));
  if (step < 2 || size <= 0) return [];
  const radius = size * STORAGE_TOWER;
  const towers: StorageTower[] = [];
  towers.push({
    kind: "octagon",
    points: regularPolygon(0, size / 2, radius, 8, Math.PI / 2),
  });
  if (step === 3) {
    towers.push(
      { kind: "octagon", points: regularPolygon(-size / 2, -size / 2, radius, 8, (-Math.PI * 3) / 4) },
      { kind: "octagon", points: regularPolygon(size / 2, -size / 2, radius, 8, -Math.PI / 4) },
    );
  }
  if (step >= 4) {
    const corners = [
      { x: size / 2, y: size / 2, angle: Math.PI / 4 },
      { x: -size / 2, y: size / 2, angle: (Math.PI * 3) / 4 },
      { x: -size / 2, y: -size / 2, angle: (-Math.PI * 3) / 4 },
      { x: size / 2, y: -size / 2, angle: -Math.PI / 4 },
    ];
    for (const corner of corners) {
      towers.push({
        kind: "octagon",
        points: regularPolygon(corner.x, corner.y, radius, 8, corner.angle),
      });
    }
  }
  if (step >= 5) {
    const along = size * STORAGE_RECT_ALONG;
    const depth = size * STORAGE_RECT_DEPTH;
    towers.push(
      { kind: "rect", x: -size / 2, y: 0, w: depth, h: along },
      { kind: "rect", x: size / 2, y: 0, w: depth, h: along },
    );
    if (step >= 6) {
      const outward = size / 2 + depth / 2;
      const sideRadius = (along / 2) * 1.5;
      towers.push(
        { kind: "octagon", points: regularPolygon(-outward, 0, sideRadius, 8, Math.PI) },
        { kind: "octagon", points: regularPolygon(outward, 0, sideRadius, 8, 0) },
      );
    }
  }
  return towers;
}

/** Coinhouse is 15% larger than a normal square at every level. Later levels add courts, not size. */
export function coinhouseScale(_level: number): number {
  return 1.15;
}

/** Octagon width across, as a fraction of the current building side. */
const COINHOUSE_OCT = 1 / 3;
/** Gap between the building half and the inner face of the wall, as a fraction of the side. */
const COINHOUSE_WALL_GAP = 0.16;
/** Extra space between the house edge and the inner face of the wall. */
const COINHOUSE_COURTYARD = 1.3;
/** Wall thickness, as a fraction of the side. Level 3 makes the wall a bit bigger. */
const COINHOUSE_WALL_THICK = 0.07 * 1.5;
const COINHOUSE_WALL_GROW = 1.25;
/** Gate length along the village-facing wall, as a fraction of the side. Thickness stays put. */
const COINHOUSE_GATE = 0.6;
/** Outer corner radius of the courtyard wall, in wall thicknesses, before it is eased off. */
const COINHOUSE_WALL_CORNER = 2.6;
/** 70% less curve than that radius, on the outside and on the courtyard side. */
const COINHOUSE_CORNER_EASE = 0.3;

export type CoinhouseRect = { x: number; y: number; w: number; h: number };

/** Courtyard wall. `inn` and `out` are half the inner and outer squares. */
export type CoinhouseWall = {
  inn: number;
  out: number;
  innerRadius: number;
  outerRadius: number;
};

export type CoinhouseLayout = {
  side: number;
  house: CoinhouseRect;
  octagons: Point[][];
  walls: CoinhouseRect[];
  /** Rounded corners of the wall around the building. Null before the wall exists. */
  wallCorner: CoinhouseWall | null;
  gate: CoinhouseRect | null;
};

function coinhouseOctagons(corners: Array<{ x: number; y: number; angle: number }>, radius: number): Point[][] {
  return corners.map((corner) => regularPolygon(corner.x, corner.y, radius, 8, corner.angle));
}

const COINHOUSE_CORNERS = [
  { x: 1, y: 1, angle: Math.PI / 4 },
  { x: -1, y: 1, angle: (Math.PI * 3) / 4 },
  { x: -1, y: -1, angle: (-Math.PI * 3) / 4 },
  { x: 1, y: -1, angle: -Math.PI / 4 },
];

/** The house inside the wall is this much of the building side. */
const COINHOUSE_HOUSE = 0.9;

/**
 * Coinhouse. Level 1 is 15% larger, with an octagon on every corner, each a
 * third of the building across. Level 2 is 10% larger and adds a small wall
 * with a long rectangle for the gate on the village side. The house inside
 * that wall is 10% smaller and keeps the corner octagons. Level 3 is another
 * 10% larger, the wall is a bit bigger, and octagons sit on the wall corners
 * too. The wall corners are rounded on the outside and on the courtyard side.
 * Local +y is away from the village.
 */
export function coinhouseLayout(size: number, level: number): CoinhouseLayout {
  const step = Math.max(1, Math.round(level));
  const side = size * coinhouseScale(step);
  const houseSide = step >= 2 ? side * COINHOUSE_HOUSE : side;
  const houseHalf = houseSide / 2;
  const house: CoinhouseRect = { x: 0, y: 0, w: houseSide, h: houseSide };
  const houseOctagons = coinhouseOctagons(
    COINHOUSE_CORNERS.map((corner) => ({
      x: corner.x * houseHalf,
      y: corner.y * houseHalf,
      angle: corner.angle,
    })),
    (houseSide * COINHOUSE_OCT) / 2,
  );
  if (step < 2) {
    return { side, house, octagons: houseOctagons, walls: [], wallCorner: null, gate: null };
  }
  const grow = step >= 3 ? COINHOUSE_WALL_GROW : 1;
  const gap = side * COINHOUSE_WALL_GAP * grow;
  const thick = side * COINHOUSE_WALL_THICK * grow;
  const inn = houseHalf + (side / 2 - houseHalf + gap) * COINHOUSE_COURTYARD;
  const out = inn + thick;
  const gateLen = side * COINHOUSE_GATE;
  const gateHalf = gateLen / 2;
  const frontY = -(inn + out) / 2;
  const frontPiece = out - gateHalf;
  const walls: CoinhouseRect[] = [
    { x: 0, y: (inn + out) / 2, w: out * 2, h: thick },
    { x: -(inn + out) / 2, y: 0, w: thick, h: out * 2 },
    { x: (inn + out) / 2, y: 0, w: thick, h: out * 2 },
    { x: -(out + gateHalf) / 2, y: frontY, w: frontPiece, h: thick },
    { x: (out + gateHalf) / 2, y: frontY, w: frontPiece, h: thick },
  ];
  const gate: CoinhouseRect = { x: 0, y: frontY, w: gateLen, h: thick * 1.8 };
  const wallCorner: CoinhouseWall = {
    inn,
    out,
    outerRadius: thick * COINHOUSE_WALL_CORNER * COINHOUSE_CORNER_EASE,
    innerRadius: thick * (COINHOUSE_WALL_CORNER - 1) * COINHOUSE_CORNER_EASE,
  };
  const wallOctagons =
    step >= 3
      ? coinhouseOctagons(
        COINHOUSE_CORNERS.map((corner) => ({ x: corner.x * out, y: corner.y * out, angle: corner.angle })),
        (side * COINHOUSE_OCT) / 2,
      )
      : [];
  return { side, house, octagons: [...houseOctagons, ...wallOctagons], walls, wallCorner, gate };
}

/** How far the coinhouse mark reaches from its slot. */
export function coinhouseReach(size: number, level: number): number {
  const layout = coinhouseLayout(size, level);
  let reach = Math.hypot(layout.house.w / 2, layout.house.h / 2);
  for (const octagon of layout.octagons) {
    for (const point of octagon) reach = Math.max(reach, Math.hypot(point.x, point.y));
  }
  for (const wall of layout.walls) {
    reach = Math.max(reach, Math.hypot(Math.abs(wall.x) + wall.w / 2, Math.abs(wall.y) + wall.h / 2));
  }
  if (layout.gate) {
    reach = Math.max(
      reach,
      Math.hypot(layout.gate.w / 2, Math.abs(layout.gate.y) + layout.gate.h / 2),
    );
  }
  return reach;
}

/** The trade post stays the first size. Later levels add wings. */
export function tradeScale(_level: number): number {
  return 1;
}

const TRADE_CORNER = 1 / 12;
/** Merchants Guild corners are a quarter less cut than the earlier trade posts. */
const TRADE_GUILD_CORNER = TRADE_CORNER * 0.75;
/** Side square, as a fraction of the trade post's current length. */
const TRADE_WING = 1.5;

/**
 * Trade post. All four corners are cut at 45°, each leg 1/12 of that piece's width.
 * Level 2 adds a square on the left, 150% of the post's length, with the same cuts.
 * Level 3 adds the same square on the right, with a tighter corner cut, and a
 * circle on the inner and outer end of each square. A side that has a square keeps a straight edge on
 * the middle. Local +y is away from the village.
 */
export function tradeOutline(size: number, level: number): Point[] {
  const step = Math.max(1, Math.round(level));
  const span = size * tradeScale(step);
  const cut = span * TRADE_CORNER;
  const left = -span / 2;
  const right = span / 2;
  const inner = -span / 2;
  const outer = span / 2;
  if (step < 2) {
    return [
      { x: left + cut, y: inner },
      { x: right - cut, y: inner },
      { x: right, y: inner + cut },
      { x: right, y: outer - cut },
      { x: right - cut, y: outer },
      { x: left + cut, y: outer },
      { x: left, y: outer - cut },
      { x: left, y: inner + cut },
    ];
  }
  const wing = span * TRADE_WING;
  const wingCut = wing * (step >= 3 ? TRADE_GUILD_CORNER : TRADE_CORNER);
  const wingLeft = left - wing;
  const wingInner = -wing / 2;
  const wingOuter = wing / 2;
  const points: Point[] = [
    { x: wingLeft + wingCut, y: wingInner },
    { x: left - wingCut, y: wingInner },
    { x: left, y: wingInner + wingCut },
    { x: left, y: inner },
  ];
  if (step >= 3) {
    const wingRight = right + wing;
    points.push(
      { x: right, y: inner },
      { x: right, y: wingInner + wingCut },
      { x: right + wingCut, y: wingInner },
      { x: wingRight - wingCut, y: wingInner },
      { x: wingRight, y: wingInner + wingCut },
      { x: wingRight, y: wingOuter - wingCut },
      { x: wingRight - wingCut, y: wingOuter },
      { x: right + wingCut, y: wingOuter },
      { x: right, y: wingOuter - wingCut },
      { x: right, y: outer },
    );
  } else {
    points.push(
      { x: right - cut, y: inner },
      { x: right, y: inner + cut },
      { x: right, y: outer - cut },
      { x: right - cut, y: outer },
    );
  }
  points.push(
    { x: left, y: outer },
    { x: left, y: wingOuter - wingCut },
    { x: left - wingCut, y: wingOuter },
    { x: wingLeft + wingCut, y: wingOuter },
    { x: wingLeft, y: wingOuter - wingCut },
    { x: wingLeft, y: wingInner + wingCut },
  );
  return points;
}

/**
 * Diameter is 2/3 of the side square, then 20% shorter along the building.
 * One circle on each inner and outer end.
 */
export function tradeCircles(
  size: number,
  level: number,
): { x: number; y: number; rx: number; ry: number }[] {
  const step = Math.max(1, Math.round(level));
  if (step < 3 || size <= 0) return [];
  const span = size * tradeScale(step);
  const wing = span * TRADE_WING;
  const rx = wing / 3;
  const ends = [-wing / 2, wing / 2];
  return [-span / 2 - wing / 2, span / 2 + wing / 2].flatMap((x) =>
    ends.map((y) => ({ x, y, rx, ry: rx * 0.8 })),
  );
}

const ALTAR_LENGTH = 0.5;
const ALTAR_CORNER = 1 / 12;
/** Porch rectangle on the inner and outer edges, as a fraction of the shrine's width. Its length is half that width. */
const ALTAR_PORCH_WIDTH = 0.7;
export const ALTAR_PORCH_DEPTH = 0.5;
/** Side rectangle, 40% as wide as the building's length, then an octagon three times that length. */
const ALTAR_WING_WIDTH = 0.4;
export const ALTAR_OCTAGON = 3;

/** The altar is 10% larger at every stage. Later levels add porches and wings at that size. */
const ALTAR_SCALE = 1.1;

/** Level 1 is half as long as a square, then 10% larger. Later levels add porches and wings at that size. */
export function altarSpan(size: number, _level: number): { width: number; depth: number } {
  return { width: size * ALTAR_SCALE, depth: size * ALTAR_LENGTH * ALTAR_SCALE };
}

/** The long way around an octagon, skipping the flat that touches the square. */
function octagonAroundFlat(points: Point[], from: Point, to: Point): Point[] {
  const indexOf = (target: Point) =>
    points.findIndex((point) => point.x === target.x && point.y === target.y);
  const start = indexOf(from);
  const end = indexOf(to);
  const forward: Point[] = [];
  for (let index = start; ; index = (index + 1) % points.length) {
    forward.push(points[index]);
    if (index === end) break;
  }
  const backward: Point[] = [];
  for (let index = start; ; index = (index - 1 + points.length) % points.length) {
    backward.push(points[index]);
    if (index === end) break;
  }
  return forward.length >= backward.length ? forward : backward;
}

/**
 * Altar. Level 1 is a short rectangle. From level 2 the corners are cut at 45°,
 * each leg 1/12 of the length, and a rectangle 70% as wide as the building sits
 * on both the outer edge and the inner edge. That rectangle is wider than it
 * is long, and its far corners are cut the same way. From level 3 a rectangle
 * sits on the left and the right, 40% as wide as the building's length, with
 * an octagon three times that length just outside each rectangle. The Sanctum
 * adds an octagon of that same size on both the outer edge and the inner edge,
 * and a small circle on each corner of the octagons. Local +y is away from the village.
 */
export function altarOutline(size: number, level: number): Point[] {
  const step = Math.max(1, Math.round(level));
  const { width, depth } = altarSpan(size, step);
  const left = -width / 2;
  const right = width / 2;
  const inner = -depth / 2;
  const outer = depth / 2;
  if (step < 2) return rectLocal(width, depth);
  const cut = depth * ALTAR_CORNER;
  const porchWidth = width * ALTAR_PORCH_WIDTH;
  const porchDepth = width * ALTAR_PORCH_DEPTH;
  const porchCut = porchDepth * ALTAR_CORNER;
  const porchLeft = -porchWidth / 2;
  const porchRight = porchWidth / 2;
  const porchOuter = outer + porchDepth;
  const porchInner = inner - porchDepth;
  const rightWing = wingAndOctagon(right, depth, 1);
  const leftWing = wingAndOctagon(left, depth, -1);
  const outerCap = step >= 4 ? porchOctagon(depth, porchOuter, 1) : [];
  const innerCap = step >= 4 ? porchOctagon(depth, porchInner, -1) : [];
  return [
    { x: left + cut, y: inner },
    { x: porchLeft, y: inner },
    { x: porchLeft, y: porchInner + porchCut },
    { x: porchLeft + porchCut, y: porchInner },
    ...innerCap,
    { x: porchRight - porchCut, y: porchInner },
    { x: porchRight, y: porchInner + porchCut },
    { x: porchRight, y: inner },
    { x: right - cut, y: inner },
    { x: right, y: inner + cut },
    ...(step >= 3 ? rightWing : []),
    { x: right, y: outer - cut },
    { x: right - cut, y: outer },
    { x: porchRight, y: outer },
    { x: porchRight, y: porchOuter - porchCut },
    { x: porchRight - porchCut, y: porchOuter },
    ...outerCap,
    { x: porchLeft + porchCut, y: porchOuter },
    { x: porchLeft, y: porchOuter - porchCut },
    { x: porchLeft, y: outer },
    { x: left + cut, y: outer },
    { x: left, y: outer - cut },
    ...(step >= 3 ? leftWing : []),
    { x: left, y: inner + cut },
  ];
}

/** Circle diameter matches the side rectangle's width. */
const ALTAR_CORNER_CIRCLE = 0.5;

export type SanctumCircle = {
  god: SanctumGod;
  /** Center of this god's octagon, where the sign sits. */
  x: number;
  y: number;
  /** Corner circles that form the scalloped border. */
  corners: { x: number; y: number; r: number }[];
  /** Outer rim. The flat shared with the building is left out. */
  rim: Point[];
};

/** One circle on each corner of the octagons, from the Sanctum on. */
export function altarCircles(size: number, level: number): { x: number; y: number; r: number }[] {
  return sanctumCircles(size, level).flatMap((circle) => circle.corners);
}

/**
 * The four sanctum octagons, one circle per god.
 * Flame is the outer circle, Raven the right, Dagon the inner, Ash the left.
 * Local +y is away from the village.
 */
export function sanctumCircles(size: number, level: number): SanctumCircle[] {
  const step = Math.max(1, Math.round(level));
  if (step < 4 || size <= 0) return [];
  const { width, depth } = altarSpan(size, step);
  const across = depth * ALTAR_OCTAGON;
  const radius = across / (2 * Math.cos(Math.PI / 8));
  const cornerR = depth * ALTAR_WING_WIDTH * ALTAR_CORNER_CIRCLE;
  const wing = depth * ALTAR_WING_WIDTH;
  const side = width / 2 + wing + across / 2;
  const porchOuter = depth / 2 + width * ALTAR_PORCH_DEPTH;
  const porchInner = -depth / 2 - width * ALTAR_PORCH_DEPTH;
  const lobes: Array<{ god: SanctumGod; x: number; y: number; rim: Point[] }> = [
    { god: "flame", x: 0, y: porchOuter + across / 2, rim: porchOctagon(depth, porchOuter, 1) },
    { god: "raven", x: side, y: 0, rim: sideOctagonRim(side, radius, 1) },
    { god: "dagon", x: 0, y: porchInner - across / 2, rim: porchOctagon(depth, porchInner, -1) },
    { god: "ash", x: -side, y: 0, rim: sideOctagonRim(-side, radius, -1) },
  ];
  return lobes.map((lobe) => ({
    god: lobe.god,
    x: lobe.x,
    y: lobe.y,
    rim: lobe.rim,
    corners: regularPolygon(lobe.x, lobe.y, radius, 8, Math.PI / 8).map((point) => ({
      x: point.x,
      y: point.y,
      r: cornerR,
    })),
  }));
}

/**
 * Same-size octagon sitting on a porch edge. Sign +1 is the outer edge,
 * -1 the inner edge. The flat shared with the porch is omitted.
 */
function porchOctagon(depth: number, porchEdge: number, sign: 1 | -1): Point[] {
  const across = depth * ALTAR_OCTAGON;
  const radius = across / (2 * Math.cos(Math.PI / 8));
  const octagon = regularPolygon(0, porchEdge + sign * (across / 2), radius, 8, Math.PI / 8);
  const flat = [...octagon]
    .sort((a, b) => sign * (a.y - b.y))
    .slice(0, 2)
    .sort((a, b) => sign * (b.x - a.x));
  return octagonAroundFlat(octagon, flat[0], flat[1]);
}

/** Long way around a side octagon. The flat against the building is omitted. */
function sideOctagonRim(center: number, radius: number, sign: 1 | -1): Point[] {
  const octagon = regularPolygon(center, 0, radius, 8, Math.PI / 8);
  const facing = center - sign * radius * Math.cos(Math.PI / 8);
  const flat = [...octagon]
    .sort((a, b) => Math.abs(a.x - facing) - Math.abs(b.x - facing))
    .slice(0, 2)
    .sort((a, b) => a.y - b.y);
  return sign > 0
    ? octagonAroundFlat(octagon, flat[0], flat[1])
    : octagonAroundFlat(octagon, flat[1], flat[0]);
}

function wingAndOctagon(edge: number, depth: number, sign: 1 | -1): Point[] {
  const far = edge + sign * depth * ALTAR_WING_WIDTH;
  const inner = -depth / 2;
  const outer = depth / 2;
  const across = depth * ALTAR_OCTAGON;
  const radius = across / (2 * Math.cos(Math.PI / 8));
  const center = far + sign * (across / 2);
  const octagon = regularPolygon(center, 0, radius, 8, Math.PI / 8);
  const flat = [...octagon]
    .sort((a, b) => Math.abs(a.x - far) - Math.abs(b.x - far))
    .slice(0, 2)
    .sort((a, b) => a.y - b.y);
  const lower = flat[0];
  const upper = flat[1];
  const around = sign > 0 ? octagonAroundFlat(octagon, lower, upper) : octagonAroundFlat(octagon, upper, lower);
  if (sign > 0) {
    return [{ x: edge, y: inner }, { x: far, y: inner }, ...around, { x: far, y: outer }, { x: edge, y: outer }];
  }
  return [{ x: edge, y: outer }, { x: far, y: outer }, ...around, { x: far, y: inner }, { x: edge, y: inner }];
}

/** Cross pattée, the temple knight cross. Flat ends flare wider than the waist. */
export function templeKnightCross(size: number): Point[] {
  const tip = size;
  const outer = size * 0.46;
  const inner = size * 0.12;
  return [
    { x: -outer, y: tip },
    { x: outer, y: tip },
    { x: inner, y: inner },
    { x: tip, y: outer },
    { x: tip, y: -outer },
    { x: inner, y: -inner },
    { x: outer, y: -tip },
    { x: -outer, y: -tip },
    { x: -inner, y: -inner },
    { x: -tip, y: -outer },
    { x: -tip, y: outer },
    { x: -inner, y: inner },
  ];
}

/** Short ticks past the flat end of each arm. `outset` clears a stroke centered on the outline. */
export function templeKnightCrossRays(size: number, outset = 0): [Point, Point][] {
  const start = size + outset;
  const end = start + size * 0.38;
  const arms = [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
  ];
  return arms.map((arm) => [
    { x: arm.x * start, y: arm.y * start },
    { x: arm.x * end, y: arm.y * end },
  ]);
}

/** Wide, short teeth around the heartfire. Each base meets the next on the border. */
const HEARTFIRE_TOOTH_COUNT = 16;
const HEARTFIRE_TOOTH_HEIGHT = 0.36;
/** Altitude of each tooth compared with the first ring. */
const HEARTFIRE_TOOTH_FLATNESS = 0.75;
/**
 * Fillet radius on the outward tip, as a fraction of the flattened altitude.
 * A smaller fillet still reads as a point: each tooth is only a few pixels tall.
 */
const HEARTFIRE_TOOTH_TIP_ROUND = 1.2;
const HEARTFIRE_TOOTH_TIP_STEPS = 4;

/** Tangent point on the outward side of a circle, closest to `prefer`. */
function outwardFilletTangent(from: Point, center: Point, radius: number, prefer: Point): Point | null {
  const dx = from.x - center.x;
  const dy = from.y - center.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= radius + 1e-6) return null;
  const ang = Math.atan2(dy, dx);
  const beta = Math.acos(Math.min(1, radius / dist));
  const candidates = [beta, -beta].map((turn) => ({
    x: center.x + Math.cos(ang + turn) * radius,
    y: center.y + Math.sin(ang + turn) * radius,
  }));
  candidates.sort(
    (a, b) => Math.hypot(a.x - prefer.x, a.y - prefer.y) - Math.hypot(b.x - prefer.x, b.y - prefer.y),
  );
  return candidates[0];
}

function sampleArc(center: Point, radius: number, from: number, to: number, steps: number): Point[] {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return Array.from({ length: steps + 1 }, (_, step) => {
    const angle = from + (delta * step) / steps;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });
}

/** Straight sides into a short arc, so the outward corner is rounded and the peak stays put. */
function roundedOutwardCorner(left: Point, peak: Point, right: Point, radius: number): Point[] {
  const peakDist = Math.hypot(peak.x, peak.y);
  if (radius <= 0 || peakDist <= radius) return [peak];
  const mid = Math.atan2(peak.y, peak.x);
  const center = { x: Math.cos(mid) * (peakDist - radius), y: Math.sin(mid) * (peakDist - radius) };
  const leftTan = outwardFilletTangent(left, center, radius, peak);
  const rightTan = outwardFilletTangent(right, center, radius, peak);
  if (!leftTan || !rightTan) return [peak];
  if (Math.hypot(leftTan.x, leftTan.y) <= Math.hypot(left.x, left.y)) return [peak];
  if (Math.hypot(rightTan.x, rightTan.y) <= Math.hypot(right.x, right.y)) return [peak];
  const a0 = Math.atan2(leftTan.y - center.y, leftTan.x - center.x);
  const a1 = Math.atan2(peak.y - center.y, peak.x - center.x);
  const a2 = Math.atan2(rightTan.y - center.y, rightTan.x - center.x);
  const leftArc = sampleArc(center, radius, a0, a1, HEARTFIRE_TOOTH_TIP_STEPS);
  const rightArc = sampleArc(center, radius, a1, a2, HEARTFIRE_TOOTH_TIP_STEPS);
  return [...leftArc.slice(0, -1), peak, ...rightArc.slice(1)];
}

export function heartfireBorderTriangles(radius: number, border: number): Point[][] {
  if (radius <= 0) return [];
  const outer = radius + border;
  const step = (2 * Math.PI) / HEARTFIRE_TOOTH_COUNT;
  const base = 2 * outer * Math.sin(step / 2);
  const baseRadius = outer - 0.35;
  const chordMid = baseRadius * Math.cos(step / 2);
  const fullTip = outer + base * HEARTFIRE_TOOTH_HEIGHT;
  const tipRadius = chordMid + (fullTip - chordMid) * HEARTFIRE_TOOTH_FLATNESS;
  const fillet = (tipRadius - chordMid) * HEARTFIRE_TOOTH_TIP_ROUND;
  return Array.from({ length: HEARTFIRE_TOOTH_COUNT }, (_, index) => {
    const mid = index * step;
    const left = mid - step / 2;
    const right = mid + step / 2;
    const leftPoint = { x: Math.cos(left) * baseRadius, y: Math.sin(left) * baseRadius };
    const peak = { x: Math.cos(mid) * tipRadius, y: Math.sin(mid) * tipRadius };
    const rightPoint = { x: Math.cos(right) * baseRadius, y: Math.sin(right) * baseRadius };
    return [leftPoint, ...roundedOutwardCorner(leftPoint, peak, rightPoint, fillet), rightPoint];
  });
}

/** The smithy stays the first size. Later levels add the forge and the wing. */
export function blacksmithScale(_level: number): number {
  return 1;
}

/** The lodge stays the first width. Later levels add a tower and a wing. */
export function cabinWidthScale(_level: number): number {
  return 1;
}

/** Main square only. The side wing keeps the width from before this. */
const CABIN_MAIN_WIDE = 1.3;

function cabinMainSize(size: number, level: number): { width: number; depth: number } {
  return {
    width: size * cabinWidthScale(level) * CABIN_MAIN_WIDE,
    depth: size * cabinLengthScale(level),
  };
}

/** The lodge stays the first length. Later levels add a tower and a wing. */
export function cabinLengthScale(_level: number): number {
  return 1;
}

/** Round tower on the outer right corner, as a fraction of the first lodge. */
const CABIN_TOWER = 0.22;

/**
 * Round tower on the outer right corner from level 2. It stays the first size.
 * Local +y is away from the village center, and +x is to the right from outside.
 */
export function cabinTower(
  size: number,
  level: number,
): { x: number; y: number; r: number } | null {
  const step = Math.max(1, Math.round(level));
  if (step < 2 || size <= 0) return null;
  const { width, depth } = cabinMainSize(size, step);
  return {
    x: width / 2,
    y: depth / 2,
    r: size * CABIN_TOWER,
  };
}

/**
 * Left-side rectangle on the Grand Hunter Lodge. Length is 75% of the lodge,
 * width is one third, and the village-facing end lines up with the lodge.
 * Local +y is away from the village center, and +x is to the right from outside.
 */
export function cabinWing(
  size: number,
  level: number,
): { x: number; y: number; w: number; h: number } | null {
  const step = Math.max(1, Math.round(level));
  if (step < 3 || size <= 0) return null;
  const { width, depth } = cabinMainSize(size, step);
  const w = (size * cabinWidthScale(step)) / 3;
  const h = depth * 0.75;
  return {
    x: -width / 2 - w / 2,
    y: -depth / 2 + h / 2,
    w,
    h,
  };
}

/** Lodge body, with the left rectangle joined on so the shared edge is not drawn. */
export function cabinOutline(size: number, level: number): Point[] {
  const { width, depth } = cabinMainSize(size, level);
  const wing = cabinWing(size, level);
  if (!wing) return rectLocal(width, depth);
  const left = -width / 2 - wing.w;
  const inner = -depth / 2;
  const wingOuter = inner + wing.h;
  return [
    { x: left, y: inner },
    { x: width / 2, y: inner },
    { x: width / 2, y: depth / 2 },
    { x: -width / 2, y: depth / 2 },
    { x: -width / 2, y: wingOuter },
    { x: left, y: wingOuter },
  ];
}

/** The tannery hall stays the first size. Later levels add wings. */
export function tanneryWidthScale(_level: number): number {
  return 1;
}

/** The tannery hall stays the first size. Later levels add wings. */
export function tanneryLengthScale(_level: number): number {
  return 1;
}

/** Wide hall, matching the tanning yard: the bar is 40 long and 12 deep. */
const TANNERY_WIDE = 1.7;
const TANNERY_YARD_WIDTH = 40;
const TANNERY_YARD_BAR = 12;
const TANNERY_YARD_WING = 12;
/** How far each wing reaches past the inner edge of the bar, in yard units. */
const TANNERY_YARD_REACH = 26;
/** Hall depth, toward and away from the village. */
export const TANNERY_DEEP = TANNERY_WIDE * (TANNERY_YARD_BAR / TANNERY_YARD_WIDTH);
/** Wing thickness, same as the bar in the tanning yard. */
const TANNERY_WING = TANNERY_WIDE * (TANNERY_YARD_WING / TANNERY_YARD_WIDTH);
/** How far each wing reaches past the hall toward the village center. */
export const TANNERY_WING_REACH = TANNERY_WIDE * (TANNERY_YARD_REACH / TANNERY_YARD_WIDTH);

/**
 * Tannery, in the proportions of the tanning yard: a bar 40 by 12, and wings
 * 12 thick that reach 26 past the inner edge. Level 1 is the bar. Level 2
 * adds the left wing. Level 3 adds the right wing, a U open toward the center.
 * Local +y is away from the village center, and +x is to the right from outside.
 */
export function tanneryOutline(size: number, level: number): Point[] {
  const step = Math.max(1, Math.round(level));
  const halfW = (size * TANNERY_WIDE) / 2;
  const halfD = (size * TANNERY_DEEP) / 2;
  const inner = -halfD;
  const outer = halfD;
  if (step < 2) {
    return [
      { x: -halfW, y: inner },
      { x: halfW, y: inner },
      { x: halfW, y: outer },
      { x: -halfW, y: outer },
    ];
  }
  const wing = size * TANNERY_WING;
  const tip = inner - size * TANNERY_WING_REACH;
  const leftInner = -halfW + wing;
  const points: Point[] = [
    { x: -halfW, y: tip },
    { x: leftInner, y: tip },
    { x: leftInner, y: inner },
  ];
  if (step >= 3) {
    const rightInner = halfW - wing;
    points.push(
      { x: rightInner, y: inner },
      { x: rightInner, y: tip },
      { x: halfW, y: tip },
    );
  } else {
    points.push({ x: halfW, y: inner });
  }
  points.push({ x: halfW, y: outer }, { x: -halfW, y: outer });
  return points;
}

/** Open court of the U. Paths stop at the mouth instead of crossing it. */
export function tanneryCourt(size: number, level: number): Point[] | null {
  if (Math.max(1, Math.round(level)) < 3) return null;
  const halfW = (size * TANNERY_WIDE) / 2;
  const inner = -(size * TANNERY_DEEP) / 2;
  const tip = inner - size * TANNERY_WING_REACH;
  const wing = size * TANNERY_WING;
  return [
    { x: -halfW + wing, y: tip },
    { x: halfW - wing, y: tip },
    { x: halfW - wing, y: inner },
    { x: -halfW + wing, y: inner },
  ];
}

export {
  BASE_TRAP_COUNT,
  CHITIN_OUTLINE,
  CHITIN_SPIKE_BASE,
  CHITIN_SPIKE_LENGTH,
  CHITIN_SPIKE_SPACING,
  MOAT_GROUND_PAD,
  MOAT_OUTER_STRETCH,
  MOAT_STROKE,
  TRAP_DRAW_SCALE,
  WALL_CHITIN_STROKE,
  alchemistHall,
  alchemistHallDoor,
  archiveOutline,
  archiveScale,
  bastionDrawbridge,
  blacksmithAnnex,
  blacksmithFurnace,
  blacksmithOutline,
  blacksmithWing,
  buildersHole,
  buildersOutline,
  buildersParts,
  buildersScale,
  buildersWing,
  buildingClearance,
  chitinSpikesAlongPolyline,
  clerksHut,
  closestSlotGap,
  drawbridgeChitinGap,
  foundryDomePoints,
  foundryFurnaceDomes,
  foundryFurnacePlates,
  foundryOutline,
  foundryScale,
  furthestVillageGround,
  innerWallPolygon,
  layoutWallRadius,
  moatBandEdges,
  moatBandThickness,
  moatCenterRadius,
  moatOuterOffset,
  moatOuterOffsetAt,
  moatOuterOffsetMax,
  moatRadiusAt,
  moatRingPoints,
  moatThicknessWave,
  offsetFromCentroid,
  outsetFromCenter,
  ringPoints,
  smoothClosedPath,
  trapAreaLevel,
  trapArmLength,
  trapHitRadius,
  trapMarkReach,
  trapMarkScale,
  trapPoints,
  trapWallOutset,
  trapsClearOfBuildings,
  treeMeetsMoat,
  treeMeetsTrap,
  villageGroundPoints,
  wallChitinPolygon,
  wallChitinSpikes,
  wallFitLevel,
  wallPolygon,
  wallRadius,
  wallStrokeWidth,
} from "@/pages/village-map-demo/geometryBuildings";
export type {
  BastionDrawbridge,
  ChitinSpike,
  FoundryDome,
} from "@/pages/village-map-demo/geometryBuildings";

export {
  PALISADE_BORDER,
  PALISADE_TOWER_STROKE,
  bastionChitinChains,
  bastionChitinPaths,
  buildingReach,
  buildingShapes,
  circleMeetsBuilding,
  circleMeetsPalisade,
  clipSegmentOutsideWall,
  constrainMove,
  containSlots,
  crossOutline,
  finalFramePoints,
  fittedViewBox,
  footprintsOverlap,
  hitsPalisadeTower,
  innerSidePoint,
  mapFramePoints,
  palisadeTowerChitinOutset,
  palisadeTowerRim,
  palisadeTowers,
  pointInPolygon,
  pointOnWall,
  polyOutsideChitinChains,
  polyOutsideChitinPaths,
  radialAngle,
  tentOutline,
  wallAngle,
  wallChitinOpenChains,
  wallChitinOpenPaths,
  wallClearance,
  watchtowerChitinChains,
  watchtowerChitinPaths,
} from "@/pages/village-map-demo/geometryFrame";
export type {
  ChitinBlocker,
  WallChitinSpan,
} from "@/pages/village-map-demo/geometryFrame";
