import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "@/game/state";
import { FIRST_PURCHASE_INSIGHT_BONUS } from "@shared/firstPurchaseInsightBonus";
import { completePaidShopPurchaseInStore } from "./shopPostPurchaseState";

describe("completePaidShopPurchaseInStore", () => {
  beforeEach(() => {
    useGameStore.setState({
      hasMadeNonFreePurchase: false,
      resources: {
        ...useGameStore.getState().resources,
        insight: 100,
      },
      story: {
        ...useGameStore.getState().story,
        seen: {
          ...useGameStore.getState().story.seen,
          playlightFirstPurchaseDiscountActive: true,
        },
      },
    });
  });

  it("grants Insight once on the first paid purchase", () => {
    const first = completePaidShopPurchaseInStore();
    const state = useGameStore.getState();

    expect(first.grantedFirstPurchaseInsight).toBe(true);
    expect(state.hasMadeNonFreePurchase).toBe(true);
    expect(state.resources.insight).toBe(100 + FIRST_PURCHASE_INSIGHT_BONUS);
    expect(state.story.seen.playlightFirstPurchaseDiscountActive).toBe(false);

    const second = completePaidShopPurchaseInStore();
    expect(second.grantedFirstPurchaseInsight).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(
      100 + FIRST_PURCHASE_INSIGHT_BONUS,
    );
  });

  it("does not grant Insight when the player already paid before", () => {
    useGameStore.setState({ hasMadeNonFreePurchase: true });

    const result = completePaidShopPurchaseInStore();
    expect(result.grantedFirstPurchaseInsight).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(100);
  });
});
