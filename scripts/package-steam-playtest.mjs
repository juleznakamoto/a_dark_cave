/**
 * Build and package the Steam **playtest** desktop app (full game, isolated saves).
 *
 * 1. Reads the playtest App ID from `steam_appid_playtest.txt`.
 * 2. Temporarily writes it to `steam_appid.txt` for electron-builder + Steamworks.
 * 3. Builds Vite with `VITE_STEAM_BUILD=1` + `VITE_STEAM_PLAYTEST=1`.
 * 4. Bundles Electron with `ADC_STEAM_PLAYTEST=1` (playtest save paths / window title).
 * 5. Runs electron-builder with `electron-builder.playtest.yml`.
 * 6. Restores the main-game `steam_appid.txt` when done.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const mainAppIdPath = join(root, "steam_appid.txt");
const playtestAppIdPath = join(root, "steam_appid_playtest.txt");

function readPlaytestAppId() {
  if (!existsSync(playtestAppIdPath)) {
    throw new Error(
      "Missing steam_appid_playtest.txt — paste the playtest App ID from Steamworks (Apps → A Dark Cave Playtest).",
    );
  }
  const lines = readFileSync(playtestAppIdPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
  }
  throw new Error(
    "steam_appid_playtest.txt has no App ID — add the numeric playtest App ID on its own line.",
  );
}

function run(command, env = {}) {
  execSync(command, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

const playtestAppId = readPlaytestAppId();
const mainAppIdBackup = existsSync(mainAppIdPath)
  ? readFileSync(mainAppIdPath, "utf-8")
  : null;

writeFileSync(mainAppIdPath, `${playtestAppId}\n`, "utf-8");

try {
  // eslint-disable-next-line no-console
  console.log(`Packaging Steam playtest (App ID ${playtestAppId})...`);
  run("cross-env VITE_STEAM_BUILD=1 VITE_STEAM_PLAYTEST=1 vite build");
  run("node scripts/build-electron.mjs", { ADC_STEAM_PLAYTEST: "1" });
  run("electron-builder --win --config electron-builder.playtest.yml");
} finally {
  if (mainAppIdBackup !== null) {
    writeFileSync(mainAppIdPath, mainAppIdBackup, "utf-8");
  }
}

// eslint-disable-next-line no-console
console.log("Steam playtest package ready in release/");
