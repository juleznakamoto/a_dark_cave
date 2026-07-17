import type { GameState } from "@shared/schema";
import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";

/** Schema version stamped on game_state_v2 dual-writes. Bump when V2 envelope shape changes. */
export const SAVE_SCHEMA_VERSION_V2 = 1;

/**
 * Best-effort sidecar write of the full game state to `game_saves.game_state_v2`.
 * Must never throw — legacy save/load must be unaffected if this fails.
 */
export async function dualWriteSaveGameV2(
  fullGameState: GameState,
): Promise<void> {
  try {
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

    const { error } = await supabase.rpc("save_game_state_v2", {
      p_game_state: sanitized,
      p_schema_version: SAVE_SCHEMA_VERSION_V2,
    });

    if (error) {
      logger.warn("[SAVE V2] dual-write failed (ignored):", error.message ?? error);
      return;
    }

    logger.log("[SAVE V2] ✅ dual-write ok", {
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      playTime: Math.floor(Number(sanitized.playTime) || 0),
    });
  } catch (error) {
    logger.warn("[SAVE V2] dual-write failed (ignored):", error);
  }
}
