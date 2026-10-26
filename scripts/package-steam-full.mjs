/**
 * Build and package the Steam full-game desktop app.
 * Web and Electron output stay in dist/web-steam-full and dist/electron-steam-full
 * so a demo build cannot delete chunks this packager is reading.
 */
import { packageSteamEdition, readRootSteamAppId } from "./package-steam-edition.mjs";

const appId = readRootSteamAppId();

// eslint-disable-next-line no-console
console.log(`Packaging Steam full game (App ID ${appId})...`);
packageSteamEdition({
  edition: "full",
  builderConfig: "electron-builder.yml",
  viteEnv: { VITE_STEAM_BUILD: "1" },
  steamAppIdText: `${appId}\n`,
});

// eslint-disable-next-line no-console
console.log("Steam package ready in release/");
