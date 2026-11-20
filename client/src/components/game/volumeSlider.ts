/** Dark unfilled track; filled portion stays red (Firefox progress, WebKit layer).
 * A full-width red-to-dark gradient leaves a red pixel on the right cap in
 * iOS WebKit: the rounded end samples the first color stop. The red is a
 * sized layer on a solid track, so that cap stays dark.
 */
const VOLUME_SLIDER_TRACK_BASE =
  "cursor-pointer appearance-none bg-transparent accent-transparent " +
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full " +
  "[&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:border-0 " +
  "[&::-webkit-slider-runnable-track]:shadow-none " +
  "[&::-webkit-slider-runnable-track]:[background-color:#262626] " +
  "[&::-webkit-slider-runnable-track]:[background-image:linear-gradient(#dc2626,#dc2626)] " +
  "[&::-webkit-slider-runnable-track]:[background-repeat:no-repeat] " +
  "[&::-webkit-slider-runnable-track]:[background-position:left_center] " +
  "[&::-webkit-slider-runnable-track]:[background-size:var(--slider-fill)_100%] " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:border-0 " +
  "[&::-webkit-slider-thumb]:shadow-none " +
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-neutral-800 " +
  "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-red-600 " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-red-600";

/** Start-screen knob: 0.75rem (12px at the default root size). */
const VOLUME_SLIDER_THUMB =
  "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 " +
  "[&::-webkit-slider-thumb]:mt-[calc(0.375rem/2-0.75rem/2)] " +
  "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3";

/** Settings knob: 16px (1rem at the default root size). */
const SETTINGS_VOLUME_SLIDER_THUMB =
  "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 " +
  "[&::-webkit-slider-thumb]:mt-[calc(0.375rem/2-1rem/2)] " +
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4";

/** Vertical start-screen slider. */
export const VOLUME_SLIDER_TRACK = `${VOLUME_SLIDER_TRACK_BASE} ${VOLUME_SLIDER_THUMB}`;

/** Horizontal settings slider (ambience and sound). */
export const VOLUME_SLIDER = `w-full h-5 ${VOLUME_SLIDER_TRACK_BASE} ${SETTINGS_VOLUME_SLIDER_THUMB}`;

/**
 * Settings knob is `w-4` (1rem). A native range slides that knob's center
 * across `trackWidth - thumbWidth`, inset by half a knob at each end.
 */
export function volumeFromClientX(
  clientX: number,
  trackLeft: number,
  trackWidth: number,
  thumbWidth: number,
): number {
  const travel = trackWidth - thumbWidth;
  if (!(travel > 0)) return 0;
  const along = clientX - trackLeft - thumbWidth / 2;
  const ratio = Math.min(1, Math.max(0, along / travel));
  return Math.round(ratio * 100) / 100;
}

/** 1rem in pixels, matching the settings knob. Falls back to 16. */
export function settingsVolumeThumbWidthPx(): number {
  if (typeof document === "undefined") return 16;
  const rootPx = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return Number.isFinite(rootPx) && rootPx > 0 ? rootPx : 16;
}
