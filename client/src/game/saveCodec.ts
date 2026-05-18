import type { GameState, SaveData } from "@shared/schema";

/** Obfuscated local IndexedDB payload (XOR + Base64). */
export const LOCAL_SAVE_PREFIX = "ADC2:";

const OBFUSCATION_KEY = "ADarkCave-local-save-v1";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getKeyBytes(): Uint8Array {
  return textEncoder.encode(OBFUSCATION_KEY);
}

function xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i % key.length];
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeJsonPayload(json: string): string {
  const bytes = textEncoder.encode(json);
  const xored = xorBytes(bytes, getKeyBytes());
  return LOCAL_SAVE_PREFIX + bytesToBase64(xored);
}

function decodeJsonPayload(raw: string): unknown {
  const xored = base64ToBytes(raw.slice(LOCAL_SAVE_PREFIX.length));
  const bytes = xorBytes(xored, getKeyBytes());
  return JSON.parse(textDecoder.decode(bytes));
}

function isLegacySaveData(raw: unknown): raw is SaveData {
  return (
    raw !== null &&
    typeof raw === "object" &&
    "gameState" in raw &&
    (raw as SaveData).gameState !== null &&
    typeof (raw as SaveData).gameState === "object"
  );
}

function isLegacyGameState(raw: unknown): raw is GameState {
  if (raw === null || typeof raw !== "object" || "gameState" in raw) {
    return false;
  }
  const o = raw as Record<string, unknown>;
  return (
    "resources" in o ||
    "playTime" in o ||
    "flags" in o ||
    "buildings" in o
  );
}

export function encodeLocalSave(data: SaveData): string {
  return encodeJsonPayload(JSON.stringify(data));
}

export function encodeLocalGameState(state: GameState): string {
  return encodeJsonPayload(JSON.stringify(state));
}

export function decodeLocalSave(raw: unknown): SaveData | null {
  if (isLegacySaveData(raw)) {
    return raw;
  }
  if (typeof raw !== "string" || !raw.startsWith(LOCAL_SAVE_PREFIX)) {
    return null;
  }
  try {
    return decodeJsonPayload(raw) as SaveData;
  } catch {
    return null;
  }
}

export function decodeLocalGameState(raw: unknown): GameState | null {
  if (isLegacyGameState(raw)) {
    return raw;
  }
  if (typeof raw !== "string" || !raw.startsWith(LOCAL_SAVE_PREFIX)) {
    return null;
  }
  try {
    return decodeJsonPayload(raw) as GameState;
  } catch {
    return null;
  }
}

/** True when stored value is obfuscated (not legacy plain object). */
export function isObfuscatedLocalPayload(raw: unknown): boolean {
  return typeof raw === "string" && raw.startsWith(LOCAL_SAVE_PREFIX);
}
