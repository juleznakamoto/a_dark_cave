/**
 * Integrity checks for cloud save rows (admin Save Game Analysis tab).
 * Deep scans of the last N cloud saves for wipe / shape / cross-slice corruption.
 */

import { TOOL_REBUILD_FROM_STORY_SEEN } from "./rebuildToolsFromStorySeen";
import {
  hasBastionUnlockEvidence,
  hasForestUnlockEvidence,
  hasVillageUnlockEvidence,
} from "./repairUnlockFlags";

export const SAVE_GAME_ANALYSIS_DEFAULT_LIMIT = 100;

/** Story flags that prove at least one craftable tool was owned (craft-flag rebuild set). */
export const CRAFT_TOOL_STORY_FLAG_KEYS = TOOL_REBUILD_FROM_STORY_SEEN.flatMap(
  (entry) => [...entry.seenKeys],
);

/**
 * Mid/late weapons that stamp craft story flags (early bows often do not).
 * Same wipe class as tools — permanent ownership maps.
 */
export const WEAPON_REBUILD_FROM_STORY_SEEN = [
  { weaponKey: "war_bow", seenKeys: ["hasWarBow", "actionCraftWarBow"] },
  { weaponKey: "master_bow", seenKeys: ["hasMasterBow", "actionCraftMasterBow"] },
  { weaponKey: "frostglass_sword", seenKeys: ["hasFrostglassSword"] },
  {
    weaponKey: "blacksteel_sword",
    seenKeys: ["hasBlacksteelSword", "actionCraftBlacksteelSword"],
  },
  {
    weaponKey: "blacksteel_bow",
    seenKeys: ["hasBlacksteelBow", "actionCraftBlacksteelBow"],
  },
  { weaponKey: "bloodstone_staff", seenKeys: ["hasBloodstoneStaff"] },
] as const;

/** Craft clothing that stamps story flags (sacrifices can remove other clothing). */
export const CLOTHING_REBUILD_FROM_STORY_SEEN = [
  {
    clothingKey: "explorer_pack",
    seenKeys: ["hasExplorerPack", "actionCraftExplorerPack"],
  },
  {
    clothingKey: "hunter_cloak",
    seenKeys: ["hasHunterCloak", "actionCraftHunterCloak"],
  },
] as const;

/** Object slices that must exist once a save has meaningful progress. */
export const FOUNDATIONAL_OBJECT_SLICES = [
  "tools",
  "flags",
  "buildings",
  "resources",
  "villagers",
  "story",
  "stats",
] as const;

/** Playtime (ms) above which missing foundational slices are suspicious. */
export const PROGRESSED_PLAYTIME_MS = 5 * 60_000;

export type SaveGameIssueKind =
  | "invalid_game_state"
  | "negative_resource"
  | "non_numeric_resource"
  | "negative_villager"
  | "negative_building"
  | "non_numeric_building"
  | "bad_playtime"
  | "negative_playtime"
  | "wiped_tools"
  | "missing_tools_with_craft_flags"
  | "tool_craft_mismatch"
  | "wiped_weapons"
  | "missing_weapons_with_craft_flags"
  | "weapon_craft_mismatch"
  | "wiped_craft_clothing"
  | "missing_buildings_with_progress"
  | "missing_foundational_slices"
  | "bad_slice_shape"
  | "missing_game_started"
  | "missing_unlock_flags"
  | "bad_story_seen"
  | "bad_game_stats"
  | "updated_before_created"
  | "population_mismatch";

export type SaveGameIssue = {
  kind: SaveGameIssueKind;
  detail?: string;
  field?: string;
};

export type SaveGameAnalysisInput = {
  id?: string;
  /** Null when the account was anonymized / deleted (migration 009). */
  user_id: string | null;
  username?: string | null;
  updated_at: string;
  created_at: string;
  game_state: unknown;
  game_stats?: unknown;
};

export type SaveGameAnalysisRow = {
  id?: string;
  user_id: string | null;
  username?: string | null;
  updated_at: string;
  created_at: string;
  playmin: number | null;
  tools_owned: number;
  has_tools_key: boolean;
  /** Client bundle SHA stamped on last save; null when missing/empty. */
  clientBuildSha: string | null;
  /** True when stamped SHA matches the deploy SHA passed into analysis. */
  isCurrentVersion: boolean;
  issues: SaveGameIssue[];
};

export type SaveGameAnalysisSummary = {
  scanned: number;
  rowsWithIssues: number;
  oldestUpdated: string | null;
  newestUpdated: string | null;
  byKind: Partial<Record<SaveGameIssueKind, number>>;
  /** Deploy SHA used for version comparison (null when unknown). */
  /** Published build SHA used for the comparison (see AnalyzeSaveGamesOptions). */
  currentBuildSha: string | null;
  /** Saves whose clientBuildSha matches currentBuildSha. */
  onCurrentVersion: number;
  /** Saves missing a SHA or on a different build (subset of last N). */
  notOnCurrentVersion: number;
  rows: SaveGameAnalysisRow[];
};

export type AnalyzeSaveGamesOptions = {
  /**
   * Published build SHA for the analyzed env (prod: live site `/api/version`;
   * dev: admin host deploy SHA).
   */
  currentBuildSha?: string | null;
};

function normalizeBuildSha(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function sumNumericRecordValues(record: Record<string, unknown>): number {
  return Object.values(record).reduce<number>(
    (sum, value) => sum + (typeof value === "number" ? value : 0),
    0,
  );
}

/** Mirrors client `getActiveExpeditionVillagerCount`. */
export function computeActiveExpeditionFromGameState(
  gsObj: Record<string, unknown>,
  now = Date.now(),
): number {
  const expedition = asObject(gsObj.expeditionVillagers) ?? {};
  const starts = asObject(gsObj.executionStartTimes) ?? {};
  const durations = asObject(gsObj.executionDurations) ?? {};
  return Object.entries(expedition).reduce((sum, [actionId, count]) => {
    if (typeof count !== "number" || count <= 0) return sum;
    const startTime = starts[actionId];
    const durationSec = durations[actionId];
    if (
      typeof startTime !== "number" ||
      typeof durationSec !== "number" ||
      durationSec <= 0
    ) {
      return sum;
    }
    if ((now - startTime) / 1000 >= durationSec) {
      return sum;
    }
    return sum + count;
  }, 0);
}

/** Mirrors client `getCurrentPopulation` — derived from villagers, not cached fields. */
export function computeCurrentPopulationFromGameState(
  gsObj: Record<string, unknown>,
  now = Date.now(),
): number {
  const villagers = asObject(gsObj.villagers) ?? {};
  return (
    sumNumericRecordValues(villagers) +
    computeActiveExpeditionFromGameState(gsObj, now)
  );
}

/** Mirrors client `getMaxPopulation` — housing cap from buildings + temple bonus. */
export function computeMaxPopulationFromGameState(
  gsObj: Record<string, unknown>,
): number {
  const buildings = asObject(gsObj.buildings) ?? {};
  const blessings = asObject(gsObj.blessings) ?? {};
  const buildingCount = (key: string): number => {
    const value = buildings[key];
    return typeof value === "number" ? value : 0;
  };

  let templeBonus = 0;
  if (blessings.flames_touch === true) {
    templeBonus = 4;
  } else if (blessings.flames_touch_enhanced === true) {
    templeBonus = 8;
  }

  return (
    buildingCount("woodenHut") * 2 +
    buildingCount("stoneHut") * 4 +
    buildingCount("longhouse") * 8 +
    buildingCount("furTents") * 4 +
    buildingCount("blackEstate") * 10 +
    templeBonus
  );
}

export function hasCraftToolStoryFlags(storySeen: unknown): boolean {
  const seen = asObject(storySeen);
  if (!seen) return false;
  return CRAFT_TOOL_STORY_FLAG_KEYS.some((key) => seen[key] === true);
}

export function hasCraftWeaponStoryFlags(storySeen: unknown): boolean {
  const seen = asObject(storySeen);
  if (!seen) return false;
  return WEAPON_REBUILD_FROM_STORY_SEEN.some(({ seenKeys }) =>
    seenKeys.some((key) => seen[key] === true),
  );
}

export function countOwnedBooleanSlice(slice: unknown): number {
  const obj = asObject(slice);
  if (!obj) return 0;
  return Object.values(obj).filter((v) => v === true).length;
}

export function countOwnedTools(tools: unknown): number {
  return countOwnedBooleanSlice(tools);
}

function seenTrue(
  seen: Record<string, unknown> | null,
  key: string,
): boolean {
  return seen?.[key] === true;
}

function sumBuildingCounts(buildings: Record<string, unknown> | null): number {
  if (!buildings) return 0;
  return Object.values(buildings).reduce<number>((sum, value) => {
    return sum + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

function listMismatchedOwnedKeys(
  slice: Record<string, unknown> | null,
  mappings: ReadonlyArray<{ key: string; seenKeys: readonly string[] }>,
  seen: Record<string, unknown> | null,
): string[] {
  if (!seen) return [];
  const missing: string[] = [];
  for (const { key, seenKeys } of mappings) {
    if (!seenKeys.some((seenKey) => seen[seenKey] === true)) continue;
    if (slice?.[key] !== true) missing.push(key);
  }
  return missing;
}

export function analyzeSaveGameRow(
  row: SaveGameAnalysisInput,
  options: AnalyzeSaveGamesOptions = {},
): SaveGameAnalysisRow {
  const issues: SaveGameIssue[] = [];
  const gs = row.game_state;
  const gsObj = asObject(gs);
  const currentBuildSha = normalizeBuildSha(options.currentBuildSha);

  if (!gsObj) {
    issues.push({
      kind: "invalid_game_state",
      detail: gs === null ? "null" : typeof gs,
    });
    return {
      id: row.id,
      user_id: row.user_id,
      username: row.username,
      updated_at: row.updated_at,
      created_at: row.created_at,
      playmin: null,
      tools_owned: 0,
      has_tools_key: false,
      clientBuildSha: null,
      isCurrentVersion: false,
      issues,
    };
  }

  if (Object.keys(gsObj).length === 0) {
    issues.push({ kind: "invalid_game_state", detail: "empty object" });
  }

  const resources = asObject(gsObj.resources);
  if (resources) {
    for (const [key, value] of Object.entries(resources)) {
      // null/undefined are treated as 0 throughout gameplay (`|| 0` / `?? 0` / numeric coercion).
      if (value === null || value === undefined) continue;
      if (typeof value !== "number") {
        issues.push({
          kind: "non_numeric_resource",
          field: key,
          detail: typeof value,
        });
      } else if (value < 0) {
        issues.push({ kind: "negative_resource", field: key, detail: String(value) });
      }
    }
  }

  const villagers = asObject(gsObj.villagers);
  if (villagers) {
    for (const [key, value] of Object.entries(villagers)) {
      if (typeof value === "number" && value < 0) {
        issues.push({ kind: "negative_villager", field: key, detail: String(value) });
      }
    }
  }

  const buildings = asObject(gsObj.buildings);
  const hasBuildingsKey = Object.prototype.hasOwnProperty.call(gsObj, "buildings");
  if (hasBuildingsKey && buildings === null) {
    issues.push({ kind: "bad_slice_shape", detail: "buildings" });
  } else if (buildings) {
    for (const [key, value] of Object.entries(buildings)) {
      if (value === null || value === undefined) continue;
      if (typeof value !== "number") {
        issues.push({
          kind: "non_numeric_building",
          field: key,
          detail: typeof value,
        });
      } else if (value < 0) {
        issues.push({
          kind: "negative_building",
          field: key,
          detail: String(value),
        });
      }
    }
  }

  const playTimeRaw = gsObj.playTime;
  let playmin: number | null = null;
  let playTimeMs: number | null = null;
  if (playTimeRaw === null || playTimeRaw === undefined) {
    issues.push({ kind: "bad_playtime", detail: "missing" });
  } else if (typeof playTimeRaw !== "number") {
    issues.push({ kind: "bad_playtime", detail: typeof playTimeRaw });
  } else if (!Number.isFinite(playTimeRaw)) {
    issues.push({ kind: "bad_playtime", detail: String(playTimeRaw) });
  } else {
    if (playTimeRaw < 0) {
      issues.push({ kind: "negative_playtime", detail: String(playTimeRaw) });
    }
    playTimeMs = playTimeRaw;
    playmin = Math.round((playTimeRaw / 60_000) * 10) / 10;
  }

  const story = asObject(gsObj.story);
  const storySeen = story ? asObject(story.seen) : null;
  if (story && storySeen === null && story.seen !== undefined) {
    issues.push({ kind: "bad_story_seen", detail: "story.seen not an object" });
  }

  if (row.game_stats !== undefined && row.game_stats !== null && !Array.isArray(row.game_stats)) {
    issues.push({ kind: "bad_game_stats", detail: typeof row.game_stats });
  }

  const updatedMs = Date.parse(row.updated_at);
  const createdMs = Date.parse(row.created_at);
  if (Number.isFinite(updatedMs) && Number.isFinite(createdMs) && updatedMs < createdMs) {
    const skewSec = Math.round((createdMs - updatedMs) / 1000);
    issues.push({
      kind: "updated_before_created",
      detail: `${skewSec}s skew`,
    });
  }

  const computedCurrent = computeCurrentPopulationFromGameState(
    gsObj,
    Number.isFinite(updatedMs) ? updatedMs : Date.now(),
  );
  const computedMax = computeMaxPopulationFromGameState(gsObj);
  if (computedCurrent > computedMax) {
    issues.push({
      kind: "population_mismatch",
      detail: `current=${computedCurrent} max=${computedMax}`,
    });
  }

  const hasToolsKey = Object.prototype.hasOwnProperty.call(gsObj, "tools");
  const toolsObj = asObject(gsObj.tools);
  if (hasToolsKey && toolsObj === null) {
    issues.push({ kind: "bad_slice_shape", detail: "tools" });
  }
  const toolsOwned = countOwnedTools(gsObj.tools);
  const craftFlags = hasCraftToolStoryFlags(storySeen);

  if (craftFlags && !hasToolsKey) {
    issues.push({ kind: "missing_tools_with_craft_flags" });
  } else if (craftFlags && toolsOwned === 0) {
    issues.push({ kind: "wiped_tools" });
  } else if (craftFlags && hasToolsKey) {
    const mismatchedTools = listMismatchedOwnedKeys(
      toolsObj,
      TOOL_REBUILD_FROM_STORY_SEEN.map((entry) => ({
        key: entry.toolKey,
        seenKeys: entry.seenKeys,
      })),
      storySeen,
    );
    if (mismatchedTools.length > 0) {
      issues.push({
        kind: "tool_craft_mismatch",
        detail: mismatchedTools.slice(0, 12).join(","),
      });
    }
  }

  const hasWeaponsKey = Object.prototype.hasOwnProperty.call(gsObj, "weapons");
  const weaponsObj = asObject(gsObj.weapons);
  if (hasWeaponsKey && weaponsObj === null) {
    issues.push({ kind: "bad_slice_shape", detail: "weapons" });
  }
  const weaponsOwned = countOwnedBooleanSlice(gsObj.weapons);
  const weaponCraftFlags = hasCraftWeaponStoryFlags(storySeen);
  if (weaponCraftFlags && !hasWeaponsKey) {
    issues.push({ kind: "missing_weapons_with_craft_flags" });
  } else if (weaponCraftFlags && weaponsOwned === 0) {
    issues.push({ kind: "wiped_weapons" });
  } else if (weaponCraftFlags && hasWeaponsKey) {
    const mismatchedWeapons = listMismatchedOwnedKeys(
      weaponsObj,
      WEAPON_REBUILD_FROM_STORY_SEEN.map((entry) => ({
        key: entry.weaponKey,
        seenKeys: entry.seenKeys,
      })),
      storySeen,
    );
    if (mismatchedWeapons.length > 0) {
      issues.push({
        kind: "weapon_craft_mismatch",
        detail: mismatchedWeapons.slice(0, 12).join(","),
      });
    }
  }

  const hasClothingKey = Object.prototype.hasOwnProperty.call(gsObj, "clothing");
  const clothingObj = asObject(gsObj.clothing);
  if (hasClothingKey && clothingObj === null) {
    issues.push({ kind: "bad_slice_shape", detail: "clothing" });
  }
  const mismatchedClothing = listMismatchedOwnedKeys(
    clothingObj,
    CLOTHING_REBUILD_FROM_STORY_SEEN.map((entry) => ({
      key: entry.clothingKey,
      seenKeys: entry.seenKeys,
    })),
    storySeen,
  );
  if (mismatchedClothing.length > 0) {
    issues.push({
      kind: "wiped_craft_clothing",
      detail: mismatchedClothing.join(","),
    });
  }

  const flagsObj = asObject(gsObj.flags);
  const hasFlagsKey = Object.prototype.hasOwnProperty.call(gsObj, "flags");
  if (hasFlagsKey && flagsObj === null) {
    issues.push({ kind: "bad_slice_shape", detail: "flags" });
  }

  const unlockEvidence = {
    flags: (flagsObj ?? {}) as {
      villageUnlocked?: boolean;
      forestUnlocked?: boolean;
      bastionUnlocked?: boolean;
      hasFortress?: boolean;
      gameStarted?: boolean;
    },
    tools: toolsObj as Record<string, boolean | undefined> | null,
    weapons: weaponsObj as Record<string, boolean | undefined> | null,
    buildings: buildings as Record<string, number | undefined> | null,
    story: story
      ? { seen: storySeen as Record<string, unknown> | null }
      : null,
  };

  const villageEvidence = hasVillageUnlockEvidence(unlockEvidence);
  const forestEvidence = hasForestUnlockEvidence(unlockEvidence);
  const bastionEvidence = hasBastionUnlockEvidence(unlockEvidence);

  // Older deep-merge saves often omit empty object keys — only require full
  // foundational shape once playTime shows the player is past the first minutes.
  if (playTimeMs !== null && playTimeMs >= PROGRESSED_PLAYTIME_MS) {
    const missingSlices: string[] = [];
    for (const key of FOUNDATIONAL_OBJECT_SLICES) {
      if (!Object.prototype.hasOwnProperty.call(gsObj, key)) {
        missingSlices.push(key);
        continue;
      }
      if (
        asObject(gsObj[key]) === null &&
        !issues.some(
          (issue) => issue.kind === "bad_slice_shape" && issue.detail === key,
        )
      ) {
        issues.push({ kind: "bad_slice_shape", detail: key });
      }
    }
    if (missingSlices.length > 0) {
      issues.push({
        kind: "missing_foundational_slices",
        detail: missingSlices.join(","),
      });
    }
  }

  const villagerTotal = villagers ? sumNumericRecordValues(villagers) : 0;
  const buildingTotal = sumBuildingCounts(buildings);
  if (
    (villagerTotal > 0 || craftFlags || villageEvidence) &&
    (!hasBuildingsKey || buildingTotal === 0)
  ) {
    // Brand-new village can have stone axe before first hut — only flag when
    // villagers exist or mid+ craft evidence (iron+) / housing should exist.
    const midCraft =
      seenTrue(storySeen, "hasIronAxe") ||
      seenTrue(storySeen, "actionCraftIronAxe") ||
      seenTrue(storySeen, "hasSteelAxe") ||
      toolsObj?.iron_axe === true ||
      toolsObj?.steel_axe === true;
    if (villagerTotal > 0 || midCraft || bastionEvidence) {
      issues.push({
        kind: "missing_buildings_with_progress",
        detail: !hasBuildingsKey
          ? "buildings key missing"
          : `buildingTotal=0 villagers=${villagerTotal}`,
      });
    }
  }

  if (
    hasFlagsKey &&
    (villageEvidence || forestEvidence || bastionEvidence || craftFlags) &&
    unlockEvidence.flags.gameStarted !== true
  ) {
    issues.push({ kind: "missing_game_started" });
  }

  const missingUnlocks: string[] = [];
  if (villageEvidence && unlockEvidence.flags.villageUnlocked !== true) {
    missingUnlocks.push("villageUnlocked");
  }
  if (forestEvidence && unlockEvidence.flags.forestUnlocked !== true) {
    missingUnlocks.push("forestUnlocked");
  }
  if (bastionEvidence && unlockEvidence.flags.bastionUnlocked !== true) {
    missingUnlocks.push("bastionUnlocked");
  }
  if (missingUnlocks.length > 0) {
    issues.push({
      kind: "missing_unlock_flags",
      detail: missingUnlocks.join(","),
    });
  }

  const clientBuildSha = normalizeBuildSha(gsObj.clientBuildSha);
  const isCurrentVersion =
    currentBuildSha !== null &&
    clientBuildSha !== null &&
    clientBuildSha === currentBuildSha;

  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    updated_at: row.updated_at,
    created_at: row.created_at,
    playmin,
    tools_owned: toolsOwned,
    has_tools_key: hasToolsKey,
    clientBuildSha,
    isCurrentVersion,
    issues,
  };
}

export function summarizeSaveGameAnalysis(
  rows: SaveGameAnalysisRow[],
  options: AnalyzeSaveGamesOptions = {},
): Omit<SaveGameAnalysisSummary, "rows"> {
  const byKind: Partial<Record<SaveGameIssueKind, number>> = {};
  let rowsWithIssues = 0;
  let onCurrentVersion = 0;

  for (const row of rows) {
    if (row.isCurrentVersion) onCurrentVersion += 1;
    if (row.issues.length === 0) continue;
    rowsWithIssues += 1;
    for (const issue of row.issues) {
      byKind[issue.kind] = (byKind[issue.kind] ?? 0) + 1;
    }
  }

  const updatedTimes = rows
    .map((r) => r.updated_at)
    .filter(Boolean)
    .sort();

  const currentBuildSha = normalizeBuildSha(options.currentBuildSha);

  return {
    scanned: rows.length,
    rowsWithIssues,
    oldestUpdated: updatedTimes[0] ?? null,
    newestUpdated: updatedTimes.at(-1) ?? null,
    byKind,
    currentBuildSha,
    onCurrentVersion,
    notOnCurrentVersion: rows.length - onCurrentVersion,
  };
}

export function analyzeSaveGames(
  inputs: SaveGameAnalysisInput[],
  options: AnalyzeSaveGamesOptions = {},
): SaveGameAnalysisSummary {
  const rows = inputs.map((row) => analyzeSaveGameRow(row, options));
  return {
    ...summarizeSaveGameAnalysis(rows, options),
    rows,
  };
}
