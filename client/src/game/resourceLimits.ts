
import { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

// Bomb resource keys (stored in resources but displayed in Combat Items section)
export const BOMB_RESOURCES = ["ember_bomb", "ashfire_bomb", "void_bomb"] as const;

/** Stored in resources, shown under Combat Items (side panel); not counted as normal stash resources */
export const COMBAT_ITEM_RESOURCES = [
  ...BOMB_RESOURCES,
  "veinfire_elixir",
] as const;

export type CombatItemResourceKey = (typeof COMBAT_ITEM_RESOURCES)[number];

export function isCombatItemResource(key: string): boolean {
  return COMBAT_ITEM_RESOURCES.includes(key as CombatItemResourceKey);
}

/** Max Veinfire Elixir the player may hold */
export function getMaxVeinfireElixirLimit(): number {
  return 10;
}

export function isVeinfireElixirResource(key: string): boolean {
  return key === "veinfire_elixir";
}

export function isVeinfireElixirAtLimit(state: GameState): boolean {
  const current = state.resources.veinfire_elixir ?? 0;
  return current >= getMaxVeinfireElixirLimit();
}

// Max bombs per type: 10 base, 20 with Grenadier's Bag (leather item for combat capacity)
export function getMaxBombLimit(state: GameState): number {
  return state.clothing?.grenadier_bag ? 20 : 10;
}

export function isBombResource(key: string): boolean {
  return BOMB_RESOURCES.includes(key as (typeof BOMB_RESOURCES)[number]);
}

export function isBombAtLimit(
  bombKey: string,
  state: GameState,
): boolean {
  if (!isBombResource(bombKey)) return false;
  const current = state.resources[bombKey as keyof typeof state.resources] ?? 0;
  return current >= getMaxBombLimit(state);
}

// Resources that are never limited
const UNLIMITED_RESOURCES = ['silver', 'gold', 'insight'];

// Get the current resource limit based on storage building level.
// IMPORTANT: Server-side validation mirrors storage tiers in
// supabase/migrations (save_game_with_analytics). Migration 042 allows
// event overcap past this limit (sanity ceiling); production stays client-capped.
// If you change storage tiers or limits here, update the SQL function too.
export function getResourceLimit(state: GameState): number {
  // Determine storage level based on highest storage building
  let storageLevel = 0;

  if (state.buildings.greatVault > 0) storageLevel = 6;
  else if (state.buildings.grandRepository > 0) storageLevel = 5;
  else if (state.buildings.villageWarehouse > 0) storageLevel = 4;
  else if (state.buildings.fortifiedStorehouse > 0) storageLevel = 3;
  else if (state.buildings.storehouse > 0) storageLevel = 2;
  else if (state.buildings.supplyHut > 0) storageLevel = 1;

  const limits: Record<number, number> = {
    0: 500,    // Initial cap for new games
    1: 1000,   // Supply Hut
    2: 2500,   // Storehouse
    3: 5000,  // Fortified Storehouse
    4: 10000,  // Village Warehouse
    5: 25000,  // Grand Repository
    6: 50000, // Great Vault
  };

  return limits[storageLevel] || 500;
}

// Check if a resource should be limited
export function isResourceLimited(resourceKey: string, state: GameState): boolean {
  return !UNLIMITED_RESOURCES.includes(resourceKey);
}

export type ConstrainResourceOptions = {
  /** Amount before this write. Used to preserve existing overcap on production/action paths. */
  previousAmount?: number;
  /**
   * When true, skip warehouse storage clamping (event rewards may exceed storage).
   * The storage limit itself is unchanged; excess is kept until spent.
   * Hard caps (Veinfire Elixir) still apply.
   */
  allowOvercap?: boolean;
};

/**
 * Hard clamp to the warehouse storage limit (and Veinfire hard cap).
 * Prefer `constrainResourceAmount` for gameplay writes so event overcap is not wiped.
 */
export function capResourceToLimit(
  resourceKey: string,
  value: number,
  state: GameState
): number {
  if (!isResourceLimited(resourceKey, state)) {
    return value;
  }

  // Veinfire Elixir hard cap applies before warehouse storage cap
  if (isVeinfireElixirResource(resourceKey)) {
    value = Math.min(value, getMaxVeinfireElixirLimit());
  }

  const limit = getResourceLimit(state);
  return Math.min(value, limit);
}

/**
 * Constrain a resource write for production, actions, or event rewards.
 * - Without `allowOvercap`: cannot gain past the storage limit; existing overcap is kept (not clamped down).
 * - With `allowOvercap`: warehouse storage limit ignored (events); Veinfire hard cap still applies.
 */
export function constrainResourceAmount(
  resourceKey: string,
  nextAmount: number,
  state: GameState,
  options?: ConstrainResourceOptions,
): number {
  let value = Math.max(0, nextAmount);

  if (!isResourceLimited(resourceKey, state)) {
    return value;
  }

  if (isVeinfireElixirResource(resourceKey)) {
    return Math.min(value, getMaxVeinfireElixirLimit());
  }

  if (options?.allowOvercap) {
    return value;
  }

  const limit = getResourceLimit(state);
  if (value <= limit) {
    return value;
  }

  const previous = options?.previousAmount;
  if (previous !== undefined && previous >= limit) {
    // Already at/over cap: allow decreases, block further gains
    return Math.min(value, previous);
  }

  return limit;
}

// Get display text for current storage capacity
export function getStorageLimitText(state: GameState): string {
  const limit = getResourceLimit(state);
  if (limit === Infinity) {
    return "Unlimited";
  }

  return formatNumber(limit);
}

// Get storage building name based on state
export function getStorageBuildingName(state: GameState): string {
  // Determine storage level based on highest storage building
  if (state.buildings.greatVault > 0) return "Great Vault";
  if (state.buildings.grandRepository > 0) return "Grand Repository";
  if (state.buildings.villageWarehouse > 0) return "Village Warehouse";
  if (state.buildings.fortifiedStorehouse > 0) return "Fortified Storehouse";
  if (state.buildings.storehouse > 0) return "Storehouse";
  if (state.buildings.supplyHut > 0) return "Supply Hut";

  return "No Storage";
}
