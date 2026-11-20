/**
 * Build a CrazyGames HTML5 folder (Steam-demo chrome, relative asset paths).
 *
 * Output:
 * - `release/a-dark-cave-crazygames/` (playable files)
 * - `release/a-dark-cave-crazygames.zip` (`index.html` at the archive root)
 *
 * Upload the zip on developer.crazygames.com.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const distPublic = join(root, "dist", "public");
const releaseDir = join(root, "release");
const outDir = join(releaseDir, "a-dark-cave-crazygames");
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
writeCrazyGamesZip(outDir, zipPath);

console.log(`CrazyGames folder ready: ${outDir}`);
console.log(`CrazyGames zip ready: ${zipPath}`);

/** Zip the folder contents so `index.html` is at the archive root. */
function writeCrazyGamesZip(dir, destination) {
  rmSync(destination, { force: true, maxRetries: 8, retryDelay: 150 });
  execSync("tar -a -cf $env:ADC_CRAZYGAMES_ZIP *", {
    cwd: dir,
    stdio: "inherit",
    shell: "powershell.exe",
    env: { ...process.env, ADC_CRAZYGAMES_ZIP: destination },
  });
}
