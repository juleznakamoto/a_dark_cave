/** URL-safe referral codes: 6 chars, uppercase, no ambiguous 0/O/1/I/L. */
export const REFERRAL_CODE_LENGTH = 6;

export const REFERRAL_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const REFERRAL_CODE_PATTERN = new RegExp(
  `^[${REFERRAL_CODE_CHARS}]{${REFERRAL_CODE_LENGTH}}$`,
);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateReferralCode(
  random: () => number = Math.random,
): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    const idx = Math.floor(random() * REFERRAL_CODE_CHARS.length);
    code += REFERRAL_CODE_CHARS[idx]!;
  }
  return code;
}

/** Uppercase and validate; returns null if not a valid 6-char referral code. */
export function normalizeReferralCode(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  if (!REFERRAL_CODE_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function isUuidReferralCode(code: string): boolean {
  return UUID_PATTERN.test(code.trim());
}

export function isShortReferralCode(code: string): boolean {
  return normalizeReferralCode(code) !== null;
}

/** Normalize `?ref=` for signup: uppercase short codes; legacy full UUIDs unchanged. */
export function parseRefParam(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isUuidReferralCode(trimmed)) return trimmed;
  return normalizeReferralCode(trimmed);
}
