/**
 * Steam Cloud save adapter.
 *
 * In the Steam build the game keeps using IndexedDB for fast local persistence,
 * but also mirrors the already-encoded (`ADC2:`) save blob to a flat file in the
 * Electron `userData` directory via the preload bridge. That file is what Steam
 * Auto-Cloud syncs across machines (configured in the Steamworks partner backend).
 *
 * On load we prefer whichever copy (IndexedDB vs Steam file) has more `playTime`,
 * so a fresh machine that only has the cloud-synced file restores correctly and
 * an up-to-date local machine is never overwritten by a stale cloud copy.
 */
import type { SaveData } from "@shared/schema";
import { isSteamBuild } from "@/lib/edition";
import { hasSteamBridge, steamReadSave, steamWriteSave } from "@/lib/steam";
import { decodeLocalSave } from "./saveCodec";

/** Mirror the encoded save blob to the Steam Cloud file. No-op on web. */
export async function writeSteamCloudSave(encoded: string): Promise<void> {
  if (!isSteamBuild || !hasSteamBridge()) return;
  await steamWriteSave(encoded);
}

/** Read + decode the Steam Cloud save file, or null when absent / on web. */
export async function readSteamCloudSave(): Promise<SaveData | null> {
  if (!isSteamBuild || !hasSteamBridge()) return null;
  const raw = await steamReadSave();
  if (!raw) return null;
  return decodeLocalSave(raw);
}

/**
 * Choose the more advanced of two saves by `playTime`. Used to reconcile the
 * IndexedDB copy with the Steam Cloud file on load.
 */
export function pickNewerSave(
  a: SaveData | undefined,
  b: SaveData | null,
): SaveData | undefined {
  if (!a) return b ?? undefined;
  if (!b) return a;
  const aTime = Math.floor(a.playTime ?? 0);
  const bTime = Math.floor(b.playTime ?? 0);
  return bTime > aTime ? b : a;
}
