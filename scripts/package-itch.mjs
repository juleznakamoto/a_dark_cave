/**
 * Build an itch.io HTML5 demo folder (relative asset paths, no portal SDK).
 *
 * Output:
 * - `release/a-dark-cave-itch/` (playable files)
 * - `release/a-dark-cave-itch.zip` (`index.html` at the archive root)
 *
 * itch.io allows 1000 zip entries, counting folders. Precompressed `.br` / `.gz`
 * siblings from the Vite compression plugin are omitted; itch serves the raw files.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const distPublic = join(root, "dist", "public");
const releaseDir = join(root, "release");
const outDir = join(releaseDir, "a-dark-cave-itch");
const zipPath = join(releaseDir, "a-dark-cave-itch.zip");

function run(command, env = {}) {
  execSync(command, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

console.log("Building itch.io demo (VITE_ITCH=1, relative base)...");
run("cross-env VITE_ITCH=1 vite build");

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
stripPrecompressed(outDir);
writeItchZip(outDir, zipPath);

console.log(`itch.io folder ready: ${outDir}`);
console.log(`itch.io zip ready: ${zipPath}`);

/** Drop Vite's precompressed copies. The client never requests them. */
function stripPrecompressed(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      stripPrecompressed(full);
      continue;
    }
    if (entry.name.endsWith(".br") || entry.name.endsWith(".gz")) {
      rmSync(full);
    }
  }
}

/** Zip the folder contents so `index.html` is at the archive root. */
function writeItchZip(dir, destination) {
  rmSync(destination, { force: true });
  execSync("tar -a -cf $env:ADC_ITCH_ZIP *", {
    cwd: dir,
    stdio: "inherit",
    shell: "powershell.exe",
    env: { ...process.env, ADC_ITCH_ZIP: destination },
  });
}
