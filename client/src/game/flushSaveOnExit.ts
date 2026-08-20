/**
 * Flush the live game to disk when the player leaves.
 *
 * Steam: Electron asks the renderer to save, waits for an ack, then quits.
 * CrazyGames / Galaxy / web: `pagehide` is best-effort only (no exit API;
 * the iframe or tab can disappear before IndexedDB finishes).
 */
import { logger } from "@/lib/logger";
import {
  steamNotifyQuitSaveComplete,
  steamOnWillQuit,
} from "@/lib/steam";

let uninstall: (() => void) | null = null;
let flushInFlight: Promise<void> | null = null;

function hasLiveGameToFlush(state: {
  flags?: { gameStarted?: boolean };
  isGameLoopActive?: boolean;
}): boolean {
  return state.flags?.gameStarted === true || state.isGameLoopActive === true;
}

async function flushLiveGame(): Promise<void> {
  const { useGameStore } = await import("./state");
  const state = useGameStore.getState();
  if (!hasLiveGameToFlush(state)) return;

  const { saveGame } = await import("./save");
  const { buildGameState } = await import("./stateHelpers");
  await saveGame(buildGameState(state), false, { force: true });
}

function flushLiveGameOnce(): Promise<void> {
  if (!flushInFlight) {
    flushInFlight = flushLiveGame()
      .catch((error) => {
        logger.warn("[SAVE] Exit flush failed:", error);
      })
      .finally(() => {
        flushInFlight = null;
      });
  }
  return flushInFlight;
}

/** True when a started game is in memory and should be written on quit. */
export function shouldFlushLiveGameOnExit(state: {
  flags?: { gameStarted?: boolean };
  isGameLoopActive?: boolean;
}): boolean {
  return hasLiveGameToFlush(state);
}

export function installFlushSaveOnExit(): () => void {
  if (uninstall) return uninstall;

  const onPageHide = () => {
    void flushLiveGameOnce();
  };
  window.addEventListener("pagehide", onPageHide);

  const stopWillQuit = steamOnWillQuit(() => {
    void flushLiveGameOnce().finally(() => {
      steamNotifyQuitSaveComplete();
    });
  });

  uninstall = () => {
    window.removeEventListener("pagehide", onPageHide);
    stopWillQuit?.();
    uninstall = null;
  };
  return uninstall;
}
