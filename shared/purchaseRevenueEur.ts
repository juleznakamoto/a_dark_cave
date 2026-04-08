/** Display helpers for admin purchase rows (charge currency only; no FX). */

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
