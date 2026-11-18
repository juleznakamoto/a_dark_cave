/** Finger travel before a cube memory counts as a sideways swipe. */
export const CUBE_MEMORY_SWIPE_MIN_PX = 48;

/**
 * Estate cube memories page like a carousel.
 * A finger moving left asks for the next memory. A finger moving right asks
 * for the previous one. A short or mostly vertical drag is not a swipe.
 */
export function cubeMemorySwipeDirection(
  dx: number,
  dy: number,
): "previous" | "next" | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.abs(dx) < CUBE_MEMORY_SWIPE_MIN_PX) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? "next" : "previous";
}
