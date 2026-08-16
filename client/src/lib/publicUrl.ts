/**
 * Resolve a site-root public path (`/sounds/x.mp3`) against the Vite base.
 * CrazyGames hosts the folder in a subdirectory, so the build uses `base: "./"`.
 */
export function publicUrl(path: string): string {
  if (!path.startsWith("/")) return path;
  const base = import.meta.env.BASE_URL;
  if (!base || base === "/") return path;
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path.slice(1)}`;
}

export function publicUrlMap<T extends Record<string, string>>(
  urls: T,
): T {
  const next = { ...urls };
  for (const key of Object.keys(next) as Array<keyof T>) {
    next[key] = publicUrl(next[key]) as T[keyof T];
  }
  return next;
}
