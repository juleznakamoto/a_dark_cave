/** Steam build stub — Stripe payments are web-only. */

export function getStripeReturnUrlForConfirm(): string {
  return typeof window !== "undefined" ? window.location.href : "";
}

export async function processStripePaymentReturn(): Promise<void> { }
