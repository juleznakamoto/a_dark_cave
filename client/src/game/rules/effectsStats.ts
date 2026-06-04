import type { GameState } from "@shared/schema";
import { CRUEL_MODE } from "@/game/cruelMode";

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

/** Madness-based chance (0–15%) that a Fight-click bastion strike deals no damage. */
export function getCombatAttackFailChancePercent(madness: number): number {
  if (madness >= 60) return 15;
  if (madness >= 50) return 12.5;
  if (madness >= 40) return 10;
  if (madness >= 30) return 7.5;
  if (madness >= 20) return 5;
  if (madness >= 10) return 2.5;
  return 0;
}

/**
 * Per-cycle probability (0–1) that madness kills villagers.
 * Mirrors `handleMadnessCheck` in `loop.ts` (tier thresholds + cruel bonuses).
 */
export function getMadnessDeathChancePerCycle(
  totalMadness: number,
  cruelMode: boolean,
): number {
  if (totalMadness <= 5) return 0;
  const scale = cruelMode ? 1 : 0;
  const md = CRUEL_MODE.loop.madnessDeath;
  if (totalMadness <= 10) {
    return md.tier2.base + scale * md.tier2.whenCruel;
  }
  if (totalMadness <= 20) {
    return md.tier3.base + scale * md.tier3.whenCruel;
  }
  if (totalMadness <= 30) {
    return md.tier4.base + scale * md.tier4.whenCruel;
  }
  if (totalMadness <= 40) {
    return md.tier5.base + scale * md.tier5.whenCruel;
  }
  return md.tier6.base + scale * md.tier6.whenCruel;
}

/** Max per-cycle madness death chance (41+ Madness, tier6). */
export function getMadnessDeathChanceMaxPerCycle(cruelMode: boolean): number {
  const scale = cruelMode ? 1 : 0;
  const md = CRUEL_MODE.loop.madnessDeath;
  return md.tier6.base + scale * md.tier6.whenCruel;
}

/** Decimal chance → percent for stat tooltips (one decimal when under 10%). */
export function madnessDeathChanceToTooltipPercent(chance: number): number {
  const pct = chance * 100;
  if (pct === 0) return 0;
  if (pct < 10) return Math.round(pct * 10) / 10;
  return Math.round(pct);
}
