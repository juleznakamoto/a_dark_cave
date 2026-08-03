import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaveData } from "@shared/schema";
import { encodeLocalSave } from "./saveCodec";
import {
  createStartupSaveHeader,
  readStartupSaveHeader,
  writeStartupSaveHeader,
} from "./startupSaveHeader";

const { mockGet, mockOpenDB } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockOpenDB: vi.fn(),
}));

vi.mock("idb", () => ({
  openDB: mockOpenDB,
}));

function createSave(): SaveData {
  return {
    timestamp: 123,
    playTime: 456,
    gameState: {
      flags: { gameStarted: true },
      cruelMode: true,
      musicMuted: true,
      sfxMuted: false,
      musicVolume: 0.4,
      sfxVolume: 0.7,
      devGameMode: "steamDemo",
    },
  } as unknown as SaveData;
}

describe("startup save header", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    mockGet.mockReset();
    mockOpenDB.mockReset();
    mockOpenDB.mockResolvedValue({ get: mockGet });
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
  });

  it("extracts only startup routing and preference fields", () => {
    expect(createStartupSaveHeader(createSave())).toEqual({
      version: 1,
      gameStarted: true,
      cruelMode: true,
      musicMuted: true,
      sfxMuted: false,
      musicVolume: 0.4,
      sfxVolume: 0.7,
      devGameMode: "steamDemo",
    });
  });

  it("infers a started game from legacy progress evidence", () => {
    const save = createSave() as SaveData & {
      gameState: SaveData["gameState"] & {
        story: { seen: { fireLit: boolean } };
      };
    };
    save.playTime = 0;
    save.gameState.playTime = 0;
    save.gameState.flags.gameStarted = false;
    save.gameState.story = { seen: { fireLit: true } };

    expect(createStartupSaveHeader(save).gameStarted).toBe(true);
  });

  it("uses the small localStorage header after confirming its save exists", async () => {
    const save = createSave();
    writeStartupSaveHeader(save);
    mockGet.mockResolvedValue(encodeLocalSave(save));

    await expect(readStartupSaveHeader()).resolves.toMatchObject({
      gameStarted: true,
      cruelMode: true,
    });
    expect(mockOpenDB).toHaveBeenCalledOnce();
  });

  it("clears a stale header when its IndexedDB save was deleted", async () => {
    writeStartupSaveHeader(createSave());
    mockGet.mockResolvedValue(undefined);

    await expect(readStartupSaveHeader()).resolves.toBeNull();
    expect(storage.size).toBe(0);
  });

  it("backfills the header from an existing encoded IndexedDB save", async () => {
    mockGet.mockResolvedValue(encodeLocalSave(createSave()));

    await expect(readStartupSaveHeader()).resolves.toMatchObject({
      gameStarted: true,
      musicVolume: 0.4,
    });
    expect(mockOpenDB).toHaveBeenCalledOnce();
    expect(storage.size).toBe(1);
  });
});
