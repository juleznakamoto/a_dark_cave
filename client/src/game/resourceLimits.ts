
import { GameState } from "@shared/schema";

// Bomb resource keys (stored in resources but displayed in weapons section)
export const BOMB_RESOURCES = ["ember_bomb", "ashfire_bomb", "void_bomb"] as const;

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
const UNLIMITED_RESOURCES = ['silver', 'gold'];

// Get the current resource limit based on storage building level.
// IMPORTANT: Server-side validation mirrors this logic in
// supabase/migrations/001_supabase-setup.sql (save_game_with_analytics).
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

// Cap a resource value to the current limit
export function capResourceToLimit(
  resourceKey: string,
  value: number,
  state: GameState
): number {
  if (!isResourceLimited(resourceKey, state)) {
    return value;
  }

  const limit = getResourceLimit(state);
  const cappedValue = Math.min(value, limit);

  return cappedValue;
}

// Get display text for current storage capacity
export function getStorageLimitText(state: GameState): string {
  const limit = getResourceLimit(state);
  if (limit === Infinity) {
    return "Unlimited";
  }

  return limit.toLocaleString();
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
