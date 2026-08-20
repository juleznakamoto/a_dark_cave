/**
 * Flush the live game to disk when the player leaves.
 *
 * Steam: Electron asks the renderer to save, waits for an ack, then quits.
 * CrazyGames / Galaxy / web: `pagehide` is best-effort only (no exit API;
 * the iframe or tab can disappear before IndexedDB finishes).
 *
 * Steam exit is one write only: after the handshake flush settles we lock and
 * drop `pagehide` before acking. A start-screen no-op must not take that lock,
 * or a later live quit would skip `saveGame`.
 */
import { logger } from "@/lib/logger";
import {
  steamNotifyQuitSaveComplete,
  steamOnWillQuit,
} from "@/lib/steam";

let uninstall: (() => void) | null = null;
let flushInFlight: Promise<void> | null = null;
/**
 * Set only after the Steam quit handshake flush settles. A start-screen
 * pagehide is a no-op and must not block a later live save.
 */
let exitFlushLocked = false;

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
  if (flushInFlight) return flushInFlight;
  if (exitFlushLocked) return Promise.resolve();

  flushInFlight = flushLiveGame()
    .catch((error) => {
      logger.warn("[SAVE] Exit flush failed:", error);
    })
    .finally(() => {
      flushInFlight = null;
    });
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

  let stopWillQuit: (() => void) | undefined;
  const detachExitListeners = () => {
    window.removeEventListener("pagehide", onPageHide);
    stopWillQuit?.();
    stopWillQuit = undefined;
  };

  stopWillQuit = steamOnWillQuit(() => {
    void flushLiveGameOnce().finally(() => {
      // One Steam handshake write only. Lock + drop pagehide before ack so
      // window teardown cannot start a second saveGame.
      exitFlushLocked = true;
      detachExitListeners();
      steamNotifyQuitSaveComplete();
    });
  });

  uninstall = () => {
    detachExitListeners();
    flushInFlight = null;
    exitFlushLocked = false;
    uninstall = null;
  };
  return uninstall;
}
