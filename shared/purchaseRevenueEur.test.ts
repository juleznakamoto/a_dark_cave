import { describe, expect, it } from "vitest";
import {
  ADMIN_HISTORICAL_USD_PER_EUR,
  adminUnifiedRevenueEurCents,
} from "./purchaseRevenueEur";

describe("adminUnifiedRevenueEurCents", () => {
  it("prefers reporting_eur_cents", () => {
    expect(
      adminUnifiedRevenueEurCents({
        price_paid: 999,
        currency: "usd",
        reporting_eur_cents: 888,
      }),
    ).toBe(888);
  });

  it("uses EUR price_paid when no reporting", () => {
    expect(
      adminUnifiedRevenueEurCents({ price_paid: 100, currency: "eur" }),
    ).toBe(100);
  });

  it("converts USD with fixed historical rate when no reporting", () => {
    expect(
      adminUnifiedRevenueEurCents({ price_paid: 109, currency: "usd" }),
    ).toBe(Math.round(109 / ADMIN_HISTORICAL_USD_PER_EUR));
  });
});
