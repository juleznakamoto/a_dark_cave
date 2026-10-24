/**
 * Chromium page zoom for the Steam shell (Electron `setZoomFactor`).
 *
 * Small / Medium / Large are 100% / 110% / 125%. The website keeps the CSS
 * text delta instead; this map is only applied when the Electron bridge is live.
 * Storage keys match `client/src/lib/textScale.ts`.
 */

export const TEXT_SCALE_STORAGE_KEY = "adc-text-scale-v2";

/** Pre–Small/Medium/Large rename. Migrated once into TEXT_SCALE_STORAGE_KEY. */
export const LEGACY_TEXT_SCALE_STORAGE_KEY = "adc-text-scale";

/** Match `TEXT_SCALE_MOBILE_BREAKPOINT_PX` in the client. */
export const TEXT_SCALE_MOBILE_BREAKPOINT_PX = 768;

export const TEXT_SCALE_ZOOM_FACTOR = {
  small: 1,
  medium: 1.1,
  large: 1.25,
} as const;

export type TextScaleZoomId = keyof typeof TEXT_SCALE_ZOOM_FACTOR;

export function textScaleZoomFactor(scale: string): number | null {
  if (scale === "small" || scale === "medium" || scale === "large") {
    return TEXT_SCALE_ZOOM_FACTOR[scale];
  }
  return null;
}

/**
 * Scale id to apply before the page finishes booting.
 * Mirrors `getStoredTextScale` / legacy remap, without writing storage.
 * Unknown or missing values use Medium on desktop and Small below the breakpoint.
 */
export function textScaleIdFromStorage(
  storedV2: string | null,
  legacy: string | null,
  viewportWidth: number | null,
): TextScaleZoomId {
  const fallback: TextScaleZoomId =
    viewportWidth != null &&
    viewportWidth > 0 &&
    viewportWidth < TEXT_SCALE_MOBILE_BREAKPOINT_PX
      ? "small"
      : "medium";

  if (storedV2) {
    if (storedV2 === "small" || storedV2 === "medium" || storedV2 === "large") {
      return storedV2;
    }
    if (storedV2 === "normal") return "small";
    if (storedV2 === "extraLarge") return "large";
    return fallback;
  }

  if (legacy === "normal") return "small";
  if (legacy === "extraLarge") return "large";
  // Old "large" was +2px, which is Medium now.
  if (legacy === "large") return "medium";
  if (legacy === "small" || legacy === "medium") return legacy;
  return fallback;
}
