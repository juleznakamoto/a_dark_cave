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

/**
 * Union of lifetime hits + current-run story.seen flags (legacy / mid-run).
 * Order matches STORAGE_MAXER_RESOURCE_KEYS.
 */
export function getLifetimeStorageMaxHits(state: GameState): string[] {
  const hits = new Set<string>(state.lifetimeStorageMaxHits ?? []);
  const seen = state.story?.seen;
  if (seen) {
    for (const key of STORAGE_MAXER_RESOURCE_KEYS) {
      if (seen[storageMaxHitSeenKey(key)]) hits.add(key);
    }
  }
  return STORAGE_MAXER_RESOURCE_KEYS.filter((key) => hits.has(key));
}

export function getResourcesReachedStorageMaxCount(state: GameState): number {
  return getLifetimeStorageMaxHits(state).length;
}

export type StorageMaxHitUpdates = {
  storySeen: Record<string, boolean>;
  lifetimeStorageMaxHits?: string[];
};

/**
 * Returns patches when resources first hit Great Vault capacity.
 * Empty when storage is not at the highest tier or nothing newly hit the cap.
 * Writes both story.seen (current run) and lifetimeStorageMaxHits (persists across restarts).
 */
export function collectStorageMaxHitUpdates(
  state: GameState,
  resources: Partial<Record<string, number>>,
): StorageMaxHitUpdates {
  if (!isMaxStorageBuilding(state)) return { storySeen: {} };

  const limit = getResourceLimit(state);
  const existing = new Set(getLifetimeStorageMaxHits(state));
  const storySeen: Record<string, boolean> = {};
  let changed = false;

  for (const key of STORAGE_MAXER_RESOURCE_KEYS) {
    if (!isResourceLimited(key, state) || isCombatItemResource(key)) continue;
    if (existing.has(key)) continue;
    const value =
      resources[key] ??
      state.resources[key as keyof GameState["resources"]] ??
      0;
    if (value >= limit) {
      existing.add(key);
      storySeen[storageMaxHitSeenKey(key)] = true;
      changed = true;
    }
  }

  if (!changed) return { storySeen: {} };

  return {
    storySeen,
    lifetimeStorageMaxHits: STORAGE_MAXER_RESOURCE_KEYS.filter((key) =>
      existing.has(key),
    ),
  };
}

/** @deprecated Prefer collectStorageMaxHitUpdates — story.seen slice only. */
export function collectStorageMaxHitSeenUpdates(
  state: GameState,
  resources: Partial<Record<string, number>>,
): Record<string, boolean> {
  return collectStorageMaxHitUpdates(state, resources).storySeen;
}
