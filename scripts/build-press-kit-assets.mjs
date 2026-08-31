/**
 * Copy the square logo, then zip client/public/press-kit.
 * Capsules, screenshots, and the gameplay trailer are authored locally.
 * Run: node scripts/build-press-kit-assets.mjs
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "client", "public", "press-kit");
const DIRS = {
  logos: join(OUT, "logos"),
  screenshots: join(OUT, "screenshots"),
  capsules: join(OUT, "capsules"),
  video: join(OUT, "video"),
};

function main() {
  for (const dir of Object.values(DIRS)) mkdirSync(dir, { recursive: true });

  copyFileSync(
    join(ROOT, "build-resources", "logo-source.png"),
    join(DIRS.logos, "a_dark_cave_logo.png"),
  );

  const trailerDest = join(DIRS.video, "a_dark_cave_gameplay_trailer.mp4");
  if (!existsSync(trailerDest)) {
    console.warn(`Missing local trailer at ${trailerDest}`);
  }

  const zipPath = join(OUT, "a_dark_cave_press_kit.zip");
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path "${OUT}\\logos","${OUT}\\screenshots","${OUT}\\capsules","${OUT}\\video" -DestinationPath "${zipPath}" -Force`,
    ],
    { stdio: "inherit" },
  );
  console.log(`Zipped ${zipPath}`);
}

main();
