export type ExclusivePromoShockwavePulse = "hover-once" | "ping-once";

const PULSE_CLASS_NAMES: Record<ExclusivePromoShockwavePulse, string> = {
  "hover-once": "exclusive-promo-shockwave-ring--hover-once",
  "ping-once": "exclusive-promo-shockwave-ring--ping-once",
};

const ONE_SHOT_ANIMATION_NAMES = new Set([
  "exclusive-promo-shockwave-once",
  "exclusive-promo-shockwave-hover-once",
]);

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
  requestAnimationFrame(() => {
    ring.classList.add(PULSE_CLASS_NAMES[variant]);
  });
}

export function handleExclusivePromoRingAnimationEnd(
  target: HTMLElement,
  animationName: string,
): void {
  if (!ONE_SHOT_ANIMATION_NAMES.has(animationName)) {
    return;
  }
  for (const className of Object.values(PULSE_CLASS_NAMES)) {
    target.classList.remove(className);
  }
}

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
