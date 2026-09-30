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
  BASTION_DEPTH,
  ESTATE_BORDER,
  ESTATE_DEPTH,
  ESTATE_LENGTH,
  ESTATE_PORCH_DEPTH,
  ESTATE_PORCH_WIDTH,
  WIZARD_TOWER_PENTAGON_SCALE,
  altarCircles,
  altarOutline,
  blacksmithScale,
  boneTempleOutline,
  boneTempleSpikedCorners,
  boneyardOutline,
  cabinOutline,
  cabinTower,
  coinhouseReach,
  longhouseOutline,
  markSize,
  minWobbleFactor,
  ovalRadius,
  pillarOutline,
  pitOutline,
  pitScale,
  placedSlots,
  quarryOutline,
  regularPolygon,
  sitsOnWall,
  storageBorder,
  storageScale,
  storageTowers,
  tanneryOutline,
  timberMillOutline,
  tradeCircles,
  tradeOutline,
  wobbleAt,
  type PlacedSlot,
  type Point,
} from "@/pages/village-map-demo/geometry";
import {
  PALISADE_BORDER,
  PALISADE_TOWERS,
  PALISADE_TOWER_SCALE,
  PALISADE_TOWER_STROKE,
  buildingShapes,
  distanceToPolygon,
  fortBorderPad,
  palisadeTowers,
  placePoints,
  pointInPolygon,
  rectLocal,
  shapesOverlap,
  tangentAngle,
  type Shape,
} from "@/pages/village-map-demo/geometryFrame";

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

export function densifyClosed(points: Point[], stepsPerSegment = 4): Point[] {
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
export const CHITIN_SPIKE_SPACING = 16.5;

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
    Math.sin(angle * (lobes + 4) + 0.8) * 0.008 +
    Math.sin(angle * (lobes + 1) + 2.2) * 0.004;
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
 * Trap band to reserve on the paper. Built traps use their own level.
 * Palisades, the watchtower, or the bastion reserve the basic band first.
 */
export function trapAreaLevel(build: Pick<BuildState, "traps" | "wall" | "counts">): number {
  if (build.traps > 0) return build.traps;
  if (build.wall > 0 || (build.counts.watchtower ?? 0) > 0 || (build.counts.bastion ?? 0) > 0) return 1;
  return 0;
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
 * Village paper. It follows the palisade until the trap band or the moat exist,
 * then sits just outside those. The moat wins when both are present. Palisades,
 * the watchtower, and the bastion pass a basic trap level before traps are built.
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
