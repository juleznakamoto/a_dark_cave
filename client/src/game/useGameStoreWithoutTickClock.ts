import { useStoreWithEqualityFn } from "zustand/traditional";
import { useGameStore } from "@/game/state";

export type GameStoreSnapshot = ReturnType<typeof useGameStore.getState>;

/** High-frequency loop writes that must not redraw gameplay panels. */
export const GAME_STORE_TICK_CLOCK_KEYS = [
  "playTime",
  "lifetimePlayTimeMs",
  "loopProgress",
  "attackWaveTimers",
] as const;

const TICK_CLOCK_KEY_SET: ReadonlySet<string> = new Set(
  GAME_STORE_TICK_CLOCK_KEYS,
);

/**
 * True when two store snapshots differ only by the 4 Hz tick-clock fields.
 * Action functions are stable; changed gameplay slices get new references.
 */
export function storeEqualsIgnoringTickClock<T extends object>(
  a: T,
  b: T,
): boolean {
  if (a === b) return true;
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  if (aKeys.length !== Object.keys(bRecord).length) return false;
  for (const key of aKeys) {
    if (TICK_CLOCK_KEY_SET.has(key)) continue;
    if (aRecord[key] !== bRecord[key]) return false;
  }
  return true;
}

/**
 * Full store for panel helpers (`shouldShowAction`, tooltips) without
 * re-rendering on playTime / loopProgress / attack-wave elapsed writes.
 * Zustand 5 `useGameStore(selector)` has no equality argument; use
 * `useStoreWithEqualityFn` from `zustand/traditional`.
 */
export function useGameStoreWithoutTickClock(): GameStoreSnapshot {
  return useStoreWithEqualityFn(
    useGameStore,
    (s) => s,
    storeEqualsIgnoringTickClock,
  );
}
