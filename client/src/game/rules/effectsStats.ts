import type { GameState } from "@shared/schema";

/**
 * Calculate merchant discount based on knowledge
 * Returns discount as a decimal (0.05-0.25)
 * Stepped: 5% per 10 knowledge, max 25%
 */
export function calculateMerchantDiscount(knowledge: number): number {
  let discount = 0;
  if (knowledge >= 10) discount = 0.05;
  if (knowledge >= 20) discount = 0.1;
  if (knowledge >= 30) discount = 0.15;
  if (knowledge >= 40) discount = 0.2;
  if (knowledge >= 50) discount = 0.25;
  return discount;
}

/**
 * Calculate total merchant discount from all sources (knowledge + items)
 * Returns discount as a decimal (0-1)
 */
export function getTotalMerchantDiscount(state: GameState): number {
  const knowledge = state.stats?.knowledge || 0;
  let discount = calculateMerchantDiscount(knowledge);
  if (state.clothing?.ring_of_obedience) {
    discount += 0.05;
  }
  return Math.min(discount, 1);
}

/**
 * Calculate time bonus for events based on knowledge
 * Returns bonus time in seconds (0-25s)
 */
export function calculateKnowledgeTimeBonus(knowledge: number): number {
  if (knowledge >= 50) return 25;
  if (knowledge >= 40) return 20;
  if (knowledge >= 30) return 15;
  if (knowledge >= 20) return 10;
  if (knowledge >= 10) return 5;
  return 0;
}

/**
 * Check if knowledge bonus is at maximum
 */
export function isKnowledgeBonusMaxed(knowledge: number): boolean {
  return knowledge >= 50;
}

/**
 * Calculate critical strike chance based on luck
 * Returns critical chance percentage (5-25%)
 */
export function calculateCriticalStrikeChance(luck: number): number {
  if (luck >= 50) return 25;
  if (luck >= 40) return 20;
  if (luck >= 30) return 15;
  if (luck >= 20) return 10;
  if (luck >= 10) return 5;
  return 0;
}
