/**
 * Final Stripe amount in cents for shop checkout.
 *
 * Discounts apply to catalog `item.price` in cents (already reflects Beta/sale pricing).
 * **Playlight** first purchase: 10% off, same shape as **Trader's Gratitude** (25% off).
 * If both apply, the lower amount (better for the player) is used.
 */

/** 10% off catalog `item.price` for Playlight first real-money purchase. */
const PLAYLIGHT_FIRST_PURCHASE_MULTIPLIER = 0.9;
/** 25% off catalog `item.price` for Trader's Gratitude. */
const TRADERS_GRATITUDE_MULTIPLIER = 0.75;

export function getDiscountedShopPriceCents(
  basePriceCents: number,
  options: {
    playlightFirstPurchase?: boolean;
    tradersGratitude?: boolean;
  },
): number {
  if (basePriceCents <= 0) return basePriceCents;

  let best = basePriceCents;
  if (options.playlightFirstPurchase) {
    best = Math.min(
      best,
      Math.floor(basePriceCents * PLAYLIGHT_FIRST_PURCHASE_MULTIPLIER),
    );
  }
  if (options.tradersGratitude) {
    best = Math.min(
      best,
      Math.floor(basePriceCents * TRADERS_GRATITUDE_MULTIPLIER),
    );
  }
  return best;
}
