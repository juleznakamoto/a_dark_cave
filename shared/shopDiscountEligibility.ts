import type { ShopDiscountOptions } from "./shopCheckoutPrice";

/** Minimal game-state slice for shop discount eligibility (client + server). */
export type ShopDiscountGameState = {
  triggeredEvents?: Record<string, boolean | number | undefined>;
  tradersGratitudeState?: { accepted?: boolean };
  tradersSonGratitudeState?: { accepted?: boolean };
  hasMadeNonFreePurchase?: boolean;
  story?: { seen?: Record<string, boolean | number | undefined> };
};

export type ShopDiscountRequest = ShopDiscountOptions;

/** Which event discounts the player may use on the next paid shop checkout. */
export function getEligibleShopDiscountOptions(
  gameState: ShopDiscountGameState | null | undefined,
  itemId: string,
): ShopDiscountOptions {
  if (!gameState || itemId === "full_game") {
    return {};
  }

  const tradersGratitude =
    gameState.tradersGratitudeState?.accepted === true &&
    gameState.triggeredEvents?.traders_gratitude_used !== true;

  const tradersSonGratitude =
    gameState.tradersSonGratitudeState?.accepted === true &&
    gameState.triggeredEvents?.traders_son_gratitude_used !== true;

  const playlightFirstPurchase =
    gameState.story?.seen?.playlightFirstPurchaseDiscountActive === true &&
    gameState.hasMadeNonFreePurchase !== true;

  const cruelModeJourneyComplete =
    itemId === "cruel_mode" &&
    gameState.story?.seen?.cruelModeJourneyCompleteDiscount === true;

  return {
    ...(tradersGratitude && { tradersGratitude: true }),
    ...(tradersSonGratitude && { tradersSonGratitude: true }),
    ...(playlightFirstPurchase && { playlightFirstPurchase: true }),
    ...(cruelModeJourneyComplete && { cruelModeJourneyComplete: true }),
  };
}

/** Intersect client-requested flags with what the game state allows. */
export function resolveAppliedShopDiscountOptions(
  gameState: ShopDiscountGameState | null | undefined,
  itemId: string,
  requested: ShopDiscountRequest,
): ShopDiscountOptions {
  const eligible = getEligibleShopDiscountOptions(gameState, itemId);
  return {
    ...(requested.playlightFirstPurchase &&
      eligible.playlightFirstPurchase && { playlightFirstPurchase: true }),
    ...(requested.tradersGratitude &&
      eligible.tradersGratitude && { tradersGratitude: true }),
    ...(requested.tradersSonGratitude &&
      eligible.tradersSonGratitude && { tradersSonGratitude: true }),
    ...(requested.cruelModeJourneyComplete &&
      eligible.cruelModeJourneyComplete && {
        cruelModeJourneyComplete: true,
      }),
  };
}

export type ShopDiscountMetadataFlags = {
  playlightFirstPurchase?: boolean;
  tradersGratitude?: boolean;
  tradersSonGratitude?: boolean;
  cruelModeJourneyComplete?: boolean;
};

export function shopDiscountFlagsFromPaymentMetadata(
  metadata: Record<string, string | undefined> | null | undefined,
): ShopDiscountMetadataFlags {
  if (!metadata) return {};
  return {
    playlightFirstPurchase:
      metadata.playlightFirstPurchaseDiscountApplied === "true",
    tradersGratitude: metadata.tradersGratitudeDiscountApplied === "true",
    tradersSonGratitude: metadata.tradersSonGratitudeDiscountApplied === "true",
    cruelModeJourneyComplete:
      metadata.cruelModeJourneyCompleteDiscountApplied === "true",
  };
}

/** Patch game_state after a paid purchase consumed event discounts. */
export function consumeShopDiscountsInGameState(
  gameState: ShopDiscountGameState,
  applied: ShopDiscountMetadataFlags,
): ShopDiscountGameState {
  let next: ShopDiscountGameState = { ...gameState };

  if (applied.tradersGratitude) {
    next = {
      ...next,
      tradersGratitudeState: { accepted: false },
      triggeredEvents: {
        ...(next.triggeredEvents || {}),
        traders_gratitude_used: true,
      },
    };
  }

  if (applied.tradersSonGratitude) {
    next = {
      ...next,
      tradersSonGratitudeState: { accepted: false },
      triggeredEvents: {
        ...(next.triggeredEvents || {}),
        traders_son_gratitude_used: true,
      },
    };
  }

  if (applied.playlightFirstPurchase) {
    next = {
      ...next,
      hasMadeNonFreePurchase: true,
      story: {
        ...next.story,
        seen: {
          ...next.story?.seen,
          playlightFirstPurchaseDiscountActive: false,
        },
      },
    };
  }

  if (applied.cruelModeJourneyComplete) {
    next = {
      ...next,
      story: {
        ...next.story,
        seen: {
          ...next.story?.seen,
          cruelModeJourneyCompleteDiscount: false,
        },
      },
    };
  }

  return next;
}
