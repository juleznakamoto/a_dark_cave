import { describe, it, expect } from "vitest";
import type { GameState, SaveData } from "@shared/schema";
import {
  LOCAL_SAVE_PREFIX,
  encodeLocalSave,
  encodeLocalGameState,
  decodeLocalSave,
  decodeLocalGameState,
  isObfuscatedLocalPayload,
} from "./saveCodec";

const minimalSaveData = (): SaveData => ({
  gameState: {
    resources: { wood: 42, gold: 7 },
    playTime: 60_000,
    cooldownDurations: {},
  } as GameState,
  timestamp: 1_700_000_000_000,
  playTime: 60_000,
});

describe("saveCodec", () => {
  it("round-trips SaveData through XOR obfuscation", () => {
    const original = minimalSaveData();
    const encoded = encodeLocalSave(original);
    expect(encoded.startsWith(LOCAL_SAVE_PREFIX)).toBe(true);
    expect(encoded).not.toContain('"gold"');

    const decoded = decodeLocalSave(encoded);
    expect(decoded).toEqual(original);
  });

  it("round-trips GameState for lastCloudState", () => {
    const state = minimalSaveData().gameState;
    const encoded = encodeLocalGameState(state);
    expect(isObfuscatedLocalPayload(encoded)).toBe(true);

    const decoded = decodeLocalGameState(encoded);
    expect(decoded?.resources?.wood).toBe(42);
    expect(decoded?.playTime).toBe(60_000);
  });

  it("reads legacy plain SaveData objects", () => {
    const legacy = minimalSaveData();
    expect(decodeLocalSave(legacy)).toEqual(legacy);
    expect(isObfuscatedLocalPayload(legacy)).toBe(false);
  });

  it("reads legacy plain GameState objects", () => {
    const legacy = minimalSaveData().gameState;
    expect(decodeLocalGameState(legacy)).toEqual(legacy);
  });

  it("returns null for invalid or unknown payloads", () => {
    expect(decodeLocalSave(null)).toBeNull();
    expect(decodeLocalSave("not-a-save")).toBeNull();
    expect(decodeLocalSave("ADC1:deadbeef")).toBeNull();
    expect(decodeLocalSave(`${LOCAL_SAVE_PREFIX}!!!`)).toBeNull();
    expect(decodeLocalGameState(123)).toBeNull();
  });

  it("preserves unicode and nested structures", () => {
    const data: SaveData = {
      ...minimalSaveData(),
      gameState: {
        ...minimalSaveData().gameState,
        log: [
          {
            id: "1",
            timestamp: 1,
            message: "Cave dweller — welcome",
            type: "system",
          },
        ],
      } as GameState,
    };

    const decoded = decodeLocalSave(encodeLocalSave(data));
    expect(decoded?.gameState.log?.[0]?.message).toBe("Cave dweller — welcome");
  });
});
