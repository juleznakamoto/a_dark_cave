/**
 * Integrity checks for cloud save rows (admin Save Game Analysis tab).
 * Mirrors the ad-hoc Supabase scans used during the tools-wipe investigation.
 * Also compares legacy `game_state` vs sidecar `game_state_v2` (dual-write soak).
 */

import {
  hasBastionUnlockEvidence,
  hasForestUnlockEvidence,
  hasVillageUnlockEvidence,
} from "./repairUnlockFlags";

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
  /** Parallel V2 dual-write coverage / slice compare (Phase 1). */
  v2Compare?: SaveV2CompareSummary;
};

/**
 * High-signal slices listed first in mismatch details (full compare still
 * covers every top-level key; expected-noise keys are classified separately).
 */
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

/**
 * Keys whose V1/V2 drift is expected during dual-write soak (not cutover blockers).
 * Still detected and counted as `expected_noise`, not treated as `mismatch`:
 * - UI-only store fields (stripped by `buildGameState` for V2; often still on V1)
 * - Transient / delete-semantic maps (execution/expedition wholesale-replaced since
 *   migration 029; cooldowns and other maps can still diverge under V1 deep-merge)
 * - Client analytics buffers not part of gameplay state
 *
 * Keep UI keys in sync with `UI_ONLY_PROPERTIES` in `client/src/game/stateHelpers.ts`.
 */
export const SAVE_V2_COMPARE_EXPECTED_NOISE_KEYS = new Set<string>([
  // UI_ONLY_PROPERTIES (+ shopCruelModeHighlight from dialog reset)
  "activeTab",
  "devMode",
  "devSteamMode",
  "devGameMode",
  "lastSaved",
  "eventDialog",
  "combatDialog",
  "authDialogOpen",
  "shopDialogOpen",
  "shopCruelModeHighlight",
  "investDialogOpen",
  "investmentResultDialog",
  "idleModeDialog",
  "inactivityDialogOpen",
  "inactivityReason",
  "restartGameDialogOpen",
  "deleteAccountDialogOpen",
  "settingsDialogOpen",
  "playlightWelcomeDialogOpen",
  "feedbackDialogOpen",
  "socialPromptDialogOpen",
  "signUpPromptEligibleForGold",
  "resourceChangeEvents",
  "current_population",
  "total_population",
  "gamblerDiceDialogOpen",
  "rewardDialog",
  "leaderboardDialogOpen",
  "shareDialogOpen",
  "fullGamePurchaseDialogOpen",
  "galaxyTimeUpDialogOpen",
  "shopCheckoutItemId",
  "madnessDialog",
  "insightPotionDialog",
  "villageEffectDialog",
  "insightRevealing",
  "_completingExecution",
  // Transient / merge ghosts (V1 deep-merge vs V2 full replace)
  "cooldowns",
  "initialCooldowns",
  "cooldownDurations",
  "executionStartTimes",
  "executionDurations",
  "executionAbortEligible",
  "executionSpendSnapshots",
  "expeditionVillagers",
  "effects",
  "timedEventTab",
  "constructionBoostsUsed",
  "miningBoostState",
  // Wall-clock / loop timers (elapsedTime drifts; optional keys like `provoked`)
  "attackWaveTimers",
  // Non-gameplay buffers
  "clickAnalytics",
  "isPaused",
]);

/** Cap detail keys in the admin payload (full set can be large). */
const SAVE_V2_MISMATCH_DETAILS_CAP = 40;

export type SaveV2CompareStatus =
  | "missing_v2"
  | "match"
  /** Core gameplay keys match; only UI/transient/analytics keys differ. */
  | "expected_noise"
  /**
   * Keys present on only one side (usually V1 diff-save sparsity vs V2 full blob).
   * Not a value conflict — both sides agree where they overlap.
   */
  | "shape_drift"
  /**
   * Legacy playTime is ahead of the sidecar — expected while V2 dual-write is
   * DEV-only / best-effort and prod clients keep updating V1 only.
   * Not a same-moment cutover conflict.
   */
  | "v2_stale"
  /** Same key on both sides with different values at the same playTime (cutover-relevant). */
  | "mismatch"
  | "invalid_v2"
  | "invalid_legacy";

export type SaveV2CompareRow = {
  user_id: string | null;
  username?: string | null;
  status: SaveV2CompareStatus;
  /**
   * Primary detail keys for this status:
   * - mismatch → gameplay value diffs
   * - shape_drift → gameplay presence-only diffs
   * - expected_noise → noise key diffs
   */
  details: string[];
  /** Gameplay value diffs before details cap (null when none). */
  mismatchCount: number | null;
  /** Gameplay presence-only diffs (v1-only / v2-only); null when none. */
  shapeDriftCount: number | null;
  /** Expected-noise key diffs (null when none). Present alongside mismatch too. */
  expectedNoiseCount: number | null;
  save_revision: number | null;
  schema_version: number | null;
};

export type SaveV2CompareSummary = {
  scanned: number;
  withV2: number;
  missingV2: number;
  match: number;
  /** Rows with only UI/transient/analytics drift (still dual-write OK). */
  expectedNoise: number;
  /** Rows whose only non-noise diffs are key presence (V1 sparse vs V2 full). */
  shapeDrift: number;
  /** Legacy ahead of sidecar (DEV-only / failed dual-write lag). */
  v2Stale: number;
  mismatch: number;
  invalidV2: number;
  invalidLegacy: number;
  /** Real issues only (same-moment value mismatch / invalid). Other buckets are counts only. */
  rows: SaveV2CompareRow[];
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

export function countOwnedTools(tools: unknown): number {
  const obj = asObject(tools);
  if (!obj) return 0;
  return Object.values(obj).filter((v) => v === true).length;
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

  const flagsObj = asObject(gsObj.flags);
  const unlockEvidence = {
    flags: (flagsObj ?? {}) as {
      villageUnlocked?: boolean;
      forestUnlocked?: boolean;
      bastionUnlocked?: boolean;
      hasFortress?: boolean;
    },
    tools: asObject(gsObj.tools) as Record<string, boolean | undefined> | null,
    weapons: asObject(gsObj.weapons) as Record<string, boolean | undefined> | null,
    buildings: asObject(gsObj.buildings) as Record<
      string,
      number | undefined
    > | null,
    story: story
      ? { seen: storySeen as Record<string, unknown> | null }
      : null,
  };
  const missingUnlocks: string[] = [];
  if (
    hasVillageUnlockEvidence(unlockEvidence) &&
    unlockEvidence.flags.villageUnlocked !== true
  ) {
    missingUnlocks.push("villageUnlocked");
  }
  if (
    hasForestUnlockEvidence(unlockEvidence) &&
    unlockEvidence.flags.forestUnlocked !== true
  ) {
    missingUnlocks.push("forestUnlocked");
  }
  if (
    hasBastionUnlockEvidence(unlockEvidence) &&
    unlockEvidence.flags.bastionUnlocked !== true
  ) {
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
    v2Compare: compareLegacyAndV2Saves(inputs),
  };
}

/** Floor top-level playTime so sub-ms float jitter is not a false mismatch. */
function normalizeGameStateForCompare(
  state: Record<string, unknown>,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...state };
  if (typeof copy.playTime === "number" && Number.isFinite(copy.playTime)) {
    copy.playTime = Math.floor(copy.playTime);
  }
  return copy;
}

/** Order-independent JSON canonicalize for deep equality fingerprints. */
function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = canonicalize(obj[key]);
  }
  return out;
}

function valueFingerprint(value: unknown): string {
  return JSON.stringify(canonicalize(value ?? null));
}

function prioritizeMismatchDetails(keys: string[]): string[] {
  const critical = new Set<string>(SAVE_V2_COMPARE_SLICES);
  const criticalHits = keys.filter((k) => critical.has(k.split(" ")[0]!));
  const rest = keys.filter((k) => !critical.has(k.split(" ")[0]!));
  return [...criticalHits, ...rest];
}

function capDetailKeys(keys: string[]): string[] {
  const ordered = prioritizeMismatchDetails(keys);
  const details = ordered.slice(0, SAVE_V2_MISMATCH_DETAILS_CAP);
  if (ordered.length > SAVE_V2_MISMATCH_DETAILS_CAP) {
    details.push(`…+${ordered.length - SAVE_V2_MISMATCH_DETAILS_CAP} more`);
  }
  return details;
}

function flooredPlayTime(state: Record<string, unknown>): number | null {
  const raw = state.playTime;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return Math.floor(raw);
}

/**
 * Top-level deep compare of legacy `game_state` vs sidecar `game_state_v2`.
 *
 * - Value conflicts at the same playTime → `mismatch` (cutover signal)
 * - Legacy playTime ahead of sidecar → `v2_stale` (expected dual-write lag)
 * - Key only on one side → `shape_drift` (V1 diff sparsity vs V2 full blob)
 * - UI / transient / analytics keys → `expected_noise`
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

  const base = {
    user_id: row.user_id,
    username: row.username,
    save_revision: revision,
    schema_version: schemaVersion,
    mismatchCount: null as number | null,
    shapeDriftCount: null as number | null,
    expectedNoiseCount: null as number | null,
  };

  const legacy = asObject(row.game_state);
  if (!legacy) {
    return {
      ...base,
      status: "invalid_legacy",
      details: ["legacy game_state missing or not an object"],
    };
  }

  if (row.game_state_v2 === null || row.game_state_v2 === undefined) {
    return {
      ...base,
      status: "missing_v2",
      details: ["game_state_v2 is null"],
    };
  }

  const v2 = asObject(row.game_state_v2);
  if (!v2) {
    return {
      ...base,
      status: "invalid_v2",
      details: ["game_state_v2 is not an object"],
    };
  }

  const a = normalizeGameStateForCompare(legacy);
  const b = normalizeGameStateForCompare(v2);
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const valueMismatches: string[] = [];
  const shapeDrifts: string[] = [];
  const expectedNoise: string[] = [];

  for (const key of allKeys) {
    const inA = Object.prototype.hasOwnProperty.call(a, key);
    const inB = Object.prototype.hasOwnProperty.call(b, key);
    const isNoise = SAVE_V2_COMPARE_EXPECTED_NOISE_KEYS.has(key);

    if (!inA) {
      (isNoise ? expectedNoise : shapeDrifts).push(`${key} (v2-only)`);
      continue;
    }
    if (!inB) {
      (isNoise ? expectedNoise : shapeDrifts).push(`${key} (v1-only)`);
      continue;
    }
    if (valueFingerprint(a[key]) !== valueFingerprint(b[key])) {
      (isNoise ? expectedNoise : valueMismatches).push(key);
    }
  }

  const noiseCount = expectedNoise.length > 0 ? expectedNoise.length : null;
  const shapeCount = shapeDrifts.length > 0 ? shapeDrifts.length : null;
  const v1Play = flooredPlayTime(a);
  const v2Play = flooredPlayTime(b);
  const legacyAhead =
    v1Play !== null && v2Play !== null && v1Play > v2Play;

  if (valueMismatches.length > 0) {
    // Comparing different moments in time is not a cutover bug — prod often
    // updates V1 without refreshing the DEV-only / best-effort sidecar.
    if (legacyAhead) {
      const aheadMs = v1Play! - v2Play!;
      const details = capDetailKeys([
        `playTime (v1 ahead ${aheadMs}ms)`,
        ...valueMismatches.filter((key) => key !== "playTime"),
      ]);
      return {
        ...base,
        status: "v2_stale",
        details,
        mismatchCount: valueMismatches.length,
        shapeDriftCount: shapeCount,
        expectedNoiseCount: noiseCount,
      };
    }

    return {
      ...base,
      status: "mismatch",
      details: capDetailKeys(valueMismatches),
      mismatchCount: valueMismatches.length,
      shapeDriftCount: shapeCount,
      expectedNoiseCount: noiseCount,
    };
  }

  if (shapeDrifts.length > 0) {
    return {
      ...base,
      status: "shape_drift",
      details: capDetailKeys(shapeDrifts),
      shapeDriftCount: shapeDrifts.length,
      expectedNoiseCount: noiseCount,
    };
  }

  if (expectedNoise.length > 0) {
    return {
      ...base,
      status: "expected_noise",
      details: capDetailKeys(expectedNoise),
      expectedNoiseCount: expectedNoise.length,
    };
  }

  return {
    ...base,
    status: "match",
    details: [],
  };
}

/** Rows that should appear in the admin issue table (same-moment conflicts / invalid). */
function isSaveV2DashboardIssue(row: SaveV2CompareRow): boolean {
  return (
    row.status === "mismatch" ||
    row.status === "invalid_v2" ||
    row.status === "invalid_legacy"
  );
}

export function compareLegacyAndV2Saves(
  inputs: SaveGameAnalysisInput[],
): SaveV2CompareSummary {
  const compared = inputs.map(compareLegacyVsV2Row);
  let withV2 = 0;
  let missingV2 = 0;
  let match = 0;
  let expectedNoise = 0;
  let shapeDrift = 0;
  let v2Stale = 0;
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
      case "expected_noise":
        withV2 += 1;
        expectedNoise += 1;
        break;
      case "shape_drift":
        withV2 += 1;
        shapeDrift += 1;
        break;
      case "v2_stale":
        withV2 += 1;
        v2Stale += 1;
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
    expectedNoise,
    shapeDrift,
    v2Stale,
    mismatch,
    invalidV2,
    invalidLegacy,
    // Coverage / shape / noise / stale stay in summary counts — issue table is cutover conflicts.
    rows: compared.filter(isSaveV2DashboardIssue),
  };
}
