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
    const delta = capped[resource];
    if (delta === undefined || !(delta > 0)) continue;
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

/** Total-gain column: never count overflow past storage room. */
export function getSleepTotalGainDisplay(
  resource: string,
  accumulatedDelta: number,
  initialAmount: number,
  gameState: SleepStorageState,
): number {
  const total = Math.floor(accumulatedDelta);
  if (!isResourceLimited(resource, gameState as GameState)) return total;
  if (total <= 0) return total;
  const cap = getSleepResourceStorageCap(resource, gameState);
  const maxGain = Math.max(0, Math.floor(cap - initialAmount));
  return Math.min(total, maxGain);
}
