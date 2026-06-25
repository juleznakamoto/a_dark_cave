export function triggerExclusivePromoHoverPulse(ring: HTMLElement | null): void {
  if (!ring) return;
  ring.classList.remove("exclusive-promo-shockwave-ring--hover-once");
  void ring.offsetWidth;
  ring.classList.add("exclusive-promo-shockwave-ring--hover-once");
}

export function pingExclusivePromoRing(ring: HTMLElement | null): void {
  if (!ring) return;
  ring.classList.remove("exclusive-promo-shockwave-ring--ping-once");
  void ring.offsetWidth;
  ring.classList.add("exclusive-promo-shockwave-ring--ping-once");
}

export function handleExclusivePromoRingAnimationEnd(
  target: HTMLElement,
  animationName: string,
): void {
  if (animationName === "exclusive-promo-shockwave-hover-once") {
    target.classList.remove("exclusive-promo-shockwave-ring--hover-once");
  }
  if (animationName === "exclusive-promo-shockwave-once") {
    target.classList.remove("exclusive-promo-shockwave-ring--ping-once");
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
