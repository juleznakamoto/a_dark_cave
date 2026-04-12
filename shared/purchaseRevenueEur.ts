/** Display helpers for admin purchase rows (charge currency only; no FX). */

export type PurchaseRowForReporting = {
  price_paid: number;
  currency?: string | null;
  reporting_eur_cents?: number | null;
  reporting_usd_cents?: number | null;
};

/** EUR minor units for charts: prefer Stripe FX reporting when present. */
export function analyticsEurCents(p: PurchaseRowForReporting): number {
  if (p.reporting_eur_cents != null) return p.reporting_eur_cents;
  return isUsdPurchaseCurrency(p.currency) ? 0 : p.price_paid;
}

/** USD minor units for charts: prefer Stripe FX reporting when present. */
export function analyticsUsdCents(p: PurchaseRowForReporting): number {
  if (p.reporting_usd_cents != null) return p.reporting_usd_cents;
  return isUsdPurchaseCurrency(p.currency) ? p.price_paid : 0;
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
