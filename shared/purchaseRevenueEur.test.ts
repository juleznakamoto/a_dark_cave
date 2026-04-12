import { describe, expect, it } from "vitest";
import { analyticsEurCents, analyticsUsdCents } from "./purchaseRevenueEur";

describe("analyticsEurUsdCents", () => {
  it("uses reporting columns when set", () => {
    expect(
      analyticsEurCents({
        price_paid: 999,
        currency: "usd",
        reporting_eur_cents: 888,
      }),
    ).toBe(888);
    expect(
      analyticsUsdCents({
        price_paid: 999,
        currency: "eur",
        reporting_usd_cents: 777,
      }),
    ).toBe(777);
  });

  it("falls back to charge currency", () => {
    expect(
      analyticsEurCents({ price_paid: 100, currency: "eur" }),
    ).toBe(100);
    expect(
      analyticsUsdCents({ price_paid: 100, currency: "eur" }),
    ).toBe(0);
    expect(
      analyticsUsdCents({ price_paid: 200, currency: "usd" }),
    ).toBe(200);
    expect(
      analyticsEurCents({ price_paid: 200, currency: "usd" }),
    ).toBe(0);
  });
});
