/** Dark unfilled track; filled portion stays red (WebKit gradient + Firefox progress). */
export const VOLUME_SLIDER_TRACK =
  "cursor-pointer appearance-none bg-transparent " +
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full " +
  "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#dc2626_0%,#dc2626_var(--slider-fill),#262626_var(--slider-fill),#262626_100%)] " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:border-0 " +
  "[&::-webkit-slider-thumb]:mt-[calc(0.375rem/2-0.75rem/2)] " +
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-neutral-800 " +
  "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-red-600 " +
  "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-red-600";

/** Horizontal settings slider. */
export const VOLUME_SLIDER = `w-full h-4 ${VOLUME_SLIDER_TRACK}`;
