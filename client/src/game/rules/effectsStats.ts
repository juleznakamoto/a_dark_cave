
/**
 * Calculate merchant discount based on knowledge
 * Returns discount percentage (5-25%)
 */
export function calculateMerchantDiscount(knowledge: number): number {
  if (knowledge >= 50) return 25;
  if (knowledge >= 40) return 20;
  if (knowledge >= 30) return 15;
  if (knowledge >= 20) return 10;
  if (knowledge >= 10) return 5;
  return 0;
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
