/**
 * Final Stripe amount in cents for shop checkout.
 *
 * Discounts apply to catalog `item.price` in cents (already reflects Beta/sale pricing).
 * **Playlight** first purchase: 10% off, same shape as **Trader's Gratitude** (20% off).
 * If multiple apply, the lowest amount (best for the player) is used.
 */

/** 10% off catalog `item.price` for Playlight first real-money purchase. */
const PLAYLIGHT_FIRST_PURCHASE_MULTIPLIER = 0.9;
/** 20% off catalog `item.price` for Trader's Gratitude. */
const TRADERS_GRATITUDE_MULTIPLIER = 0.8;
/** 15% off catalog `item.price` for Trader's Son gratitude. */
const TRADERS_SON_GRATITUDE_MULTIPLIER = 0.85;

type ShopDiscountOptions = {
  playlightFirstPurchase?: boolean;
  tradersGratitude?: boolean;
  tradersSonGratitude?: boolean;
};

const SHOP_DISCOUNTS: [keyof ShopDiscountOptions, number][] = [
  ["playlightFirstPurchase", PLAYLIGHT_FIRST_PURCHASE_MULTIPLIER],
  ["tradersGratitude", TRADERS_GRATITUDE_MULTIPLIER],
  ["tradersSonGratitude", TRADERS_SON_GRATITUDE_MULTIPLIER],
];

export function getDiscountedShopPriceCents(
  basePriceCents: number,
  options: ShopDiscountOptions,
): number {
  if (basePriceCents <= 0) return basePriceCents;
  return Math.min(
    basePriceCents,
    ...SHOP_DISCOUNTS.filter(([k]) => options[k])
      .map(([, m]) => Math.floor(basePriceCents * m)),
  );
}
