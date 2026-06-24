import type { GameState } from "@shared/schema";
import {
  getInsightAmount,
  isInsightRevealInProgress,
  isInsightUnlocked,
} from "@/game/rules/insightReveal";
import { isSteamBuild } from "@/lib/edition";

/** Player always starts with one construction queue slot. */
export const BASE_QUEUE_SLOTS = 1;

/** Insight cost per extra slot purchase (Lodge unlock, then Guild unlock). */
export const QUEUE_SLOT_UNLOCK_INSIGHT_COSTS = [2500, 5000] as const;

/** Max purchasable extra slots (2) via Insight, plus the base slot. */
export const MAX_PURCHASABLE_QUEUE_SLOTS = 2;

/** Extra slots granted by the one-time `additional_construction_queue_slot` shop purchase. */
export const SHOP_ADDITIONAL_QUEUE_SLOTS = 2;

/** 0-based index of the first shop-purchased queue slot (after base + Insight slots). */
export const SHOP_QUEUE_SLOT_INDEX =
  BASE_QUEUE_SLOTS + MAX_PURCHASABLE_QUEUE_SLOTS;

export const MAX_QUEUE_SLOTS =
  BASE_QUEUE_SLOTS + MAX_PURCHASABLE_QUEUE_SLOTS + SHOP_ADDITIONAL_QUEUE_SLOTS;

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

/** Purchasable extra slots unlocked by Builder's Lodge (1) and Builder's Guild (2). */
export function getBuildingQueueSlotCount(
  state: Pick<GameState, "buildings">,
): number {
  const buildings = state.buildings ?? {};
  let count = 0;
  if ((buildings.buildersLodge ?? 0) >= 1) count += 1;
  if ((buildings.buildersGuild ?? 0) >= 1) count += 1;
  return count;
}

export function isShopQueueSlot(slotIndex: number): boolean {
  if (isSteamBuild) return false;
  return (
    slotIndex >= SHOP_QUEUE_SLOT_INDEX &&
    slotIndex < SHOP_QUEUE_SLOT_INDEX + SHOP_ADDITIONAL_QUEUE_SLOTS
  );
}

function getShopSlotOffset(slotIndex: number): number | null {
  if (!isShopQueueSlot(slotIndex)) return null;
  return slotIndex - SHOP_QUEUE_SLOT_INDEX;
}

/** Number of extra slots granted by the shop purchase, 0-2. Steam has no shop slots. */
export function getShopQueueSlotCount(
  state: Pick<GameState, "constructionQueueSlotsFromShop">,
): number {
  if (isSteamBuild) return 0;
  const raw = state.constructionQueueSlotsFromShop ?? 0;
  return Math.min(Math.max(0, Math.floor(raw)), SHOP_ADDITIONAL_QUEUE_SLOTS);
}

/** True once the additional construction queue slots have been bought from the shop. */
export function areAdditionalConstructionQueueSlotPurchased(
  state: Pick<GameState, "constructionQueueSlotsFromShop">,
): boolean {
  return getShopQueueSlotCount(state) >= SHOP_ADDITIONAL_QUEUE_SLOTS;
}

/** True when the "+" shop purchase for 2 extra queue slots should appear. */
export function isAdditionalConstructionQueueSlotPurchaseAvailable(
  state: Pick<GameState, "buildings" | "constructionQueueSlotsFromShop">,
): boolean {
  if (isSteamBuild) return false;
  return (
    (state.buildings?.buildersHall ?? 0) >= 1 &&
    !areAdditionalConstructionQueueSlotPurchased(state)
  );
}

/** Queue slot squares shown in the UI (building-gated slots + purchased shop slots). */
export function getVisibleQueueSlotCount(
  state?: Pick<GameState, "constructionQueueSlotsFromShop">,
): number {
  const buildingGated = BASE_QUEUE_SLOTS + MAX_PURCHASABLE_QUEUE_SLOTS;
  if (!state) return buildingGated;
  return buildingGated + getShopQueueSlotCount(state);
}

export function getPurchasedQueueSlots(
  state: Pick<GameState, "constructionQueueSlotsPurchased">,
): number {
  const raw = state.constructionQueueSlotsPurchased ?? 0;
  return Math.min(Math.max(0, Math.floor(raw)), MAX_PURCHASABLE_QUEUE_SLOTS);
}

/** 0-based slot index: building tier allows buying this extra slot. */
export function isQueueSlotBuildingUnlocked(
  state: Pick<GameState, "buildings">,
  slotIndex: number,
): boolean {
  if (slotIndex === 0) return true;
  const buildings = state.buildings ?? {};
  if (slotIndex === 1) return (buildings.buildersLodge ?? 0) >= 1;
  if (slotIndex === 2) return (buildings.buildersGuild ?? 0) >= 1;
  return false;
}

/** 0-based slot index: Insight purchase completed for this extra slot. */
export function isQueueSlotPaidFor(
  state: Pick<GameState, "constructionQueueSlotsPurchased">,
  slotIndex: number,
): boolean {
  if (slotIndex === 0) return true;
  return getPurchasedQueueSlots(state) >= slotIndex;
}

/** 0-based slot index: usable for parallel builds (base slot or paid + building met). */
export function isQueueSlotActive(
  state: Pick<
    GameState,
    "buildings" | "constructionQueueSlotsPurchased" | "constructionQueueSlotsFromShop"
  >,
  slotIndex: number,
): boolean {
  if (slotIndex === 0) return true;
  if (isShopQueueSlot(slotIndex)) {
    const shopOffset = getShopSlotOffset(slotIndex);
    return (
      shopOffset !== null && getShopQueueSlotCount(state) > shopOffset
    );
  }
  return (
    isQueueSlotBuildingUnlocked(state, slotIndex) &&
    isQueueSlotPaidFor(state, slotIndex)
  );
}

/** Grey × — building tier for this slot is not built yet. */
export function isQueueSlotBuildingLocked(
  state: Pick<GameState, "buildings">,
  slotIndex: number,
): boolean {
  if (isShopQueueSlot(slotIndex)) return false;
  return slotIndex > 0 && !isQueueSlotBuildingUnlocked(state, slotIndex);
}

/** Grey × — building met but Insight purchase still required (or shop slot not bought). */
export function isQueueSlotPurchaseLocked(
  state: Pick<
    GameState,
    "buildings" | "constructionQueueSlotsPurchased" | "constructionQueueSlotsFromShop"
  >,
  slotIndex: number,
): boolean {
  if (slotIndex === 0) return false;
  if (isShopQueueSlot(slotIndex)) {
    const shopOffset = getShopSlotOffset(slotIndex);
    return shopOffset === null || getShopQueueSlotCount(state) <= shopOffset;
  }
  return (
    isQueueSlotBuildingUnlocked(state, slotIndex) &&
    !isQueueSlotPaidFor(state, slotIndex)
  );
}

/** Grey × in UI — slot is not yet usable (building and/or Insight missing). */
export function isQueueSlotLockedForUi(
  state: Pick<
    GameState,
    "buildings" | "constructionQueueSlotsPurchased" | "constructionQueueSlotsFromShop"
  >,
  slotIndex: number,
): boolean {
  return !isQueueSlotActive(state, slotIndex);
}

/** Next extra slot to buy: 0 after Lodge (2500 Insight), 1 after Guild (5000 Insight). */
export function getNextPurchasableQueueSlotIndex(
  state: Pick<GameState, "buildings" | "constructionQueueSlotsPurchased">,
): number | null {
  const purchased = getPurchasedQueueSlots(state);
  if (purchased >= MAX_PURCHASABLE_QUEUE_SLOTS) return null;

  const buildings = state.buildings ?? {};
  const nextIndex = purchased;

  if (nextIndex === 0 && (buildings.buildersLodge ?? 0) >= 1) return 0;
  if (nextIndex === 1 && (buildings.buildersGuild ?? 0) >= 1) return 1;

  return null;
}

/** 0-based UI array index for the next Insight purchase (same index as VillagePanel loop `i`). */
export function getNextPurchasableUiSlotIndex(
  state: Pick<GameState, "buildings" | "constructionQueueSlotsPurchased">,
): number | null {
  const nextExtra = getNextPurchasableQueueSlotIndex(state);
  return nextExtra === null ? null : nextExtra + BASE_QUEUE_SLOTS;
}

/** Whether this 0-based UI slot (not tooltip label) is the next Insight unlock. */
export function isQueueSlotNextPurchasable(
  state: Pick<GameState, "buildings" | "constructionQueueSlotsPurchased">,
  slotIndex: number,
): boolean {
  const nextUiSlot = getNextPurchasableUiSlotIndex(state);
  return nextUiSlot !== null && nextUiSlot === slotIndex;
}

/** Total parallel build capacity (game logic). */
export function getTotalQueueSlots(
  state: Pick<
    GameState,
    "buildings" | "constructionQueueSlotsPurchased" | "constructionQueueSlotsFromShop"
  >,
): number {
  let total = 0;
  for (let i = 0; i < MAX_QUEUE_SLOTS; i++) {
    if (isQueueSlotActive(state, i)) total++;
  }
  return total;
}

export function getQueueSlotUnlockCost(slotIndex: number): number {
  return QUEUE_SLOT_UNLOCK_INSIGHT_COSTS[slotIndex];
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

/** 0-based slot index: currently occupied by an in-progress build (UI red indicator). */
export function isQueueSlotInUse(
  state: Pick<
    GameState,
    | "buildings"
    | "constructionQueueSlotsPurchased"
    | "constructionQueueSlotsFromShop"
    | "executionStartTimes"
  >,
  slotIndex: number,
): boolean {
  if (!isQueueSlotActive(state, slotIndex)) return false;
  const activeBuilds = getActiveBuildCount(state);
  if (activeBuilds === 0) return false;

  let activeSlotRank = 0;
  for (let i = 0; i <= slotIndex; i++) {
    if (isQueueSlotActive(state, i)) {
      activeSlotRank++;
    }
  }
  return activeSlotRank <= activeBuilds;
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
  if (total <= 0) return 0;
  return Math.max(1, Math.ceil(total / 2));
}

export function getBuildExecutionRemainingSeconds(
  state: Pick<GameState, "executionStartTimes" | "executionDurations">,
  actionId: string,
  now = Date.now(),
): number {
  const start = state.executionStartTimes?.[actionId];
  const duration = state.executionDurations?.[actionId];
  if (typeof start !== "number" || start <= 0 || typeof duration !== "number" || duration <= 0) {
    return 0;
  }
  const elapsed = (now - start) / 1000;
  return Math.max(0, duration - elapsed);
}

/** True when less time remains than the 50% skip — boost completes the build. */
export function constructionBoostWillFinishBuild(
  state: Pick<GameState, "executionStartTimes" | "executionDurations">,
  actionId: string,
  now = Date.now(),
): boolean {
  const remaining = getBuildExecutionRemainingSeconds(state, actionId, now);
  const reduction = getConstructionBoostReductionSeconds(state, actionId);
  return remaining > 0 && remaining < reduction;
}

export function getConstructionBoostCost(
  state: Pick<GameState, "executionDurations">,
  actionId: string,
): number {
  const reductionSeconds = getConstructionBoostReductionSeconds(state, actionId);
  const savedMinutes = reductionSeconds / 60;
  const rawCost = savedMinutes * CONSTRUCTION_BOOST_INSIGHT_PER_MINUTE;
  if (rawCost <= 0) return 0;
  return (
    Math.ceil(rawCost / CONSTRUCTION_BOOST_INSIGHT_PER_MINUTE) *
    CONSTRUCTION_BOOST_INSIGHT_PER_MINUTE
  );
}

export function isConstructionBoostAvailable(
  state: GameState,
  actionId: string,
): boolean {
  if (!isConstructionBoostUnlocked(state)) return false;
  if (!actionId.startsWith("build")) return false;
  if (!isBuildActionExecuting(state, actionId)) return false;
  if (isConstructionBoostUsed(state, actionId)) return false;
  if (!isInsightUnlocked(state)) return false;
  return getConstructionBoostCost(state, actionId) > 0;
}

export function canBoostConstruction(state: GameState, actionId: string): boolean {
  if (!isConstructionBoostAvailable(state, actionId)) return false;
  return getInsightAmount(state) >= getConstructionBoostCost(state, actionId);
}
