/** Insight granted once on the player's first real-money shop purchase. */
export const FIRST_PURCHASE_INSIGHT_BONUS = 5000;

/** First-purchase Insight for Playlight referral members (instead of a price discount). */
export const PLAYLIGHT_FIRST_PURCHASE_INSIGHT_BONUS = 10_000;

export function isPlaylightFirstPurchaseBonusActive(state: {
  story?: { seen?: Record<string, boolean | number | undefined> };
  hasMadeNonFreePurchase?: boolean;
}): boolean {
  return (
    state.story?.seen?.playlightFirstPurchaseDiscountActive === true &&
    state.hasMadeNonFreePurchase !== true
  );
}

export function getFirstPurchaseInsightBonus(state: {
  story?: { seen?: Record<string, boolean | number | undefined> };
  hasMadeNonFreePurchase?: boolean;
}): number {
  return isPlaylightFirstPurchaseBonusActive(state)
    ? PLAYLIGHT_FIRST_PURCHASE_INSIGHT_BONUS
    : FIRST_PURCHASE_INSIGHT_BONUS;
}
