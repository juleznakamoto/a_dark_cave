const HOVER_ONCE_CLASS = "exclusive-promo-shockwave-ring--hover-once";
const PING_ONCE_CLASS = "exclusive-promo-shockwave-ring--ping-once";

function restartRingAnimation(ring: HTMLElement, className: string): void {
  ring.classList.remove(HOVER_ONCE_CLASS, PING_ONCE_CLASS);
  void ring.offsetWidth;
  ring.classList.add(className);
}

/** Hover pulse on the header rewards-task icon (CSS animation). */
export function triggerExclusivePromoHoverPulse(ring: HTMLElement | null): void {
  if (!ring) return;
  restartRingAnimation(ring, HOVER_ONCE_CLASS);
}

/** Milestone / reward-dialog pulse (CSS animation). */
export function triggerExclusivePromoPingOnce(ring: HTMLElement | null): void {
  if (!ring) return;
  restartRingAnimation(ring, PING_ONCE_CLASS);
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
