/**
 * Full Steam game: detect a Demo save once, then Continue (copy into the
 * full-game slot) or Start New (leave the Demo file alone).
 *
 * Lives outside the game-loop dialog registry. The prompt is on the start
 * screen before the sim runs.
 */
import type { GameState, SaveData } from "@shared/schema";
import {
  isSteamBuild,
  isSteamFullBuild,
  getDevGameModeOverride,
} from "@/lib/edition";
import { logger } from "@/lib/logger";
import { decodeLocalSave } from "./saveCodec";
import { SAVE_KEY_STEAM_DEMO } from "./saveKeys";
import { getGameSaveDatabase } from "./saveStorage";
import {
  clearSteamCloudSave,
  readSteamCloudSave,
  readSteamDemoCloudSave,
} from "./steamSaveAdapter";

export const STEAM_DEMO_CONTINUE_RESOLVED_KEY =
  "adc-steam-demo-continue-resolved";

export function isStartedSave(save: SaveData | null | undefined): boolean {
  if (!save) return false;
  const state = save.gameState;
  if (state?.flags?.gameStarted === true) return true;
  if (state?.story?.seen && "fireLit" in (state.story.seen as object)) {
    if ((state.story.seen as { fireLit?: boolean }).fireLit === true) {
      return true;
    }
  }
  const playTime = Math.floor(save.playTime ?? state?.playTime ?? 0);
  return playTime > 0;
}

export function isSteamDemoOriginSave(
  save: SaveData | null | undefined,
): boolean {
  return save?.gameState?.saveOriginEdition === "steam-demo";
}

/**
 * Full game must not silently load a Demo blob from the old shared filename.
 * Demo / playtest still reconcile their own file against IndexedDB.
 */
export function shouldAdoptSteamCloudSave(
  local: SaveData | undefined,
  cloud: SaveData,
  isFullBuild: boolean = isSteamFullBuild,
): boolean {
  if (!isFullBuild) return true;
  if (isSteamDemoOriginSave(cloud)) return false;
  if (local) return true;
  return cloud.gameState?.saveOriginEdition === "steam-full";
}

export function isSteamDemoContinueResolved(): boolean {
  try {
    return localStorage.getItem(STEAM_DEMO_CONTINUE_RESOLVED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSteamDemoContinueResolved(): void {
  try {
    localStorage.setItem(STEAM_DEMO_CONTINUE_RESOLVED_KEY, "1");
  } catch {
    // Private mode: the imported / new full save still carries the flag.
  }
}

export function applySteamDemoContinueMarks(state: GameState): GameState {
  return {
    ...state,
    originatedFromSteamDemo: true,
    steamDemoContinueResolved: true,
  };
}

export function applySteamDemoStartNewMarks(state: GameState): GameState {
  return {
    ...state,
    steamDemoContinueResolved: true,
  };
}

export function shouldOfferSteamDemoContinue(input: {
  resolved: boolean;
  fullLocal: SaveData | undefined;
  fullCloud: SaveData | null;
  demoSave: SaveData | null;
  forceDevPreview?: boolean;
}): { offer: boolean; candidate: SaveData | null } {
  if (input.forceDevPreview) {
    return {
      offer: true,
      candidate: pickDemoContinueCandidate(input),
    };
  }
  if (input.resolved) {
    return { offer: false, candidate: null };
  }
  if (isStartedSave(input.fullLocal) && !isSteamDemoOriginSave(input.fullLocal)) {
    return { offer: false, candidate: null };
  }
  const candidate = pickDemoContinueCandidate(input);
  return { offer: candidate !== null, candidate };
}

function pickDemoContinueCandidate(input: {
  fullCloud: SaveData | null;
  demoSave: SaveData | null;
}): SaveData | null {
  if (isStartedSave(input.demoSave)) return input.demoSave;
  if (!isStartedSave(input.fullCloud)) return null;
  if (isSteamDemoOriginSave(input.fullCloud)) return input.fullCloud;
  if (!input.fullCloud?.gameState?.saveOriginEdition) return input.fullCloud;
  return null;
}

export function isDevDemoContinueDialogForced(
  location: { search?: string } = typeof window !== "undefined"
    ? window.location
    : {},
): boolean {
  if (!import.meta.env.DEV) return false;
  const search = location.search ?? "";
  return new URLSearchParams(search).get("devDemoContinueDialog") === "1";
}

function canOfferOnThisEdition(): boolean {
  if (isSteamFullBuild) return true;
  return (
    import.meta.env.DEV &&
    !isSteamBuild &&
    getDevGameModeOverride() === "steamGame"
  );
}

async function readIndexedDbSave(key: string): Promise<SaveData | undefined> {
  try {
    const db = await getGameSaveDatabase();
    const raw = await db.get("saves", key);
    return decodeLocalSave(raw) ?? undefined;
  } catch (error) {
    logger.warn("[STEAM] Failed to peek IndexedDB save", key, error);
    return undefined;
  }
}

async function readDevDemoIndexedDbSave(): Promise<SaveData | null> {
  if (!import.meta.env.DEV || isSteamBuild) return null;
  return (await readIndexedDbSave(SAVE_KEY_STEAM_DEMO)) ?? null;
}

/**
 * Peek Demo + full slots and decide whether the start screen should ask.
 * Does not hydrate the game store.
 */
export async function peekSteamDemoContinueOffer(location?: {
  search?: string;
}): Promise<{
  offer: boolean;
  candidate: SaveData | null;
  leftoverFullCloud: SaveData | null;
}> {
  const forceDevPreview = isDevDemoContinueDialogForced(location);
  if (!canOfferOnThisEdition() && !forceDevPreview) {
    return { offer: false, candidate: null, leftoverFullCloud: null };
  }

  const { getSaveKey } = await import("./saveKeys");
  const fullLocal = await readIndexedDbSave(getSaveKey());
  const fullCloud = isSteamBuild ? await readSteamCloudSave() : null;
  const demoSave = isSteamBuild
    ? await readSteamDemoCloudSave()
    : await readDevDemoIndexedDbSave();

  const leftoverFullCloud =
    fullCloud &&
      (isSteamDemoOriginSave(fullCloud) ||
        !fullCloud.gameState?.saveOriginEdition)
      ? fullCloud
      : null;

  return {
    ...shouldOfferSteamDemoContinue({
      resolved:
        isSteamDemoContinueResolved() ||
        fullLocal?.gameState?.steamDemoContinueResolved === true ||
        fullCloud?.gameState?.steamDemoContinueResolved === true,
      fullLocal,
      fullCloud,
      demoSave,
      forceDevPreview,
    }),
    leftoverFullCloud,
  };
}

/** Copy the Demo save into the full-game slot and remember the choice. */
export async function importSteamDemoSaveToFullGame(
  candidate: SaveData,
): Promise<void> {
  const { writeImportedLocalSave } = await import("./save");
  const marked = applySteamDemoContinueMarks(candidate.gameState);
  await writeImportedLocalSave({
    ...candidate,
    gameState: marked,
    playTime: candidate.playTime ?? marked.playTime ?? 0,
  });
  markSteamDemoContinueResolved();
}

/**
 * Keep the Demo file. Remember the choice. Drop a leftover Demo blob that old
 * demo builds wrote into the full-game Cloud filename.
 */
export async function declineSteamDemoContinue(
  leftoverFullCloud: SaveData | null,
  options?: { persistDecision?: boolean },
): Promise<void> {
  if (options?.persistDecision !== false) {
    markSteamDemoContinueResolved();
  }
  if (
    leftoverFullCloud &&
    (isSteamDemoOriginSave(leftoverFullCloud) ||
      !leftoverFullCloud.gameState?.saveOriginEdition)
  ) {
    await clearSteamCloudSave();
  }
}
