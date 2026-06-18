import { useGameStore } from "@/game/state";
import {
  consumeShopDiscountsInGameState,
  shopDiscountFlagsFromPaymentMetadata,
  type ShopDiscountMetadataFlags,
} from "@shared/shopDiscountEligibility";

/** Apply shop event-discount consumption to the local game store after a paid purchase. */
export function applyShopDiscountConsumptionToStore(
  applied: ShopDiscountMetadataFlags,
): void {
  const hasDiscount =
    applied.tradersGratitude ||
    applied.tradersSonGratitude ||
    applied.playlightFirstPurchase ||
    applied.cruelModeJourneyComplete;
  if (!hasDiscount) {
    return;
  }

  useGameStore.setState((state) => {
    const next = consumeShopDiscountsInGameState(state, applied);
    return {
      tradersGratitudeState: next.tradersGratitudeState,
      tradersSonGratitudeState: next.tradersSonGratitudeState,
      triggeredEvents: next.triggeredEvents,
      hasMadeNonFreePurchase: next.hasMadeNonFreePurchase,
      story: next.story,
    };
  });
}

export function applyShopDiscountConsumptionFromPaymentMetadata(
  metadata: Record<string, string | undefined> | null | undefined,
): void {
  applyShopDiscountConsumptionToStore(
    shopDiscountFlagsFromPaymentMetadata(metadata),
  );
}
