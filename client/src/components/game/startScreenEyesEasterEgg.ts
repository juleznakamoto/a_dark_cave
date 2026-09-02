/** Hit radius as a fraction of min(viewport w, h) around the quadrant center. */
export const EYES_EASTER_EGG_HOT_ZONE_RATIO = 0.08;

export type EyesEasterEggSide = "left" | "right";

export function pickEyesEasterEggSide(): EyesEasterEggSide {
  return Math.random() < 0.5 ? "left" : "right";
}

export function eyesEasterEggCenterFraction(side: EyesEasterEggSide): {
  x: number;
  y: number;
} {
  return { x: side === "left" ? 0.25 : 0.75, y: 0.25 };
}

export function isInEyesEasterEggHotZone(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  side: EyesEasterEggSide,
): boolean {
  const { x, y } = eyesEasterEggCenterFraction(side);
  const centerX = viewportWidth * x;
  const centerY = viewportHeight * y;
  const radius =
    Math.min(viewportWidth, viewportHeight) * EYES_EASTER_EGG_HOT_ZONE_RATIO;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  return dx * dx + dy * dy <= radius * radius;
}
