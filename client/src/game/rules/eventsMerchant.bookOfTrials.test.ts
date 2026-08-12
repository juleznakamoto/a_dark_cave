import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  generateMerchantChoices,
  isMerchantTradeCurrentlyAvailable,
} from "./eventsMerchant";

describe("merchant Book of Trials guarantee", () => {
  it("is available without Dark Estate once the merchant can visit", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 3 },
      books: { book_of_trials: false },
      resources: { gold: 50 },
      story: { seen: {} },
    });

    expect(
      isMerchantTradeCurrentlyAvailable("trade_book_of_trials", state),
    ).toBe(true);
  });

  it("is offered on every merchant visit until purchased", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 3, tradePost: 1 },
      books: { book_of_trials: false },
      resources: { gold: 500 },
      story: { seen: {} },
    });

    for (let i = 0; i < 40; i++) {
      const choices = generateMerchantChoices(state);
      expect(choices.some((c) => c.id === "trade_book_of_trials")).toBe(true);
    }
  });

  it("is not offered after the book is owned", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 5, darkEstate: 1, tradePost: 1 },
      books: { book_of_trials: true },
      resources: { gold: 500 },
      story: { seen: {} },
    });

    expect(
      isMerchantTradeCurrentlyAvailable("trade_book_of_trials", state),
    ).toBe(false);

    for (let i = 0; i < 20; i++) {
      const choices = generateMerchantChoices(state);
      expect(choices.some((c) => c.id === "trade_book_of_trials")).toBe(false);
    }
  });
});
