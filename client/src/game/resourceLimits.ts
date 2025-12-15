import { GameState } from "@shared/schema";

// Resources that are never limited
const UNLIMITED_RESOURCES = ['silver', 'gold'];

// Get the current resource limit based on storage building level
export function getResourceLimit(state: GameState): number {
  // Feature flag check - if not enabled, return unlimited
  if (!state.flags?.resourceLimitsEnabled) {
    return Infinity;
  }

  const storageLevel = state.buildings.storage || 0;

  const limits: Record<number, number> = {
    0: 500,    // Initial cap for new games
    1: 1000,   // Supply Hut
    2: 5000,   // Storehouse
    3: 10000,  // Fortified Storehouse
    4: 25000,  // Village Warehouse
    5: 50000,  // Grand Repository
    6: 100000, // City Vault
  };

  return limits[storageLevel] || 500;
}

// Check if a resource should be limited
export function isResourceLimited(resourceKey: string, state: GameState): boolean {
  if (!state.flags?.resourceLimitsEnabled) {
    return false;
  }
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
  if (!state.flags?.resourceLimitsEnabled) {
    return "Unlimited";
  }

  const limit = getResourceLimit(state);
  if (limit === Infinity) {
    return "Unlimited";
  }

  return limit.toLocaleString();
}

// Get storage building name based on level
export function getStorageBuildingName(state: GameState): string {
  if (!state.flags?.resourceLimitsEnabled) {
    return "Unlimited Storage";
  }

  // Determine storage level based on highest storage building
  if (state.buildings.cityVault > 0) return "City Vault";
  if (state.buildings.grandRepository > 0) return "Grand Repository";
  if (state.buildings.villageWarehouse > 0) return "Village Warehouse";
  if (state.buildings.fortifiedStorehouse > 0) return "Fortified Storehouse";
  if (state.buildings.storehouse > 0) return "Storehouse";
  if (state.buildings.supplyHut > 0) return "Supply Hut";

  return "No Storage";
}