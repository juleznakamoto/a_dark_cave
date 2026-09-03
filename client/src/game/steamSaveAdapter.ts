/**
 * Steam Cloud save adapter.
 *
 * IndexedDB stays the fast local copy. The Steam shell mirrors the encoded
 * (`ADC2:`) blob to an edition-specific file:
 *   full game → `%APPDATA%\A Dark Cave\adc-steam-save.dat`
 *   demo      → `%APPDATA%\A Dark Cave\adc-steam-demo-save.dat`
 * so launching the demo cannot overwrite a purchased full-game save.
 * The full game may *read* the demo file once (start-screen Continue).
 *
 * On load we prefer whichever copy (IndexedDB vs this edition's Steam file)
 * has more `playTime`. Demo-origin blobs in the full-game file are never
 * auto-adopted (old demo builds wrote the shared filename).
 */
import type { SaveData } from "@shared/schema";
import { isSteamBuild } from "@/lib/edition";
import {
  hasSteamBridge,
  steamClearSave,
  steamReadDemoSave,
  steamReadSave,
  steamWriteSave,
} from "@/lib/steam";
import { decodeLocalSave } from "./saveCodec";

/** Mirror the encoded save blob to this edition's Steam Cloud file. No-op on web. */
export async function writeSteamCloudSave(encoded: string): Promise<void> {
  if (!isSteamBuild || !hasSteamBridge()) return;
  await steamWriteSave(encoded);
}

/** Read + decode this edition's Steam Cloud save file, or null when absent / on web. */
export async function readSteamCloudSave(): Promise<SaveData | null> {
  if (!isSteamBuild || !hasSteamBridge()) return null;
  const raw = await steamReadSave();
  if (!raw) return null;
  return decodeLocalSave(raw);
}

/** Read + decode the Demo Cloud file (full game import only). */
export async function readSteamDemoCloudSave(): Promise<SaveData | null> {
  if (!isSteamBuild || !hasSteamBridge()) return null;
  const raw = await steamReadDemoSave();
  if (!raw) return null;
  return decodeLocalSave(raw);
}

/** Delete this edition's Steam Cloud file. No-op on web. */
export async function clearSteamCloudSave(): Promise<void> {
  if (!isSteamBuild || !hasSteamBridge()) return;
  await steamClearSave();
}

/**
 * Choose the more advanced of two saves by `playTime`. Used to reconcile the
 * IndexedDB copy with this edition's Steam Cloud file on load.
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

