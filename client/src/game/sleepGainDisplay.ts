import type { GameState } from "@shared/schema";
import { capResourceToLimit, isResourceLimited } from "@/game/resourceLimits";

/** Minimal state needed for sleep storage-cap math (compatible with GameStore). */
export type SleepStorageState = Pick<GameState, "buildings" | "clothing">;

/** Effective storage cap for a sleep-simulated resource (warehouse / veinfire / etc.). */
export function getSleepResourceStorageCap(
  resource: string,
  gameState: SleepStorageState,
): number {
  const state = gameState as GameState;
  if (!isResourceLimited(resource, state)) return Number.POSITIVE_INFINITY;
  return capResourceToLimit(resource, Number.MAX_SAFE_INTEGER, state);
}

export function isSleepResourceAtStorageMax(
  resource: string,
  amount: number,
  gameState: SleepStorageState,
): boolean {
  if (!isResourceLimited(resource, gameState as GameState)) return false;
  return amount >= getSleepResourceStorageCap(resource, gameState);
}

/**
 * Cap positive sleep deltas so total gain never exceeds remaining storage room.
 * Losses (negative deltas) are unchanged.
 */
export function capSleepGainDeltasToStorageRoom(
  deltas: Record<string, number>,
  initialResources: Record<string, number>,
  gameState: SleepStorageState,
): Record<string, number> {
  const capped: Record<string, number> = { ...deltas };
  for (const resource of Object.keys(capped)) {
    const delta = tidySleepAmount(capped[resource] ?? 0);
    capped[resource] = delta;
    if (!(delta > 0)) continue;
    if (!isResourceLimited(resource, gameState as GameState)) continue;
    const cap = getSleepResourceStorageCap(resource, gameState);
    const initial = initialResources[resource] || 0;
    const maxGain = Math.max(0, cap - initial);
    if (delta > maxGain) {
      capped[resource] = maxGain;
    }
  }
  return capped;
}

/**
 * Snap to hundredths. Sleep intensity steps by 5%, so a cycle rate lands on
 * 0.05. Snapping also keeps a repeated 0.2 from drifting off 1.
 */
export function tidySleepAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

/**
 * Whole units that count toward stores. The fraction stays banked until it
 * reaches 1 in either direction.
 */
export function sleepWholeUnits(amount: number): number {
  const whole = Math.trunc(tidySleepAmount(amount));
  return whole === 0 ? 0 : whole;
}

export type SleepDecimalParts = {
  negative: boolean;
  whole: number;
  /** Includes the dot, e.g. ".2", ".25", or ".0". */
  fraction: string;
};

/** Split a sleep amount so the fractional part can render apart from the whole units. */
export function splitSleepDecimal(amount: number): SleepDecimalParts {
  const tidied = tidySleepAmount(amount);
  const negative = tidied < 0;
  const abs = Math.abs(tidied);
  const whole = Math.trunc(abs);
  const hundredths = Math.round((abs - whole) * 100);
  const fraction =
    hundredths % 10 === 0
      ? `.${hundredths / 10}`
      : `.${String(hundredths).padStart(2, "0")}`;
  return { negative, whole, fraction };
}

/** Total-gain column: never count overflow past storage room. Keeps the fraction. */
export function getSleepTotalGainDisplay(
  resource: string,
  accumulatedDelta: number,
  initialAmount: number,
  gameState: SleepStorageState,
): number {
  const total = tidySleepAmount(accumulatedDelta);
  if (!isResourceLimited(resource, gameState as GameState)) return total;
  if (total <= 0) return total;
  const cap = getSleepResourceStorageCap(resource, gameState);
  const maxGain = Math.max(0, tidySleepAmount(cap - initialAmount));
  return Math.min(total, maxGain);
}
