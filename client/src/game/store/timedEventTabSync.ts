import { getBoundGameStore } from "@/game/gameStoreHolder";
import { shouldFreezeTimedEventTabCountdown } from "./dialogScheduling";
import type { GameStore } from "./types";

/**
 * Updates `timedEventTab.pauseAccumMs` / `pauseStartedAt` from game pause, blocking
 * modals, and a backgrounded tab. Call before reading effective remaining time
 * (panel timer, clearExpiredTimedEventTab).
 *
 * Uses gameStoreHolder (not createGameStore) so action slices can import this
 * without a circular dependency.
 */
export function syncTimedEventTabPauseTracking(): void {
  const store = getBoundGameStore();
  const state = store.getState() as GameStore;
  const tab = state.timedEventTab;
  if (!tab.isActive || !tab.expiryTime) return;

  const frozen = shouldFreezeTimedEventTabCountdown(state);
  const pauseStartedAt = tab.pauseStartedAt ?? 0;
  const now = Date.now();

  if (frozen) {
    if (pauseStartedAt === 0) {
      store.setState((s) => {
        const prev = s as GameStore;
        return {
          timedEventTab: {
            ...prev.timedEventTab,
            pauseAccumMs: prev.timedEventTab.pauseAccumMs ?? 0,
            pauseStartedAt: now,
          },
        };
      });
    }
  } else if (pauseStartedAt > 0) {
    const added = now - pauseStartedAt;
    store.setState((s) => {
      const prev = s as GameStore;
      return {
        timedEventTab: {
          ...prev.timedEventTab,
          pauseAccumMs: (prev.timedEventTab.pauseAccumMs ?? 0) + added,
          pauseStartedAt: 0,
        },
      };
    });
  }
}

/** Effective ms left on the timed tab after pause extension; null if tab inactive. */
export function getTimedEventTabEffectiveRemainingMs(state: GameStore): number | null {
  const tab = state.timedEventTab;
  if (!tab.isActive || !tab.expiryTime) return null;
  const pauseAccumMs = tab.pauseAccumMs ?? 0;
  const pauseStartedAt = tab.pauseStartedAt ?? 0;
  if (pauseStartedAt > 0) {
    return Math.max(0, tab.expiryTime + pauseAccumMs - pauseStartedAt);
  }
  return Math.max(0, tab.expiryTime + pauseAccumMs - Date.now());
}
