/**
 * Integrity checks for cloud save rows (admin Save Game Analysis tab).
 * Mirrors the ad-hoc Supabase scans used during the tools-wipe / buildings-wipe investigations.
 */

import {
  hasBuildStoryFlags,
  sumBuildingCounts,
} from "./rebuildBuildingsFromStorySeen";

export const SAVE_GAME_ANALYSIS_DEFAULT_LIMIT = 100;

/** Story flags that prove at least one craftable tool was owned (migration 026 set). */
export const CRAFT_TOOL_STORY_FLAG_KEYS = [
  "hasStoneAxe",
  "actionCraftStoneAxe",
  "hasStonePickaxe",
  "actionCraftStonePickaxe",
  "hasIronAxe",
  "actionCraftIronAxe",
  "hasIronPickaxe",
  "actionCraftIronPickaxe",
  "hasIronLantern",
  "actionCraftIronLantern",
  "hasSteelAxe",
  "actionCraftSteelAxe",
  "hasSteelPickaxe",
  "actionCraftSteelPickaxe",
  "hasSteelLantern",
  "actionCraftSteelLantern",
  "hasObsidianAxe",
  "actionCraftObsidianAxe",
  "hasObsidianPickaxe",
  "actionCraftObsidianPickaxe",
  "hasObsidianLantern",
  "actionCraftObsidianLantern",
  "hasAdamantAxe",
  "actionCraftAdamantAxe",
  "hasAdamantPickaxe",
  "actionCraftAdamantPickaxe",
  "hasAdamantLantern",
  "actionCraftAdamantLantern",
  "hasBlacksteelAxe",
  "actionCraftBlacksteelAxe",
  "hasBlacksteelPickaxe",
  "actionCraftBlacksteelPickaxe",
  "hasBlacksteelLantern",
  "actionCraftBlacksteelLantern",
  "blacksmithHammerChoice",
] as const;

export type SaveGameIssueKind =
  | "invalid_game_state"
  | "negative_resource"
  | "non_numeric_resource"
  | "negative_villager"
  | "bad_playtime"
  | "negative_playtime"
  | "wiped_tools"
  | "missing_tools_with_craft_flags"
  | "wiped_buildings"
  | "missing_buildings_with_build_flags"
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
  /** Sidecar full blob (migration 028). Optional — ignored by legacy analysis. */
  game_state_v2?: unknown;
  save_revision?: number | null;
  schema_version?: number | null;
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
  buildings_total: number;
  has_buildings_key: boolean;
  issues: SaveGameIssue[];
};

export type SaveGameAnalysisSummary = {
  scanned: number;
  rowsWithIssues: number;
  oldestUpdated: string | null;
  newestUpdated: string | null;
  byKind: Partial<Record<SaveGameIssueKind, number>>;
  rows: SaveGameAnalysisRow[];
  /** Parallel V2 dual-write coverage / slice compare (Phase 1). */
  v2Compare?: SaveV2CompareSummary;
};

/** Critical gameplay slices compared between legacy game_state and game_state_v2. */
export const SAVE_V2_COMPARE_SLICES = [
  "playTime",
  "tools",
  "weapons",
  "books",
  "buildings",
  "resources",
  "villagers",
  "flags",
] as const;

export type SaveV2CompareStatus =
  | "missing_v2"
  | "match"
  | "mismatch"
  | "invalid_v2"
  | "invalid_legacy";

export type SaveV2CompareRow = {
  user_id: string | null;
  username?: string | null;
  status: SaveV2CompareStatus;
  details: string[];
  save_revision: number | null;
  schema_version: number | null;
};

export type SaveV2CompareSummary = {
  scanned: number;
  withV2: number;
  missingV2: number;
  match: number;
  mismatch: number;
  invalidV2: number;
  invalidLegacy: number;
  /** Non-match rows (and optionally matches omitted to keep payload small). */
  rows: SaveV2CompareRow[];
};

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

export function countOwnedTools(tools: unknown): number {
  const obj = asObject(tools);
  if (!obj) return 0;
  return Object.values(obj).filter((v) => v === true).length;
}

export function analyzeSaveGameRow(
  row: SaveGameAnalysisInput,
): SaveGameAnalysisRow {
  const issues: SaveGameIssue[] = [];
  const gs = row.game_state;
  const gsObj = asObject(gs);

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

  const playTimeRaw = gsObj.playTime;
  let playmin: number | null = null;
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
  const toolsOwned = countOwnedTools(gsObj.tools);
  const craftFlags = hasCraftToolStoryFlags(storySeen);

  if (craftFlags && !hasToolsKey) {
    issues.push({ kind: "missing_tools_with_craft_flags" });
  } else if (craftFlags && toolsOwned === 0) {
    issues.push({ kind: "wiped_tools" });
  }

  const hasBuildingsKey = Object.prototype.hasOwnProperty.call(gsObj, "buildings");
  const buildingsTotal = sumBuildingCounts(gsObj.buildings);
  const buildFlags = hasBuildStoryFlags(storySeen);
  // Mid-game village evidence without any structures — same hybrid wipe class as tools.
  const villageEvidence =
    buildFlags ||
    (storySeen?.hasVillagers === true) ||
    (storySeen?.tabUnlockBlinkSeen_village === true);

  if (villageEvidence && !hasBuildingsKey) {
    issues.push({ kind: "missing_buildings_with_build_flags" });
  } else if (villageEvidence && buildingsTotal === 0) {
    issues.push({ kind: "wiped_buildings" });
  }

  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    updated_at: row.updated_at,
    created_at: row.created_at,
    playmin,
    tools_owned: toolsOwned,
    has_tools_key: hasToolsKey,
    buildings_total: buildingsTotal,
    has_buildings_key: hasBuildingsKey,
    issues,
  };
}

export function summarizeSaveGameAnalysis(
  rows: SaveGameAnalysisRow[],
): Omit<SaveGameAnalysisSummary, "rows"> {
  const byKind: Partial<Record<SaveGameIssueKind, number>> = {};
  let rowsWithIssues = 0;

  for (const row of rows) {
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

  return {
    scanned: rows.length,
    rowsWithIssues,
    oldestUpdated: updatedTimes[0] ?? null,
    newestUpdated: updatedTimes.at(-1) ?? null,
    byKind,
  };
}

export function analyzeSaveGames(
  inputs: SaveGameAnalysisInput[],
): SaveGameAnalysisSummary {
  const rows = inputs.map(analyzeSaveGameRow);
  return {
    ...summarizeSaveGameAnalysis(rows),
    rows,
    v2Compare: compareLegacyAndV2Saves(inputs),
  };
}

function normalizeSliceValue(key: string, value: unknown): unknown {
  if (key === "playTime") {
    if (typeof value !== "number" || !Number.isFinite(value)) return value;
    return Math.floor(value);
  }
  return value;
}

function sliceFingerprint(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/**
 * Compare legacy `game_state` vs sidecar `game_state_v2` on critical slices.
 * Mismatches can be expected while deep-merge protections diverge from client truth;
 * this is a coverage / drift signal, not a load-path change.
 */
export function compareLegacyVsV2Row(
  row: SaveGameAnalysisInput,
): SaveV2CompareRow {
  const revision =
    typeof row.save_revision === "number" && Number.isFinite(row.save_revision)
      ? row.save_revision
      : null;
  const schemaVersion =
    typeof row.schema_version === "number" && Number.isFinite(row.schema_version)
      ? row.schema_version
      : null;

  const legacy = asObject(row.game_state);
  if (!legacy) {
    return {
      user_id: row.user_id,
      username: row.username,
      status: "invalid_legacy",
      details: ["legacy game_state missing or not an object"],
      save_revision: revision,
      schema_version: schemaVersion,
    };
  }

  if (row.game_state_v2 === null || row.game_state_v2 === undefined) {
    return {
      user_id: row.user_id,
      username: row.username,
      status: "missing_v2",
      details: ["game_state_v2 is null"],
      save_revision: revision,
      schema_version: schemaVersion,
    };
  }

  const v2 = asObject(row.game_state_v2);
  if (!v2) {
    return {
      user_id: row.user_id,
      username: row.username,
      status: "invalid_v2",
      details: ["game_state_v2 is not an object"],
      save_revision: revision,
      schema_version: schemaVersion,
    };
  }

  const details: string[] = [];
  for (const key of SAVE_V2_COMPARE_SLICES) {
    const a = normalizeSliceValue(key, legacy[key]);
    const b = normalizeSliceValue(key, v2[key]);
    if (sliceFingerprint(a) !== sliceFingerprint(b)) {
      details.push(key);
    }
  }

  if (details.length > 0) {
    return {
      user_id: row.user_id,
      username: row.username,
      status: "mismatch",
      details,
      save_revision: revision,
      schema_version: schemaVersion,
    };
  }

  return {
    user_id: row.user_id,
    username: row.username,
    status: "match",
    details: [],
    save_revision: revision,
    schema_version: schemaVersion,
  };
}

export function compareLegacyAndV2Saves(
  inputs: SaveGameAnalysisInput[],
): SaveV2CompareSummary {
  const compared = inputs.map(compareLegacyVsV2Row);
  let withV2 = 0;
  let missingV2 = 0;
  let match = 0;
  let mismatch = 0;
  let invalidV2 = 0;
  let invalidLegacy = 0;

  for (const row of compared) {
    switch (row.status) {
      case "missing_v2":
        missingV2 += 1;
        break;
      case "match":
        withV2 += 1;
        match += 1;
        break;
      case "mismatch":
        withV2 += 1;
        mismatch += 1;
        break;
      case "invalid_v2":
        withV2 += 1;
        invalidV2 += 1;
        break;
      case "invalid_legacy":
        invalidLegacy += 1;
        break;
    }
  }

  return {
    scanned: compared.length,
    withV2,
    missingV2,
    match,
    mismatch,
    invalidV2,
    invalidLegacy,
    rows: compared.filter((r) => r.status !== "match"),
  };
}
