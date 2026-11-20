import fs from "node:fs";
import path from "node:path";

/**
 * Vite copies all of `client/public` into every client build.
 * These entries are for the website only. Packaged game builds delete them
 * after that copy. The website build and the dev server keep them.
 *
 * Steam, Steam demo, iOS, itch, and CrazyGames are packaged game builds.
 */
export const SITE_ONLY_PUBLIC_ENTRIES = [
  "email",
  "press-kit",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "llms-full.txt",
  "og-image.png",
  "og-image-1200x630.png",
] as const;

const COMPRESSED_SUFFIXES = [".gz", ".br"];

export function isPackagedGameBuild(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.VITE_STEAM_BUILD === "1" ||
    env.VITE_IOS_BUILD === "1" ||
    env.VITE_CRAZYGAMES === "1" ||
    env.VITE_ITCH === "1"
  );
}

/** Deletes site-only public files from a finished client build folder. */
export function removeSiteOnlyPublic(outDir: string): string[] {
  const removed: string[] = [];
  for (const entry of SITE_ONLY_PUBLIC_ENTRIES) {
    const target = path.join(outDir, entry);
    const candidates = [
      target,
      ...COMPRESSED_SUFFIXES.map((suffix) => `${target}${suffix}`),
    ];
    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;
      fs.rmSync(candidate, { recursive: true, force: true });
      removed.push(path.relative(outDir, candidate));
    }
  }
  return removed;
}
