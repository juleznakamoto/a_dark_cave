export type ExclusivePromoShockwavePulse = "hover-once" | "ping-once";

const SHOCKWAVE_PULSE_MS: Record<ExclusivePromoShockwavePulse, number> = {
  "hover-once": 750,
  "ping-once": 2400,
};

const SHOCKWAVE_KEYFRAMES: Keyframe[] = [
  {
    transform: "translate(-50%, -50%) scale(1)",
    opacity: 0.85,
    borderColor: "rgba(132, 204, 22, 0.9)",
  },
  {
    transform: "translate(-50%, -50%) scale(2)",
    opacity: 0,
    borderColor: "rgba(132, 204, 22, 0)",
  },
];

const SHOCKWAVE_EASING = "cubic-bezier(0.33, 1, 0.68, 1)";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Plays the green expand/fade shockwave on a rewards-task ring element. */
export function runExclusivePromoShockwave(
  ring: HTMLElement | null,
  durationMs: number,
): Animation | null {
  if (!ring || prefersReducedMotion()) return null;
  ring.getAnimations().forEach((animation) => animation.cancel());
  return ring.animate(SHOCKWAVE_KEYFRAMES, {
    duration: durationMs,
    easing: SHOCKWAVE_EASING,
  });
}

/** Restarts a one-shot shockwave (hover or milestone / reward dialog). */
export function pulseExclusivePromoRing(
  ring: HTMLElement | null,
  variant: ExclusivePromoShockwavePulse,
): Animation | null {
  return runExclusivePromoShockwave(ring, SHOCKWAVE_PULSE_MS[variant]);
}

/** Ambient ~every 20s pulse (same cadence as the original CSS loop). */
export const EXCLUSIVE_PROMO_AMBIENT_PULSE_MS = 20_000;

export function pumpDonateHeart(heart: HTMLElement | null): void {
  if (!heart) return;
  heart.classList.remove("donate-heart-pump-once");
  void heart.offsetWidth;
  requestAnimationFrame(() => {
    heart.classList.add("donate-heart-pump-once");
  });
}

export function handleDonateHeartAnimationEnd(
  target: HTMLElement,
  animationName: string,
): void {
  if (animationName !== "donate-heart-pump") {
    return;
  }
  target.classList.remove("donate-heart-pump-once");
}
