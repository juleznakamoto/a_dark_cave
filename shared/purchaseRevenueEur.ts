/** Display helpers for admin purchase rows. */

export type PurchaseRowForReporting = {
  price_paid: number;
  currency?: string | null;
  reporting_eur_cents?: number | null;
  reporting_usd_cents?: number | null;
};

/**
 * Approximate USD per 1 EUR for legacy USD charges without `reporting_eur_cents`.
 * Keep in sync with `supabase/migrations/016_admin_revenue_unified_eur.sql`.
 */
export const ADMIN_HISTORICAL_USD_PER_EUR = 1.09;

/**
 * All admin revenue charts and KPIs: value in EUR minor units.
 * Order: Stripe `reporting_eur_cents` (purchase-time FX) → EUR charge → USD at fixed rate.
 */
export function adminUnifiedRevenueEurCents(p: PurchaseRowForReporting): number {
  if (p.reporting_eur_cents != null) return p.reporting_eur_cents;
  if (isUsdPurchaseCurrency(p.currency)) {
    return Math.round(p.price_paid / ADMIN_HISTORICAL_USD_PER_EUR);
  }
  return p.price_paid;
}

/** @deprecated Use adminUnifiedRevenueEurCents */
export function analyticsEurCents(p: PurchaseRowForReporting): number {
  return adminUnifiedRevenueEurCents(p);
}

export function isUsdPurchaseCurrency(
  currency: string | null | undefined,
): boolean {
  return (currency ?? "eur").toLowerCase() === "usd";
}

export function formatPurchaseMinorUnits(
  pricePaid: number,
  currency: string | null | undefined,
): string {
  if (pricePaid === 0) return "Free";
  const amount = (pricePaid / 100).toFixed(2);
  if (isUsdPurchaseCurrency(currency)) return `$${amount}`;
  return `€${amount}`;
}

/** Admin lists: paid amounts as unified EUR; free/bundle lines unchanged. */
export function formatAdminUnifiedRevenueEur(p: PurchaseRowForReporting): string {
  if (p.price_paid <= 0) return formatPurchaseMinorUnits(p.price_paid, p.currency);
  return `€${(adminUnifiedRevenueEurCents(p) / 100).toFixed(2)}`;
}
