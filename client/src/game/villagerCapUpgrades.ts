import type { GameState } from "@shared/schema";
import { isInsightUnlocked, getInsightAmount } from "@/game/rules/insightReveal";

/** Max villagers assignable per profession at each Insight upgrade level (0–5). */
export const VILLAGER_CAP_BY_LEVEL = [10, 20, 30, 40, 50, 100] as const;

/** Gatherers use a fixed cap (not upgraded via Insight). */
export const GATHERER_CAP = 100;

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

export function areVillagerCapsEnabled(
  state: Pick<GameState, "flags">,
): boolean {
  return state.flags?.villagerCapsEnabled === true;
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
  state: Pick<GameState, "flags" | "villagerCapUpgrades">,
  groupId: VillagerCapGroupId,
): number {
  if (!areVillagerCapsEnabled(state)) return Infinity;
  return getVillagerCapForLevel(getVillagerCapLevel(state, groupId));
}

export function getVillagerCapForJob(
  state: Pick<GameState, "flags" | "villagerCapUpgrades">,
  jobId: keyof GameState["villagers"],
): number {
  if (jobId === "gatherer") return GATHERER_CAP;
  if (!areVillagerCapsEnabled(state)) return Infinity;
  const groupId = getGroupForJob(jobId);
  if (!groupId) return Infinity;
  return getVillagerCapForGroup(state, groupId);
}

/** Insight cost to upgrade from each cap level to the next (levels 0–4 → caps 10→20 … 50→100). */
export const VILLAGER_CAP_UPGRADE_INSIGHT_COSTS = [
  100, 250, 500, 750, 1000,
] as const;

/** Insight cost to upgrade from `level` to `level + 1`. */
export function getNextCapUpgradeCost(level: number): number {
  const clamped = Math.min(Math.max(0, level), MAX_VILLAGER_CAP_LEVEL - 1);
  return VILLAGER_CAP_UPGRADE_INSIGHT_COSTS[clamped];
}

/** Insight cost per extra construction queue slot (Lodge gate, then Guild gate). */
export const CONSTRUCTION_QUEUE_SLOT_INSIGHT_COSTS = [2500, 5000] as const;

/** Insight cost to unlock construction queue slot at 0-based purchase index. */
export function getConstructionQueueSlotUnlockCost(slotIndex: number): number {
  return CONSTRUCTION_QUEUE_SLOT_INSIGHT_COSTS[slotIndex];
}

/** Insight charged per minute of construction time saved by Construction Boost. */
export const CONSTRUCTION_BOOST_INSIGHT_PER_MINUTE = 250;

/** Insight cost per villager job preset slot (bought sequentially after each archive building tier). */
export const PRESET_SLOT_INSIGHT_COSTS = [
  2500, 5000, 7500, 10000, 12500,
] as const;

/** Insight cost to unlock preset slot at 0-based purchase index. */
export function getPresetSlotUnlockCost(slotIndex: number): number {
  return PRESET_SLOT_INSIGHT_COSTS[slotIndex];
}

export function canUpgradeVillagerCap(
  state: Pick<GameState, "flags" | "villagerCapUpgrades" | "resources">,
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
