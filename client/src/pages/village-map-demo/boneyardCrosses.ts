import { boneyardOutline, crossOutline, type Point } from "@/pages/village-map-demo/geometry";
import { distanceToPolygon, pointInPolygon } from "@/pages/village-map-demo/geometryFrame";

/** One grave per point of burial madness. The boneyard never goes past this. */
export const BONEYARD_CROSS_CAP = 10;

/**
 * Latin crosses, one per madness point the boneyard is removing.
 * The same ten spots are used at every count, so a new grave appears
 * without moving the ones already there. Spots are a loose set of rows
 * across the yard, with a little tilt so they do not look stamped.
 * Local +y is the long side, away from the village.
 */
const GRAVE_SLOTS: readonly { x: number; y: number; tilt: number }[] = [
  { x: 0.0, y: -0.28, tilt: -2 },
  { x: -0.76, y: -0.82, tilt: 4 },
  { x: 0.74, y: 0.3, tilt: -4 },
  { x: 0.78, y: -0.26, tilt: 3 },
  { x: -0.74, y: 0.32, tilt: -5 },
  { x: 0.72, y: -0.84, tilt: 5 },
  { x: -0.78, y: -0.24, tilt: 2 },
  { x: 0.0, y: 0.28, tilt: -3 },
  { x: 0.76, y: 0.84, tilt: 1 },
  { x: -0.72, y: 0.86, tilt: -1 },
];

/** Largest Latin-cross mark, as a fraction of the yard, before the fit steps down. */
const CROSS_SCALE_MAX = 0.16;
const CROSS_SCALE_MIN = 0.07;
/**
 * Drawn a fifth larger than the size the packer reserved.
 * The spots stay put, so a new grave still lands in the same place.
 */
const CROSS_DRAW = 1.2;
/** Air between bounding circles, and past the rim, so the outline wobble cannot shove a grave out or into its neighbor. */
const CROSS_GAP = 2.5;
const EDGE_PAD = 4;

export type BoneyardCross = {
  x: number;
  y: number;
  /** Extra degrees after the cross is stood upright on the page. */
  tilt: number;
};

export type BoneyardGraveLayout = {
  /** Size passed to the Latin cross outline. */
  markSize: number;
  crosses: BoneyardCross[];
};

function crossRadius(markSize: number): number {
  let radius = 0;
  for (const point of crossOutline(markSize)) {
    radius = Math.max(radius, Math.hypot(point.x, point.y));
  }
  return radius;
}

function centerIsClear(point: Point, outline: Point[], reach: number): boolean {
  return pointInPolygon(point, outline) && distanceToPolygon(point, outline) >= reach - 0.05;
}

/** Largest centered rectangle whose rim stays `reach` inside the yard. */
function safeBox(outline: Point[], reach: number): { halfX: number; halfY: number } | null {
  let halfX = 0;
  let halfY = 0;
  for (const point of outline) {
    halfX = Math.max(halfX, Math.abs(point.x));
    halfY = Math.max(halfY, Math.abs(point.y));
  }
  halfX -= reach;
  halfY -= reach;
  if (halfX <= 1 || halfY <= 1) return null;

  const boxClear = (hx: number, hy: number) => {
    const steps = 10;
    for (let index = 0; index <= steps; index++) {
      const t = index / steps;
      const x = -hx + 2 * hx * t;
      const y = -hy + 2 * hy * t;
      if (!centerIsClear({ x, y: -hy }, outline, reach)) return false;
      if (!centerIsClear({ x, y: hy }, outline, reach)) return false;
      if (!centerIsClear({ x: -hx, y }, outline, reach)) return false;
      if (!centerIsClear({ x: hx, y }, outline, reach)) return false;
    }
    return true;
  };

  if (!boxClear(halfX, halfY)) {
    let lo = 0;
    let hi = 1;
    for (let step = 0; step < 14; step++) {
      const mid = (lo + hi) / 2;
      if (boxClear(halfX * mid, halfY * mid)) lo = mid;
      else hi = mid;
    }
    halfX *= lo;
    halfY *= lo;
  }
  if (halfX <= 1 || halfY <= 1) return null;
  return { halfX, halfY };
}

function placedSlots(box: { halfX: number; halfY: number }): BoneyardCross[] {
  return GRAVE_SLOTS.map((slot) => ({
    x: slot.x * box.halfX,
    y: slot.y * box.halfY,
    tilt: slot.tilt,
  }));
}

function gravesFit(yardSize: number, scale: number): BoneyardCross[] | null {
  const markSize = yardSize * scale;
  const radius = crossRadius(markSize);
  const reach = radius + EDGE_PAD;
  const outline = boneyardOutline(yardSize);
  const box = safeBox(outline, reach);
  if (!box) return null;
  const graves = placedSlots(box);
  const minDist = radius * 2 + CROSS_GAP;
  const minDistSq = minDist * minDist;
  for (let index = 0; index < graves.length; index++) {
    const grave = graves[index];
    if (!centerIsClear(grave, outline, reach)) return null;
    for (let other = 0; other < index; other++) {
      const dx = grave.x - graves[other].x;
      const dy = grave.y - graves[other].y;
      if (dx * dx + dy * dy < minDistSq) return null;
    }
  }
  return graves;
}

/** Scale that fits all ten graves. Fewer graves reuse it so they do not resize later. */
function fittedScale(yardSize: number): { scale: number; graves: BoneyardCross[] } | null {
  const steps = 20;
  for (let index = 0; index <= steps; index++) {
    const scale = CROSS_SCALE_MAX - ((CROSS_SCALE_MAX - CROSS_SCALE_MIN) * index) / steps;
    const graves = gravesFit(yardSize, scale);
    if (graves) return { scale, graves };
  }
  return null;
}

const layoutCache = new Map<number, { scale: number; graves: BoneyardCross[] } | null>();

function fittedLayout(yardSize: number): { scale: number; graves: BoneyardCross[] } | null {
  const key = Math.round(yardSize * 1000);
  const cached = layoutCache.get(key);
  if (cached !== undefined) return cached;
  const fitted = fittedScale(yardSize);
  layoutCache.set(key, fitted);
  return fitted;
}

/** Grave crosses for this yard. `count` is the madness points removed, capped at 10. */
export function boneyardGraveLayout(yardSize: number, count: number): BoneyardGraveLayout {
  const wanted = Math.min(BONEYARD_CROSS_CAP, Math.floor(count));
  if (!Number.isFinite(yardSize) || yardSize <= 0 || !Number.isFinite(wanted) || wanted <= 0) {
    return { markSize: 0, crosses: [] };
  }
  const fitted = fittedLayout(yardSize);
  if (!fitted) return { markSize: 0, crosses: [] };
  return {
    markSize: yardSize * fitted.scale * CROSS_DRAW,
    crosses: fitted.graves.slice(0, wanted),
  };
}

/**
 * Latin cross in yard-local space.
 * `facingDeg` is the yard's own rotation. The cross is turned back by that
 * amount so it stands upright on the page, then by its own small tilt.
 */
export function graveCrossLocalPoints(
  markSize: number,
  cross: BoneyardCross,
  facingDeg: number,
): Point[] {
  const turn = ((-facingDeg + cross.tilt) * Math.PI) / 180;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return crossOutline(markSize).map((point) => ({
    x: cross.x + point.x * cos - point.y * sin,
    y: cross.y + point.x * sin + point.y * cos,
  }));
}
