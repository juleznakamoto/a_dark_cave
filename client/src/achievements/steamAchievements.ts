/**
 * Steam achievements bridge.
 *
 * Mirrors the in-game ring achievements to Steam. Steam unlocks fire on
 * *criteria met* (`getCount >= maxCount`) rather than on in-game claim, so a
 * player earns the Steam achievement even if they never click "Claim".
 *
 * The canonical in-game ID is `{category}-{segmentId}` (e.g. `basic-0-woodGatherer`).
 * Steam API names must match `[A-Za-z0-9_]`, so we derive a stable upper-snake
 * name (e.g. `ACH_BASIC_0_WOODGATHERER`). When defining achievements in the
 * Steamworks partner backend, use these exact API names.
 */
import type { GameState } from "@shared/schema";
import type { AchievementChartConfig } from "./achievementTypes";
import {
  basicChartConfig,
  buildingChartConfig,
  itemChartConfig,
  actionChartConfig,
  isOverallAchievementCategoryEnabled,
  overallChartConfig,
} from "./index";
import { getAchievementConfigForSteam } from "./achievementEdition";
import { isSteamBuild } from "@/lib/edition";
import { hasSteamBridge, steamUnlockAchievement } from "@/lib/steam";

const ALL_CONFIGS: AchievementChartConfig[] = [
  basicChartConfig,
  buildingChartConfig,
  itemChartConfig,
  actionChartConfig,
  ...(isOverallAchievementCategoryEnabled ? [overallChartConfig] : []),
];

/** Canonical in-game achievement id → Steam API name. */
export function toSteamApiName(canonicalId: string): string {
  return "ACH_" + canonicalId.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

interface AchievementEntry {
  canonicalId: string;
  apiName: string;
  maxCount: number;
  getCount: (state: GameState) => number;
}

let cachedEntries: AchievementEntry[] | null = null;

function getEntries(): AchievementEntry[] {
  if (cachedEntries) return cachedEntries;
  const entries: AchievementEntry[] = [];
  for (const raw of ALL_CONFIGS) {
    const config = getAchievementConfigForSteam(raw);
    for (const ring of config.rings) {
      for (const seg of ring) {
        const canonicalId = `${config.idPrefix}-${seg.segmentId}`;
        entries.push({
          canonicalId,
          apiName: toSteamApiName(canonicalId),
          maxCount: seg.maxCount,
          getCount: seg.getCount,
        });
      }
    }
  }
  cachedEntries = entries;
  return entries;
}

/** Full list of `{ canonicalId, apiName }` — handy for generating the Steam partner config. */
export function listSteamAchievementMappings(): { canonicalId: string; apiName: string }[] {
  return getEntries().map(({ canonicalId, apiName }) => ({ canonicalId, apiName }));
}

// Already-pushed Steam API names this session (avoids redundant IPC each tick).
const pushed = new Set<string>();

/**
 * Push any newly-completed achievements to Steam. Cheap to call frequently
 * (e.g. once per production cycle and on load); skips work on web.
 */
export async function syncSteamAchievements(state: GameState): Promise<void> {
  if (!isSteamBuild || !hasSteamBridge()) return;
  for (const entry of getEntries()) {
    if (pushed.has(entry.apiName)) continue;
    let count = 0;
    try {
      count = entry.getCount(state);
    } catch {
      continue;
    }
    if (count >= entry.maxCount) {
      pushed.add(entry.apiName);
      await steamUnlockAchievement(entry.apiName);
    }
  }
}
