import type { GameState } from "@shared/schema";
import {
  getInsightAmount,
  isInsightRevealInProgress,
  isInsightUnlocked,
} from "@/game/rules/insightReveal";

/** Player always starts with one construction queue slot. */
export const BASE_QUEUE_SLOTS = 1;

/** Insight cost for the first purchasable extra slot; each later slot costs a multiple. */
export const QUEUE_SLOT_UNLOCK_BASE_INSIGHT_COST = 2500;

/** Max purchasable extra slots (2) plus the base slot = 3 total. */
export const MAX_PURCHASABLE_QUEUE_SLOTS = 2;

export const MAX_QUEUE_SLOTS = BASE_QUEUE_SLOTS + MAX_PURCHASABLE_QUEUE_SLOTS;

export const QUEUE_SLOT_UNLOCK_INSIGHT_KEY = "constructionQueueSlotUnlock";

export const CONSTRUCTION_BOOST_INSIGHT_PER_MINUTE = 250;

export function isConstructionQueueEnabled(
  state: Pick<GameState, "flags">,
): boolean {
  return state.flags?.constructionQueueEnabled === true;
}

export function getBuilderLevel(
  state: Pick<GameState, "buildings">,
): number {
  const buildings = state.buildings ?? {};
  if ((buildings.buildersGuild ?? 0) >= 1) return 3;
  if ((buildings.buildersHall ?? 0) >= 1) return 2;
  if ((buildings.buildersLodge ?? 0) >= 1) return 1;
  return 0;
}

/** Highest-tier-only build time reduction (0–0.20). */
export function getBuilderBuildTimeReduction(level: number): number {
  if (level >= 3) return 0.2;
  if (level >= 2) return 0.1;
  if (level >= 1) return 0.05;
  return 0;
}

/** Highest-tier-only building cost reduction (0–0.10). */
export function getBuilderBuildCostReduction(level: number): number {
  if (level >= 3) return 0.1;
  if (level >= 2) return 0.05;
  return 0;
}

/** Extra queue slots granted by Builder building tiers (0–2). */
export function getBuildingQueueSlotCount(
  state: Pick<GameState, "buildings">,
): number {
  const level = getBuilderLevel(state);
  return (level >= 1 ? 1 : 0) + (level >= 3 ? 1 : 0);
}

export function getPurchasedQueueSlots(
  state: Pick<GameState, "constructionQueueSlotsPurchased">,
): number {
  const raw = state.constructionQueueSlotsPurchased ?? 0;
  return Math.min(Math.max(0, Math.floor(raw)), MAX_PURCHASABLE_QUEUE_SLOTS);
}

/** Total parallel build capacity: base slot + building grants + Insight purchases (max 2 extras). */
export function getTotalQueueSlots(
  state: Pick<GameState, "buildings" | "constructionQueueSlotsPurchased">,
): number {
  const extraSlots = Math.min(
    getBuildingQueueSlotCount(state) + getPurchasedQueueSlots(state),
    MAX_PURCHASABLE_QUEUE_SLOTS,
  );
  return BASE_QUEUE_SLOTS + extraSlots;
}

export function getNextPurchasableQueueSlotIndex(
  state: Pick<GameState, "buildings" | "constructionQueueSlotsPurchased">,
): number | null {
  const buildingSlots = getBuildingQueueSlotCount(state);
  const purchased = getPurchasedQueueSlots(state);
  if (buildingSlots === 0) return null;
  if (buildingSlots + purchased >= MAX_PURCHASABLE_QUEUE_SLOTS) return null;
  return purchased;
}

export function getQueueSlotUnlockCost(slotIndex: number): number {
  return QUEUE_SLOT_UNLOCK_BASE_INSIGHT_COST * (slotIndex + 1);
}

export function getNextQueueSlotUnlockCost(
  state: Pick<GameState, "buildings" | "constructionQueueSlotsPurchased">,
): number | null {
  const nextIndex = getNextPurchasableQueueSlotIndex(state);
  return nextIndex === null ? null : getQueueSlotUnlockCost(nextIndex);
}

export function canPurchaseQueueSlot(
  state: GameState,
  insightRevealing?: Record<string, number>,
): boolean {
  if (
    !isConstructionQueueEnabled(state) ||
    isInsightRevealInProgress(QUEUE_SLOT_UNLOCK_INSIGHT_KEY, insightRevealing)
  ) {
    return false;
  }
  const cost = getNextQueueSlotUnlockCost(state);
  if (cost === null) return false;
  if (!isInsightUnlocked(state)) return false;
  return getInsightAmount(state) >= cost;
}

export function getActiveBuildCount(
  state: Pick<GameState, "executionStartTimes">,
): number {
  const starts = state.executionStartTimes ?? {};
  return Object.keys(starts).filter((actionId) => actionId.startsWith("build")).length;
}

export function hasFreeQueueSlot(state: GameState): boolean {
  if (!isConstructionQueueEnabled(state)) return true;
  return getActiveBuildCount(state) < getTotalQueueSlots(state);
}

export function isConstructionBoostUnlocked(
  state: Pick<GameState, "flags" | "buildings">,
): boolean {
  return isConstructionQueueEnabled(state) && getBuilderLevel(state) >= 2;
}

export function isConstructionBoostUsed(
  state: Pick<GameState, "constructionBoostsUsed">,
  actionId: string,
): boolean {
  return state.constructionBoostsUsed?.[actionId] === true;
}

export function isBuildActionExecuting(
  state: Pick<GameState, "executionStartTimes" | "executionDurations">,
  actionId: string,
): boolean {
  const start = state.executionStartTimes?.[actionId];
  const duration = state.executionDurations?.[actionId];
  return typeof start === "number" && start > 0 && typeof duration === "number" && duration > 0;
}

export function getConstructionBoostReductionSeconds(
  state: Pick<GameState, "executionDurations">,
  actionId: string,
): number {
  const total = state.executionDurations?.[actionId] ?? 0;
  return Math.floor(total / 2);
}

export function getConstructionBoostCost(
  state: Pick<GameState, "executionDurations">,
  actionId: string,
): number {
  const reductionSeconds = getConstructionBoostReductionSeconds(state, actionId);
  const savedMinutes = reductionSeconds / 60;
  return Math.round(savedMinutes * CONSTRUCTION_BOOST_INSIGHT_PER_MINUTE);
}

export function canBoostConstruction(state: GameState, actionId: string): boolean {
  if (!isConstructionBoostUnlocked(state)) return false;
  if (!actionId.startsWith("build")) return false;
  if (!isBuildActionExecuting(state, actionId)) return false;
  if (isConstructionBoostUsed(state, actionId)) return false;
  if (!isInsightUnlocked(state)) return false;
  const cost = getConstructionBoostCost(state, actionId);
  if (cost <= 0) return false;
  return getInsightAmount(state) >= cost;
}
