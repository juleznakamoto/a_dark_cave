
import { GameState } from "@shared/schema";

// Resources that are never limited
const UNLIMITED_RESOURCES = ['silver', 'gold'];

// Get the current resource limit based on storage building level
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
    2: 5000,   // Storehouse
    3: 10000,  // Fortified Storehouse
    4: 25000,  // Village Warehouse
    5: 50000,  // Grand Repository
    6: 100000, // Great Vault
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
