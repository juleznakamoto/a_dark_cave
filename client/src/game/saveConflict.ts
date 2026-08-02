import type { GameState, SaveData } from "@shared/schema";

/** Legacy typo key some clients persisted alongside the schema field. */
export type PlaytimeOverwriteFields = Partial<GameState> & {
  allowPlaytimeOverwrite?: boolean;
};

/**
 * True when this save is allowed to replace a cloud document that has a higher
 * playTime. Only explicit restart overwrite flags count — `isNewGame` alone must
 * not wipe cloud progress (e.g. Light Fire on another device, then login).
 */
export function shouldAllowPlaytimeOverwrite(
  state: PlaytimeOverwriteFields | null | undefined,
): boolean {
  if (!state) return false;
  return (
    state.allowPlayTimeOverwrite === true ||
    state.allowPlaytimeOverwrite === true
  );
}

/**
 * Choose which save wins when both local and cloud exist.
 *
 * Same `gameId`: higher playTime wins (progress within one run).
 * Different `gameId`:
 * - Local with explicit `allowPlayTimeOverwrite` wins (restart pending cloud sync).
 * - Else if cloud `startTime` is newer, cloud wins (restart already synced elsewhere;
 *   do not resurrect a stale longer local finished run).
 * - Else keep local only when it has more playTime; otherwise keep cloud.
 *   This blocks "fresh Light Fire on another screen → login" from zeroing cloud.
 */
export function pickPreferredSave(
  local: SaveData,
  cloud: SaveData,
): "local" | "cloud" {
  const localGameId = local.gameState?.gameId ?? "";
  const cloudGameId = cloud.gameState?.gameId ?? "";
  const cloudPlayTime = Math.floor(cloud.playTime || 0);
  const localPlayTime = Math.floor(local.playTime || 0);

  if (localGameId && cloudGameId && localGameId !== cloudGameId) {
    if (shouldAllowPlaytimeOverwrite(local.gameState)) {
      return "local";
    }

    const localStart = Number(local.gameState?.startTime) || 0;
    const cloudStart = Number(cloud.gameState?.startTime) || 0;

    // Cloud already advanced to a newer run (restart synced on another device).
    if (cloudStart > localStart) {
      return "cloud";
    }

    // Local is a newer run (other screen / guest start). Only keep it when it
    // actually outranks cloud playTime; otherwise preserve account progress.
    return localPlayTime > cloudPlayTime ? "local" : "cloud";
  }

  return localPlayTime > cloudPlayTime ? "local" : "cloud";
}

/** True when syncing `incoming` over `existing` would decrease cloud playTime or replace the run. */
export function needsPlaytimeOverwriteForSync(
  incoming: SaveData,
  existing: SaveData,
): boolean {
  const incomingId = incoming.gameState?.gameId ?? "";
  const existingId = existing.gameState?.gameId ?? "";
  if (incomingId && existingId && incomingId !== existingId) {
    return true;
  }
  return Math.floor(incoming.playTime || 0) < Math.floor(existing.playTime || 0);
}
