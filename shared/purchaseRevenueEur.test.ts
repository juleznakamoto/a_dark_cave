import { describe, it, expect } from "vitest";
import {
  formatPurchaseMinorUnits,
  isUsdPurchaseCurrency,
} from "./purchaseRevenueEur";

describe("purchaseRevenueEur", () => {
  it("detects USD currency", () => {
    expect(isUsdPurchaseCurrency("usd")).toBe(true);
    expect(isUsdPurchaseCurrency("EUR")).toBe(false);
    expect(isUsdPurchaseCurrency(null)).toBe(false);
  });

  it("formats display by currency", () => {
    expect(formatPurchaseMinorUnits(799, "eur")).toBe("€7.99");
    expect(formatPurchaseMinorUnits(799, "usd")).toBe("$7.99");
    expect(formatPurchaseMinorUnits(0, "usd")).toBe("Free");
  });
});
