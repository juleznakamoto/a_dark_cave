/**
 * Build and package the Steam demo desktop app.
 *
 * The demo App ID is packed from steam_appid_demo.txt. The repo
 * steam_appid.txt (full game) is left unchanged.
 * Output folders are per edition so upload-all cannot wipe chunks
 * that electron-builder is still reading.
 */
import { join } from "node:path";
import { packageSteamEdition, readAppIdFile } from "./package-steam-edition.mjs";

const demoAppIdPath = join(import.meta.dirname, "..", "steam_appid_demo.txt");
const demoAppId = readAppIdFile(
  demoAppIdPath,
  "Missing steam_appid_demo.txt. Paste the demo App ID from Steamworks (Apps, A Dark Cave Demo).",
  "steam_appid_demo.txt has no App ID. Add the numeric demo App ID on its own line.",
);

// eslint-disable-next-line no-console
console.log(`Packaging Steam demo (App ID ${demoAppId})...`);
packageSteamEdition({
  edition: "demo",
  builderConfig: "electron-builder.demo.yml",
  viteEnv: { VITE_STEAM_BUILD: "1", VITE_STEAM_DEMO: "1" },
  electronEnv: { ADC_STEAM_DEMO: "1" },
  steamAppIdText: `${demoAppId}\n`,
});

// eslint-disable-next-line no-console
console.log("Steam demo package ready in release/");
