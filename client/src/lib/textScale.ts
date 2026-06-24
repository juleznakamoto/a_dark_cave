export const TEXT_SCALE_STORAGE_KEY = "adc-text-scale";

export const TEXT_SCALE_OPTIONS = ["normal", "large"] as const;

export type TextScale = (typeof TEXT_SCALE_OPTIONS)[number];

export const DEFAULT_TEXT_SCALE: TextScale = "normal";

/** Readable UI text multiplier when Large is selected (symbols stay px-fixed). */
export const LARGE_TEXT_SCALE_FACTOR = 1.125;

export const TEXT_SCALE_CHANGE_EVENT = "adc-text-scale-change";

export function isTextScale(value: string): value is TextScale {
  return (TEXT_SCALE_OPTIONS as readonly string[]).includes(value);
}

export function normalizeTextScale(
  value: string | null | undefined,
): TextScale {
  if (!value) return DEFAULT_TEXT_SCALE;
  return isTextScale(value) ? value : DEFAULT_TEXT_SCALE;
}

export function getTextScaleFactor(scale: TextScale): number {
  return scale === "large" ? LARGE_TEXT_SCALE_FACTOR : 1;
}

export function getStoredTextScale(): TextScale {
  if (typeof window === "undefined") return DEFAULT_TEXT_SCALE;
  try {
    return normalizeTextScale(localStorage.getItem(TEXT_SCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_TEXT_SCALE;
  }
}

export function setStoredTextScale(scale: TextScale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TEXT_SCALE_STORAGE_KEY, scale);
  } catch {
    /* ignore quota / private mode */
  }
}

export function applyTextScaleToDocument(scale: TextScale): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const factor = getTextScaleFactor(scale);
  root.style.setProperty("--adc-text-scale", String(factor));
  root.classList.toggle("adc-text-large", scale === "large");
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
