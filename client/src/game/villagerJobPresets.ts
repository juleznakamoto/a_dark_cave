import type { GameState } from "@shared/schema";
import { populationJobs } from "@/game/population";
import { getVillagersInVillage } from "@/game/population";
import { getVillagerCapForJob } from "@/game/villagerCapUpgrades";
import { isSteamBuild } from "@/lib/edition";
import {
  getInsightAmount,
  isInsightRevealInProgress,
  isInsightUnlocked,
  PRESET_UNLOCK_INSIGHT_KEY,
} from "@/game/rules/insightReveal";
import { updatePopulationCounts } from "@/game/stateHelpers";

/** Base Insight cost for the first preset slot; each later slot costs a multiple of this. */
export const PRESET_UNLOCK_BASE_INSIGHT_COST = 2500;

/** Slots unlocked via the Scribe's Office building chain (one per building). */
export const MAX_BUILDING_PRESET_SLOTS = 3;

/** Extra slots granted by the one-time `additional_preset_slots` shop purchase. */
export const SHOP_ADDITIONAL_PRESET_SLOTS = 2;

/** 0-based index of the first shop-purchased preset slot (after building-gated slots). */
export const SHOP_PRESET_SLOT_INDEX = MAX_BUILDING_PRESET_SLOTS;

/** Total preset slots shown in the UI (building-unlocked + shop-purchased). */
export const MAX_PRESET_SLOTS =
  MAX_BUILDING_PRESET_SLOTS + SHOP_ADDITIONAL_PRESET_SLOTS;

/** Building chain that unlocks preset slots, lowest tier first (one slot each). */
export const PRESET_UNLOCK_BUILDINGS: (keyof GameState["buildings"])[] = [
  "scribesOffice",
  "recordsHall",
  "grandArchive",
];

/** Build action id for each archive building that unlocks a preset slot. */
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

/** Number of preset slots made *available to buy* by built archive buildings (0-3). */
export function getBuildingPresetSlotCount(
  state: Pick<GameState, "buildings">,
): number {
  return PRESET_UNLOCK_BUILDINGS.reduce(
    (count, key) => count + ((state.buildings?.[key] ?? 0) > 0 ? 1 : 0),
    0,
  );
}

/** Number of slots the player has bought with Insight (building-gated), 0-3. */
export function getInsightPurchasedPresetCount(
  state: Pick<GameState, "villagerPresetsPurchased">,
): number {
  const raw = state.villagerPresetsPurchased ?? 0;
  return Math.min(Math.max(0, Math.floor(raw)), MAX_BUILDING_PRESET_SLOTS);
}

/** Number of extra slots granted by the `additional_preset_slots` shop purchase, 0-2. Steam has no shop slots. */
export function getShopPresetSlotCount(
  state: Pick<GameState, "villagerPresetSlotsFromShop">,
): number {
  if (isSteamBuild) return 0;
  const raw = state.villagerPresetSlotsFromShop ?? 0;
  return Math.min(Math.max(0, Math.floor(raw)), SHOP_ADDITIONAL_PRESET_SLOTS);
}

/** True once the additional preset slots have been bought from the shop. */
export function areAdditionalPresetSlotsPurchased(
  state: Pick<GameState, "villagerPresetSlotsFromShop">,
): boolean {
  return getShopPresetSlotCount(state) >= SHOP_ADDITIONAL_PRESET_SLOTS;
}

export function isShopPresetSlot(slotIndex: number): boolean {
  if (isSteamBuild) return false;
  return (
    slotIndex >= SHOP_PRESET_SLOT_INDEX &&
    slotIndex < SHOP_PRESET_SLOT_INDEX + SHOP_ADDITIONAL_PRESET_SLOTS
  );
}

function getShopPresetSlotOffset(slotIndex: number): number | null {
  if (!isShopPresetSlot(slotIndex)) return null;
  return slotIndex - SHOP_PRESET_SLOT_INDEX;
}

/** Total usable preset slots (Insight-bought + shop-bought), 0-5. */
export function getPurchasedPresetCount(
  state: Pick<
    GameState,
    "villagerPresetsPurchased" | "villagerPresetSlotsFromShop"
  >,
): number {
  return getInsightPurchasedPresetCount(state) + getShopPresetSlotCount(state);
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
  const target = Math.min(usedCount, buildingAvailable, MAX_BUILDING_PRESET_SLOTS);
  if (target <= current) return null;

  return { villagerPresetsPurchased: target };
}

/** True once the first archive building exists (preset controls become visible). */
export function arePresetsVisible(
  state: Pick<GameState, "buildings">,
): boolean {
  return getBuildingPresetSlotCount(state) > 0;
}

/** Preset slot squares shown in the UI (building-gated slots + purchased shop slots). */
export function getVisiblePresetSlotCount(
  state?: Pick<GameState, "villagerPresetSlotsFromShop">,
): number {
  const buildingGated = MAX_BUILDING_PRESET_SLOTS;
  if (!state) return buildingGated;
  return buildingGated + getShopPresetSlotCount(state);
}

/** Grey preview — archive building for this 0-based slot is not built yet. */
export function isPresetSlotBuildingLocked(
  state: Pick<GameState, "buildings">,
  slotIndex: number,
): boolean {
  if (slotIndex < 0 || slotIndex >= MAX_BUILDING_PRESET_SLOTS) {
    return false;
  }
  const buildingKey = PRESET_UNLOCK_BUILDINGS[slotIndex];
  return (state.buildings?.[buildingKey] ?? 0) < 1;
}

/** A slot index (0-based) is usable once its building exists and it has been bought. */
export function isPresetSlotUnlocked(
  state: Pick<
    GameState,
    "buildings" | "villagerPresetsPurchased" | "villagerPresetSlotsFromShop"
  >,
  slotIndex: number,
): boolean {
  if (slotIndex < 0) return false;
  if (isShopPresetSlot(slotIndex)) {
    const shopOffset = getShopPresetSlotOffset(slotIndex);
    return shopOffset !== null && getShopPresetSlotCount(state) > shopOffset;
  }
  if (isPresetSlotBuildingLocked(state, slotIndex)) return false;
  return slotIndex < getInsightPurchasedPresetCount(state);
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

/** True when at least one preset slot is usable (Insight- or shop-bought). */
export function hasAnyUnlockedPresetSlot(
  state: Pick<
    GameState,
    "buildings" | "villagerPresetsPurchased" | "villagerPresetSlotsFromShop"
  >,
): boolean {
  return getFirstUnlockedPresetSlotIndex(state) !== null;
}

/** Grey × — building met but Insight purchase still required (shop slots only). */
export function isPresetSlotPurchaseLocked(
  state: Pick<
    GameState,
    "buildings" | "villagerPresetsPurchased" | "villagerPresetSlotsFromShop"
  >,
  slotIndex: number,
): boolean {
  if (isShopPresetSlot(slotIndex)) {
    const shopOffset = getShopPresetSlotOffset(slotIndex);
    return shopOffset === null || getShopPresetSlotCount(state) <= shopOffset;
  }
  return (
    !isPresetSlotBuildingLocked(state, slotIndex) &&
    !isPresetSlotUnlocked(state, slotIndex)
  );
}

/**
 * 0-based index of the next slot available to purchase, or null when none is
 * available (all purchased, or no further archive building built yet). Slots are
 * bought strictly one after another — slot N requires its matching building first.
 */
export function getNextPurchasablePresetSlotIndex(
  state: Pick<GameState, "buildings" | "villagerPresetsPurchased">,
): number | null {
  const purchased = getInsightPurchasedPresetCount(state);
  if (purchased >= MAX_BUILDING_PRESET_SLOTS) return null;
  if (isPresetSlotBuildingLocked(state, purchased)) return null;
  return purchased;
}

/** Insight cost to unlock the slot at the given 0-based index (2500, 5000, 7500). */
export function getPresetUnlockCost(slotIndex: number): number {
  return PRESET_UNLOCK_BASE_INSIGHT_COST * (slotIndex + 1);
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
    isInsightRevealInProgress(
      PRESET_UNLOCK_INSIGHT_KEY,
      insightRevealing,
    )
  ) {
    return false;
  }
  const cost = getNextPresetUnlockCost(state);
  if (cost === null) return false;
  if (!isInsightUnlocked(state)) return false;
  return getInsightAmount(state) >= cost;
}

/** Building key required to unlock a 0-based slot (slots 0-2 only). */
export function getPresetSlotUnlockBuildingKey(
  slotIndex: number,
): (typeof PRESET_UNLOCK_BUILDINGS)[number] | null {
  if (slotIndex < 0 || slotIndex >= MAX_BUILDING_PRESET_SLOTS) {
    return null;
  }
  return PRESET_UNLOCK_BUILDINGS[slotIndex];
}

/** Build action id for the building that unlocks a 0-based slot, or null for purchase slots. */
export function getPresetSlotUnlockActionId(slotIndex: number): string | null {
  const buildingKey = getPresetSlotUnlockBuildingKey(slotIndex);
  return buildingKey ? PRESET_UNLOCK_BUILDING_ACTION_IDS[buildingKey] : null;
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
