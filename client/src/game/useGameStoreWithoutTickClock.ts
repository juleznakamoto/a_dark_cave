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

/**
 * Remaining-time writes from `tickCooldowns`. Panels only need to know which
 * actions are cooling, not the 0.25s remaining. CooldownButton still
 * subscribes to the per-action number.
 */
export const GAME_STORE_COOLDOWN_CLOCK_KEYS = [
  "cooldowns",
  "initialCooldowns",
] as const;

const TICK_CLOCK_KEY_SET: ReadonlySet<string> = new Set(
  GAME_STORE_TICK_CLOCK_KEYS,
);
const COOLDOWN_CLOCK_KEY_SET: ReadonlySet<string> = new Set(
  GAME_STORE_COOLDOWN_CLOCK_KEYS,
);

/** True when the same action ids have a remaining cooldown above zero. */
export function cooldownActiveSetEqual(
  a: unknown,
  b: unknown,
): boolean {
  if (a === b) return true;
  const aRec = (a ?? {}) as Record<string, number>;
  const bRec = (b ?? {}) as Record<string, number>;
  let aActive = 0;
  for (const key in aRec) {
    if ((aRec[key] ?? 0) > 0) aActive += 1;
  }
  let bActive = 0;
  for (const key in bRec) {
    if ((bRec[key] ?? 0) > 0) bActive += 1;
  }
  if (aActive !== bActive) return false;
  for (const key in aRec) {
    if ((aRec[key] ?? 0) > 0 && (bRec[key] ?? 0) <= 0) return false;
  }
  return true;
}

/**
 * True when two store snapshots differ only by the 4 Hz tick-clock fields
 * or in-flight cooldown remaining time. Action functions are stable;
 * changed gameplay slices get new references.
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
    if (COOLDOWN_CLOCK_KEY_SET.has(key)) {
      if (!cooldownActiveSetEqual(aRecord[key], bRecord[key])) return false;
      continue;
    }
    if (aRecord[key] !== bRecord[key]) return false;
  }
  return true;
}

/**
 * Full store for panel helpers (`shouldShowAction`, tooltips) without
 * re-rendering on playTime / loopProgress / attack-wave elapsed writes
 * or cooldown remaining-time ticks (Prior / crafts stay assigned).
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
