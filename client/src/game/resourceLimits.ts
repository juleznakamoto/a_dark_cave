
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
    0: 0,      // No storage = no resources allowed
    1: 1000,   // Supply Hut
    2: 5000,   // Storehouse
    3: 10000,  // Fortified Storehouse
    4: 25000,  // Village Warehouse
    5: 50000,  // Grand Repository
    6: 100000, // City Vault
  };

  return limits[storageLevel] || 0;
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
  return Math.min(value, limit);
}

// Get display text for current storage capacity
export function getStorageLimitText(state: GameState): string {
  if (!state.flags?.resourceLimitsEnabled) {
    return "Unlimited";
  }

  const limit = getResourceLimit(state);
  if (limit === 0) {
    return "No Storage";
  }
  if (limit === Infinity) {
    return "Unlimited";
  }
  
  return limit.toLocaleString();
}

// Get storage building name based on level
export function getStorageBuildingName(level: number): string {
  const names: Record<number, string> = {
    0: "No Storage",
    1: "Supply Hut",
    2: "Storehouse",
    3: "Fortified Storehouse",
    4: "Village Warehouse",
    5: "Grand Repository",
    6: "City Vault",
  };
  
  return names[level] || "Unknown";
}
