import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeLocalSave } from "./saveCodec";
import type { SaveData } from "@shared/schema";

const { editionMocks, dataStore } = vi.hoisted(() => ({
  editionMocks: { isCrazyGamesEdition: false },
  dataStore: new Map<string, string>(),
}));

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isCrazyGamesEdition: () => editionMocks.isCrazyGamesEdition,
    isCrazyGamesBuild: false,
  };
});

vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/crazyGames", () => ({
  initCrazyGamesSdk: vi.fn().mockResolvedValue(true),
  getCrazyGamesData: () => ({
    getItem: (key: string) => dataStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      dataStore.set(key, value);
    },
    removeItem: (key: string) => {
      dataStore.delete(key);
    },
    clear: () => dataStore.clear(),
  }),
}));

function createSave(playTime: number): SaveData {
  return {
    timestamp: 1,
    playTime,
    gameState: {
      flags: { gameStarted: true },
      playTime,
    },
  } as unknown as SaveData;
}

describe("crazyGamesSaveAdapter", () => {
  const local = new Map<string, string>();

  beforeEach(() => {
    dataStore.clear();
    local.clear();
    editionMocks.isCrazyGamesEdition = true;
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => local.set(key, value),
      removeItem: (key: string) => local.delete(key),
    });
  });

  it("no-ops when not on the CrazyGames edition", async () => {
    editionMocks.isCrazyGamesEdition = false;
    const { writeCrazyGamesCloudSave, readCrazyGamesSave } = await import(
      "./crazyGamesSaveAdapter"
    );
    await writeCrazyGamesCloudSave(encodeLocalSave(createSave(10)));
    await expect(readCrazyGamesSave()).resolves.toBeNull();
    expect(dataStore.size).toBe(0);
  });

  it("writes the encoded save to Data and localStorage", async () => {
    const { writeCrazyGamesCloudSave, readCrazyGamesSave, CRAZYGAMES_SAVE_STORAGE_KEY } =
      await import("./crazyGamesSaveAdapter");
    const save = createSave(90);
    const encoded = encodeLocalSave(save);
    await writeCrazyGamesCloudSave(encoded);

    expect(dataStore.get(CRAZYGAMES_SAVE_STORAGE_KEY)).toBe(encoded);
    expect(local.get(CRAZYGAMES_SAVE_STORAGE_KEY)).toBe(encoded);
    await expect(readCrazyGamesSave()).resolves.toMatchObject({ playTime: 90 });
  });

  it("reads localStorage when the Data module is empty", async () => {
    const { readCrazyGamesSave, CRAZYGAMES_SAVE_STORAGE_KEY } = await import(
      "./crazyGamesSaveAdapter"
    );
    local.set(CRAZYGAMES_SAVE_STORAGE_KEY, encodeLocalSave(createSave(40)));
    await expect(readCrazyGamesSave()).resolves.toMatchObject({ playTime: 40 });
  });

  it("hydrates the startup header from the Data module", async () => {
    const { prepareCrazyGamesStartup } = await import("./crazyGamesSaveAdapter");
    const { getStartupSaveHeaderKey } = await import("./saveKeys");
    const header = JSON.stringify({
      version: 1,
      gameStarted: true,
      cruelMode: false,
      musicMuted: false,
      sfxMuted: false,
      musicVolume: 1,
      sfxVolume: 1,
      devGameMode: "normal",
    });
    dataStore.set(getStartupSaveHeaderKey(), header);

    await prepareCrazyGamesStartup();
    expect(local.get(getStartupSaveHeaderKey())).toBe(header);
  });
});
