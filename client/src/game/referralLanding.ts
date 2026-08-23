import { parseRefParam } from "@shared/referralCode";

/** First-touch invite code from `?ref=`. Survives OAuth redirects and later signup. */
export const LANDING_REFERRAL_CODE_KEY = "adc_landing_referral_code";

export function readLandingReferralCode(): string | null {
  try {
    return parseRefParam(localStorage.getItem(LANDING_REFERRAL_CODE_KEY));
  } catch {
    return null;
  }
}

function writeLandingReferralCode(code: string): void {
  try {
    localStorage.setItem(LANDING_REFERRAL_CODE_KEY, code);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearLandingReferralCode(): void {
  try {
    localStorage.removeItem(LANDING_REFERRAL_CODE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Persist a valid `?ref=` on first touch. Later codes do not replace it.
 * Returns the stored code (existing or newly written).
 */
export function persistLandingReferralCode(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  const incoming = parseRefParam(new URLSearchParams(search).get("ref"));
  const existing = readLandingReferralCode();
  if (existing) return existing;
  if (!incoming) return null;
  writeLandingReferralCode(incoming);
  return incoming;
}

/** Stored first-touch code, or `?ref=` if persist has not run yet. */
export function getLandingReferralCode(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  return (
    readLandingReferralCode() ??
    parseRefParam(new URLSearchParams(search).get("ref"))
  );
}
