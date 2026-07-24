import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  INSIGHT_BLESSING_ORDER,
  createInitialInsightBlessingOffer,
  ensureInsightBlessingOfferState,
  getInsightBlessingCost,
  getVisibleInsightBlessingOffers,
  purchaseInsightBlessingFromOffer,
} from "./insightBlessings";

function stateWith(
  blessings: Partial<Record<(typeof INSIGHT_BLESSING_ORDER)[number], boolean>>,
  offer?: { slots: Array<string | null>; nextIndex: number },
) {
  return gameStateSchema.parse({
    blessings,
    insightBlessingOfferState: offer,
  });
}

describe("insightBlessings offer flow", () => {
  it("initializes the first three blessings in list order", () => {
    const state = stateWith({});
    const offer = createInitialInsightBlessingOffer(state);
    expect(offer.slots).toEqual([
      "trail_sense",
      "skilled_hands",
      "keen_builder",
    ]);
    expect(offer.nextIndex).toBe(3);
    expect(getInsightBlessingCost(state)).toBe(500);
  });

  it("fills the purchased slot with the next blessing in the list", () => {
    const state = stateWith({});
    const afterInit = {
      ...state,
      insightBlessingOfferState: createInitialInsightBlessingOffer(state),
    };

    const afterPurchase = purchaseInsightBlessingFromOffer(
      afterInit,
      "skilled_hands",
    );
    expect(afterPurchase.slots).toEqual([
      "trail_sense",
      "fresh_blood",
      "keen_builder",
    ]);
    expect(afterPurchase.nextIndex).toBe(4);
  });

  it("shows fewer cards as the list runs out", () => {
    let state = stateWith({
      trail_sense: true,
      skilled_hands: true,
      keen_builder: true,
      fresh_blood: true,
    });
    state = {
      ...state,
      insightBlessingOfferState: {
        slots: ["depths_gift", "rich_veins", null],
        nextIndex: 6,
      },
    };

    expect(getVisibleInsightBlessingOffers(state)).toEqual([
      "depths_gift",
      "rich_veins",
    ]);

    const after = purchaseInsightBlessingFromOffer(state, "depths_gift");
    expect(after.slots.filter(Boolean)).toEqual(["rich_veins"]);
  });

  it("escalates insight cost by owned count", () => {
    expect(getInsightBlessingCost(stateWith({}))).toBe(500);
    expect(
      getInsightBlessingCost(stateWith({ trail_sense: true })),
    ).toBe(750);
    expect(
      getInsightBlessingCost(
        stateWith({
          trail_sense: true,
          skilled_hands: true,
          keen_builder: true,
          fresh_blood: true,
          depths_gift: true,
        }),
      ),
    ).toBe(2500);
  });

  it("ensure initializes uninitialized offer state", () => {
    const state = stateWith({});
    const offer = ensureInsightBlessingOfferState(state);
    expect(offer.slots.filter(Boolean)).toHaveLength(3);
  });
});
