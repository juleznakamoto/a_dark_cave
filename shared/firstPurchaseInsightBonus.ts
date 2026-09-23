import { pendingPartnerInsightSource } from "./partnerInsightReferral";

/** Insight granted once on the player's first real-money shop purchase. */
export const FIRST_PURCHASE_INSIGHT_BONUS = 5000;

/**
 * First-purchase Insight for Playlight, itch.io, Bored.com, and Incremental DB
 * referrals (instead of a price discount).
 */
export const PLAYLIGHT_FIRST_PURCHASE_INSIGHT_BONUS = 10_000;

type FirstPurchaseInsightState = {
  story?: { seen?: Record<string, boolean | number | undefined> };
  hasMadeNonFreePurchase?: boolean;
};

export function isPlaylightFirstPurchaseBonusActive(
  state: FirstPurchaseInsightState,
): boolean {
  return (
    state.story?.seen?.playlightFirstPurchaseDiscountActive === true &&
    state.hasMadeNonFreePurchase !== true
  );
}

export function isElevatedFirstPurchaseInsightActive(
  state: FirstPurchaseInsightState,
): boolean {
  return (
    isPlaylightFirstPurchaseBonusActive(state) ||
    pendingPartnerInsightSource(state) != null
  );
}

export function getFirstPurchaseInsightBonus(
  state: FirstPurchaseInsightState,
): number {
  return isElevatedFirstPurchaseInsightActive(state)
    ? PLAYLIGHT_FIRST_PURCHASE_INSIGHT_BONUS
    : FIRST_PURCHASE_INSIGHT_BONUS;
}

const BANNER_BEFORE = {
  playlight: {
    key: "ui:shop.firstPurchaseInsightBannerBeforePlaylight",
    defaultValue: "As a Playlight user you receive",
  },
  itch: {
    key: "ui:shop.firstPurchaseInsightBannerBeforeItch",
    defaultValue: "As an itch.io user you receive",
  },
  bored: {
    key: "ui:shop.firstPurchaseInsightBannerBeforeBored",
    defaultValue: "As a Bored.com user you receive",
  },
  incrementaldb: {
    key: "ui:shop.firstPurchaseInsightBannerBeforeIncrementalDb",
    defaultValue: "As an Incremental DB user you receive",
  },
  standard: {
    key: "ui:shop.firstPurchaseInsightBannerBefore",
    defaultValue: "Get",
  },
} as const;

/** Shop banner lead-in for the first-purchase Insight amount. */
export function firstPurchaseInsightBannerBefore(
  state: FirstPurchaseInsightState,
): { key: string; defaultValue: string } {
  if (isPlaylightFirstPurchaseBonusActive(state)) return BANNER_BEFORE.playlight;
  const partner = pendingPartnerInsightSource(state);
  if (partner) return BANNER_BEFORE[partner];
  return BANNER_BEFORE.standard;
}
