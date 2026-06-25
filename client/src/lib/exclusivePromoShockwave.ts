const PING_ONCE_CLASS = "exclusive-promo-shockwave-ring--ping-once";

/** Milestone / reward-dialog pulse (CSS animation). */
export function triggerExclusivePromoPingOnce(ring: HTMLElement | null): void {
  if (!ring) return;
  ring.classList.remove(PING_ONCE_CLASS);
  void ring.offsetWidth;
  ring.classList.add(PING_ONCE_CLASS);
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
