/**
 * Server-side save game validation logic.
 *
 * This TypeScript module mirrors the resource manipulation prevention checks
 * implemented in the SQL function `save_game_with_analytics` in
 * supabase/migrations/001_supabase-setup.sql.
 *
 * If you change validation rules here, update the SQL function too (and vice versa).
 * Storage limits mirror client/src/game/resourceLimits.ts.
 */

/** Minimal shape of a game state for validation purposes (JSONB on the server). */
export interface SaveGameState {
  resources?: Record<string, number>;
  buildings?: Record<string, number>;
  activatedPurchases?: Record<string, boolean>;
  claimedAchievements?: string[];
  [key: string]: unknown;
}

/**
 * Storage building hierarchy and their limits.
 * Mirrors client/src/game/resourceLimits.ts – keep in sync.
 */
const STORAGE_BUILDINGS: { key: string; limit: number }[] = [
  { key: 'greatVault', limit: 50000 },
  { key: 'grandRepository', limit: 25000 },
  { key: 'villageWarehouse', limit: 10000 },
  { key: 'fortifiedStorehouse', limit: 5000 },
  { key: 'storehouse', limit: 2500 },
  { key: 'supplyHut', limit: 1000 },
];

const DEFAULT_RESOURCE_LIMIT = 500;

/** Resources that are not subject to storage caps. */
const UNLIMITED_RESOURCES = ['gold', 'silver'];

/** Maximum silver increase per save (unless claimedAchievements changed). */
export const MAX_SILVER_DELTA = 5000;

/** Maximum gold increase per save (unless activatedPurchases changed). */
export const MAX_GOLD_DELTA = 1500;

/**
 * Determine the storage resource limit from the buildings in the merged state.
 */
export function getStorageLimit(buildings: Record<string, number> | undefined): number {
  if (!buildings) return DEFAULT_RESOURCE_LIMIT;

  for (const { key, limit } of STORAGE_BUILDINGS) {
    if ((buildings[key] ?? 0) > 0) return limit;
  }

  return DEFAULT_RESOURCE_LIMIT;
}

export interface ValidationError {
  code: 'RESOURCE_OVER_STORAGE_LIMIT' | 'SILVER_DELTA_EXCEEDED' | 'GOLD_DELTA_EXCEEDED';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a save game diff against the existing state.
 *
 * @param existingState  The current server-side game state (before merge).
 * @param mergedState    The state after applying the diff (existingState merged with diff).
 * @param diff           The raw diff sent by the client (used to check which top-level keys changed).
 * @param allowPlaytimeOverwrite  If true, skip validation (game restart scenario).
 */
export function validateSaveGame(
  existingState: SaveGameState | null,
  mergedState: SaveGameState,
  diff: Partial<SaveGameState>,
  allowPlaytimeOverwrite = false,
): ValidationResult {
  const errors: ValidationError[] = [];

  // Skip validation when there's no existing state (first save) or on game restart
  if (existingState === null || allowPlaytimeOverwrite) {
    return { valid: true, errors: [] };
  }

  const storageLimit = getStorageLimit(mergedState.buildings);

  // 1) Validate limited resources against storage cap
  if (mergedState.resources) {
    for (const [key, value] of Object.entries(mergedState.resources)) {
      if (UNLIMITED_RESOURCES.includes(key)) continue;
      if ((value ?? 0) > storageLimit) {
        errors.push({
          code: 'RESOURCE_OVER_STORAGE_LIMIT',
          message: `${key} (${value}) exceeds storage limit (${storageLimit})`,
        });
      }
    }
  }

  // 2) Validate silver delta: max +5000 per save, unless claimedAchievements changed
  const oldSilver = existingState.resources?.silver ?? 0;
  const newSilver = mergedState.resources?.silver ?? 0;
  const silverDelta = newSilver - oldSilver;
  const claimedAchievementsChanged = 'claimedAchievements' in diff;

  if (silverDelta > MAX_SILVER_DELTA && !claimedAchievementsChanged) {
    errors.push({
      code: 'SILVER_DELTA_EXCEEDED',
      message: `silver increase (${silverDelta}) exceeds maximum of ${MAX_SILVER_DELTA} per save`,
    });
  }

  // 3) Validate gold delta: max +1500 per save, unless activatedPurchases changed
  const oldGold = existingState.resources?.gold ?? 0;
  const newGold = mergedState.resources?.gold ?? 0;
  const goldDelta = newGold - oldGold;
  const activatedPurchasesChanged = 'activatedPurchases' in diff;

  if (goldDelta > MAX_GOLD_DELTA && !activatedPurchasesChanged) {
    errors.push({
      code: 'GOLD_DELTA_EXCEEDED',
      message: `gold increase (${goldDelta}) exceeds maximum of ${MAX_GOLD_DELTA} per save`,
    });
  }

  return { valid: errors.length === 0, errors };
}
