import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaveData } from "@shared/schema";
import { encodeLocalSave } from "./saveCodec";
import {
  createStartupSaveHeader,
  readStartupSaveHeader,
  readStartupSaveHeaderResult,
  writeStartupSaveHeader,
} from "./startupSaveHeader";

const { mockGet, mockOpenDB, editionMocks, mockReadCgSave } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockOpenDB: vi.fn(),
  editionMocks: { isCrazyGamesEdition: false },
  mockReadCgSave: vi.fn(),
}));

vi.mock("idb", () => ({
  openDB: mockOpenDB,
}));

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isCrazyGamesEdition: () => editionMocks.isCrazyGamesEdition,
  };
});

vi.mock("./crazyGamesSaveAdapter", () => ({
  writeCrazyGamesHeaderJson: vi.fn(),
  readCrazyGamesHeaderJson: vi.fn(() => null),
  readCrazyGamesSave: mockReadCgSave,
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
    mockReadCgSave.mockReset();
    mockReadCgSave.mockResolvedValue(null);
    editionMocks.isCrazyGamesEdition = false;
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

  it("keeps the header when IndexedDB is empty but CrazyGames has a save", async () => {
    editionMocks.isCrazyGamesEdition = true;
    writeStartupSaveHeader(createSave());
    mockGet.mockResolvedValue(undefined);
    mockReadCgSave.mockResolvedValue(createSave());

    await expect(readStartupSaveHeader()).resolves.toMatchObject({
      gameStarted: true,
    });
    expect(storage.size).toBe(1);
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

  it("distinguishes an IndexedDB failure from a missing save", async () => {
    mockGet.mockRejectedValue(new Error("IndexedDB unavailable"));

    await expect(readStartupSaveHeaderResult()).resolves.toMatchObject({
      status: "error",
      retryable: true,
    });
    await expect(readStartupSaveHeader()).rejects.toThrow(
      "IndexedDB unavailable",
    );
  });

  it("reports a corrupt existing save instead of treating it as missing", async () => {
    mockGet.mockResolvedValue("not-a-valid-save");

    await expect(readStartupSaveHeaderResult()).resolves.toMatchObject({
      status: "error",
      retryable: false,
    });
  });

  it("uses the CrazyGames save when IndexedDB is empty", async () => {
    editionMocks.isCrazyGamesEdition = true;
    mockGet.mockResolvedValue(undefined);
    mockReadCgSave.mockResolvedValue(createSave());

    await expect(readStartupSaveHeader()).resolves.toMatchObject({
      gameStarted: true,
      cruelMode: true,
    });
    expect(storage.size).toBe(1);
  });

  it("treats IndexedDB failure as missing when CrazyGames has no save", async () => {
    editionMocks.isCrazyGamesEdition = true;
    mockOpenDB.mockRejectedValue(new Error("IndexedDB unavailable"));
    mockReadCgSave.mockResolvedValue(null);

    await expect(readStartupSaveHeader()).resolves.toBeNull();
  });
});
