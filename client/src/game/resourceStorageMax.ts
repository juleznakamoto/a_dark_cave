import type { GameState } from "@shared/schema";
import {
  getResourceLimit,
  isCombatItemResource,
  isResourceLimited,
} from "./resourceLimits";

/**
 * Warehouse-capped resources that count toward Resource Maxer.
 * Excludes unlimited currencies and combat items (hard caps below warehouse max).
 */
export const STORAGE_MAXER_RESOURCE_KEYS = [
  "wood",
  "stone",
  "food",
  "veinroot",
  "bones",
  "fur",
  "leather",
  "bone_totem",
  "leather_totem",
  "iron",
  "coal",
  "sulfur",
  "obsidian",
  "adamant",
  "steel",
  "blacksteel",
  "moonstone",
  "black_powder",
  "ashfire_dust",
  "torch",
] as const;

export type StorageMaxerResourceKey =
  (typeof STORAGE_MAXER_RESOURCE_KEYS)[number];

export function isMaxStorageBuilding(state: GameState): boolean {
  return (state.buildings?.greatVault ?? 0) > 0;
}

export function storageMaxHitSeenKey(resource: string): string {
  return `storageMaxHit_${resource}`;
}

export function getStorageMaxerResourceTotal(): number {
  return STORAGE_MAXER_RESOURCE_KEYS.length;
}

export function getResourcesReachedStorageMaxCount(state: GameState): number {
  const seen = state.story?.seen;
  if (!seen) return 0;
  let count = 0;
  for (const key of STORAGE_MAXER_RESOURCE_KEYS) {
    if (seen[storageMaxHitSeenKey(key)]) count += 1;
  }
  return count;
}

/**
 * Returns story.seen flags to merge when resources first hit Great Vault capacity.
 * Empty when storage is not at the highest tier or nothing newly hit the cap.
 */
export function collectStorageMaxHitSeenUpdates(
  state: GameState,
  resources: Partial<Record<string, number>>,
): Record<string, boolean> {
  if (!isMaxStorageBuilding(state)) return {};

  const limit = getResourceLimit(state);
  const updates: Record<string, boolean> = {};

  for (const key of STORAGE_MAXER_RESOURCE_KEYS) {
    if (!isResourceLimited(key, state) || isCombatItemResource(key)) continue;
    const seenKey = storageMaxHitSeenKey(key);
    if (state.story?.seen?.[seenKey]) continue;
    const value =
      resources[key] ??
      state.resources[key as keyof GameState["resources"]] ??
      0;
    if (value >= limit) {
      updates[seenKey] = true;
    }
  }

  return updates;
}
