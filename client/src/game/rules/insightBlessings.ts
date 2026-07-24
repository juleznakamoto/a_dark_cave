import type { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

/** Ordered offer list for the Insight blessing timed-tab event. */
export const INSIGHT_BLESSING_ORDER = [
  "trail_sense",
  "skilled_hands",
  "keen_builder",
  "fresh_blood",
  "depths_gift",
  "rich_veins",
] as const;

export type InsightBlessingId = (typeof INSIGHT_BLESSING_ORDER)[number];

/** Insight cost for the Nth purchased blessing (0-based index). */
export const INSIGHT_BLESSING_COSTS = [
  500, 750, 1000, 1500, 2000, 2500,
] as const;

export type InsightBlessingOfferState = {
  /** Up to 3 slots; null when empty after the list is exhausted. */
  slots: Array<InsightBlessingId | null>;
  /** Next index into `INSIGHT_BLESSING_ORDER` to pull into a vacated slot. */
  nextIndex: number;
};

export const DEFAULT_INSIGHT_BLESSING_OFFER_STATE: InsightBlessingOfferState = {
  slots: [],
  nextIndex: 0,
};

export function isInsightBlessingId(id: string): id is InsightBlessingId {
  return (INSIGHT_BLESSING_ORDER as readonly string[]).includes(id);
}

export function countOwnedInsightBlessings(state: GameState): number {
  return INSIGHT_BLESSING_ORDER.filter(
    (id) => state.blessings?.[id] === true,
  ).length;
}

export function hasUnownedInsightBlessings(state: GameState): boolean {
  return INSIGHT_BLESSING_ORDER.some((id) => state.blessings?.[id] !== true);
}

export function getInsightBlessingCost(state: GameState): number {
  const purchased = countOwnedInsightBlessings(state);
  return (
    INSIGHT_BLESSING_COSTS[
    Math.min(purchased, INSIGHT_BLESSING_COSTS.length - 1)
    ] ?? INSIGHT_BLESSING_COSTS[INSIGHT_BLESSING_COSTS.length - 1]
  );
}

export function getInsightBlessingCostLabel(state: GameState): string {
  return `${formatNumber(getInsightBlessingCost(state))} Insight`;
}

function isOfferInitialized(
  offer: InsightBlessingOfferState | undefined | null,
): boolean {
  return Boolean(offer && (offer.slots.length > 0 || offer.nextIndex > 0));
}

function pullNextAvailable(
  state: GameState,
  nextIndex: number,
): { id: InsightBlessingId | null; nextIndex: number } {
  let idx = nextIndex;
  while (idx < INSIGHT_BLESSING_ORDER.length) {
    const id = INSIGHT_BLESSING_ORDER[idx];
    idx += 1;
    if (state.blessings?.[id] !== true) {
      return { id, nextIndex: idx };
    }
  }
  return { id: null, nextIndex: idx };
}

/** Build the first 3-slot offer from the ordered list. */
export function createInitialInsightBlessingOffer(
  state: GameState,
): InsightBlessingOfferState {
  const slots: Array<InsightBlessingId | null> = [null, null, null];
  let nextIndex = 0;
  for (let i = 0; i < 3; i++) {
    const pulled = pullNextAvailable(state, nextIndex);
    slots[i] = pulled.id;
    nextIndex = pulled.nextIndex;
  }
  return { slots, nextIndex };
}

/**
 * Ensure offer slots exist and replace any owned/missing entries with the next
 * unowned blessing from the ordered list (same slot position).
 */
export function ensureInsightBlessingOfferState(
  state: GameState,
): InsightBlessingOfferState {
  const current = state.insightBlessingOfferState;
  if (!isOfferInitialized(current)) {
    return createInitialInsightBlessingOffer(state);
  }

  const slots: Array<InsightBlessingId | null> = [
    current.slots[0] ?? null,
    current.slots[1] ?? null,
    current.slots[2] ?? null,
  ];
  let nextIndex = current.nextIndex ?? 0;
  let changed = slots.length !== 3;

  for (let i = 0; i < 3; i++) {
    const slot = slots[i];
    if (slot != null && state.blessings?.[slot] === true) {
      slots[i] = null;
      changed = true;
    }
    if (slots[i] == null) {
      const pulled = pullNextAvailable(state, nextIndex);
      if (pulled.id != null) {
        slots[i] = pulled.id;
        nextIndex = pulled.nextIndex;
        changed = true;
      } else if (nextIndex !== pulled.nextIndex) {
        nextIndex = pulled.nextIndex;
        changed = true;
      }
    }
  }

  if (
    !changed &&
    current.slots.length === 3 &&
    current.nextIndex === nextIndex
  ) {
    return current;
  }

  return { slots, nextIndex };
}

export function getVisibleInsightBlessingOffers(
  state: GameState,
): InsightBlessingId[] {
  const offer = ensureInsightBlessingOfferState(state);
  return offer.slots.filter((id): id is InsightBlessingId => id != null);
}

/**
 * After purchasing `blessingId`, clear its slot and fill that slot with the next
 * unowned blessing from the list (if any).
 */
export function purchaseInsightBlessingFromOffer(
  state: GameState,
  blessingId: InsightBlessingId,
): InsightBlessingOfferState {
  const offer = ensureInsightBlessingOfferState(state);
  const slots: Array<InsightBlessingId | null> = [...offer.slots];
  while (slots.length < 3) slots.push(null);

  const slotIndex = slots.findIndex((id) => id === blessingId);
  if (slotIndex < 0) {
    return offer;
  }

  // Treat the chosen blessing as owned when pulling the replacement.
  const stateAfterPurchase = {
    ...state,
    blessings: {
      ...state.blessings,
      [blessingId]: true,
    },
  };

  slots[slotIndex] = null;
  let nextIndex = offer.nextIndex;
  const pulled = pullNextAvailable(stateAfterPurchase, nextIndex);
  slots[slotIndex] = pulled.id;
  nextIndex = pulled.nextIndex;

  return { slots, nextIndex };
}
