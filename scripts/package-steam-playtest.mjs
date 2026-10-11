/**
 * Build and package the Steam playtest desktop app (full game, isolated saves).
 *
 * The playtest App ID is packed from steam_appid_playtest.txt. The repo
 * steam_appid.txt (full game) is left unchanged.
 * Output folders are per edition so upload-all cannot wipe chunks
 * that electron-builder is still reading.
 */
import { join } from "node:path";
import { packageSteamEdition, readAppIdFile } from "./package-steam-edition.mjs";

const playtestAppIdPath = join(
  import.meta.dirname,
  "..",
  "steam_appid_playtest.txt",
);
const playtestAppId = readAppIdFile(
  playtestAppIdPath,
  "Missing steam_appid_playtest.txt. Paste the playtest App ID from Steamworks (Apps, A Dark Cave Playtest).",
  "steam_appid_playtest.txt has no App ID. Add the numeric playtest App ID on its own line.",
);

// eslint-disable-next-line no-console
console.log(`Packaging Steam playtest (App ID ${playtestAppId})...`);
packageSteamEdition({
  edition: "playtest",
  builderConfig: "electron-builder.playtest.yml",
  viteEnv: { VITE_STEAM_BUILD: "1", VITE_STEAM_PLAYTEST: "1" },
  electronEnv: { ADC_STEAM_PLAYTEST: "1" },
  steamAppIdText: `${playtestAppId}\n`,
});

// eslint-disable-next-line no-console
console.log("Steam playtest package ready in release/");
