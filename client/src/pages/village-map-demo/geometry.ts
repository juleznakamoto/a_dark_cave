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

export type Point = { x: number; y: number };

/** Building positions sit on whole pixels. */
export function snapToPixel(point: Point): Point {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

/** Nearest whole pixel that is still a legal place to stand. */
function snapToLegalPixel(point: Point, legal: (at: Point) => boolean): Point {
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

/** Black rim around the bastion. The drawbridge rails use the same width, outside the deck. */
export function bastionOutlineWidth(tier: number): number {
  return Math.max(1, tier) * 4;
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
const ESTATE_PORCH_WIDTH = 2 / 5;
const ESTATE_PORCH_DEPTH = (1 / 4) * 0.55;
const ESTATE_PORCH_CORNER = 0.28;

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

function regularPolygon(
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
const ALTAR_PORCH_DEPTH = 0.5;
/** Side rectangle, 40% as wide as the building's length, then an octagon three times that length. */
const ALTAR_WING_WIDTH = 0.4;
const ALTAR_OCTAGON = 3;

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
const TANNERY_DEEP = TANNERY_WIDE * (TANNERY_YARD_BAR / TANNERY_YARD_WIDTH);
/** Wing thickness, same as the bar in the tanning yard. */
const TANNERY_WING = TANNERY_WIDE * (TANNERY_YARD_WING / TANNERY_YARD_WIDTH);
/** How far each wing reaches past the hall toward the village center. */
const TANNERY_WING_REACH = TANNERY_WIDE * (TANNERY_YARD_REACH / TANNERY_YARD_WIDTH);

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
function tanneryCourt(size: number, level: number): Point[] | null {
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

/**
 * Alchemist's Hall. 50% larger than a normal building, and three times as wide
 * as it is long, then 25% less wide. A decagon tower sits on the left side,
 * 25% larger than the length, then 15% larger again. Local +y is away from the village center, and
 * +x is to the right from outside.
 */
export function alchemistHall(size: number): { width: number; depth: number; tower: Point[] } {
  const depth = size * 1.5;
  const width = depth * 3 * 0.75;
  const radius = (depth * 1.25 * 1.15) / 2;
  return {
    width,
    depth,
    tower: regularPolygon(-width / 2, 0, radius, 10, Math.PI),
  };
}

/** Middle of the right wall. The decagon sits on the left. */
export function alchemistHallDoor(at: Point, hutSize: number): Point {
  const hall = alchemistHall(markSize("alchemistHall", hutSize));
  return placePoints([{ x: hall.width / 2, y: 0 }], at, tangentAngle(at))[0];
}

/** Each outward corner is cut by this fraction of the building's width. */
const CLERK_CORNER_CUT = 0.1;

/**
 * Clerk's hut size. Level 1 is 50% larger than a normal square, then 10% smaller,
 * then 15% larger. The Scriptorium is 25% wider than that. The Tomewarden Academy
 * is 50% wider.
 */
function clerksHutSize(size: number, level: number): { width: number; depth: number } {
  const step = Math.round(level);
  const depth = size * 1.5 * 0.9 * 1.15;
  const width = step >= 3 ? depth * 1.5 : step >= 2 ? depth * 1.25 : depth;
  return { width, depth };
}

/**
 * Clerk's Hut, the scribe hut. The two corners that face away from the village
 * are cut off. Level 2 puts a circle on the outer edge, twice a third of the
 * hut's depth across. Level 3 adds circles on the left and right. Local +y is away from the center, and +x
 * is to the right from outside.
 */
export function clerksHut(
  size: number,
  level: number,
): { body: Point[]; circles: { x: number; y: number; r: number }[] } {
  const step = Math.max(1, Math.round(level));
  const { width, depth } = clerksHutSize(size, step);
  const cut = width * CLERK_CORNER_CUT;
  const hx = width / 2;
  const hy = depth / 2;
  const body = [
    { x: -hx, y: -hy },
    { x: hx, y: -hy },
    { x: hx, y: hy - cut },
    { x: hx - cut, y: hy },
    { x: -hx + cut, y: hy },
    { x: -hx, y: hy - cut },
  ];
  const circles: { x: number; y: number; r: number }[] = [];
  if (step >= 2) {
    const across = step === 2 ? (depth / 3) * 2 : width / 3;
    circles.push({ x: 0, y: hy, r: across / 2 });
  }
  if (step >= 3) {
    const radius = width / 6;
    circles.push({ x: -hx, y: 0, r: radius }, { x: hx, y: 0, r: radius });
  }
  return { body, circles };
}

/** Side square, as a fraction of the building width. */
const ARCHIVE_WING = 0.5;

/** Every scribe's office is 15% larger, then another 10%. Later levels add wings and a cap at that size. */
export function archiveScale(_level: number): number {
  return 1.15 * 1.1;
}

/**
 * Outer half of the circle that used to sit on the scribe's office.
 * Diameter is the building's outer edge. The dome bulges away from the village.
 */
function archiveOuterCap(span: number, base: number): Point[] {
  const radius = span / 2;
  const steps = 12;
  const points: Point[] = [];
  for (let step = 1; step < steps; step++) {
    const angle = (step / steps) * Math.PI;
    points.push({
      x: Math.cos(angle) * radius,
      y: base + Math.sin(angle) * radius,
    });
  }
  return points;
}

/**
 * Scribe's Office. Level 1 is half a U: the building plus a square on the
 * left, half as wide as the building, sticking toward the village. The open
 * end faces the middle. Level 2 mirrors that square, closing the U, still
 * open toward the middle. Level 3 makes the middle square 50% longer, away
 * from the village, and replaces that outer edge with a half circle of the
 * building's width. Local +y is away.
 */
export function archiveOutline(size: number, level: number): Point[] {
  const span = size * archiveScale(level);
  const half = span / 2;
  const arm = span * ARCHIVE_WING;
  const inner = -half;
  const left = -half;
  const right = half;
  const tip = inner - arm;
  const join = inner + arm;
  const step = Math.round(level);
  const mirrored = step >= 2;
  const outer = half + (step >= 3 ? span * 0.5 : 0);
  return [
    { x: left - arm, y: tip },
    { x: left, y: tip },
    { x: left, y: inner },
    { x: right, y: inner },
    ...(mirrored
      ? [
        { x: right, y: tip },
        { x: right + arm, y: tip },
        { x: right + arm, y: join },
        { x: right, y: join },
      ]
      : []),
    { x: right, y: outer },
    ...(step >= 3 ? archiveOuterCap(span, outer) : []),
    { x: left, y: outer },
    { x: left, y: join },
    { x: left - arm, y: join },
  ];
}

const BUILDERS_SHRINK = 0.85 ** 2 * 0.9 * 0.9;
/** Short side of the L, in spans. Two of these L's are the hall. */
const BUILDERS_LONG = 1.7;
/** Hall and the I beside it are 50% longer than that short side. */
const BUILDERS_LENGTH = 1.5;
/** Court wall, in spans. Lodge legs use this same thickness. */
const BUILDERS_WALL = 0.28;
/** Thick court wall, eased back a little so the opening inside is roomier. */
const BUILDERS_WALL_SCALE = 1.3 * 1.75 * 0.85;
/** I beside the hall. Its length matches the hall. */
const BUILDERS_WING_W = 0.55;
/** Gap between the hall and that I, in spans. */
const BUILDERS_WING_GAP = 0.18 * 3;

/** Every builder's building is smaller by 15%, 15%, 10%, then 10%, then half again as large. */
export function buildersScale(_level: number): number {
  return BUILDERS_SHRINK * 1.5;
}

/** Shared wall thickness for the lodge legs and the hall they form. */
function buildersWall(span: number): number {
  return span * BUILDERS_WALL * BUILDERS_WALL_SCALE;
}

/** The L's box. The hall is this same box, open inside. */
function buildersBox(span: number): {
  wide: number;
  deep: number;
  thick: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const wide = span * BUILDERS_LONG;
  const deep = wide * BUILDERS_LENGTH;
  const thick = buildersWall(span);
  return {
    wide,
    deep,
    thick,
    left: -wide / 2,
    top: -deep / 2,
    right: wide / 2,
    bottom: deep / 2,
  };
}

/**
 * Builder's Lodge. Level 1 is an L, open toward the upper right, with the
 * foot on the side away from the village. Level 2 is that L plus the
 * opposite L, together one open rectangle of the same outer size. Level 3
 * keeps that rectangle and sets an I beside it, as long as the rectangle,
 * with a small gap. The rectangle and the I are 50% longer than the L's
 * short side. Local +y is away from the village.
 */
export function buildersParts(
  size: number,
  level: number,
): { outer: Point[]; hole: Point[] | null; wing: Point[] | null } {
  const step = Math.max(1, Math.round(level));
  const box = buildersBox(size * buildersScale(step));
  const { thick, left, top, right, bottom } = box;
  if (step < 2) {
    return {
      outer: [
        { x: left, y: bottom },
        { x: right, y: bottom },
        { x: right, y: bottom - thick },
        { x: left + thick, y: bottom - thick },
        { x: left + thick, y: top },
        { x: left, y: top },
      ],
      hole: null,
      wing: null,
    };
  }
  const wingLeft = right + size * buildersScale(step) * BUILDERS_WING_GAP;
  const wingW = size * buildersScale(step) * BUILDERS_WING_W;
  return {
    outer: [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ],
    hole: [
      { x: left + thick, y: top + thick },
      { x: right - thick, y: top + thick },
      { x: right - thick, y: bottom - thick },
      { x: left + thick, y: bottom - thick },
    ],
    wing: step >= 3
      ? [
        { x: wingLeft, y: top },
        { x: wingLeft + wingW, y: top },
        { x: wingLeft + wingW, y: bottom },
        { x: wingLeft, y: bottom },
      ]
      : null,
  };
}

/** Outer edge of the builder's lodge. */
export function buildersOutline(size: number, level: number): Point[] {
  return buildersParts(size, level).outer;
}

/** Courtyard hole. Level 1 has none. */
export function buildersHole(size: number, level: number): Point[] | null {
  return buildersParts(size, level).hole;
}

/** Detached room beside the court. Levels 1 and 2 have none. */
export function buildersWing(size: number, level: number): Point[] | null {
  return buildersParts(size, level).wing;
}

const FOUNDRY_SHRINK = 0.9;
/** Corner cut, a quarter of the original 45% of the short edge. */
const FOUNDRY_END_CUT = 0.45 / 4;

/** Every foundry is 10% smaller. Later levels add squares at that size. */
export function foundryScale(_level: number): number {
  return FOUNDRY_SHRINK;
}

/** Half-square bumps on the outer edge. Each is a quarter of the foundry's width. */
const FOUNDRY_SQUARE = 1 / 4;

/**
 * Two half-squares on the outer edge, walked from right to left.
 * Each is a quarter of the foundry wide and sticks out by half of that.
 * The corners that face away from the village are cut at 45°, only a small nick.
 */
function foundryOuterSquares(width: number, outer: number): Point[] {
  const side = width * FOUNDRY_SQUARE;
  const stick = side / 2;
  const cut = side * FOUNDRY_END_CUT;
  const points: Point[] = [];
  for (const center of [width / 4, -width / 4]) {
    const right = center + side / 2;
    const left = center - side / 2;
    const top = outer + stick;
    points.push(
      { x: right, y: outer },
      { x: right, y: top - cut },
      { x: right - cut, y: top },
      { x: left + cut, y: top },
      { x: left, y: top - cut },
      { x: left, y: outer },
    );
  }
  return points;
}

/**
 * Half-square on a short end. `sign` is +1 on the right, walked toward the
 * outside, and -1 on the left, walked back toward the village. The corners
 * that stick out are cut at 45°, only a small nick.
 */
function foundrySideSquare(edge: number, sign: 1 | -1, side: number): Point[] {
  const stick = side / 2;
  const nick = side * FOUNDRY_END_CUT;
  const top = side / 2;
  const bottom = -side / 2;
  const out = edge + sign * stick;
  if (sign > 0) {
    return [
      { x: edge, y: bottom },
      { x: out - nick, y: bottom },
      { x: out, y: bottom + nick },
      { x: out, y: top - nick },
      { x: out - nick, y: top },
      { x: edge, y: top },
    ];
  }
  return [
    { x: edge, y: top },
    { x: out + nick, y: top },
    { x: out, y: top - nick },
    { x: out, y: bottom + nick },
    { x: out + nick, y: bottom },
    { x: edge, y: bottom },
  ];
}

/**
 * Foundry. Three times as wide as it is long. Each corner is cut at 45°,
 * taking a quarter of that 45% off the short edge. Level 2 is 15% larger and
 * adds one half-square on the left end and one on the right. Level 3 is the
 * same size and adds two half-squares on the outer edge. The corners that
 * stick out are cut at 45°, only a small nick. Local +y is away from the village.
 */
export function foundryOutline(size: number, level: number): Point[] {
  const depth = size * foundryScale(level);
  const width = depth * 3;
  const cut = depth * FOUNDRY_END_CUT;
  const hx = width / 2;
  const hy = depth / 2;
  const inner = -hy;
  const outer = hy;
  const step = Math.round(level);
  const side = width * FOUNDRY_SQUARE;
  return [
    { x: -hx + cut, y: inner },
    { x: hx - cut, y: inner },
    { x: hx, y: inner + cut },
    ...(step >= 2 ? foundrySideSquare(hx, 1, side) : []),
    { x: hx, y: outer - cut },
    { x: hx - cut, y: outer },
    ...(step >= 3 ? foundryOuterSquares(width, outer) : []),
    { x: -hx + cut, y: outer },
    { x: -hx, y: outer - cut },
    ...(step >= 2 ? foundrySideSquare(-hx, -1, side) : []),
    { x: -hx, y: inner + cut },
  ];
}

/** Two half-circles on the outside face of each furnace. */
const FOUNDRY_OUTSIDE_DOMES = 2;
/** Diameter of one half-circle, as a fraction of that outside face. */
const FOUNDRY_DOME_SPAN = 0.25;

export type FoundryDome = {
  cx: number;
  cy: number;
  /** Unit direction along the flat edge. */
  tx: number;
  ty: number;
  /** Unit direction the plate sticks out. */
  nx: number;
  ny: number;
  /** Half the flat edge. */
  along: number;
  /** How far the plate sticks out. */
  bulge: number;
};

/** Two small half-circles, spaced along the outside face and sticking out along the normal. */
function outsideDomes(from: Point, to: Point, nx: number, ny: number): FoundryDome[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const along = (length * FOUNDRY_DOME_SPAN) / 2;
  return Array.from({ length: FOUNDRY_OUTSIDE_DOMES }, (_, index) => {
    const t = (index + 1) / (FOUNDRY_OUTSIDE_DOMES + 1);
    return {
      cx: from.x + dx * t,
      cy: from.y + dy * t,
      tx: dx / length,
      ty: dy / length,
      nx,
      ny,
      along,
      bulge: along,
    };
  });
}

/** Outside face of one outer furnace. That face points away from the village. */
function outerFurnaceDomes(center: number, outer: number, side: number): FoundryDome[] {
  const stick = side / 2;
  const top = outer + stick;
  return outsideDomes({ x: center - side / 2, y: top }, { x: center + side / 2, y: top }, 0, 1);
}

/** Outside face of one end furnace. `sign` is +1 on the right and -1 on the left. */
function sideFurnaceDomes(edge: number, sign: 1 | -1, side: number): FoundryDome[] {
  const out = edge + sign * (side / 2);
  const top = side / 2;
  const bottom = -side / 2;
  if (sign > 0) return outsideDomes({ x: out, y: bottom }, { x: out, y: top }, 1, 0);
  return outsideDomes({ x: out, y: top }, { x: out, y: bottom }, -1, 0);
}

/** Points along the outer arc, including both ends of the flat edge. */
export function foundryDomePoints(dome: FoundryDome, steps = 16): Point[] {
  const points: Point[] = [];
  for (let index = 0; index <= steps; index++) {
    const s = -1 + (2 * index) / steps;
    const lift = Math.sqrt(Math.max(0, 1 - s * s));
    points.push({
      x: dome.cx + dome.tx * s * dome.along + dome.nx * lift * dome.bulge,
      y: dome.cy + dome.ty * s * dome.along + dome.ny * lift * dome.bulge,
    });
  }
  return points;
}

/**
 * Two small half-circles on the outside face of each furnace.
 * Local +y is away from the village.
 */
export function foundryFurnaceDomes(size: number, level: number): FoundryDome[] {
  const step = Math.round(level);
  if (step < 2) return [];
  const depth = size * foundryScale(level);
  const width = depth * 3;
  const side = width * FOUNDRY_SQUARE;
  const hx = width / 2;
  const outer = depth / 2;
  return [
    ...(step >= 3
      ? [...outerFurnaceDomes(width / 4, outer, side), ...outerFurnaceDomes(-width / 4, outer, side)]
      : []),
    ...sideFurnaceDomes(hx, 1, side),
    ...sideFurnaceDomes(-hx, -1, side),
  ];
}

/** One polygon per half-circle. The flat edge is the side that sits on the furnace. */
export function foundryFurnacePlates(size: number, level: number): Point[][] {
  return foundryFurnaceDomes(size, level).map((dome) => foundryDomePoints(dome, 8));
}

/** Furnace square, as a fraction of the blacksmith's current width. */
const BLACKSMITH_FURNACE = 0.32 * 2 * 0.8;
/** Shift toward the village center, in the same units as the building stroke. */
const BLACKSMITH_FURNACE_INSET = 4;

/**
 * Square on the outer right corner, pulled 4px toward the village center.
 * Local +y is away from the center, and +x is to the right when looking that
 * way from outside. The side follows the current width, so the furnace grows
 * when the blacksmith widens.
 */
export function blacksmithFurnace(
  width: number,
  depth: number,
): { x: number; y: number; w: number; h: number } {
  const side = width * BLACKSMITH_FURNACE;
  return {
    x: width / 2,
    y: depth / 2 - BLACKSMITH_FURNACE_INSET,
    w: side,
    h: side,
  };
}

/** Detached square at the upper right, as a fraction of the hall. */
const BLACKSMITH_ANNEX = 0.42;
/** Gap between the hall's upper-right corner and that square. */
const BLACKSMITH_ANNEX_GAP = 0.14;

/**
 * Square off the upper-right corner, from the Advanced Blacksmith on.
 * A gap keeps it separate from the hall. In the comparison cell the top is
 * toward the village, and +x is to the right.
 */
export function blacksmithAnnex(
  width: number,
  depth: number,
  level: number,
): { x: number; y: number; w: number; h: number } | null {
  if (Math.round(level) < 2 || width <= 0 || depth <= 0) return null;
  const side = width * BLACKSMITH_ANNEX;
  const gap = width * BLACKSMITH_ANNEX_GAP;
  return {
    x: width / 2 + gap + side / 2,
    y: -depth / 2 - gap - side / 2,
    w: side,
    h: side,
  };
}

/** Grand blacksmith wing is longer than the building. Its width is two thirds of the hall. */
const BLACKSMITH_WING_LENGTH = 1.15;
const BLACKSMITH_WING_WIDTH = 1 / 3;
/** Level 2 is half of the original rectangle. Level 3 is twice that full width. */
const BLACKSMITH_WING_SMALL = 0.5;
const BLACKSMITH_WING_GRAND = 2;

/**
 * Rectangle on the left, opposite the furnace, flush with the edge that faces
 * the village. Level 2 is the small one. The Grand Blacksmith makes it a bit
 * longer than the building and twice as wide as the full rectangle.
 * Local +y is away from the center.
 */
export function blacksmithWing(
  width: number,
  depth: number,
  level: number,
): { x: number; y: number; w: number; h: number } | null {
  const step = Math.round(level);
  if (step < 2 || width <= 0 || depth <= 0) return null;
  const grown = step >= 3 ? 1 : BLACKSMITH_WING_SMALL;
  const wide = step >= 3 ? BLACKSMITH_WING_GRAND : 1;
  const w = width * BLACKSMITH_WING_WIDTH * grown * wide;
  const h = depth * BLACKSMITH_WING_LENGTH * grown;
  return {
    x: -width / 2 - w / 2,
    y: -depth / 2 + h / 2,
    w,
    h,
  };
}

/** Blacksmith body, with the left rectangle joined on so the shared edge is not drawn. */
export function blacksmithOutline(width: number, depth: number, level: number): Point[] {
  const wing = blacksmithWing(width, depth, level);
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

/** How far a building's mark extends past its slot, so the wall can clear it. */
export function buildingClearance(buildingId: string, hutSize: number, level = 1): number {
  if (buildingId === "pit") {
    return Math.max(
      ...densifyClosed(pitOutline(hutSize * pitScale(level)), 4).map((point) =>
        Math.hypot(point.x, point.y),
      ),
    );
  }
  if (buildingId === "estate") {
    const border = level > 1 ? ESTATE_BORDER : 1;
    const outerReach = (hutSize * ESTATE_DEPTH) / 2 + (hutSize / 2) * 1.25;
    const sideReach = level > 1 ? (hutSize * ESTATE_LENGTH) / 2 + (hutSize / 4) * 1.5 : 0;
    const porchHalfW = (hutSize * ESTATE_LENGTH * ESTATE_PORCH_WIDTH) / 2;
    const porchTip = (hutSize * ESTATE_DEPTH) / 2 + hutSize * ESTATE_DEPTH * ESTATE_PORCH_DEPTH;
    const porchReach = Math.hypot(porchHalfW, porchTip);
    return Math.max(outerReach, sideReach, porchReach) + border / 2;
  }
  if (buildingId === "wizardTower") {
    const towerRadius = markSize(buildingId, hutSize) / 2;
    return towerRadius * (1 + WIZARD_TOWER_PENTAGON_SCALE);
  }
  if (buildingId === "storage") {
    const body = markSize(buildingId, hutSize) * storageScale(level);
    const pad = storageBorder(level) / 2;
    let reach = body / 2 + pad;
    for (const tower of storageTowers(body, level)) {
      if (tower.kind === "octagon") {
        for (const point of tower.points) {
          reach = Math.max(reach, Math.hypot(point.x, point.y) + pad);
        }
      } else {
        const hx = tower.w / 2;
        const hy = tower.h / 2;
        reach = Math.max(
          reach,
          Math.hypot(tower.x - hx, tower.y - hy) + pad,
          Math.hypot(tower.x + hx, tower.y - hy) + pad,
          Math.hypot(tower.x + hx, tower.y + hy) + pad,
          Math.hypot(tower.x - hx, tower.y + hy) + pad,
        );
      }
    }
    return reach;
  }
  if (buildingId === "cabin") {
    const size = markSize(buildingId, hutSize);
    const tower = cabinTower(size, level);
    let reach = Math.max(...cabinOutline(size, level).map((point) => Math.hypot(point.x, point.y)));
    if (tower) reach = Math.max(reach, Math.hypot(tower.x, tower.y) + tower.r);
    return reach;
  }
  if (buildingId === "tannery") {
    const size = markSize(buildingId, hutSize);
    return Math.max(...tanneryOutline(size, level).map((point) => Math.hypot(point.x, point.y)));
  }
  if (buildingId === "alchemistHall") {
    const hall = alchemistHall(markSize(buildingId, hutSize));
    return Math.max(
      Math.hypot(hall.width / 2, hall.depth / 2),
      ...hall.tower.map((point) => Math.hypot(point.x, point.y)),
    );
  }
  if (buildingId === "clerksHut") {
    const hut = clerksHut(markSize(buildingId, hutSize), level);
    let reach = Math.max(...hut.body.map((point) => Math.hypot(point.x, point.y)));
    for (const circle of hut.circles) {
      reach = Math.max(reach, Math.hypot(circle.x, circle.y) + circle.r);
    }
    return reach;
  }
  if (buildingId === "archive") {
    const size = markSize(buildingId, hutSize);
    return Math.max(...archiveOutline(size, level).map((point) => Math.hypot(point.x, point.y)));
  }
  if (buildingId === "builders") {
    const size = markSize(buildingId, hutSize);
    const parts = buildersParts(size, level);
    const points = [...parts.outer, ...(parts.wing ?? [])];
    return Math.max(...points.map((point) => Math.hypot(point.x, point.y)));
  }
  if (buildingId === "foundry") {
    const size = markSize(buildingId, hutSize);
    return Math.max(...foundryOutline(size, level).map((point) => Math.hypot(point.x, point.y)));
  }
  if (buildingId === "coinhouse") {
    return coinhouseReach(markSize(buildingId, hutSize), level);
  }
  if (buildingId === "longhouse") {
    const size = markSize(buildingId, hutSize);
    return Math.max(...longhouseOutline(size).map((point) => Math.hypot(point.x, point.y)));
  }
  if (buildingId === "boneyard") {
    const size = markSize(buildingId, hutSize);
    return Math.max(...boneyardOutline(size).map((point) => Math.hypot(point.x, point.y)));
  }
  if (buildingId === "quarry") {
    const size = markSize(buildingId, hutSize);
    return Math.max(...quarryOutline(size).map((point) => Math.hypot(point.x, point.y)));
  }
  if (buildingId === "timberMill") {
    const size = markSize(buildingId, hutSize);
    return Math.max(...timberMillOutline(size).map((point) => Math.hypot(point.x, point.y)));
  }
  if (buildingId === "pillarOfClarity") {
    const size = markSize(buildingId, hutSize);
    return Math.max(...pillarOutline(size).map((point) => Math.hypot(point.x, point.y)));
  }
  if (buildingId === "boneTemple") {
    const size = markSize(buildingId, hutSize);
    let reach = Math.max(...boneTempleOutline(size).map((point) => Math.hypot(point.x, point.y)));
    for (const corner of boneTempleSpikedCorners(size)) {
      for (const point of corner) reach = Math.max(reach, Math.hypot(point.x, point.y));
    }
    return reach;
  }
  if (buildingId === "trade") {
    const size = markSize(buildingId, hutSize);
    let reach = Math.max(...tradeOutline(size, level).map((point) => Math.hypot(point.x, point.y)));
    for (const circle of tradeCircles(size, level)) {
      reach = Math.max(reach, Math.hypot(circle.x, circle.y) + circle.rx);
    }
    return reach;
  }
  if (buildingId === "altar") {
    const size = markSize(buildingId, hutSize);
    let reach = Math.max(...altarOutline(size, level).map((point) => Math.hypot(point.x, point.y)));
    for (const circle of altarCircles(size, level)) {
      reach = Math.max(reach, Math.hypot(circle.x, circle.y) + circle.r);
    }
    return reach;
  }
  if (buildingId === "blacksmith") {
    const span = markSize(buildingId, hutSize) * blacksmithScale(level);
    const furnace = blacksmithFurnace(span, span);
    const annex = blacksmithAnnex(span, span, level);
    const corners = (box: { x: number; y: number; w: number; h: number }) => {
      const hx = box.w / 2;
      const hy = box.h / 2;
      return [
        Math.hypot(box.x + hx, box.y + hy),
        Math.hypot(box.x - hx, box.y - hy),
        Math.hypot(box.x + hx, box.y - hy),
        Math.hypot(box.x - hx, box.y + hy),
      ];
    };
    return Math.max(
      ...blacksmithOutline(span, span, level).map((point) => Math.hypot(point.x, point.y)),
      ...corners(furnace),
      ...(annex ? corners(annex) : []),
    );
  }
  return markSize(buildingId, hutSize) / 2;
}

/**
 * Upgrades do not push the palisade out. The Dark Estate and Black Estate
 * still use their real tier, because the black border reaches farther.
 */
export function wallFitLevel(buildingId: string, tier: number): number {
  return buildingId === "estate" ? Math.max(1, Math.round(tier)) : 1;
}

export function wallRadius(slots: PlacedSlot[], tuning: Tuning): number {
  let reach = 64;
  for (const slot of slots) {
    if (sitsOnWall(slot.buildingId)) continue;
    reach = Math.max(
      reach,
      ovalRadius(slot, tuning.wallOval) +
      buildingClearance(slot.buildingId, tuning.squareSize, wallFitLevel(slot.buildingId, slot.tier)),
    );
  }
  return reach / minWobbleFactor(tuning.wallWobble, tuning.wallLobes);
}

/** Finished-village wall. Drags do not change it. */
export function layoutWallRadius(tuning: Tuning): number {
  const layout = placedSlots(applyGrowth(GROWTH_STEPS.length), tuning, {});
  return wallRadius(layout, tuning);
}

export function ringPoints(radius: number, tuning: Tuning, rotation = 0): Point[] {
  const count = Math.max(8, Math.round(tuning.wallSides));
  const points: Point[] = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2 + rotation;
    const local = radius * wobbleAt(angle, tuning.wallWobble, tuning.wallLobes);
    points.push({
      x: MAP_CENTER + Math.cos(angle) * local,
      y: MAP_CENTER + Math.sin(angle) * local * tuning.wallOval,
    });
  }
  return points;
}

function curveSegments(points: Point[], tension = 1): Array<[Point, Point, Point, Point]> {
  const count = points.length;
  const segments: Array<[Point, Point, Point, Point]> = [];
  for (let index = 0; index < count; index++) {
    const p0 = points[(index - 1 + count) % count];
    const p1 = points[index];
    const p2 = points[(index + 1) % count];
    const p3 = points[(index + 2) % count];
    segments.push([
      p1,
      {
        x: p1.x + ((p2.x - p0.x) / 6) * tension,
        y: p1.y + ((p2.y - p0.y) / 6) * tension,
      },
      {
        x: p2.x - ((p3.x - p1.x) / 6) * tension,
        y: p2.y - ((p3.y - p1.y) / 6) * tension,
      },
      p2,
    ]);
  }
  return segments;
}

function cubicPoint(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
}

function densifyClosed(points: Point[], stepsPerSegment = 4): Point[] {
  const dense: Point[] = [];
  for (const [p0, c1, c2, p3] of curveSegments(points)) {
    for (let step = 0; step < stepsPerSegment; step++) {
      dense.push(cubicPoint(p0, c1, c2, p3, step / stepsPerSegment));
    }
  }
  return dense;
}

/** The same curve the palisade is drawn with, as a dense polygon. */
export function wallPolygon(radius: number, tuning: Tuning): Point[] {
  return densifyClosed(ringPoints(radius, tuning), 4);
}

/**
 * Inner edge of the drawn wall stroke: centerline inset by half the stroke
 * width. Buildings must stay inside this line so they do not cover the grey.
 */
export function innerWallPolygon(radius: number, tuning: Tuning, wallStroke: number): Point[] {
  const inset = Math.max(0, wallStroke / 2);
  return densifyClosed(outsetFromCenter(ringPoints(radius, tuning), -inset), 4);
}

/** Push ring points outward along the ray from the map center. */
export function outsetFromCenter(points: Point[], outset: number | ((point: Point) => number)): Point[] {
  return points.map((point) => {
    const dx = point.x - MAP_CENTER;
    const dy = point.y - MAP_CENTER;
    const length = Math.hypot(dx, dy) || 1;
    const reach = typeof outset === "function" ? outset(point) : outset;
    return {
      x: point.x + (dx / length) * reach,
      y: point.y + (dy / length) * reach,
    };
  });
}

/**
 * Centerline of the wall's outer white chitin stroke, densified to match the
 * smoothed path drawn on the map.
 */
export function wallChitinPolygon(
  radius: number,
  tuning: Tuning,
  wallStroke: number,
  chitinStroke: number,
): Point[] {
  const outset = wallStroke / 2 + chitinStroke / 2;
  return densifyClosed(outsetFromCenter(ringPoints(radius, tuning), outset), 8);
}

export type ChitinSpike = {
  /** Outer tip, on the local outward normal. */
  tip: Point;
  left: Point;
  right: Point;
};

/** Default spike length in SVG units (short triangles on the rim). */
export const CHITIN_SPIKE_LENGTH = 8;
/** Black edge on each side of a chitin plate. */
export const CHITIN_OUTLINE = 1;
/** White plating stroke on the outside of the palisade. */
export const WALL_CHITIN_STROKE = 5;
/** Base width across the wall tangent. */
export const CHITIN_SPIKE_BASE = 6;
/** Arc spacing along the outer chitin rim. */
export const CHITIN_SPIKE_SPACING = 22;

type SpikeOptions = {
  length?: number;
  baseWidth?: number;
  spacing?: number;
  /** When true, wrap from the last point back to the first. */
  closed?: boolean;
  exclude?: Array<Point & { r: number }>;
  /**
   * Which side of the stroke the tips point to.
   * `radial` faces away from the village center (the palisade).
   * `left` faces the left of the chain's direction of travel (the bastion wrap).
   */
  outside?: "radial" | "left";
};

/**
 * Small outward triangles along a chitin centerline. Bases sit on the outer
 * edge of the white stroke; tips point along the local outward normal (90° off
 * the edge tangent, away from MAP_CENTER), not along a radial ray.
 */
export function chitinSpikesAlongPolyline(
  centerline: Point[],
  chitinStroke: number,
  options: SpikeOptions = {},
): ChitinSpike[] {
  if (centerline.length < 2) return [];
  const length = options.length ?? CHITIN_SPIKE_LENGTH;
  const baseWidth = options.baseWidth ?? CHITIN_SPIKE_BASE;
  const spacing = options.spacing ?? CHITIN_SPIKE_SPACING;
  const exclude = options.exclude ?? [];
  const closed = options.closed ?? false;
  const outside = options.outside ?? "radial";
  const halfStroke = chitinStroke / 2;

  // Each entry is the outer edge of one centerline segment, plus the unit
  // direction the tip should point.
  const pieces: Array<{ a: Point; b: Point; nx: number; ny: number }> = [];

  if (outside === "left") {
    // Offset each segment on its own. A miter at the tower corners folds the
    // base into the notch and aims one spike back into the tower.
    const segCount = closed ? centerline.length : centerline.length - 1;
    for (let index = 0; index < segCount; index++) {
      const a = centerline[index];
      const b = centerline[(index + 1) % centerline.length];
      const tx = b.x - a.x;
      const ty = b.y - a.y;
      const segLen = Math.hypot(tx, ty);
      if (segLen < 1e-6) continue;
      const nx = -ty / segLen;
      const ny = tx / segLen;
      pieces.push({
        a: { x: a.x + nx * halfStroke, y: a.y + ny * halfStroke },
        b: { x: b.x + nx * halfStroke, y: b.y + ny * halfStroke },
        nx,
        ny,
      });
    }
  } else {
    const rim = centerline.map((point, index) => {
      const prev = centerline[(index - 1 + centerline.length) % centerline.length];
      const next = centerline[(index + 1) % centerline.length];
      const usePrev = closed || index > 0;
      const useNext = closed || index < centerline.length - 1;
      const ax = usePrev ? point.x - prev.x : next.x - point.x;
      const ay = usePrev ? point.y - prev.y : next.y - point.y;
      const bx = useNext ? next.x - point.x : point.x - prev.x;
      const by = useNext ? next.y - point.y : point.y - prev.y;
      const tx = ax + bx;
      const ty = ay + by;
      const tLen = Math.hypot(tx, ty) || 1;
      let nx = ty / tLen;
      let ny = -tx / tLen;
      const awayX = point.x - MAP_CENTER;
      const awayY = point.y - MAP_CENTER;
      if (nx * awayX + ny * awayY < 0) {
        nx = -nx;
        ny = -ny;
      }
      return {
        x: point.x + nx * halfStroke,
        y: point.y + ny * halfStroke,
      };
    });
    const segCount = closed ? rim.length : rim.length - 1;
    for (let index = 0; index < segCount; index++) {
      const a = rim[index];
      const b = rim[(index + 1) % rim.length];
      const tx = b.x - a.x;
      const ty = b.y - a.y;
      const segLen = Math.hypot(tx, ty);
      if (segLen < 1e-6) continue;
      let nx = ty / segLen;
      let ny = -tx / segLen;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const awayX = mid.x - MAP_CENTER;
      const awayY = mid.y - MAP_CENTER;
      if (nx * awayX + ny * awayY < 0) {
        nx = -nx;
        ny = -ny;
      }
      pieces.push({ a, b, nx, ny });
    }
  }

  if (pieces.length === 0) return [];
  const perimeter: number[] = [0];
  let total = 0;
  for (const piece of pieces) {
    total += Math.hypot(piece.b.x - piece.a.x, piece.b.y - piece.a.y);
    perimeter.push(total);
  }
  if (total < spacing * 0.5) return [];

  const count = Math.max(1, Math.round(total / spacing));
  const step = total / count;
  const spikes: ChitinSpike[] = [];
  const limit = closed ? count : Math.max(1, count - 1);

  for (let index = 0; index < limit; index++) {
    const target = closed ? index * step : (index + 0.5) * (total / limit);
    let segment = 0;
    while (segment < perimeter.length - 1 && perimeter[segment + 1] < target - 1e-9) {
      segment += 1;
    }
    const piece = pieces[Math.min(segment, pieces.length - 1)];
    const segLen = Math.hypot(piece.b.x - piece.a.x, piece.b.y - piece.a.y) || 1;
    const t = (target - perimeter[segment]) / segLen;
    const base = {
      x: piece.a.x + (piece.b.x - piece.a.x) * t,
      y: piece.a.y + (piece.b.y - piece.a.y) * t,
    };

    if (exclude.some((zone) => Math.hypot(base.x - zone.x, base.y - zone.y) < zone.r)) {
      continue;
    }

    const tx = (piece.b.x - piece.a.x) / segLen;
    const ty = (piece.b.y - piece.a.y) / segLen;
    const half = baseWidth / 2;
    spikes.push({
      tip: { x: base.x + piece.nx * length, y: base.y + piece.ny * length },
      left: { x: base.x + tx * half, y: base.y + ty * half },
      right: { x: base.x - tx * half, y: base.y - ty * half },
    });
  }
  return spikes;
}

/**
 * Spikes on the closed village wall rim. Optionally skip bases that land inside
 * exclusion circles (when those surfaces get their own spike chains instead).
 */
export function wallChitinSpikes(
  chitinCenterline: Point[],
  chitinStroke: number,
  options: SpikeOptions = {},
): ChitinSpike[] {
  return chitinSpikesAlongPolyline(chitinCenterline, chitinStroke, {
    ...options,
    closed: true,
  });
}

/** Scale a polygon away from its centroid (border / chitin outset). */
export function offsetFromCentroid(points: Point[], delta: number): Point[] {
  if (delta === 0 || points.length === 0) return points;
  const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  let reach = 0;
  for (const point of points) {
    reach = Math.max(reach, Math.hypot(point.x - cx, point.y - cy));
  }
  if (reach + delta <= 0) return points;
  const scale = (reach + delta) / reach;
  return points.map((point) => ({
    x: cx + (point.x - cx) * scale,
    y: cy + (point.y - cy) * scale,
  }));
}

export function smoothClosedPath(points: Point[], tension = 1): string {
  if (points.length === 0) return "";
  const first = points[0];
  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (const [, c1, c2, p2] of curveSegments(points, tension)) {
    path += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return `${path} Z`;
}

/** Stable spread so crosses sit at uneven distances without jumping on redraw. */
function signedWave(index: number, salt: number): number {
  const wave =
    Math.sin(index * 2.399 + salt) * 0.62 + Math.sin(index * 5.17 + 1.2 + salt) * 0.38;
  return Math.max(-1, Math.min(1, wave));
}

export const BASE_TRAP_COUNT = 40;
export const MOAT_STROKE = 21;
/** The moat's outer edge sits this much farther out. The inner edge stays put. */
export const MOAT_OUTER_STRETCH = 0.5;

/** How far the moat's outer edge sits past its centerline at its thinnest. */
export function moatOuterOffset(): number {
  return MOAT_STROKE / 2 + MOAT_STROKE * MOAT_OUTER_STRETCH;
}

/** Full band at the thin spots: outer stretch plus the inner half. */
export function moatBandThickness(): number {
  return moatOuterOffset() + MOAT_STROKE / 2;
}

/** Thick stretches are this much wider than the thin ones. */
const MOAT_THICKNESS_VARY = 0.35;

function moatThicknessRaw(angle: number): number {
  const lumps = 0.5 - 0.5 * Math.cos(angle * 5 + 0.8);
  const slow = 0.5 + 0.5 * Math.sin(angle * 2 + 0.2);
  return lumps * 0.8 + slow * 0.2;
}

const MOAT_WAVE_EXTENT = (() => {
  let min = Infinity;
  let max = -Infinity;
  for (let step = 0; step < 720; step++) {
    const value = moatThicknessRaw((step / 720) * Math.PI * 2);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
})();

/** 0 on the thinnest stretch of the moat, 1 on the thickest. */
export function moatThicknessWave(angle: number): number {
  const span = MOAT_WAVE_EXTENT.max - MOAT_WAVE_EXTENT.min;
  const wave = (moatThicknessRaw(angle) - MOAT_WAVE_EXTENT.min) / span;
  return Math.max(0, Math.min(1, wave));
}

/**
 * Outer edge past the centerline. The inner edge stays put, and the band
 * grows by up to 35% along the ring.
 */
export function moatOuterOffsetAt(angle: number): number {
  return moatOuterOffset() + moatBandThickness() * MOAT_THICKNESS_VARY * moatThicknessWave(angle);
}

/** Farthest the outer edge sits past the centerline. */
export function moatOuterOffsetMax(): number {
  return moatOuterOffset() + moatBandThickness() * MOAT_THICKNESS_VARY;
}
/** Extra space past the touch circle before the next trap. */
const TRAP_TOUCH_GAP = 5;

/** Drop a cross whose touch circle comes within 5px of another. */
function spreadTraps(traps: Point[], gap: number): Point[] {
  const kept: Point[] = [];
  for (const trap of traps) {
    const clear = kept.every((other) => Math.hypot(trap.x - other.x, trap.y - other.y) >= gap);
    if (clear) kept.push(trap);
  }
  return kept;
}
/** Air that must remain between a trap and the wall, and between a trap and the moat. */
const TRAP_CLEARANCE = 4;
/** Outline wobble can shove a cross by about this much. */
const TRAP_WOBBLE_PAD = 2.5;

/** Drawn crosses are half the tuned size, then 30% larger. Improved traps were already 25% larger. */
export const TRAP_DRAW_SCALE = 0.5;
const TRAP_SIZE_BUMP = 1.3;
/** Extra length of the cross arms. The stroke does not use this. */
const TRAP_ARM_SCALE = 1.25;

export function trapMarkScale(trapLevel: number): number {
  return (trapLevel >= 2 ? 1.25 : 1) * TRAP_SIZE_BUMP;
}

/** Arm length of a drawn cross. Stroke stays on `trapMarkScale`. */
export function trapArmLength(tuning: Tuning, trapLevel: number): number {
  return tuning.trapSize * TRAP_DRAW_SCALE * trapMarkScale(trapLevel) * TRAP_ARM_SCALE;
}

/** Round pointer target. Covers the cross, including the square caps. */
export function trapHitRadius(tuning: Tuning, trapLevel: number): number {
  const size = trapArmLength(tuning, trapLevel);
  const stroke = tuning.trapStroke * TRAP_DRAW_SCALE * trapMarkScale(trapLevel);
  const tip = size * Math.SQRT2 + stroke / 2;
  return Math.hypot(tip, stroke / 2);
}

/** How far a drawn cross reaches from its center, including the square caps and outline wobble. */
export function trapMarkReach(tuning: Tuning, trapLevel: number): number {
  const scale = trapMarkScale(trapLevel);
  const size = trapArmLength(tuning, trapLevel);
  const stroke = tuning.trapStroke * TRAP_DRAW_SCALE * scale;
  const tip = size * Math.SQRT2 + stroke / 2;
  return Math.hypot(tip, stroke / 2) + TRAP_WOBBLE_PAD;
}

/** Plates, the ink on their outer edge, and the spikes, past the stroke's outer edge. */
function chitinBeyondStroke(chitinStroke: number): number {
  if (chitinStroke <= 0) return 0;
  return chitinStroke + CHITIN_OUTLINE + CHITIN_SPIKE_LENGTH;
}

/**
 * Distance from the palisade centerline that traps must stay outside.
 * Includes the wall ink, tower stroke, and chitin plates with their spikes.
 */
export function trapWallOutset(
  wallLevel: number,
  wallStroke: number,
  hutSize: number,
  chitinStroke = 0,
): number {
  const step = PALISADE_TOWERS[Math.min(Math.max(wallLevel, 0), 4)] ?? null;
  const towerR = step ? (hutSize * step.diameter * PALISADE_TOWER_SCALE) / 2 : 0;
  const towerEdge = towerR > 0 ? towerR + PALISADE_TOWER_STROKE / 2 : 0;
  const wallEdge = wallStroke / 2 + PALISADE_BORDER;
  return Math.max(wallEdge, towerEdge) + chitinBeyondStroke(chitinStroke);
}

export function wallStrokeWidth(level: number, base: number): number {
  if (level <= 0) return 1.5;
  const scale = [0, 0.65, 1.25, 2, 2.9][Math.min(level, 4)] ?? 0.65;
  return base * scale * 1.25;
}

/** Gap from the palisade out to the moat centerline. */
const MOAT_GAP_SCALE = 2.5 * 1.25 * 1.15 * 1.2 * 1.15;

/** Centerline of the moat, outside the palisade stroke. */
export function moatCenterRadius(wallRadius: number, wallStroke: number): number {
  return wallRadius + (wallStroke * 0.65 + 16) * MOAT_GAP_SCALE;
}

/**
 * Moat radius at one angle. It follows the wall, then adds a quieter ripple
 * so the ditch is not a copy of the palisade.
 */
export function moatRadiusAt(center: number, angle: number, tuning: Tuning): number {
  const lobes = tuning.wallLobes;
  const wall = wobbleAt(angle, tuning.wallWobble, lobes);
  const ripple =
    Math.sin(angle * (lobes + 4) + 0.8) * 0.02 +
    Math.sin(angle * (lobes + 1) + 2.2) * 0.013;
  return center * (wall + ripple);
}

/** Moat centerline. Same oval as the wall, with its own bumps. */
export function moatRingPoints(radius: number, tuning: Tuning): Point[] {
  const count = Math.max(8, Math.round(tuning.wallSides));
  const points: Point[] = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const local = moatRadiusAt(radius, angle, tuning);
    points.push({
      x: MAP_CENTER + Math.cos(angle) * local,
      y: MAP_CENTER + Math.sin(angle) * local * tuning.wallOval,
    });
  }
  return points;
}

/** Outer and inner edges, sampled finely so the thick and thin stretches stay. */
export function moatBandEdges(radius: number, tuning: Tuning): { outer: Point[]; inner: Point[] } {
  const count = 72;
  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const local = moatRadiusAt(radius, angle, tuning);
    const point = {
      x: MAP_CENTER + Math.cos(angle) * local,
      y: MAP_CENTER + Math.sin(angle) * local * tuning.wallOval,
    };
    const dx = point.x - MAP_CENTER;
    const dy = point.y - MAP_CENTER;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const out = moatOuterOffsetAt(angle);
    outer.push({ x: point.x + ux * out, y: point.y + uy * out });
    inner.push({ x: point.x - ux * (MOAT_STROKE / 2), y: point.y - uy * (MOAT_STROKE / 2) });
  }
  return { outer, inner };
}

/** Deck width as a fraction of the bastion mark. Narrower than the gap between the outer towers. */
const DRAWBRIDGE_WIDTH = 1.5 * 1.15;
/** How far the fill slides under the outer wall. The bastion outline stays on top of this tuck. */
const DRAWBRIDGE_TUCK = 1.5;
/** How far the far end rests on the bank past the moat's outer edge. */
const DRAWBRIDGE_LANDING = 12;

export type BastionDrawbridge = {
  /** Local y where the fill starts, tucked into the outer wall. */
  near: number;
  /** Local y of the outer wall, where the side rails meet the gate. */
  mouth: number;
  /** Local y of the far bank. */
  far: number;
  /** Half the deck width, in local x. */
  half: number;
  /**
   * Deck corners in map space: near-left, near-right, far-right, far-left.
   * Keeps traps off the deck and lets the map frame include the far bank.
   */
  deck: Point[];
};

/** Extra local half-width so chitin and its spikes stop beside the deck, past its outline. */
export function drawbridgeChitinGap(half: number, outline = 0): number {
  return half + outline + WALL_CHITIN_STROKE / 2 + CHITIN_SPIKE_BASE / 2;
}

function raySegmentDistance(
  ox: number,
  oy: number,
  ux: number,
  uy: number,
  a: Point,
  b: Point,
): number | null {
  const sx = b.x - a.x;
  const sy = b.y - a.y;
  const den = ux * sy - uy * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = a.x - ox;
  const qy = a.y - oy;
  const t = (qx * sy - qy * sx) / den;
  const u = (qx * uy - qy * ux) / den;
  if (t <= 0 || u < 0 || u > 1) return null;
  return t;
}

/** Distance from the village center to where this outward ray meets a closed ring. */
function outwardRingDistance(at: Point, ring: Point[]): number | null {
  const dx = at.x - MAP_CENTER;
  const dy = at.y - MAP_CENTER;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const ux = dx / len;
  const uy = dy / len;
  let best: number | null = null;
  for (let index = 0; index < ring.length; index++) {
    const hit = raySegmentDistance(
      MAP_CENTER,
      MAP_CENTER,
      ux,
      uy,
      ring[index],
      ring[(index + 1) % ring.length],
    );
    if (hit == null) continue;
    if (best == null || hit > best) best = hit;
  }
  return best;
}

/**
 * Lowered drawbridge from the bastion's outer gate to the far bank of the moat.
 * Local +y points away from the village. Null when the ditch cannot be measured.
 */
export function bastionDrawbridge(
  at: Point,
  hutSize: number,
  wallRadius: number,
  wallStroke: number,
  tuning: Tuning,
): BastionDrawbridge | null {
  const size = markSize("bastion", hutSize);
  const mouth = (size * BASTION_DEPTH) / 2;
  const center = moatCenterRadius(wallRadius, wallStroke);
  // The painted ditch is the smoothed curve, which bows past the sample points.
  const hit = outwardRingDistance(at, densifyClosed(moatBandEdges(center, tuning).outer, 8));
  if (hit == null) return null;
  const centerDist = Math.hypot(at.x - MAP_CENTER, at.y - MAP_CENTER);
  const far = hit + DRAWBRIDGE_LANDING - centerDist;
  if (far < mouth + 16) return null;
  const half = (size * DRAWBRIDGE_WIDTH) / 2;
  const near = mouth - DRAWBRIDGE_TUCK;
  const deck = placePoints(
    [
      { x: -half, y: near },
      { x: half, y: near },
      { x: half, y: far },
      { x: -half, y: far },
    ],
    at,
    tangentAngle(at),
  );
  return { near, mouth, far, half, deck };
}

/** Wall centerline at this angle, in the oval the palisade uses. */
function wallCenterRadius(wallRadius: number, angle: number, tuning: Tuning): number {
  return wallRadius * wobbleAt(angle, tuning.wallWobble, tuning.wallLobes);
}

/** Farthest wall centerline nearby, so a bulge does not hide under one sample. */
function wallCenterReach(wallRadius: number, angle: number, tuning: Tuning): number {
  let outer = 0;
  for (let offset = -0.06; offset <= 0.06 + 1e-9; offset += 0.02) {
    outer = Math.max(outer, wallCenterRadius(wallRadius, angle + offset, tuning));
  }
  return outer;
}

/** Nearest moat inner edge nearby, inside the ditch stroke. */
function moatInnerReach(
  wallRadius: number,
  moatStroke: number,
  angle: number,
  tuning: Tuning,
): number {
  const center = moatCenterRadius(wallRadius, moatStroke);
  let inner = Infinity;
  for (let offset = -0.06; offset <= 0.06 + 1e-9; offset += 0.02) {
    inner = Math.min(inner, moatRadiusAt(center, angle + offset, tuning));
  }
  return inner - MOAT_STROKE / 2;
}

/**
 * Trap centers in the band between the palisade and the moat.
 * `moatStroke` is the anchor the ditch is drawn from. `wallOutset` is how far
 * the wall, its towers, or chitin already reach past that centerline.
 */
export function trapPoints(
  wallRadius: number,
  tuning: Tuning,
  trapLevel = 1,
  moatStroke = 0,
  wallOutset = 0,
): Point[] {
  const reach = trapMarkReach(tuning, trapLevel);
  const blocked = wallOutset > 0 ? wallOutset : moatStroke / 2;
  const rings = trapLevel >= 2 ? 2 : 1;
  const points: Point[] = [];
  for (let ring = 0; ring < rings; ring++) {
    const weights = Array.from(
      { length: BASE_TRAP_COUNT },
      (_, index) => 1 + signedWave(index + ring * 3, 0.4) * 0.28,
    );
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = 0.35 + ring * (Math.PI / BASE_TRAP_COUNT);
    for (let index = 0; index < BASE_TRAP_COUNT; index++) {
      const angle = cursor;
      cursor += (weights[index] / weightSum) * Math.PI * 2;
      const inner = wallCenterReach(wallRadius, angle, tuning) + blocked + TRAP_CLEARANCE + reach;
      const outer = moatInnerReach(wallRadius, moatStroke, angle, tuning) - TRAP_CLEARANCE - reach;
      const span = Math.max(0, outer - inner);
      let local = (inner + outer) / 2;
      if (rings === 2 && outer > inner) {
        const slack = Math.max(0, span - (2 * reach + TRAP_CLEARANCE));
        const jitter = ((signedWave(index + ring * 5, 1.7) + 1) / 2) * Math.min(8, slack / 2);
        local = ring === 0 ? inner + jitter : outer - jitter;
      } else if (span > 0) {
        const jitter = signedWave(index, 1.7) * Math.min(8, span / 2);
        local = (inner + outer) / 2 + jitter;
      }
      if (outer > inner) local = Math.min(outer, Math.max(inner, local));
      points.push({
        x: MAP_CENTER + Math.cos(angle) * local,
        y: MAP_CENTER + Math.sin(angle) * local * tuning.wallOval,
      });
    }
  }
  return spreadTraps(points, 2 * trapHitRadius(tuning, trapLevel) + TRAP_TOUCH_GAP);
}

/**
 * Drop crosses that would touch the bastion, a watchtower, a palisade tower,
 * their chitin, or a drawbridge. `chitinStroke` is the plate width when plating is drawn.
 * `blockedPad` is outline drawn outside a deck, so crosses stay off the rails.
 */
export function trapsClearOfBuildings(
  traps: Point[],
  tuning: Tuning,
  trapLevel: number,
  wallLevel: number,
  wallRadius: number,
  slots: PlacedSlot[],
  hutSize = tuning.squareSize,
  blocked: Point[][] = [],
  chitinStroke = 0,
  blockedPad = 0,
): Point[] {
  const reach = trapMarkReach(tuning, trapLevel) + TRAP_CLEARANCE;
  const plating = chitinBeyondStroke(chitinStroke);
  const obstacles: Array<{ shape: Shape; pad: number }> = palisadeTowers(
    wallLevel,
    wallRadius,
    tuning,
    tuning.squareSize,
  ).map((tower) => ({
    shape: { kind: "circle" as const, c: tower, r: tower.r },
    pad: PALISADE_TOWER_STROKE / 2 + plating,
  }));
  for (const slot of slots) {
    if (!sitsOnWall(slot.buildingId)) continue;
    const pad = fortBorderPad(slot.buildingId, slot.tier) + plating;
    for (const shape of buildingShapes(slot.buildingId, slot, hutSize, slot.tier)) {
      obstacles.push({ shape, pad });
    }
  }
  for (const poly of blocked) {
    if (poly.length >= 3) obstacles.push({ shape: { kind: "poly", points: poly }, pad: blockedPad });
  }
  return traps.filter((trap) =>
    obstacles.every((obstacle) => {
      const mark: Shape = { kind: "circle", c: trap, r: reach + obstacle.pad };
      return !shapesOverlap(mark, obstacle.shape);
    }),
  );
}

export function closestSlotGap(slots: PlacedSlot[]): number {
  let gap = Number.POSITIVE_INFINITY;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const dx = slots[i].x - slots[j].x;
      const dy = slots[i].y - slots[j].y;
      gap = Math.min(gap, Math.hypot(dx, dy));
    }
  }
  return gap;
}

/** Paper stays this far past the outermost trap mark. */
const TRAP_GROUND_PAD = 16;
/** Improved traps push the paper out again, past the second row. */
const TRAP_UPGRADE_GROUND_PAD = 14;
/** Paper past the moat's outer edge. */
export const MOAT_GROUND_PAD = 25;

/**
 * Village paper. It follows the palisade until traps or the moat exist, then
 * sits just outside those. The moat wins when both are present.
 */
export function villageGroundPoints(
  wallRadius: number,
  tuning: Tuning,
  build: Pick<BuildState, "traps" | "moat" | "wall">,
  traps: Point[],
): Point[] {
  const wall = ringPoints(wallRadius, tuning);
  if (build.moat && build.wall > 0) {
    const anchor = tuning.wallThickness * 1.52;
    const center = moatCenterRadius(wallRadius, anchor);
    return outsetFromCenter(moatBandEdges(center, tuning).outer, MOAT_GROUND_PAD);
  }
  if (build.traps > 0 && traps.length > 0) {
    const reach = trapMarkReach(tuning, build.traps);
    const pad = TRAP_GROUND_PAD + (build.traps >= 2 ? TRAP_UPGRADE_GROUND_PAD : 0);
    let extra = 0;
    for (const trap of traps) {
      const angle = Math.atan2((trap.y - MAP_CENTER) / (tuning.wallOval || 1), trap.x - MAP_CENTER);
      const wallReach = wallRadius * wobbleAt(angle, tuning.wallWobble, tuning.wallLobes);
      extra = Math.max(extra, ovalRadius(trap, tuning.wallOval) + reach + pad - wallReach);
    }
    if (extra > 0) return outsetFromCenter(wall, extra);
  }
  return wall;
}

/** Largest village paper: just past the moat, even before that ditch is drawn. */
export function furthestVillageGround(wallRadius: number, tuning: Tuning): Point[] {
  const anchor = tuning.wallThickness * 1.52;
  const center = moatCenterRadius(wallRadius, anchor);
  return outsetFromCenter(moatBandEdges(center, tuning).outer, MOAT_GROUND_PAD);
}

/** A crown overlaps a trap mark. */
export function treeMeetsTrap(center: Point, reach: number, traps: Point[], markReach: number): boolean {
  const limit = reach + markReach;
  return traps.some((trap) => Math.hypot(trap.x - center.x, trap.y - center.y) < limit);
}

/** A crown overlaps the moat, including its black outline. */
export function treeMeetsMoat(
  center: Point,
  reach: number,
  edges: { outer: Point[]; inner: Point[] },
  outline = 0.5,
): boolean {
  const limit = reach + outline;
  const insideOuter = pointInPolygon(center, edges.outer);
  const insideInner = pointInPolygon(center, edges.inner);
  if (insideOuter && !insideInner) return true;
  if (insideInner) return distanceToPolygon(center, edges.inner) <= limit;
  return distanceToPolygon(center, edges.outer) <= limit;
}

/**
 * Points that set the map frame. Before the bastion or traps exist, the frame
 * stops at the city edge (and the moat, when that ditch is already there).
 */
export function mapFramePoints(build: BuildState, tuning: Tuning, slots: PlacedSlot[]): Point[] {
  const radius = layoutWallRadius(tuning);
  const anchor = tuning.wallThickness * 1.52;
  const groundTraps =
    build.traps > 0
      ? trapPoints(
        radius,
        tuning,
        build.traps,
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
    ...villageGroundPoints(radius, tuning, build, groundTraps),
  ];
  const cityOnly = (build.counts.bastion ?? 0) <= 0 && build.traps <= 0;
  if (build.moat && build.wall > 0) {
    const center = moatCenterRadius(radius, anchor);
    points.push(...moatRingPoints(center, tuning));
  }
  if (!cityOnly && groundTraps.length > 0) {
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
type Shape = CircleShape | PolyShape;

/** Edges may meet. Anything past this counts as one building covering another. */
const TOUCH_PX = 0.2;

function rectLocal(length: number, depth: number): Point[] {
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
function tangentAngle(at: Point): number {
  return radialAngle(at) - Math.PI / 2;
}

function placePoints(local: Point[], at: Point, angle: number): Point[] {
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

function shapesOverlap(a: Shape, b: Shape): boolean {
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
const PALISADE_TOWER_SCALE = 1.15;
/** Palisade tower outline is a 2px stroke centered on the circle. */
export const PALISADE_TOWER_STROKE = 2;
/** Black edge outside the palisade stroke. */
export const PALISADE_BORDER = 2;

/** Towers spaced around the palisade. Diameter is in hut-widths, before the scale above. */
const PALISADE_TOWERS: Array<{ count: number; diameter: number } | null> = [
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

function distanceToPolygon(point: Point, poly: Point[]): number {
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
function fortBorderPad(buildingId: string, tier: number): number {
  if (buildingId === "bastion") return bastionOutlineWidth(tier);
  if (buildingId === "watchtower") return 4;
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
