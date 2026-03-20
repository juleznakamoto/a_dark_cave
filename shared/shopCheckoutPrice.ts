/**
 * Final Stripe amount in cents for shop checkout.
 *
 * **Beta** (25% off list) and **Playlight first-purchase** (10% extra) stack **additively**:
 * eligible players pay 65% of `item.price` (35% total discount).
 *
 * **Trader's Gratitude** (25% off list) does not stack with Playlight: if both flags are
 * present, the Playlight path (35% off) — the better price for the player — is used.
 */

/** Fraction off list price during Beta (applies to Playlight first-purchase checkout). */
const BETA_DISCOUNT = 0.25;
/** Extra fraction off for Playlight first purchase (additive with {@link BETA_DISCOUNT}). */
const PLAYLIGHT_FIRST_PURCHASE_EXTRA = 0.1;

export function getDiscountedShopPriceCents(
  basePriceCents: number,
  options: {
    playlightFirstPurchase?: boolean;
    tradersGratitude?: boolean;
  },
): number {
  if (basePriceCents <= 0) return basePriceCents;
  if (options.playlightFirstPurchase) {
    const totalDiscount = BETA_DISCOUNT + PLAYLIGHT_FIRST_PURCHASE_EXTRA;
    return Math.floor(basePriceCents * (1 - totalDiscount));
  }
  if (options.tradersGratitude) {
    return Math.floor(basePriceCents * 0.75);
  }
  return basePriceCents;
}
