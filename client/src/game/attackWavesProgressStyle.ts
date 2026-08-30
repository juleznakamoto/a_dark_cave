/**
 * Bastion attack-waves chart bar chrome.
 *
 * Tweak these tokens. `AttackWavesProgressBar` and `/dev/animations#attack-waves-bar`
 * read this file. Estate skill bars use `EstateStyleProgress` and stay independent.
 */
export const ATTACK_WAVES_PROGRESS_STYLE = {
  growAnimationMs: 1000,
  /** Wave complete: tween the fill only. No estate-style sparks or glow sweep. */
  emitSparksOnGrow: false,
  disableGlow: true,
  filledClassName: "bg-fuchsia-950/80",
  emptyClassName: "bg-neutral-800",
  segmentClassName: "h-2",
  /** 1px outside ring on filled segments (box-shadow, not border). */
  rimClassName: "shadow-[0_0_0_1px_theme(colors.fuchsia.400/1)]",
  /** Smoke-flow palette (low → high). Same role as estate fuchsia-900…fuchsia-500. */
  shaderColorTokens: ["fuchsia-900", "fuchsia-800", "fuchsia-600", "fuchsia-400"],
  /** Solid fill when WebGL is off. */
  shaderFallbackClassName: "bg-fuchsia-950",
} as const;
