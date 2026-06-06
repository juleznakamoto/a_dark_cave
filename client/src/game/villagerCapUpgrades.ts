import type { GameState } from "@shared/schema";
import { isInsightUnlocked, getInsightAmount } from "@/game/rules/insightReveal";

/** Max villagers assignable per profession at each Insight upgrade level (0–5). */
export const VILLAGER_CAP_BY_LEVEL = [10, 20, 30, 40, 50, 100] as const;

export const MAX_VILLAGER_CAP_LEVEL = 5;

export type VillagerCapGroupId =
  | "hunter"
  | "miner"
  | "forger"
  | "tanner"
  | "scholar"
  | "alchemist";

export type VillagerCapGroupConfig = {
  chain: string[];
  professions: (keyof GameState["villagers"])[];
};

export const VILLAGER_CAP_GROUPS: Record<
  VillagerCapGroupId,
  VillagerCapGroupConfig
> = {
  hunter: {
    chain: ["cabin", "greatCabin", "grandHunterLodge"],
    professions: ["hunter"],
  },
  miner: {
    chain: ["shallowPit", "deepeningPit", "deepPit", "bottomlessPit"],
    professions: [
      "iron_miner",
      "coal_miner",
      "sulfur_miner",
      "obsidian_miner",
      "adamant_miner",
      "moonstone_miner",
    ],
  },
  forger: {
    chain: ["foundry", "primeFoundry", "masterworkFoundry"],
    professions: ["steel_forger", "blacksteel_forger"],
  },
  tanner: {
    chain: ["tannery", "masterTannery", "highTannery"],
    professions: ["tanner"],
  },
  scholar: {
    chain: ["clerksHut", "scriptorium", "inkwardenAcademy"],
    professions: ["scholar"],
  },
  alchemist: {
    chain: ["alchemistHall"],
    professions: ["powder_maker", "ashfire_dust_maker"],
  },
};

const JOB_TO_GROUP = new Map<string, VillagerCapGroupId>();
const BUILDING_TO_GROUP = new Map<string, VillagerCapGroupId>();

for (const [groupId, config] of Object.entries(VILLAGER_CAP_GROUPS) as [
  VillagerCapGroupId,
  VillagerCapGroupConfig,
][]) {
  for (const job of config.professions) {
    JOB_TO_GROUP.set(job, groupId);
  }
  for (const buildingKey of config.chain) {
    BUILDING_TO_GROUP.set(buildingKey, groupId);
  }
}

export type VillagerCapGateState = Pick<GameState, "flags"> & {
  devMode?: boolean;
};

/** New-game flag + dev build only until the feature ships broadly. */
export function areVillagerCapsEnabled(state: VillagerCapGateState): boolean {
  return (
    state.devMode === true && state.flags?.villagerCapsEnabled === true
  );
}

export function getGroupForJob(
  jobId: string,
): VillagerCapGroupId | undefined {
  return JOB_TO_GROUP.get(jobId);
}

export function getGroupForBuildingKey(
  buildingKey: string,
): VillagerCapGroupId | undefined {
  return BUILDING_TO_GROUP.get(buildingKey);
}

export function getVillagerCapLevel(
  state: Pick<GameState, "villagerCapUpgrades">,
  groupId: VillagerCapGroupId,
): number {
  const raw = state.villagerCapUpgrades?.[groupId] ?? 0;
  return Math.min(Math.max(0, raw), MAX_VILLAGER_CAP_LEVEL);
}

export function getVillagerCapForLevel(level: number): number {
  const clamped = Math.min(Math.max(0, level), MAX_VILLAGER_CAP_LEVEL);
  return VILLAGER_CAP_BY_LEVEL[clamped];
}

export function getVillagerCapForGroup(
  state: Pick<GameState, "villagerCapUpgrades"> & VillagerCapGateState,
  groupId: VillagerCapGroupId,
): number {
  if (!areVillagerCapsEnabled(state)) return Infinity;
  return getVillagerCapForLevel(getVillagerCapLevel(state, groupId));
}

export function getVillagerCapForJob(
  state: Pick<GameState, "villagerCapUpgrades"> & VillagerCapGateState,
  jobId: keyof GameState["villagers"],
): number {
  if (!areVillagerCapsEnabled(state)) return Infinity;
  const groupId = getGroupForJob(jobId);
  if (!groupId) return Infinity;
  return getVillagerCapForGroup(state, groupId);
}

/** Insight cost to upgrade from `level` to `level + 1`. */
export function getNextCapUpgradeCost(level: number): number {
  return 50 * (level + 1);
}

export function canUpgradeVillagerCap(
  state: Pick<GameState, "villagerCapUpgrades" | "resources"> &
    VillagerCapGateState,
  groupId: VillagerCapGroupId,
): boolean {
  if (!areVillagerCapsEnabled(state)) return false;
  if (!isInsightUnlocked(state)) return false;
  const level = getVillagerCapLevel(state, groupId);
  if (level >= MAX_VILLAGER_CAP_LEVEL) return false;
  const cost = getNextCapUpgradeCost(level);
  return getInsightAmount(state) >= cost;
}

/** Insight glyph used in resources panel and villager-cap UI. */
export const INSIGHT_GLYPH = "🟖";

/** Tailwind class for Insight-colored text (matches resources panel). */
export const INSIGHT_TEXT_CLASS = "text-blue-600";
