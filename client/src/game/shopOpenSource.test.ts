import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "@/game/state";

describe("setShopDialogOpen shop-open analytics", () => {
  beforeEach(() => {
    useGameStore.setState({
      shopDialogOpen: false,
      traderDialogOpens: 0,
      clickAnalytics: {},
    });
  });

  it("increments traderDialogOpens and tracks shop-open-{source} on first open", () => {
    useGameStore.getState().setShopDialogOpen(true, "tab");
    const state = useGameStore.getState();
    expect(state.shopDialogOpen).toBe(true);
    expect(state.traderDialogOpens).toBe(1);
    expect(state.clickAnalytics["shop-open-tab"]).toBe(1);
  });

  it("does not double-count when shop is already open", () => {
    useGameStore.getState().setShopDialogOpen(true, "footer");
    useGameStore.getState().setShopDialogOpen(true, "tab");
    const state = useGameStore.getState();
    expect(state.traderDialogOpens).toBe(1);
    expect(state.clickAnalytics["shop-open-footer"]).toBe(1);
    expect(state.clickAnalytics["shop-open-tab"]).toBeUndefined();
  });

  it("tracks unknown when source is omitted", () => {
    useGameStore.getState().setShopDialogOpen(true);
    expect(useGameStore.getState().clickAnalytics["shop-open-unknown"]).toBe(1);
  });
});
