import type { GameState } from "@shared/schema";
import { populationJobs } from "@/game/population";
import { getVillagersInVillage } from "@/game/population";
import { getVillagerCapForJob } from "@/game/villagerCapUpgrades";
import { updatePopulationCounts } from "@/game/stateHelpers";

/** Slots unlocked via the Scribe's Office building chain (one per building). */
export const MAX_BUILDING_PRESET_SLOTS = 3;

/** Total preset slots shown in the UI (matches building-unlocked slots for now). */
export const MAX_PRESET_SLOTS = MAX_BUILDING_PRESET_SLOTS;

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

/** Number of preset slots currently unlocked by built archive buildings (0-3). */
export function getUnlockedPresetCount(
  state: Pick<GameState, "buildings">,
): number {
  return PRESET_UNLOCK_BUILDINGS.reduce(
    (count, key) => count + ((state.buildings?.[key] ?? 0) > 0 ? 1 : 0),
    0,
  );
}

/** True once the first archive building exists (preset controls become visible). */
export function arePresetsVisible(
  state: Pick<GameState, "buildings">,
): boolean {
  return getUnlockedPresetCount(state) > 0;
}

/** A slot index (0-based) is usable when within the unlocked building count. */
export function isPresetSlotUnlocked(
  state: Pick<GameState, "buildings">,
  slotIndex: number,
): boolean {
  return slotIndex >= 0 && slotIndex < getUnlockedPresetCount(state);
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
