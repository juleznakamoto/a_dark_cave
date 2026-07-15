/**
 * Build and package the Steam **demo** desktop app.
 *
 * 1. Reads the demo App ID from `steam_appid_demo.txt` (first numeric line).
 * 2. Temporarily writes it to `steam_appid.txt` for electron-builder + Steamworks.
 * 3. Builds Vite with `VITE_STEAM_BUILD=1` + `VITE_STEAM_DEMO=1`.
 * 4. Bundles Electron with `ADC_STEAM_DEMO=1` (demo save paths / window title).
 * 5. Runs electron-builder with `electron-builder.demo.yml`.
 * 6. Restores the main-game `steam_appid.txt` when done.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const mainAppIdPath = join(root, "steam_appid.txt");
const demoAppIdPath = join(root, "steam_appid_demo.txt");

function readDemoAppId() {
  if (!existsSync(demoAppIdPath)) {
    throw new Error(
      "Missing steam_appid_demo.txt — paste the demo App ID from Steamworks (Apps → A Dark Cave Demo).",
    );
  }
  const lines = readFileSync(demoAppIdPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
  }
  throw new Error(
    "steam_appid_demo.txt has no App ID — add the numeric demo App ID on its own line.",
  );
}

function run(command, env = {}) {
  execSync(command, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

const demoAppId = readDemoAppId();
const mainAppIdBackup = existsSync(mainAppIdPath)
  ? readFileSync(mainAppIdPath, "utf-8")
  : null;

writeFileSync(mainAppIdPath, `${demoAppId}\n`, "utf-8");

try {
  // eslint-disable-next-line no-console
  console.log(`Packaging Steam demo (App ID ${demoAppId})...`);
  run("cross-env VITE_STEAM_BUILD=1 VITE_STEAM_DEMO=1 vite build");
  run("node scripts/build-electron.mjs", { ADC_STEAM_DEMO: "1" });
  run("electron-builder --win --config electron-builder.demo.yml");
} finally {
  if (mainAppIdBackup !== null) {
    writeFileSync(mainAppIdPath, mainAppIdBackup, "utf-8");
  }
}

// eslint-disable-next-line no-console
console.log("Steam demo package ready in release/");
