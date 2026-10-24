import { hasChromiumTextZoom, steamSetTextZoom } from "@/lib/steam";
import {
  LEGACY_TEXT_SCALE_STORAGE_KEY,
  TEXT_SCALE_MOBILE_BREAKPOINT_PX as SHARED_TEXT_SCALE_MOBILE_BREAKPOINT_PX,
  TEXT_SCALE_STORAGE_KEY,
  TEXT_SCALE_ZOOM_FACTOR,
} from "@shared/textScaleZoom";

export { TEXT_SCALE_STORAGE_KEY, TEXT_SCALE_ZOOM_FACTOR };

/** Match `useIsMobile` / tooltip mobile breakpoint. */
export const TEXT_SCALE_MOBILE_BREAKPOINT_PX =
  SHARED_TEXT_SCALE_MOBILE_BREAKPOINT_PX;

export const TEXT_SCALE_OPTIONS = ["small", "medium", "large"] as const;

export type TextScale = (typeof TEXT_SCALE_OPTIONS)[number];

/**
 * Fallback when `window` is unavailable (SSR / early boot).
 * Live default: Small on mobile, Medium on desktop — see getPlatformDefaultTextScale().
 */
export const DEFAULT_TEXT_SCALE: TextScale = "small";

/** Extra pixels added to readable UI text when Medium is selected. */
export const MEDIUM_TEXT_DELTA_PX = 2;

/** Extra pixels added to readable UI text when Large is selected. */
export const LARGE_TEXT_DELTA_PX = 4;

/**
 * Milder multiplier for button chrome (height/padding) when Medium is selected.
 * Kept milder than the +2px text bump so labeled actions breathe without blowing up header/footer layout.
 */
export const MEDIUM_CONTROL_SCALE_FACTOR = 1.06;

/**
 * Milder multiplier for button chrome when Large is selected.
 * Same ratio idea as Medium: grow hit targets without matching the full text bump.
 */
export const LARGE_CONTROL_SCALE_FACTOR = 1.12;

export const TEXT_SCALE_CHANGE_EVENT = "adc-text-scale-change";

/**
 * Pre-rename ids that are not also current option ids.
 * Old `"large"` (+2px) collides with new `"large"` (+4px); that remap only
 * runs when reading the legacy storage key (see readLegacyStoredTextScale).
 */
const LEGACY_TEXT_SCALE_MAP: Record<string, TextScale> = {
  normal: "small",
  extraLarge: "large",
};

/** Full remap for `adc-text-scale` → v2, including old `"large"` → medium. */
const LEGACY_STORAGE_VALUE_MAP: Record<string, TextScale> = {
  ...LEGACY_TEXT_SCALE_MAP,
  large: "medium",
};

export function isTextScale(value: string): value is TextScale {
  return (TEXT_SCALE_OPTIONS as readonly string[]).includes(value);
}

/** Small below the mobile breakpoint; Medium on desktop. */
export function getPlatformDefaultTextScale(): TextScale {
  if (typeof window === "undefined") return DEFAULT_TEXT_SCALE;
  return window.innerWidth < TEXT_SCALE_MOBILE_BREAKPOINT_PX
    ? "small"
    : "medium";
}

export function normalizeTextScale(
  value: string | null | undefined,
): TextScale {
  if (!value) return getPlatformDefaultTextScale();
  if (isTextScale(value)) return value;
  return LEGACY_TEXT_SCALE_MAP[value] ?? getPlatformDefaultTextScale();
}

export function isEnlargedTextScale(scale: TextScale): boolean {
  return scale === "medium" || scale === "large";
}

export function getTextScaleDeltaPx(scale: TextScale): number {
  if (scale === "large") return LARGE_TEXT_DELTA_PX;
  if (scale === "medium") return MEDIUM_TEXT_DELTA_PX;
  return 0;
}

export function getControlScaleFactor(scale: TextScale): number {
  if (scale === "large") return LARGE_CONTROL_SCALE_FACTOR;
  if (scale === "medium") return MEDIUM_CONTROL_SCALE_FACTOR;
  return 1;
}

function readLegacyStoredTextScale(): TextScale | null {
  if (typeof window === "undefined") return null;
  try {
    const legacy = localStorage.getItem(LEGACY_TEXT_SCALE_STORAGE_KEY);
    if (!legacy) return null;
    const mapped = LEGACY_STORAGE_VALUE_MAP[legacy];
    localStorage.removeItem(LEGACY_TEXT_SCALE_STORAGE_KEY);
    return mapped ?? null;
  } catch {
    return null;
  }
}

export function getStoredTextScale(): TextScale {
  if (typeof window === "undefined") return DEFAULT_TEXT_SCALE;
  try {
    const stored = localStorage.getItem(TEXT_SCALE_STORAGE_KEY);
    if (stored) return normalizeTextScale(stored);
    const migrated = readLegacyStoredTextScale();
    if (migrated) {
      localStorage.setItem(TEXT_SCALE_STORAGE_KEY, migrated);
      return migrated;
    }
    return getPlatformDefaultTextScale();
  } catch {
    return getPlatformDefaultTextScale();
  }
}

export function setStoredTextScale(scale: TextScale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TEXT_SCALE_STORAGE_KEY, scale);
    localStorage.removeItem(LEGACY_TEXT_SCALE_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Steam shell: Chromium zoom instead of the CSS text/control bumps. */
export function usesChromiumTextZoom(): boolean {
  return hasChromiumTextZoom();
}

/**
 * Control chrome scale actually painted. Steam leaves this at 1 because
 * `setZoomFactor` already scales the page.
 */
export function getRenderedControlScaleFactor(scale: TextScale): number {
  return usesChromiumTextZoom() ? 1 : getControlScaleFactor(scale);
}

function clearManualTextScale(root: HTMLElement): void {
  root.style.setProperty("--adc-text-delta", "0px");
  root.style.removeProperty("--adc-text-scale");
  root.style.setProperty("--adc-control-scale", "1");
  root.classList.remove("adc-text-large", "adc-text-xlarge");
}

export function applyTextScaleToDocument(scale: TextScale): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (usesChromiumTextZoom()) {
    // Page zoom scales type, chrome, and shaders together. The CSS delta
    // would stack a second enlargement on top of 110% / 125%.
    clearManualTextScale(root);
    steamSetTextZoom(scale);
  } else {
    root.style.setProperty(
      "--adc-text-delta",
      `${getTextScaleDeltaPx(scale)}px`,
    );
    root.style.removeProperty("--adc-text-scale");
    root.style.setProperty(
      "--adc-control-scale",
      String(getControlScaleFactor(scale)),
    );
    // `adc-text-large` = Medium or Large (shared layout breathing room).
    // `adc-text-xlarge` = Large only (further indicator / glyph bumps).
    root.classList.toggle("adc-text-large", isEnlargedTextScale(scale));
    root.classList.toggle("adc-text-xlarge", scale === "large");
  }
  window.dispatchEvent(
    new CustomEvent(TEXT_SCALE_CHANGE_EVENT, { detail: { scale } }),
  );
}

export function setTextScale(scale: TextScale): void {
  setStoredTextScale(scale);
  applyTextScaleToDocument(scale);
}

export function initTextScaleFromStorage(): TextScale {
  const scale = getStoredTextScale();
  applyTextScaleToDocument(scale);
  return scale;
}
