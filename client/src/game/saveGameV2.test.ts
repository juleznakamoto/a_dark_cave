import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRpc, mockGetSession, mockGetSupabaseClient } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockGetSession = vi.fn();
  const mockGetSupabaseClient = vi.fn();
  return { mockRpc, mockGetSession, mockGetSupabaseClient };
});

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  dualWriteSaveGameV2,
  isSaveGameV2CloudEnabled,
  isSaveGameV2RichEnabled,
  SAVE_SCHEMA_VERSION_V2,
} from "./saveGameV2";
import { logger } from "@/lib/logger";

describe("dualWriteSaveGameV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSupabaseClient.mockResolvedValue({
      auth: { getSession: mockGetSession },
      rpc: mockRpc,
    });
  });

  it("enables thin dual-write by default; rich path only in Vite DEV", () => {
    // Vitest runs with import.meta.env.DEV === true
    expect(isSaveGameV2CloudEnabled()).toBe(true);
    expect(isSaveGameV2RichEnabled()).toBe(true);
  });

  it("no-ops without a session and never throws", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(
      dualWriteSaveGameV2({ playTime: 1000 } as any),
    ).resolves.toBeUndefined();

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("writes full state + analytics via save_game_state_v2 RPC in DEV (rich)", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const state = {
      playTime: 12_345.7,
      tools: { stone_axe: true },
      resources: { wood: 10 },
    };

    await dualWriteSaveGameV2(state as any, {
      clickAnalytics: { gather_wood: 3 },
      resourceAnalytics: { wood: 10 },
      clearAnalytics: false,
      allowPlaytimeOverwrite: true,
    });

    expect(mockRpc).toHaveBeenCalledWith("save_game_state_v2", {
      p_game_state: expect.objectContaining({
        playTime: 12_345.7,
        tools: { stone_axe: true },
      }),
      p_schema_version: SAVE_SCHEMA_VERSION_V2,
      p_click_analytics: { gather_wood: 3 },
      p_resource_analytics: { wood: 10 },
      p_clear_analytics: false,
      p_allow_playtime_overwrite: true,
    });
  });

  it("omits empty analytics objects on rich path", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });
    mockRpc.mockResolvedValue({ data: null, error: null });

    await dualWriteSaveGameV2({ playTime: 1 } as any, {
      clickAnalytics: {},
      resourceAnalytics: {},
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "save_game_state_v2",
      expect.objectContaining({
        p_click_analytics: null,
        p_resource_analytics: null,
        p_clear_analytics: false,
        p_allow_playtime_overwrite: false,
      }),
    );
  });

  it("swallows RPC errors so legacy save is unaffected", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "function missing" },
    });

    await expect(
      dualWriteSaveGameV2({ playTime: 1, tools: {} } as any),
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalled();
  });

  it("swallows unexpected exceptions", async () => {
    mockGetSupabaseClient.mockRejectedValue(new Error("network down"));

    await expect(
      dualWriteSaveGameV2({ playTime: 1 } as any),
    ).resolves.toBeUndefined();
  });
});
