/**
 * Same rule as auth-js `isAuthRetryableFetchError`. Inlined so the game loop
 * does not import `@supabase/supabase-js` (the offline build only stubs
 * `@/lib/supabase`).
 */
function isRetryableAuthFetchError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "__isAuthError" in error &&
    (error as { name?: string }).name === "AuthRetryableFetchError"
  );
}

/**
 * Whether `refreshSession()` means this login was revoked.
 *
 * auth-js keeps the stored session for AuthRetryableFetchError (offline, CORS,
 * 502/503/504) and only removes it for a real auth failure. A null session
 * alongside that error is the same failed request, not a second login.
 */
export function refreshResultMeansSessionRevoked(result: {
  session: unknown;
  error: unknown;
}): boolean {
  if (isRetryableAuthFetchError(result.error)) return false;
  return Boolean(result.error) || result.session == null;
}
