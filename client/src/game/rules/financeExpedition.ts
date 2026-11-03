import type { GameState } from "@shared/schema";

/**
 * Pure finance-expedition tier helpers (no action/event imports).
 * Kept as a leaf module so buttonUpgrades / rules/index can share them
 * without creating a circular init cycle through forestResearchActions.
 */

export const FINANCE_EXPEDITION_TIERS = [
  { gold: 10, food: 250, villagers: 2, executionTime: 30, insight: 250 },
  { gold: 20, food: 500, villagers: 4, executionTime: 45, insight: 500 },
  { gold: 30, food: 750, villagers: 6, executionTime: 60, insight: 750 },
  { gold: 40, food: 1000, villagers: 8, executionTime: 75, insight: 1000 },
  { gold: 50, food: 1500, villagers: 10, executionTime: 90, insight: 1500 },
] as const;

/**
 * Chance the returning expedition offers the leatherbound book.
 * Index 0 is the first run. Later runs keep the last chance.
 */
export const CHAINMASTER_BOOK_OFFER_CHANCES = [0, 0.1, 0.25, 0.5, 1] as const;

export function getChainmasterBookOfferChance(usageCount: number): number {
  const index = Math.max(0, Math.floor(usageCount) || 0);
  const last = CHAINMASTER_BOOK_OFFER_CHANCES.length - 1;
  return CHAINMASTER_BOOK_OFFER_CHANCES[Math.min(index, last)];
}

export function getFinanceExpeditionUsageCount(
  state: Pick<GameState, "story">,
): number {
  return Number(state.story?.seen?.financeExpeditionUsageCount) || 0;
}

export function getFinanceExpeditionTierIndex(
  state: Pick<GameState, "story">,
): number {
  const usageCount = getFinanceExpeditionUsageCount(state);
  return Math.min(usageCount, FINANCE_EXPEDITION_TIERS.length - 1);
}

export function getFinanceExpeditionTier(
  state: Pick<GameState, "story">,
): (typeof FINANCE_EXPEDITION_TIERS)[number] {
  return FINANCE_EXPEDITION_TIERS[getFinanceExpeditionTierIndex(state)];
}

export function getFinanceExpeditionGoldCost(state: GameState): number {
  return getFinanceExpeditionTier(state).gold;
}

export function getFinanceExpeditionFoodCost(state: GameState): number {
  return getFinanceExpeditionTier(state).food;
}

export function getFinanceExpeditionInsightReward(state: GameState): number {
  return getFinanceExpeditionTier(state).insight;
}

/** Prior may automate Finance Expedition only after the max tier has been completed once. */
export function isFinanceExpeditionPriorUnlocked(
  state: Pick<GameState, "story">,
): boolean {
  return getFinanceExpeditionUsageCount(state) >= FINANCE_EXPEDITION_TIERS.length;
}
