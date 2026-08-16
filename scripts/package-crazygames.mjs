/**
 * Build a CrazyGames HTML5 zip (Steam-demo chrome, relative asset paths).
 *
 * Output: `release/a-dark-cave-crazygames.zip` (contents of `dist/public`,
 * not the folder itself). Upload that zip on developer.crazygames.com.
 */
import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const distPublic = join(root, "dist", "public");
const releaseDir = join(root, "release");
const zipPath = join(releaseDir, "a-dark-cave-crazygames.zip");

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
rmSync(zipPath, { force: true });

const zipCommand =
  process.platform === "win32"
    ? `powershell -NoProfile -Command "Compress-Archive -Path '${distPublic.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`
    : `zip -r "${zipPath}" .`;

if (process.platform === "win32") {
  run(zipCommand);
} else {
  execSync(zipCommand, {
    cwd: distPublic,
    stdio: "inherit",
  });
}

console.log(`CrazyGames zip ready: ${zipPath}`);
