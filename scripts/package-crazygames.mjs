/**
 * Build a CrazyGames HTML5 folder (Steam-demo chrome, relative asset paths).
 *
 * Output: `release/a-dark-cave-crazygames/` (contents of `dist/public`,
 * not a zip). Upload that folder on developer.crazygames.com.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const distPublic = join(root, "dist", "public");
const releaseDir = join(root, "release");
const outDir = join(releaseDir, "a-dark-cave-crazygames");
const legacyZipPath = join(releaseDir, "a-dark-cave-crazygames.zip");

function run(command, env = {}) {
  execSync(command, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

console.log("Building CrazyGames demo (VITE_CRAZYGAMES=1, relative base)...");
run("cross-env VITE_CRAZYGAMES=1 vite build");

mkdirSync(releaseDir, { recursive: true });
rmSync(legacyZipPath, { force: true });
// Windows EPERM: Explorer / Cursor often hold the output folder itself.
// Wipe children instead of deleting the directory, then copy over it.
if (existsSync(outDir)) {
  for (const entry of readdirSync(outDir)) {
    rmSync(join(outDir, entry), {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 150,
    });
  }
} else {
  mkdirSync(outDir, { recursive: true });
}
cpSync(distPublic, outDir, { recursive: true });

console.log(`CrazyGames folder ready: ${outDir}`);
