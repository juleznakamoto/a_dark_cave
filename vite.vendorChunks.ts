export type VendorChunkOptions = {
  /** Steam / CrazyGames builds stub Supabase + Stripe. Unused for chunking. */
  offlineStubs: boolean;
};

/** Package name from a Rollup module id, or null for app / Vite internals. */
export function packageNameFromId(id: string): string | null {
  const normalized = id.replace(/\\/g, "/");
  const marker = "/node_modules/";
  const idx = normalized.lastIndexOf(marker);
  if (idx === -1) return null;
  const rest = normalized.slice(idx + marker.length);
  if (rest.startsWith(".")) return null;
  if (rest.startsWith("@")) {
    const parts = rest.split("/");
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`;
  }
  return rest.split("/")[0] || null;
}

/**
 * Only isolate React. Putting framer / radix / supabase in their own named
 * chunks made Rollup park Vite's `import()` preload helper inside one of
 * those files, so the start-screen graph downloaded all three vendors.
 */
export function vendorManualChunk(
  id: string,
  _options: VendorChunkOptions,
): string | undefined {
  const pkg = packageNameFromId(id);
  if (pkg === "react" || pkg === "react-dom" || pkg === "scheduler") {
    return "vendor-react";
  }
  return undefined;
}
