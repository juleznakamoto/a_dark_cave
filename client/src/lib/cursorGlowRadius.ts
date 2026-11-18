/** Shorter edge at or above this keeps the desktop glow. Landscape phones still count. */
export const CURSOR_GLOW_MOBILE_SHORT_SIDE_PX = 768;

/**
 * Phone spotlight, relative to the desktop fraction.
 * Measured on the shorter edge so a tall screen does not blow the pool up.
 */
export const CURSOR_GLOW_MOBILE_SCALE = 0.5;

/**
 * Cursor glow radius in height-normalized shader units.
 * Desktop keeps `desktopFraction` of the screen height.
 * A short viewport uses half of that, as a fraction of the shorter edge.
 */
export function cursorGlowRadius(
  desktopFraction: number,
  width: number,
  height: number,
): number {
  const shortSide = Math.min(width, height);
  if (shortSide >= CURSOR_GLOW_MOBILE_SHORT_SIDE_PX) return desktopFraction;
  const safeHeight = Math.max(height, 1);
  return desktopFraction * CURSOR_GLOW_MOBILE_SCALE * (shortSide / safeHeight);
}
