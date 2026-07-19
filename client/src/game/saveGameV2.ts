import type { GameState } from "@shared/schema";
import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";

/** Schema version stamped on game_state_v2 dual-writes. Bump when V2 envelope shape changes. */
export const SAVE_SCHEMA_VERSION_V2 = 1;

/**
 * Sidecar dual-write of the full blob to `game_saves.game_state_v2`.
 * On by default in all builds (load still uses legacy `game_state`).
 * Kill switch: `VITE_SAVE_GAME_V2_CLOUD=0`.
 * Requires migration 028 on the target DB.
 */
export function isSaveGameV2CloudEnabled(): boolean {
  return import.meta.env.VITE_SAVE_GAME_V2_CLOUD !== "0";
}

/**
 * Rich V2 path (analytics, playTime OCC, completion, anti-cheat via migration 029).
 * DEV-only until cutover; SQL also no-ops unless `app_config.environment=development`.
 */
export function isSaveGameV2RichEnabled(): boolean {
  return import.meta.env.DEV === true && isSaveGameV2CloudEnabled();
}

export type SaveGameV2CloudOptions = {
  clickAnalytics?: Record<string, number> | null;
  resourceAnalytics?: Record<string, number> | null;
  clearAnalytics?: boolean;
  allowPlaytimeOverwrite?: boolean;
};

/**
 * Best-effort sidecar write of the full game state to `game_saves.game_state_v2`.
 * Thin path (PROD): full blob only — matches migration 028 signature.
 * Rich path (DEV): blob + OCC/analytics — matches migration 029.
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

    const rich = isSaveGameV2RichEnabled();
    const rpcArgs: Record<string, unknown> = {
      p_game_state: sanitized,
      p_schema_version: SAVE_SCHEMA_VERSION_V2,
    };

    if (rich) {
      const clickAnalytics =
        options.clickAnalytics && Object.keys(options.clickAnalytics).length > 0
          ? options.clickAnalytics
          : null;
      const resourceAnalytics =
        options.resourceAnalytics &&
          Object.keys(options.resourceAnalytics).length > 0
          ? options.resourceAnalytics
          : null;
      rpcArgs.p_click_analytics = clickAnalytics;
      rpcArgs.p_resource_analytics = resourceAnalytics;
      rpcArgs.p_clear_analytics = options.clearAnalytics === true;
      rpcArgs.p_allow_playtime_overwrite =
        options.allowPlaytimeOverwrite === true;
    }

    const { error } = await supabase.rpc("save_game_state_v2", rpcArgs);

    if (error) {
      logger.warn("[SAVE V2] dual-write failed (ignored):", error.message ?? error);
      return;
    }

    logger.log("[SAVE V2] ✅ dual-write ok", {
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      playTime: Math.floor(Number(sanitized.playTime) || 0),
      rich,
      hasClickAnalytics: rich && !!rpcArgs.p_click_analytics,
      hasResourceAnalytics: rich && !!rpcArgs.p_resource_analytics,
      clearAnalytics: rich && options.clearAnalytics === true,
      allowOverwrite: rich && options.allowPlaytimeOverwrite === true,
    });
  } catch (error) {
    logger.warn("[SAVE V2] dual-write failed (ignored):", error);
  }
}
