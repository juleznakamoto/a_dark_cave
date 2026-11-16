/**
 * iOS save file. IndexedDB stays the fast local copy. The App Store build
 * also writes the encoded (`ADC2:`) blob to the app sandbox so a WebView
 * storage wipe does not drop the only copy.
 *
 * No-op outside `VITE_IOS_BUILD=1`.
 */
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { logger } from "@/lib/logger";
import type { SaveData } from "@shared/schema";
import { isIosBuild } from "@/lib/edition";
import { decodeLocalSave } from "./saveCodec";

export const IOS_SAVE_FILE = "adc-ios-save.dat";

function isMissingFile(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not found|does not exist|NSFileNoSuchFile/i.test(message);
}

/** Mirror the encoded save blob into the app sandbox. No-op off iOS. */
export async function writeIosSaveFile(encoded: string): Promise<void> {
  if (!isIosBuild) return;
  try {
    await Filesystem.writeFile({
      path: IOS_SAVE_FILE,
      data: encoded,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  } catch (error) {
    logger.warn("[SAVE] iOS file mirror failed:", error);
  }
}

/** Read and decode the sandbox save, or null when absent / off iOS. */
export async function readIosSaveFile(): Promise<SaveData | null> {
  if (!isIosBuild) return null;
  try {
    const result = await Filesystem.readFile({
      path: IOS_SAVE_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    const raw = typeof result.data === "string" ? result.data : null;
    if (!raw) return null;
    return decodeLocalSave(raw);
  } catch (error) {
    if (!isMissingFile(error)) {
      logger.warn("[SAVE] iOS file read failed:", error);
    }
    return null;
  }
}

/** Delete the sandbox save. No-op off iOS and when the file is already gone. */
export async function clearIosSaveFile(): Promise<void> {
  if (!isIosBuild) return;
  try {
    await Filesystem.deleteFile({
      path: IOS_SAVE_FILE,
      directory: Directory.Data,
    });
  } catch (error) {
    if (!isMissingFile(error)) {
      logger.warn("[SAVE] iOS file delete failed:", error);
    }
  }
}
