import { getBoundGameStore } from "@/game/gameStoreHolder";
import { isModalDialogOpen } from "@/game/store/dialogScheduling";
import type { GameStore } from "@/game/store/types";

/** One Great Fire level lasts 90 seconds of unpaused time. */
export const HEARTFIRE_LEVEL_DURATION_MS = 90_000;

type HeartfireClock = {
  level?: number;
  lastLevelDecrease?: number;
  /** Wall-clock ms when a blocking dialog froze the countdown. 0 while running. */
  pauseStartedAt?: number;
};

/**
 * Event, combat, reward, and other blocking dialogs pause the sim.
 * Sleep already shifts `lastLevelDecrease` on wake, so the sleep dialog
 * must not start a second pause.
 */
export function shouldFreezeHeartfireCountdown(state: GameStore): boolean {
  if (state.idleModeState?.isActive) return false;
  return isModalDialogOpen(state);
}

/** Elapsed ms toward the next level drop. Frozen while `pauseStartedAt` is set. */
export function getHeartfireElapsedMs(
  heartfire: HeartfireClock | null | undefined,
  now = Date.now(),
): number {
  const lastDecrease = heartfire?.lastLevelDecrease || 0;
  const pauseStartedAt = heartfire?.pauseStartedAt ?? 0;
  const effectiveNow = pauseStartedAt > 0 ? pauseStartedAt : now;
  return Math.max(0, effectiveNow - lastDecrease);
}

/**
 * Arm or release the Great Fire pause from the current dialog state.
 * While a dialog is open, the ring and the level drop both read `pauseStartedAt`
 * instead of the wall clock. On close, that gap is added to `lastLevelDecrease`.
 */
export function syncHeartfirePauseTracking(now = Date.now()): void {
  const store = getBoundGameStore();
  const state = store.getState() as GameStore;
  const heartfire = state.heartfireState;
  if (!heartfire) return;

  const pauseStartedAt = heartfire.pauseStartedAt ?? 0;
  const frozen = shouldFreezeHeartfireCountdown(state);

  if ((heartfire.level ?? 0) <= 0) {
    if (pauseStartedAt > 0) {
      store.setState((current) => {
        const prev = (current as GameStore).heartfireState;
        if ((prev?.pauseStartedAt ?? 0) <= 0) return {};
        return { heartfireState: { ...prev, pauseStartedAt: 0 } };
      });
    }
    return;
  }

  if (frozen) {
    if (pauseStartedAt > 0) return;
    store.setState((current) => {
      const prevStore = current as GameStore;
      const prev = prevStore.heartfireState;
      if (!prev || (prev.level ?? 0) <= 0) return {};
      if ((prev.pauseStartedAt ?? 0) > 0) return {};
      if (!shouldFreezeHeartfireCountdown(prevStore)) return {};
      return { heartfireState: { ...prev, pauseStartedAt: now } };
    });
    return;
  }

  if (pauseStartedAt <= 0) return;
  store.setState((current) => {
    const prevStore = current as GameStore;
    const prev = prevStore.heartfireState;
    const started = prev?.pauseStartedAt ?? 0;
    if (!prev || started <= 0) return {};
    if (shouldFreezeHeartfireCountdown(prevStore)) return {};
    return {
      heartfireState: {
        ...prev,
        lastLevelDecrease: (prev.lastLevelDecrease || 0) + Math.max(0, now - started),
        pauseStartedAt: 0,
      },
    };
  });
}

let watchInstalled = false;
let watchSyncing = false;

/** Freeze or resume as soon as a dialog opens or closes, without waiting for the next tick. */
export function installHeartfirePauseWatch(): void {
  if (watchInstalled) return;
  const store = getBoundGameStore();
  if (!store.subscribe) return;
  watchInstalled = true;
  store.subscribe(() => {
    if (watchSyncing) return;
    const current = store.getState() as GameStore;
    const heartfire = current.heartfireState;
    if (!heartfire || (heartfire.level ?? 0) <= 0) return;
    const frozen = shouldFreezeHeartfireCountdown(current);
    const started = heartfire.pauseStartedAt ?? 0;
    if (frozen === (started > 0)) return;
    watchSyncing = true;
    try {
      syncHeartfirePauseTracking();
    } finally {
      watchSyncing = false;
    }
  });
}
