import type { GameState } from "@shared/schema";
import { populationJobs } from "@/game/population";
import { getVillagersInVillage } from "@/game/population";
import {
  getPresetSlotUnlockCost,
  getVillagerCapForJob,
} from "@/game/villagerCapUpgrades";
import { isSteamEditionActive } from "@/lib/edition";
import {
  getInsightAmount,
  isInsightRevealInProgress,
  isInsightUnlocked,
  PRESET_UNLOCK_INSIGHT_KEY,
} from "@/game/rules/insightReveal";
import { updatePopulationCounts } from "@/game/stateHelpers";

/** Preset slots unlocked per archive building tier (Scribe's → Records → Grand Archive). */
export const PRESET_SLOTS_BY_BUILDING_TIER = [2, 1, 2] as const;

export const MAX_PRESET_SLOTS = PRESET_SLOTS_BY_BUILDING_TIER.reduce(
  (sum, count) => sum + count,
  0,
);

/** Legacy shop slots (old 3-building + 2-shop layout) started at index 3. */
export const LEGACY_SHOP_PRESET_SLOT_START = 3;
export const LEGACY_SHOP_PRESET_SLOTS = 2;

/** Building chain that unlocks preset slots, lowest tier first. */
export const PRESET_UNLOCK_BUILDINGS: (keyof GameState["buildings"])[] = [
  "scribesOffice",
  "recordsHall",
  "grandArchive",
];

/** Build action id for each archive building that unlocks preset slots. */
export const PRESET_UNLOCK_BUILDING_ACTION_IDS: Record<
  (typeof PRESET_UNLOCK_BUILDINGS)[number],
  string
> = {
  scribesOffice: "buildScribesOffice",
  recordsHall: "buildRecordsHall",
  grandArchive: "buildGrandArchive",
};

type PresetSlot = NonNullable<GameState["villagerJobPresets"][number]>;
type PresetAssignments = PresetSlot["assignments"];
type VillagerJobKey = keyof GameState["villagers"];

/** Stable list of job ids (everything in `villagers` except `free`). */
const JOB_IDS = Object.keys(populationJobs) as VillagerJobKey[];

function getBuiltPresetTierCount(
  state: Pick<GameState, "buildings">,
): number {
  return PRESET_UNLOCK_BUILDINGS.reduce(
    (count, key) => count + ((state.buildings?.[key] ?? 0) > 0 ? 1 : 0),
    0,
  );
}

/** Preset slots made available to buy by built archive buildings (0–5). */
export function getBuildingPresetSlotCount(
  state: Pick<GameState, "buildings">,
): number {
  const tierCount = getBuiltPresetTierCount(state);
  let total = 0;
  for (let i = 0; i < tierCount; i++) {
    total += PRESET_SLOTS_BY_BUILDING_TIER[i];
  }
  return total;
}

/** Number of preset slots bought with Insight, 0–5. */
export function getInsightPurchasedPresetCount(
  state: Pick<GameState, "villagerPresetsPurchased">,
): number {
  const raw = state.villagerPresetsPurchased ?? 0;
  return Math.min(Math.max(0, Math.floor(raw)), MAX_PRESET_SLOTS);
}

/** Legacy shop slots (0–2) for players who bought before shop removal. */
export function getShopPresetSlotCount(
  state: Pick<GameState, "villagerPresetSlotsFromShop">,
): number {
  if (isSteamEditionActive()) return 0;
  const raw = state.villagerPresetSlotsFromShop ?? 0;
  return Math.min(Math.max(0, Math.floor(raw)), LEGACY_SHOP_PRESET_SLOTS);
}

function isLegacyShopPresetSlot(slotIndex: number): boolean {
  if (isSteamEditionActive()) return false;
  return (
    slotIndex >= LEGACY_SHOP_PRESET_SLOT_START &&
    slotIndex < LEGACY_SHOP_PRESET_SLOT_START + LEGACY_SHOP_PRESET_SLOTS
  );
}

function isLegacyShopPresetSlotUnlocked(
  state: Pick<GameState, "villagerPresetSlotsFromShop">,
  slotIndex: number,
): boolean {
  if (!isLegacyShopPresetSlot(slotIndex)) return false;
  const offset = slotIndex - LEGACY_SHOP_PRESET_SLOT_START;
  return getShopPresetSlotCount(state) > offset;
}

/** Preset slot squares shown in the UI (always show the full building-gated set). */
export function getVisiblePresetSlotCount(): number {
  return MAX_PRESET_SLOTS;
}

/** True once the first archive building exists (preset controls become visible). */
export function arePresetsVisible(
  state: Pick<GameState, "buildings">,
): boolean {
  return getBuildingPresetSlotCount(state) > 0;
}

/** Building key required to unlock a 0-based slot, or null for legacy shop slots. */
export function getPresetSlotUnlockBuildingKey(
  slotIndex: number,
): (typeof PRESET_UNLOCK_BUILDINGS)[number] | null {
  let cursor = 0;
  for (let i = 0; i < PRESET_UNLOCK_BUILDINGS.length; i++) {
    const tierSlots = PRESET_SLOTS_BY_BUILDING_TIER[i];
    if (slotIndex < cursor + tierSlots) {
      return PRESET_UNLOCK_BUILDINGS[i];
    }
    cursor += tierSlots;
  }
  return null;
}

/** Build action id for the building that unlocks a 0-based slot, or null for legacy shop slots. */
export function getPresetSlotUnlockActionId(slotIndex: number): string | null {
  const buildingKey = getPresetSlotUnlockBuildingKey(slotIndex);
  return buildingKey ? PRESET_UNLOCK_BUILDING_ACTION_IDS[buildingKey] : null;
}

/** Grey preview — archive building for this 0-based slot is not built yet. */
export function isPresetSlotBuildingLocked(
  state: Pick<GameState, "buildings" | "villagerPresetSlotsFromShop">,
  slotIndex: number,
): boolean {
  if (isLegacyShopPresetSlotUnlocked(state, slotIndex)) return false;

  const buildingKey = getPresetSlotUnlockBuildingKey(slotIndex);
  if (!buildingKey) {
    return isLegacyShopPresetSlot(slotIndex);
  }
  return (state.buildings?.[buildingKey] ?? 0) < 1;
}

/** A slot index (0-based) is usable once its building tier exists and it has been bought. */
export function isPresetSlotUnlocked(
  state: Pick<
    GameState,
    "buildings" | "villagerPresetsPurchased" | "villagerPresetSlotsFromShop"
  >,
  slotIndex: number,
): boolean {
  if (slotIndex < 0 || slotIndex >= MAX_PRESET_SLOTS) return false;
  if (isLegacyShopPresetSlotUnlocked(state, slotIndex)) return true;
  if (isPresetSlotBuildingLocked(state, slotIndex)) return false;
  return slotIndex < getInsightPurchasedPresetCount(state);
}

/** Grey × — building met but Insight purchase still required. */
export function isPresetSlotPurchaseLocked(
  state: Pick<
    GameState,
    "buildings" | "villagerPresetsPurchased" | "villagerPresetSlotsFromShop"
  >,
  slotIndex: number,
): boolean {
  if (isLegacyShopPresetSlot(slotIndex)) {
    return !isLegacyShopPresetSlotUnlocked(state, slotIndex);
  }
  return (
    !isPresetSlotBuildingLocked(state, slotIndex) &&
    !isPresetSlotUnlocked(state, slotIndex)
  );
}

/** + — building met; unlockable with Insight (excludes legacy shop slots). */
export function isPresetSlotInsightPurchaseLocked(
  state: Pick<
    GameState,
    "buildings" | "villagerPresetsPurchased" | "villagerPresetSlotsFromShop"
  >,
  slotIndex: number,
): boolean {
  if (isLegacyShopPresetSlot(slotIndex)) return false;
  return isPresetSlotPurchaseLocked(state, slotIndex);
}

/**
 * 0-based index of the next slot available to purchase, or null when none is
 * available (all purchased, or no further archive building built yet).
 */
export function getNextPurchasablePresetSlotIndex(
  state: Pick<GameState, "buildings" | "villagerPresetsPurchased">,
): number | null {
  const purchased = getInsightPurchasedPresetCount(state);
  const buildingAvailable = getBuildingPresetSlotCount(state);
  if (purchased >= buildingAvailable || purchased >= MAX_PRESET_SLOTS) {
    return null;
  }
  if (isPresetSlotBuildingLocked(state, purchased)) return null;
  return purchased;
}

/** Insight cost to unlock the slot at the given 0-based index. */
export function getPresetUnlockCost(slotIndex: number): number {
  return getPresetSlotUnlockCost(slotIndex);
}

/** Insight cost for the next purchasable slot, or null when none is available. */
export function getNextPresetUnlockCost(
  state: Pick<GameState, "buildings" | "villagerPresetsPurchased">,
): number | null {
  const nextIndex = getNextPurchasablePresetSlotIndex(state);
  return nextIndex === null ? null : getPresetUnlockCost(nextIndex);
}

/** True when a slot can be purchased now (slot available, Insight unlocked & affordable). */
export function canPurchasePresetSlot(
  state: GameState,
  insightRevealing?: Record<string, number>,
): boolean {
  if (
    isInsightRevealInProgress(PRESET_UNLOCK_INSIGHT_KEY, insightRevealing)
  ) {
    return false;
  }
  const cost = getNextPresetUnlockCost(state);
  if (cost === null) return false;
  if (!isInsightUnlocked(state)) return false;
  return getInsightAmount(state) >= cost;
}

/**
 * One-time load migration: slots that already had saved presets stay unlocked
 * without Insight payment. Skipped in dev builds so the unlock flow can be tested.
 */
export function migrateVillagerPresetsPurchasedOnLoad(
  state: Pick<
    GameState,
    "buildings" | "villagerJobPresets" | "villagerPresetsPurchased"
  >,
): Partial<Pick<GameState, "villagerPresetsPurchased">> | null {
  if (import.meta.env.DEV) return null;

  const usedCount = countUsedPresetSlots(state);
  if (usedCount <= 0) return null;

  const current = getInsightPurchasedPresetCount(state);
  const buildingAvailable = getBuildingPresetSlotCount(state);
  const target = Math.min(usedCount, buildingAvailable, MAX_PRESET_SLOTS);
  if (target <= current) return null;

  return { villagerPresetsPurchased: target };
}

/** First usable 0-based preset slot index, or null when none are unlocked. */
export function getFirstUnlockedPresetSlotIndex(
  state: Pick<
    GameState,
    "buildings" | "villagerPresetsPurchased" | "villagerPresetSlotsFromShop"
  >,
): number | null {
  for (let i = 0; i < MAX_PRESET_SLOTS; i++) {
    if (isPresetSlotUnlocked(state, i)) return i;
  }
  return null;
}

/** True when at least one preset slot is usable. */
export function hasAnyUnlockedPresetSlot(
  state: Pick<
    GameState,
    "buildings" | "villagerPresetsPurchased" | "villagerPresetSlotsFromShop"
  >,
): boolean {
  return getFirstUnlockedPresetSlotIndex(state) !== null;
}

/**
 * Highest 1-based slot count implied by saved preset data (0 when none saved).
 * Used for backwards-compat load migration only.
 */
export function countUsedPresetSlots(
  state: Pick<GameState, "villagerJobPresets">,
): number {
  const presets = state.villagerJobPresets ?? [];
  let highestUsedIndex = -1;
  for (let i = 0; i < MAX_PRESET_SLOTS; i++) {
    if (presets[i] != null) {
      highestUsedIndex = i;
    }
  }
  return highestUsedIndex >= 0 ? highestUsedIndex + 1 : 0;
}

/** Saved preset for a 0-based slot index, or null when empty/out of range. */
export function getPresetSlot(
  state: Pick<GameState, "villagerJobPresets">,
  slotIndex: number,
): PresetSlot | null {
  return state.villagerJobPresets?.[slotIndex] ?? null;
}

/** Snapshot current job counts (excludes `free` and zero entries). */
export function snapshotAssignments(
  villagers: GameState["villagers"],
): PresetAssignments {
  const assignments: PresetAssignments = {};
  for (const jobId of JOB_IDS) {
    const count = villagers[jobId] ?? 0;
    if (count > 0) {
      assignments[jobId] = count;
    }
  }
  return assignments;
}

function clampToCap(
  state: Pick<GameState, "flags" | "villagerCapUpgrades">,
  jobId: VillagerJobKey,
  value: number,
): number {
  const cap = getVillagerCapForJob(state, jobId);
  return Math.min(value, cap);
}

/** Mirror `assignVillagerToJob` first-assign tracking when a preset introduces hunters/gatherers. */
function computeFirstAssignSeen(
  state: GameState,
  nextVillagers: GameState["villagers"],
): Record<string, boolean> {
  const seen: Record<string, boolean> = {};
  if ((nextVillagers.hunter ?? 0) > 0 && (state.villagers.hunter ?? 0) === 0) {
    seen.hashunter = true;
  }
  if (
    (nextVillagers.gatherer ?? 0) > 0 &&
    (state.villagers.gatherer ?? 0) === 0
  ) {
    seen.hasgatherer = true;
  }
  return seen;
}

/**
 * Redistribute the village workforce to match a preset.
 *
 * - Workforce = all villagers in the village (assigned jobs + free); expedition villagers are
 *   tracked separately in `expeditionVillagers` and are left untouched.
 * - If the workforce meets or exceeds the preset total, jobs are filled to the preset (clamped by
 *   per-profession caps) and any surplus goes to `free`.
 * - If the workforce shrank below the preset total, jobs are filled proportionally to the preset.
 */
export function applyPresetAssignments(
  state: GameState,
  assignments: PresetAssignments,
): Partial<GameState> {
  const workforce = getVillagersInVillage(state);

  const desired: Partial<Record<VillagerJobKey, number>> = {};
  let presetSum = 0;
  for (const jobId of JOB_IDS) {
    const raw = assignments[jobId];
    const value = typeof raw === "number" ? Math.max(0, Math.floor(raw)) : 0;
    if (value > 0) {
      desired[jobId] = value;
      presetSum += value;
    }
  }

  const next: Record<VillagerJobKey, number> = {} as Record<
    VillagerJobKey,
    number
  >;
  for (const jobId of JOB_IDS) {
    next[jobId] = 0;
  }

  if (presetSum > 0 && workforce > 0) {
    if (workforce >= presetSum) {
      for (const jobId of JOB_IDS) {
        next[jobId] = clampToCap(state, jobId, desired[jobId] ?? 0);
      }
    } else {
      const fractional: { jobId: VillagerJobKey; frac: number }[] = [];
      let assignedSoFar = 0;
      for (const jobId of JOB_IDS) {
        const target = ((desired[jobId] ?? 0) * workforce) / presetSum;
        const floored = Math.floor(target);
        next[jobId] = floored;
        assignedSoFar += floored;
        fractional.push({ jobId, frac: target - floored });
      }
      let leftover = workforce - assignedSoFar;
      fractional.sort((a, b) => b.frac - a.frac);
      for (const { jobId } of fractional) {
        if (leftover <= 0) break;
        if ((desired[jobId] ?? 0) <= 0) continue;
        next[jobId] += 1;
        leftover -= 1;
      }
      for (const jobId of JOB_IDS) {
        next[jobId] = clampToCap(state, jobId, next[jobId]);
      }
    }
  }

  let assignedTotal = 0;
  const villagers: GameState["villagers"] = { ...state.villagers };
  for (const jobId of JOB_IDS) {
    villagers[jobId] = next[jobId];
    assignedTotal += next[jobId];
  }
  villagers.free = Math.max(0, workforce - assignedTotal);

  const popPatch = updatePopulationCounts({ ...state, villagers });
  const seenAdditions = computeFirstAssignSeen(state, villagers);

  let story = popPatch.story;
  if (Object.keys(seenAdditions).length > 0) {
    const baseStory = popPatch.story ?? state.story;
    story = {
      ...baseStory,
      seen: {
        ...baseStory.seen,
        ...seenAdditions,
      },
    };
  }

  return {
    villagers,
    ...popPatch,
    ...(story ? { story } : {}),
  };
}
