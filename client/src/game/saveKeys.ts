import {
  isCrazyGamesEdition,
  isGalaxyEdition,
  isItchEdition,
  isSteamDemoBuild,
} from "@/lib/edition";

const SAVE_KEY_MAIN = "mainSave";
const SAVE_KEY_GALAXY = "galaxySave";
const SAVE_KEY_CRAZYGAMES = "crazyGamesSave";
const SAVE_KEY_ITCH = "itchSave";
export const SAVE_KEY_STEAM_DEMO = "steamDemoSave";

export function getSaveKey(): string {
  if (isSteamDemoBuild) return SAVE_KEY_STEAM_DEMO;
  if (isItchEdition()) return SAVE_KEY_ITCH;
  if (isCrazyGamesEdition()) return SAVE_KEY_CRAZYGAMES;
  if (isGalaxyEdition()) return SAVE_KEY_GALAXY;
  return SAVE_KEY_MAIN;
}

export function getStartupSaveHeaderKey(): string {
  return `adc-startup-save-header:${getSaveKey()}`;
}
