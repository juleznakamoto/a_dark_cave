/**
 * Rebuild buildings from `story.seen.actionBuild*` flags (same pattern as tools / migration 026).
 * Only raises building counts to at least 1 when a craft/build flag proves ownership —
 * never lowers counts. Countable huts cannot be restored to exact N from flags alone.
 */

/** One-time / upgrade-chain buildings: flag proves count >= 1. */
export const BUILDING_REBUILD_FROM_STORY_SEEN = [
  "cabin",
  "greatCabin",
  "grandHunterLodge",
  "timberMill",
  "quarry",
  "blacksmith",
  "advancedBlacksmith",
  "grandBlacksmith",
  "shallowPit",
  "deepeningPit",
  "deepPit",
  "bottomlessPit",
  "foundry",
  "primeFoundry",
  "masterworkFoundry",
  "bastion",
  "fortifiedMoat",
  "wizardTower",
  "traps",
  "improvedTraps",
  "blackMonolith",
  "pillarOfClarity",
  "boneyard",
  "boneTemple",
  "paleCross",
  "consecratedPaleCross",
  "darkEstate",
  "blackEstate",
  "supplyHut",
  "storehouse",
  "fortifiedStorehouse",
  "villageWarehouse",
  "grandRepository",
  "greatVault",
  "clerksHut",
  "scriptorium",
  "inkwardenAcademy",
  "scribesOffice",
  "recordsHall",
  "grandArchive",
  "buildersLodge",
  "buildersHall",
  "buildersGuild",
  "tannery",
  "masterTannery",
  "highTannery",
  "altar",
  "shrine",
  "temple",
  "sanctum",
  "alchemistHall",
  "tradePost",
  "grandBazaar",
  "merchantsGuild",
  "chitinPlating",
  "coinhouse",
  "bank",
  "treasury",
  "heartfire",
  // Countable housing — flag only proves >= 1
  "woodenHut",
  "stoneHut",
  "longhouse",
  "furTents",
  "watchtower",
  "palisades",
] as const;

export type BuildingRebuildKey = (typeof BUILDING_REBUILD_FROM_STORY_SEEN)[number];

/** `buildWoodenHut` → `actionBuildWoodenHut` */
export function buildingKeyToActionBuildSeenKey(buildingKey: string): string {
  return `actionBuild${buildingKey.charAt(0).toUpperCase()}${buildingKey.slice(1)}`;
}

function asSeenRecord(storySeen: unknown): Record<string, unknown> | null {
  if (!storySeen || typeof storySeen !== "object" || Array.isArray(storySeen)) {
    return null;
  }
  return storySeen as Record<string, unknown>;
}

function asBuildingsRecord(
  buildings: unknown,
): Record<string, number> {
  if (!buildings || typeof buildings !== "object" || Array.isArray(buildings)) {
    return {};
  }
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(buildings as Record<string, unknown>)) {
    const n = typeof value === "number" ? value : Number(value);
    result[key] = Number.isFinite(n) ? n : 0;
  }
  return result;
}

export function sumBuildingCounts(buildings: unknown): number {
  return Object.values(asBuildingsRecord(buildings)).reduce(
    (sum, n) => sum + Math.max(0, n),
    0,
  );
}

export function hasBuildStoryFlags(storySeen: unknown): boolean {
  const seen = asSeenRecord(storySeen);
  if (!seen) return false;
  return BUILDING_REBUILD_FROM_STORY_SEEN.some(
    (key) => seen[buildingKeyToActionBuildSeenKey(key)] === true,
  );
}

/**
 * Overlay story-flag-derived buildings onto a buildings slice (add-only, min count 1).
 */
export function overlayBuildingsFromStorySeen<T extends Record<string, number>>(
  buildings: T,
  storySeen: unknown,
): T {
  const seen = asSeenRecord(storySeen);
  if (!seen) return buildings;

  const result = { ...buildings } as Record<string, number>;
  for (const buildingKey of BUILDING_REBUILD_FROM_STORY_SEEN) {
    const flag = buildingKeyToActionBuildSeenKey(buildingKey);
    if (seen[flag] === true) {
      const current = Number(result[buildingKey]) || 0;
      if (current < 1) {
        result[buildingKey] = 1;
      }
    }
  }
  return result as T;
}

/** Sticky progression flags that must not be cleared by a hybrid incremental save. */
export const STICKY_TRUE_FLAGS = [
  "gameStarted",
  "hasLitFire",
  "villageUnlocked",
  "forestUnlocked",
  "bastionUnlocked",
  "monolithUnlocked",
  "hasCity",
  "hasFortress",
  "hasHitResourceLimit",
  "villagerCapsEnabled",
  "humanSacrificeUnlocked",
  "firstWolfAttack",
] as const;

export function overlayStickyTrueFlags<T extends Record<string, boolean>>(
  flags: T,
  priorFlags: unknown,
): T {
  if (!priorFlags || typeof priorFlags !== "object" || Array.isArray(priorFlags)) {
    return flags;
  }
  const prior = priorFlags as Record<string, unknown>;
  const result = { ...flags } as Record<string, boolean>;
  for (const key of STICKY_TRUE_FLAGS) {
    if (prior[key] === true) {
      result[key] = true;
    }
  }
  return result as T;
}

/**
 * Re-derive sticky unlock flags from story.seen when a hybrid wipe cleared them.
 * Only sets flags to true — never clears an already-true flag.
 */
export function overlayFlagsFromStorySeen<T extends Record<string, boolean>>(
  flags: T,
  storySeen: unknown,
  playTimeMs = 0,
): T {
  const seen = asSeenRecord(storySeen);
  const result = { ...flags } as Record<string, boolean>;

  if (
    result.gameStarted !== true &&
    (playTimeMs > 0 || seen?.fireLit === true || seen?.gameStarted === true)
  ) {
    result.gameStarted = true;
  }
  if (result.hasLitFire !== true && seen?.fireLit === true) {
    result.hasLitFire = true;
  }
  if (
    result.villageUnlocked !== true &&
    (hasBuildStoryFlags(storySeen) ||
      seen?.hasVillagers === true ||
      seen?.tabUnlockBlinkSeen_village === true)
  ) {
    result.villageUnlocked = true;
  }
  if (
    result.forestUnlocked !== true &&
    (seen?.tabUnlockBlinkSeen_forest === true ||
      seen?.hasHunted === true ||
      seen?.actionCraftCrudeBow === true ||
      seen?.forestCave === true)
  ) {
    result.forestUnlocked = true;
  }
  if (
    result.bastionUnlocked !== true &&
    (seen?.tabUnlockBlinkSeen_bastion === true ||
      seen?.actionBuildBastion === true)
  ) {
    result.bastionUnlocked = true;
  }
  if (result.villagerCapsEnabled !== true && result.villageUnlocked === true) {
    result.villagerCapsEnabled = true;
  }

  return result as T;
}
