/** Auth `app_metadata` flag set by admin for live-env DEV multipliers. */
export const DEV_MULTIPLIERS_APP_METADATA_KEY = "dev_multipliers";

/** Live accounts that always get local-DEV multipliers and/or Steam Game UI. */
export const BUILT_IN_DEV_ACCOUNTS = [
  {
    email: "adcplay6acee6b4@uberip.com",
    multipliers: true,
    steamMode: true,
  },
] as const;

export const BUILT_IN_DEV_MULTIPLIER_EMAILS = BUILT_IN_DEV_ACCOUNTS.filter(
  (account) => account.multipliers,
).map((account) => account.email);

export const BUILT_IN_STEAM_MODE_EMAILS = BUILT_IN_DEV_ACCOUNTS.filter(
  (account) => account.steamMode,
).map((account) => account.email);

export function parseEmailAllowlist(raw: string | undefined | null): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailOnAllowlist(
  email: string | undefined | null,
  allowlist: Set<string>,
): boolean {
  if (!email?.trim()) return false;
  return allowlist.has(email.trim().toLowerCase());
}

export function hasDevMultipliersAppMetadata(appMetadata: unknown): boolean {
  if (!appMetadata || typeof appMetadata !== "object") return false;
  return (
    (appMetadata as Record<string, unknown>)[
    DEV_MULTIPLIERS_APP_METADATA_KEY
    ] === true
  );
}

export function accountHasDevMultipliers(opts: {
  email?: string | null;
  appMetadata?: unknown;
  allowlist: Set<string>;
}): boolean {
  return (
    hasDevMultipliersAppMetadata(opts.appMetadata) ||
    isEmailOnAllowlist(opts.email, opts.allowlist)
  );
}

export function accountHasSteamMode(opts: {
  email?: string | null;
  allowlist: Set<string>;
}): boolean {
  return isEmailOnAllowlist(opts.email, opts.allowlist);
}
