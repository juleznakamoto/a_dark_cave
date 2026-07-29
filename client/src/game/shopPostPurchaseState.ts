import { useGameStore } from "@/game/state";
import { updateResource } from "@/game/stateHelpers";
import { FIRST_PURCHASE_INSIGHT_BONUS } from "@shared/firstPurchaseInsightBonus";
import {
  consumeShopDiscountsInGameState,
  shopDiscountFlagsFromPaymentMetadata,
  type ShopDiscountMetadataFlags,
} from "@shared/shopDiscountEligibility";

export type PaidShopPurchaseResult = {
  /** True when this call granted the one-time first-purchase Insight bonus. */
  grantedFirstPurchaseInsight: boolean;
};

/**
 * Mark a real-money shop purchase complete: set `hasMadeNonFreePurchase`, clear
 * Playlight first-purchase discount eligibility, and grant the one-time Insight
 * bonus on the first paid purchase. Idempotent if already purchased before.
 */
export function completePaidShopPurchaseInStore(): PaidShopPurchaseResult {
  let grantedFirstPurchaseInsight = false;

  useGameStore.setState((state) => {
    const clearPlaylightSeen = {
      ...state.story,
      seen: {
        ...state.story.seen,
        playlightFirstPurchaseDiscountActive: false,
      },
    };

    if (state.hasMadeNonFreePurchase) {
      return {
        hasMadeNonFreePurchase: true,
        story: clearPlaylightSeen,
      };
    }

    grantedFirstPurchaseInsight = true;
    const resourceUpdates = updateResource(
      state,
      "insight",
      FIRST_PURCHASE_INSIGHT_BONUS,
    );
    const baseStory = resourceUpdates.story ?? state.story;

    return {
      ...resourceUpdates,
      hasMadeNonFreePurchase: true,
      story: {
        ...baseStory,
        seen: {
          ...baseStory.seen,
          playlightFirstPurchaseDiscountActive: false,
        },
      },
    };
  });

  return { grantedFirstPurchaseInsight };
}

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
