import { isCrazyGamesBuild } from "@/lib/edition";

/**
 * Resolve an in-app path (`/end-screen`, `/?game=true`) against the current
 * document URL. CrazyGames hosts the folder in a subdirectory and routes via
 * the hash, so a raw `location.href = "/end-screen"` would leave the game.
 */
export function resolveSpaHref(
  target: string,
  currentHref: string,
  options: { hashRouted: boolean },
): string {
  if (!options.hashRouted) return target;

  const current = new URL(currentHref);
  const parsed = new URL(target, current.origin);
  current.search = parsed.search;
  current.hash = parsed.pathname || "/";
  return current.href;
}

/** Navigate to an in-app path without breaking CrazyGames hash + relative base. */
export function navigateSpa(target: string): void {
  window.location.href = resolveSpaHref(target, window.location.href, {
    hashRouted: isCrazyGamesBuild,
  });
}
