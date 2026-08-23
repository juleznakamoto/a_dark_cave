import { useStoreWithEqualityFn } from "zustand/traditional";
import type { GameState } from "@shared/schema";
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
 * True when two lists of plain objects match by key/value (new array
 * identity from helpers does not force a re-render).
 */
export function derivedListEqual<T extends object>(
  a: readonly T[],
  b: readonly T[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i] as Record<string, unknown>;
    const right = b[i] as Record<string, unknown>;
    if (left === right) continue;
    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length) return false;
    for (const key of keys) {
      if (left[key] !== right[key]) return false;
    }
  }
  return true;
}

/**
 * Subscribe to a derived helper result. Helpers may still take GameState
 * inside the selector; the component only re-renders when the result
 * changes (`Object.is`, or a custom equality fn for new-array returns).
 */
export function useDerivedGameState<T>(
  selector: (state: GameState) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
): T {
  return useStoreWithEqualityFn(
    useGameStore,
    (s) => selector(s as unknown as GameState),
    equalityFn,
  );
}

/**
 * Full store for panel helpers (`shouldShowAction`, tooltips) without
 * re-rendering on playTime / loopProgress / attack-wave elapsed writes
 * or cooldown remaining-time ticks (Prior / crafts stay assigned).
 * Prefer `useDerivedGameState` when the UI only needs a boolean, cost,
 * or similar helper result. Zustand 5 `useGameStore(selector)` has no
 * equality argument; use `useStoreWithEqualityFn` from `zustand/traditional`.
 */
export function useGameStoreWithoutTickClock(): GameStoreSnapshot {
  return useStoreWithEqualityFn(
    useGameStore,
    (s) => s,
    storeEqualsIgnoringTickClock,
  );
}
