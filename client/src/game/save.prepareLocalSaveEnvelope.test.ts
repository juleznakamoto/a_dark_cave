import { describe, it, expect, vi } from "vitest";
import type { GameState } from "@shared/schema";
import {
  prepareLocalSaveEnvelope,
  saveGame,
} from "./save";
import {
  decodeLocalSave,
  encodeLocalSave,
  encodeLocalSaveJson,
} from "./saveCodec";

const { mockPut, mockOpenDB } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockOpenDB: vi.fn(),
}));

vi.mock("idb", () => ({
  openDB: mockOpenDB,
}));

vi.mock("./auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
  getCurrentUserForLoad: vi.fn().mockResolvedValue(null),
  saveGameToSupabase: vi.fn(),
  loadGameFromSupabase: vi.fn(),
  processReferralAfterConfirmation: vi.fn(),
  flushPendingReferralToUserMetadata: vi.fn(),
}));

vi.mock("./state", () => ({
  useGameStore: {
    getState: vi.fn(() => ({
      inactivityDialogOpen: false,
      getAndResetClickAnalytics: vi.fn(),
      getAndResetResourceAnalytics: vi.fn(),
    })),
    setState: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function sampleState(overrides: Partial<GameState> = {}): GameState {
  return {
    resources: { wood: 11, stone: 22, gold: 33, food: 44 },
    buildings: { hut: 2 },
    items: {},
    cooldowns: { gatherWood: 1500 },
    cooldownDurations: { gatherWood: 5000 },
    log: [
      {
        id: "log-1",
        timestamp: 99,
        message: "The fire holds",
        type: "system",
      },
    ],
    flags: { gameStarted: true, hasLitFire: true },
    story: { seen: { fireLit: true }, merchantPurchases: 0, heavySleeperHours: 0 },
    playTime: 90_000,
    isNewGame: false,
    startTime: 1_700_000_000_000,
    ...overrides,
  } as GameState;
}

describe("prepareLocalSaveEnvelope", () => {
  it("stringifies the envelope once and encode reuses that JSON", () => {
    const stringifySpy = vi.spyOn(JSON, "stringify");
    const { json, data } = prepareLocalSaveEnvelope(sampleState());
    expect(stringifySpy).toHaveBeenCalledTimes(1);
    expect(stringifySpy.mock.results[0]?.value).toBe(json);
    stringifySpy.mockRestore();

    const decoded = decodeLocalSave(encodeLocalSaveJson(json));
    expect(decoded).toEqual(data);
    expect(decoded?.gameState.resources?.wood).toBe(11);
    expect(decoded?.gameState.log?.[0]?.message).toBe("The fire holds");
    expect(decoded?.playTime).toBe(90_000);
  });

  it("round-trips the same payload as encodeLocalSave of the parsed clone", () => {
    const { json, data } = prepareLocalSaveEnvelope(sampleState());
    expect(decodeLocalSave(encodeLocalSaveJson(json))).toEqual(
      decodeLocalSave(encodeLocalSave(data)),
    );
  });

  it("stamps lastSaved, clientBuildSha, and default cooldownDurations", () => {
    const { data } = prepareLocalSaveEnvelope(
      sampleState({ cooldownDurations: undefined }),
    );
    expect(data.gameState.lastSaved).toEqual(expect.any(Number));
    expect(data.timestamp).toBe(data.gameState.lastSaved);
    expect(typeof data.gameState.clientBuildSha).toBe("string");
    expect(data.gameState.cooldownDurations).toEqual({});
  });

  it("zeros playTime when restart overwrite is allowed", () => {
    const { data } = prepareLocalSaveEnvelope(
      sampleState({ allowPlayTimeOverwrite: true, playTime: 12_000 }),
    );
    expect(data.playTime).toBe(0);
    expect(data.gameState.playTime).toBe(0);
  });

  it("omits functions and undefined keys so load cannot see them", () => {
    const dirty = sampleState({
      resources: { wood: 5, extra: undefined },
    } as Partial<GameState>);
    (dirty as GameState & { onTick?: () => void }).onTick = () => undefined;

    const { json, data } = prepareLocalSaveEnvelope(dirty);
    expect(json).not.toContain("onTick");
    expect(data.gameState).not.toHaveProperty("onTick");
    expect(JSON.parse(json).gameState.resources).not.toHaveProperty("extra");
  });
});

describe("saveGame stringify-once local write", () => {
  it("writes an ADC2 blob that decodes back to the prepared envelope", async () => {
    mockPut.mockImplementation(async () => undefined);
    mockOpenDB.mockResolvedValue({
      put: mockPut,
      get: vi.fn(),
      delete: vi.fn(),
    });

    const state = sampleState();
    await saveGame(state, true);

    const mainSaveCall = mockPut.mock.calls.find(
      (call: unknown[]) => call[0] === "saves",
    );
    expect(mainSaveCall).toBeDefined();
    const decoded = decodeLocalSave(mainSaveCall![1]);
    expect(decoded?.gameState.resources?.wood).toBe(11);
    expect(decoded?.gameState.story?.seen?.fireLit).toBe(true);
    expect(decoded?.gameState.log?.[0]?.message).toBe("The fire holds");
    expect(decoded?.playTime).toBe(90_000);
    expect(typeof decoded?.gameState.lastSaved).toBe("number");
  });
});
