/**
 * Integrity checks for cloud save rows (admin Save Game Analysis tab).
 * Mirrors the ad-hoc Supabase scans used during the tools-wipe investigation.
 */

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
  user_id: string;
  username?: string | null;
  updated_at: string;
  created_at: string;
  game_state: unknown;
  game_stats?: unknown;
};

export type SaveGameAnalysisRow = {
  id?: string;
  user_id: string;
  username?: string | null;
  updated_at: string;
  created_at: string;
  playmin: number | null;
  tools_owned: number;
  has_tools_key: boolean;
  issues: SaveGameIssue[];
};

export type SaveGameAnalysisSummary = {
  scanned: number;
  rowsWithIssues: number;
  oldestUpdated: string | null;
  newestUpdated: string | null;
  byKind: Partial<Record<SaveGameIssueKind, number>>;
  rows: SaveGameAnalysisRow[];
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

/** Mirrors client `getCurrentPopulation` — derived from villagers, not cached fields. */
export function computeCurrentPopulationFromGameState(
  gsObj: Record<string, unknown>,
): number {
  const villagers = asObject(gsObj.villagers) ?? {};
  const expedition = asObject(gsObj.expeditionVillagers) ?? {};
  return sumNumericRecordValues(villagers) + sumNumericRecordValues(expedition);
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

  const computedCurrent = computeCurrentPopulationFromGameState(gsObj);
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

  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    updated_at: row.updated_at,
    created_at: row.created_at,
    playmin,
    tools_owned: toolsOwned,
    has_tools_key: hasToolsKey,
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
  };
}
