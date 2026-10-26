/**
 * Package one Steam desktop edition (full or demo).
 *
 * Vite and electron-builder used to share `dist/public`. Upload-all builds the
 * next edition while the previous electron-builder is still reading hashed
 * chunks, and `emptyOutDir` deletes them (ENOENT on CrazyGamesMenuLinks-*.js).
 * Each edition now writes and packs its own folders.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

function run(command, env = {}) {
  execSync(command, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function readNumericId(filePath, missingMessage, emptyMessage) {
  if (!existsSync(filePath)) throw new Error(missingMessage);
  const lines = readFileSync(filePath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
  }
  throw new Error(emptyMessage);
}

/**
 * @param {object} options
 * @param {"full" | "demo"} options.edition
 * @param {string} options.builderConfig electron-builder yml, relative to the repo
 * @param {Record<string, string>} options.viteEnv
 * @param {Record<string, string>} [options.electronEnv]
 * @param {string} options.steamAppIdText file contents for the packed steam_appid.txt
 */
export function packageSteamEdition({
  edition,
  builderConfig,
  viteEnv,
  electronEnv = {},
  steamAppIdText,
}) {
  const webDir = `dist/web-steam-${edition}`;
  const electronDir = `dist/electron-steam-${edition}`;
  const metaRel = `dist/meta-steam-${edition}`;
  const metaDir = join(root, metaRel);
  mkdirSync(metaDir, { recursive: true });
  const appIdBody = steamAppIdText.endsWith("\n")
    ? steamAppIdText
    : `${steamAppIdText}\n`;
  writeFileSync(join(metaDir, "steam_appid.txt"), appIdBody, "utf-8");

  const packConfigName = `electron-builder.pack-${edition}.yml`;
  mkdirSync(join(root, "dist"), { recursive: true });
  writeFileSync(
    join(root, "dist", packConfigName),
    [
      `extends: ${builderConfig}`,
      "files:",
      `  - from: ${webDir}`,
      "    to: dist/public",
      "    filter:",
      '      - "**/*"',
      `  - from: ${electronDir}`,
      "    to: dist-electron",
      "    filter:",
      '      - "**/*"',
      `  - from: ${metaRel}`,
      '    to: "."',
      "    filter:",
      "      - steam_appid.txt",
      "",
    ].join("\n"),
    "utf-8",
  );

  run("vite build", {
    ...viteEnv,
    ADC_WEB_OUT_DIR: webDir,
  });
  run("node scripts/build-electron.mjs", {
    ...electronEnv,
    ADC_ELECTRON_OUT_DIR: electronDir,
  });
  run(`electron-builder --win --config dist/${packConfigName}`);
}

export function readAppIdFile(filePath, missingMessage, emptyMessage) {
  return readNumericId(filePath, missingMessage, emptyMessage);
}

export function readRootSteamAppId() {
  return readAppIdFile(
    join(root, "steam_appid.txt"),
    "Missing steam_appid.txt. Add the numeric full-game App ID on its own line.",
    "steam_appid.txt has no App ID. Add the numeric App ID on its own line.",
  );
}
