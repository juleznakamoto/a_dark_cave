/** Dark unfilled track; filled portion stays red (Firefox progress, WebKit layer).
 * A full-width red-to-dark gradient leaves a red pixel on the right cap in
 * iOS WebKit: the rounded end samples the first color stop. The red is a
 * sized layer on a solid track, so that cap stays dark.
 */
export const VOLUME_SLIDER_TRACK =
  "cursor-pointer appearance-none bg-transparent accent-transparent " +
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full " +
  "[&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:border-0 " +
  "[&::-webkit-slider-runnable-track]:shadow-none " +
  "[&::-webkit-slider-runnable-track]:[background-color:#262626] " +
  "[&::-webkit-slider-runnable-track]:[background-image:linear-gradient(#dc2626,#dc2626)] " +
  "[&::-webkit-slider-runnable-track]:[background-repeat:no-repeat] " +
  "[&::-webkit-slider-runnable-track]:[background-position:left_center] " +
  "[&::-webkit-slider-runnable-track]:[background-size:var(--slider-fill)_100%] " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:border-0 " +
  "[&::-webkit-slider-thumb]:shadow-none " +
  "[&::-webkit-slider-thumb]:mt-[calc(0.375rem/2-0.75rem/2)] " +
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-neutral-800 " +
  "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-red-600 " +
  "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-red-600";

/** Horizontal settings slider. */
export const VOLUME_SLIDER = `w-full h-4 ${VOLUME_SLIDER_TRACK}`;
