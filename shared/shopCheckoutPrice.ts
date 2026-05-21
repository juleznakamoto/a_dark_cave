/**
 * Final Stripe amount in cents for shop checkout.
 *
 * Discounts apply to catalog `item.price` in cents (already reflects Beta/sale pricing).
 * **Playlight** first purchase: 10% off, same shape as **Trader's Gratitude** (20% off).
 * If multiple %-off apply, the lowest amount (best for the player) is used.
 * **Journey complete** (Cruel Mode card only): caps price at `CRUEL_MODE_JOURNEY_COMPLETE_PRICE_CENTS`
 * after %-off (see end-screen → shop flow).
 */

/** 10% off catalog `item.price` for Playlight first real-money purchase. */
const PLAYLIGHT_FIRST_PURCHASE_MULTIPLIER = 0.9;
/** 20% off catalog `item.price` for Trader's Gratitude. */
const TRADERS_GRATITUDE_MULTIPLIER = 0.8;
/** 15% off catalog `item.price` for Trader's Son gratitude. */
const TRADERS_SON_GRATITUDE_MULTIPLIER = 0.85;

/** Display percent for shop UI / i18n (derived from checkout multipliers). */
export const TRADERS_GRATITUDE_DISCOUNT_PERCENT = Math.round(
  (1 - TRADERS_GRATITUDE_MULTIPLIER) * 100,
);
export const TRADERS_SON_DISCOUNT_PERCENT = Math.round(
  (1 - TRADERS_SON_GRATITUDE_MULTIPLIER) * 100,
);

/**
 * Checkout price for Cruel Mode when the journey-complete promo is active ($3.49).
 * Applied after %-discounts (Trader / Son / Playlight) as an extra cap for `cruel_mode` only.
 */
export const CRUEL_MODE_JOURNEY_COMPLETE_PRICE_CENTS = 349;

export type ShopDiscountOptions = {
  playlightFirstPurchase?: boolean;
  tradersGratitude?: boolean;
  tradersSonGratitude?: boolean;
  /** Cruel Mode only: extra discount for players who used the end-screen CTA (server + client must agree). */
  cruelModeJourneyComplete?: boolean;
};

const SHOP_PERCENT_DISCOUNTS: [
  keyof Omit<ShopDiscountOptions, "cruelModeJourneyComplete">,
  number,
][] = [
    ["playlightFirstPurchase", PLAYLIGHT_FIRST_PURCHASE_MULTIPLIER],
    ["tradersGratitude", TRADERS_GRATITUDE_MULTIPLIER],
    ["tradersSonGratitude", TRADERS_SON_GRATITUDE_MULTIPLIER],
  ];

export function getDiscountedShopPriceCents(
  basePriceCents: number,
  options: ShopDiscountOptions,
  itemId?: string,
): number {
  if (basePriceCents <= 0) return basePriceCents;

  const multiplierBest = Math.min(
    basePriceCents,
    ...SHOP_PERCENT_DISCOUNTS.filter(([k]) => options[k])
      .map(([, m]) => Math.floor(basePriceCents * m)),
  );

  if (
    itemId === "cruel_mode" &&
    options.cruelModeJourneyComplete &&
    multiplierBest > CRUEL_MODE_JOURNEY_COMPLETE_PRICE_CENTS
  ) {
    return CRUEL_MODE_JOURNEY_COMPLETE_PRICE_CENTS;
  }

  return multiplierBest;
}
