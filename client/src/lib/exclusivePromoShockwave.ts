export type ExclusivePromoShockwavePulse = "hover-once" | "ping-once";

const PULSE_CLASS_NAMES: Record<ExclusivePromoShockwavePulse, string> = {
  "hover-once": "exclusive-promo-shockwave-ring--hover-once",
  "ping-once": "exclusive-promo-shockwave-ring--ping-once",
};

/** Restarts a one-shot shockwave on the rewards-task ring (hover or milestone ping). */
export function pulseExclusivePromoRing(
  ring: HTMLElement | null,
  variant: ExclusivePromoShockwavePulse,
): void {
  if (!ring) return;
  for (const className of Object.values(PULSE_CLASS_NAMES)) {
    ring.classList.remove(className);
  }
  void ring.offsetWidth;
  ring.classList.add(PULSE_CLASS_NAMES[variant]);
}

export function handleExclusivePromoRingAnimationEnd(
  target: HTMLElement,
  event: AnimationEvent,
): void {
  if (
    event.animationName !== "exclusive-promo-shockwave-once" &&
    event.animationName !== "exclusive-promo-shockwave-hover-once"
  ) {
    return;
  }
  for (const className of Object.values(PULSE_CLASS_NAMES)) {
    target.classList.remove(className);
  }
}
