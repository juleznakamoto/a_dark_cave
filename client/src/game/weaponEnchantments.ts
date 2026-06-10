import type { GameState } from "@shared/schema";
import { weaponEffects } from "@/game/rules/effects";
import { getInsightAmount, isInsightUnlocked } from "@/game/rules/insightReveal";
import { POISON_ARROWS_DOT_FIGHT_ROUNDS } from "@/game/rules/skillUpgrades";

/** Insight cost per point of stat added by a generic weapon enchantment. */
export const ENCHANT_COST_PER_STAT = 250;

/** Building that unlocks weapon enchantment (Tomewarden Academy). */
const ENCHANT_BUILDING_KEY = "inkwardenAcademy";

/**
 * Per-level enchant deltas for special weapons (non-generic). Generic weapons get a
 * single level derived from their base stats. `baseStrength`/`baseKnowledge` are folded
 * into the weapon's original (black) tooltip value; `enchantStrength`/`enchantKnowledge`
 * render after the base in Insight-blue.
 */
interface EnchantDelta {
  baseStrength?: number;
  baseKnowledge?: number;
  enchantStrength?: number;
  enchantKnowledge?: number;
  /** Extra poison DoT Fight rounds (Nightshade Bow). */
  poisonRounds?: number;
  /** Insight cost to reach this level from the previous one. */
  cost: number;
}

const SPECIAL_ENCHANTS: Record<string, EnchantDelta[]> = {
  nightshade_bow: [
    { baseStrength: 5, enchantStrength: 2, cost: 1000 },
    { enchantStrength: 3, poisonRounds: 1, cost: 2000 },
  ],
};

/** Max enchant level for a weapon (generic weapons: 1; specials defined above). */
export function getMaxEnchantLevel(weaponId: string): number {
  return SPECIAL_ENCHANTS[weaponId]?.length ?? 1;
}

export function isWeaponEnchantUnlocked(
  state: Pick<GameState, "buildings">,
): boolean {
  return (
    (state.buildings[ENCHANT_BUILDING_KEY as keyof GameState["buildings"]] ??
      0) >= 1
  );
}

export function getWeaponEnchantLevel(
  state: Pick<GameState, "weaponEnchantments">,
  weaponId: string,
): number {
  const raw = state.weaponEnchantments?.[weaponId] ?? 0;
  return Math.min(Math.max(0, raw), getMaxEnchantLevel(weaponId));
}

/** Enchant bonus added to a single stat: base 1 plus 1 per full 10 points the weapon has. */
function genericEnchantStat(base: number): number {
  if (base <= 0) return 0;
  return 1 + Math.floor(base / 10);
}

/** Delta granted when upgrading a weapon from `level` (0-based) to `level + 1`. */
function getEnchantLevelDelta(
  weaponId: string,
  level: number,
): EnchantDelta | null {
  const special = SPECIAL_ENCHANTS[weaponId];
  if (special) return special[level] ?? null;
  if (level !== 0) return null;
  const base = weaponEffects[weaponId]?.bonuses.generalBonuses ?? {};
  const enchantStrength = genericEnchantStat(base.strength ?? 0);
  const enchantKnowledge = genericEnchantStat(base.knowledge ?? 0);
  return {
    enchantStrength,
    enchantKnowledge,
    cost: (enchantStrength + enchantKnowledge) * ENCHANT_COST_PER_STAT,
  };
}

export interface WeaponEnchantBonus {
  /** Added to the weapon's original (black) Strength value. */
  baseStrength: number;
  baseKnowledge: number;
  /** Enchant bonus rendered in Insight-blue after the original value. */
  enchantStrength: number;
  enchantKnowledge: number;
  /** Extra poison DoT Fight rounds. */
  poisonRounds: number;
}

/** Accumulated enchant bonuses for a weapon at its current level. */
export function getWeaponEnchantBonus(
  state: Pick<GameState, "weaponEnchantments">,
  weaponId: string,
): WeaponEnchantBonus {
  const level = getWeaponEnchantLevel(state, weaponId);
  const bonus: WeaponEnchantBonus = {
    baseStrength: 0,
    baseKnowledge: 0,
    enchantStrength: 0,
    enchantKnowledge: 0,
    poisonRounds: 0,
  };
  for (let i = 0; i < level; i++) {
    const delta = getEnchantLevelDelta(weaponId, i);
    if (!delta) continue;
    bonus.baseStrength += delta.baseStrength ?? 0;
    bonus.baseKnowledge += delta.baseKnowledge ?? 0;
    bonus.enchantStrength += delta.enchantStrength ?? 0;
    bonus.enchantKnowledge += delta.enchantKnowledge ?? 0;
    bonus.poisonRounds += delta.poisonRounds ?? 0;
  }
  return bonus;
}

/** Insight cost to enchant a weapon from its current level, or null if maxed. */
export function getNextEnchantCost(
  state: Pick<GameState, "weaponEnchantments">,
  weaponId: string,
): number | null {
  const level = getWeaponEnchantLevel(state, weaponId);
  const delta = getEnchantLevelDelta(weaponId, level);
  return delta ? delta.cost : null;
}

/** Whether a weapon can be enchanted right now (unlocked, owned, not maxed, affordable). */
export function canEnchantWeapon(
  state: Pick<
    GameState,
    "buildings" | "weapons" | "weaponEnchantments" | "resources"
  >,
  weaponId: string,
): boolean {
  if (!isWeaponEnchantUnlocked(state)) return false;
  if (!isInsightUnlocked(state as GameState)) return false;
  if (!(state.weapons as Record<string, boolean>)[weaponId]) return false;
  const level = getWeaponEnchantLevel(state, weaponId);
  if (level >= getMaxEnchantLevel(weaponId)) return false;
  const cost = getNextEnchantCost(state, weaponId);
  if (cost == null) return false;
  return getInsightAmount(state as GameState) >= cost;
}

/** Poison Arrows DoT Fight rounds including Nightshade Bow enchant bonus. */
export function getPoisonArrowsDotFightRounds(
  state: Pick<GameState, "weaponEnchantments">,
): number {
  return (
    POISON_ARROWS_DOT_FIGHT_ROUNDS +
    getWeaponEnchantBonus(state, "nightshade_bow").poisonRounds
  );
}
