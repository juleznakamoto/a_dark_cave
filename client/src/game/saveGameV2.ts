import type { GameState } from "@shared/schema";
import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";

/** Schema version stamped on game_state_v2 dual-writes. Bump when V2 envelope shape changes. */
export const SAVE_SCHEMA_VERSION_V2 = 1;

/**
 * Rich V2 cloud dual-write is DEV-only (Vite `import.meta.env.DEV`).
 * Production builds never call it; SQL also no-ops unless app_config.environment=development.
 */
export function isSaveGameV2CloudEnabled(): boolean {
  return import.meta.env.DEV === true;
}

export type SaveGameV2CloudOptions = {
  clickAnalytics?: Record<string, number> | null;
  resourceAnalytics?: Record<string, number> | null;
  clearAnalytics?: boolean;
  allowPlaytimeOverwrite?: boolean;
};

/**
 * Best-effort sidecar write of the full game state to `game_saves.game_state_v2`.
 * DEV-only rich path: playTime OCC, anti-cheat (prod DB only), completion stats, analytics.
 * Must never throw — legacy save/load must be unaffected if this fails.
 */
export async function dualWriteSaveGameV2(
  fullGameState: GameState,
  options: SaveGameV2CloudOptions = {},
): Promise<void> {
  try {
    if (!isSaveGameV2CloudEnabled()) {
      return;
    }

    const supabase = await getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return;
    }

    let sanitized: Record<string, unknown>;
    try {
      sanitized = JSON.parse(JSON.stringify(fullGameState)) as Record<
        string,
        unknown
      >;
    } catch (serializeError) {
      logger.warn(
        "[SAVE V2] dual-write skipped — serialize failed:",
        serializeError,
      );
      return;
    }

    if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
      return;
    }
    if (Object.keys(sanitized).length === 0) {
      return;
    }

    const clickAnalytics =
      options.clickAnalytics && Object.keys(options.clickAnalytics).length > 0
        ? options.clickAnalytics
        : null;
    const resourceAnalytics =
      options.resourceAnalytics &&
        Object.keys(options.resourceAnalytics).length > 0
        ? options.resourceAnalytics
        : null;

    const { error } = await supabase.rpc("save_game_state_v2", {
      p_game_state: sanitized,
      p_schema_version: SAVE_SCHEMA_VERSION_V2,
      p_click_analytics: clickAnalytics,
      p_resource_analytics: resourceAnalytics,
      p_clear_analytics: options.clearAnalytics === true,
      p_allow_playtime_overwrite: options.allowPlaytimeOverwrite === true,
    });

    if (error) {
      logger.warn("[SAVE V2] dual-write failed (ignored):", error.message ?? error);
      return;
    }

    logger.log("[SAVE V2] ✅ dual-write ok", {
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      playTime: Math.floor(Number(sanitized.playTime) || 0),
      hasClickAnalytics: !!clickAnalytics,
      hasResourceAnalytics: !!resourceAnalytics,
      clearAnalytics: options.clearAnalytics === true,
      allowOverwrite: options.allowPlaytimeOverwrite === true,
    });
  } catch (error) {
    logger.warn("[SAVE V2] dual-write failed (ignored):", error);
  }
}
