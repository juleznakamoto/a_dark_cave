/**
 * Resolve API path against an optional origin (no trailing slash on base).
 * Used by `apiUrl`; exported for unit tests.
 */
export function resolveApiUrl(
  base: string | undefined,
  path: string,
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const b = base?.trim().replace(/\/$/, "") ?? "";
  return b ? `${b}${normalized}` : normalized;
}

/**
 * Build an absolute or same-origin URL for `/api/...` calls.
 * Set `VITE_API_BASE` (no trailing slash) when the browser loads the UI from a
 * different host/port than the Express server (e.g. some Replit web previews).
 */
export function apiUrl(path: string): string {
  const raw = import.meta.env.VITE_API_BASE as string | undefined;
  return resolveApiUrl(raw, path);
}
