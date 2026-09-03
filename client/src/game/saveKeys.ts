import {
  isCrazyGamesEdition,
  isGalaxyEdition,
  isSteamDemoBuild,
  isSteamPlaytestBuild,
} from "@/lib/edition";

const SAVE_KEY_MAIN = "mainSave";
const SAVE_KEY_GALAXY = "galaxySave";
const SAVE_KEY_CRAZYGAMES = "crazyGamesSave";
export const SAVE_KEY_STEAM_DEMO = "steamDemoSave";
const SAVE_KEY_STEAM_PLAYTEST = "steamPlaytestSave";

export function getSaveKey(): string {
  if (isSteamPlaytestBuild) return SAVE_KEY_STEAM_PLAYTEST;
  if (isSteamDemoBuild) return SAVE_KEY_STEAM_DEMO;
  if (isCrazyGamesEdition()) return SAVE_KEY_CRAZYGAMES;
  if (isGalaxyEdition()) return SAVE_KEY_GALAXY;
  return SAVE_KEY_MAIN;
}

export function getStartupSaveHeaderKey(): string {
  return `adc-startup-save-header:${getSaveKey()}`;
}
