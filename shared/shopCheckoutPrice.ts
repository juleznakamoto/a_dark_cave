/**
 * Final Stripe amount in cents for shop checkout.
 *
 * Trader's Gratitude (25%) is **exclusive** with Playlight first-purchase (10%):
 * while gratitude is active, only the 25% applies — not stacked on top of 10%.
 * If neither applies, the base price is unchanged.
 */
export function getDiscountedShopPriceCents(
  basePriceCents: number,
  options: {
    playlightFirstPurchase?: boolean;
    tradersGratitude?: boolean;
  },
): number {
  if (basePriceCents <= 0) return basePriceCents;
  if (options.tradersGratitude) {
    return Math.floor(basePriceCents * 0.75);
  }
  if (options.playlightFirstPurchase) {
    return Math.floor(basePriceCents * 0.9);
  }
  return basePriceCents;
}
