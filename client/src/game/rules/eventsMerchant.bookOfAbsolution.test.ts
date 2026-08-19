import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  generateMerchantChoices,
  isMerchantTradeCurrentlyAvailable,
} from "./eventsMerchant";

function merchantState(overrides?: {
  clerksHut?: number;
  bookOfAbsolution?: boolean;
  bookOfTrials?: boolean;
}) {
  return gameStateSchema.parse({
    buildings: {
      woodenHut: 5,
      tradePost: 1,
      clerksHut: overrides?.clerksHut ?? 1,
    },
    books: {
      book_of_trials: overrides?.bookOfTrials ?? true,
      book_of_absolution: overrides?.bookOfAbsolution ?? false,
    },
    resources: { gold: 2000 },
    story: { seen: {} },
  });
}

describe("merchant Book of Absolution", () => {
  it("is unavailable until Insight is unlocked", () => {
    const state = merchantState({ clerksHut: 0 });
    expect(
      isMerchantTradeCurrentlyAvailable("trade_book_of_absolution", state),
    ).toBe(false);

    for (let i = 0; i < 20; i++) {
      const choices = generateMerchantChoices(state);
      expect(choices.some((c) => c.id === "trade_book_of_absolution")).toBe(
        false,
      );
    }
  });

  it("is offered on every merchant visit after Insight until purchased", () => {
    const state = merchantState();
    expect(
      isMerchantTradeCurrentlyAvailable("trade_book_of_absolution", state),
    ).toBe(true);

    for (let i = 0; i < 40; i++) {
      const choices = generateMerchantChoices(state);
      expect(choices.some((c) => c.id === "trade_book_of_absolution")).toBe(
        true,
      );
    }
  });

  it("costs 250 Gold when there is no merchant discount", () => {
    const state = merchantState();
    const trade = generateMerchantChoices(state).find(
      (c) => c.id === "trade_book_of_absolution",
    );
    expect(trade?.sellAmount).toBe(250);
    expect(trade?.sellResource).toBe("gold");
  });

  it("is not offered after the book is owned", () => {
    const state = merchantState({ bookOfAbsolution: true });
    expect(
      isMerchantTradeCurrentlyAvailable("trade_book_of_absolution", state),
    ).toBe(false);

    for (let i = 0; i < 20; i++) {
      const choices = generateMerchantChoices(state);
      expect(choices.some((c) => c.id === "trade_book_of_absolution")).toBe(
        false,
      );
    }
  });

  it("yields to Book of Trials while both are unowned", () => {
    const state = merchantState({ bookOfTrials: false });
    for (let i = 0; i < 20; i++) {
      const ids = generateMerchantChoices(state).map((c) => c.id);
      expect(ids).toContain("trade_book_of_trials");
      expect(ids).not.toContain("trade_book_of_absolution");
      expect(
        ids.filter((id) => id.startsWith("trade_book_")).length,
      ).toBe(1);
    }
  });
});
