import type { GameState, SaveData } from "@shared/schema";

/** Legacy typo key some clients persisted alongside the schema field. */
export type PlaytimeOverwriteFields = Partial<GameState> & {
  allowPlaytimeOverwrite?: boolean;
};

/**
 * True when this save is allowed to replace a cloud document that has a higher
 * playTime (new game / explicit restart overwrite).
 */
export function shouldAllowPlaytimeOverwrite(
  state: PlaytimeOverwriteFields | null | undefined,
): boolean {
  if (!state) return false;
  return (
    state.allowPlayTimeOverwrite === true ||
    state.allowPlaytimeOverwrite === true ||
    state.isNewGame === true
  );
}

/**
 * Choose which save wins when both local and cloud exist.
 *
 * Same `gameId`: higher playTime wins (progress within one run).
 * Different `gameId`: newer `startTime` wins so a restart is not overwritten by
 * a longer finished run still sitting on cloud (or a stale local tab).
 */
export function pickPreferredSave(
  local: SaveData,
  cloud: SaveData,
): "local" | "cloud" {
  const localGameId = local.gameState?.gameId ?? "";
  const cloudGameId = cloud.gameState?.gameId ?? "";

  if (localGameId && cloudGameId && localGameId !== cloudGameId) {
    const localStart = Number(local.gameState?.startTime) || 0;
    const cloudStart = Number(cloud.gameState?.startTime) || 0;
    if (localStart !== cloudStart) {
      return localStart > cloudStart ? "local" : "cloud";
    }
    return (local.timestamp || 0) >= (cloud.timestamp || 0) ? "local" : "cloud";
  }

  const cloudPlayTime = Math.floor(cloud.playTime || 0);
  const localPlayTime = Math.floor(local.playTime || 0);
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
