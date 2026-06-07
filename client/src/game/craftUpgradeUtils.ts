import { GameState } from "@shared/schema";
import { getUpgradeBonusMultiplier, type UpgradeKey } from "./buttonUpgrades";
import { DISGRACED_PRIOR_UPGRADES } from "./rules/skillUpgrades";

export const CRAFT_UPGRADE_ACTIONS = [
  "craftTorches",
  "craftBoneTotems",
  "craftLeatherTotems",
] as const;

export type CraftUpgradeActionId = (typeof CRAFT_UPGRADE_ACTIONS)[number];

const CRAFT_BASE_AMOUNTS: Record<CraftUpgradeActionId, number> = {
  craftTorches: 1,
  craftBoneTotems: 1,
  craftLeatherTotems: 1,
};

export function isCraftUpgradeAction(
  actionId: string,
): actionId is CraftUpgradeActionId {
  return (CRAFT_UPGRADE_ACTIONS as readonly string[]).includes(actionId);
}

/** Disgraced Prior reward multiplier when this action is assigned (else 1). */
export function getCraftPriorMultiplier(
  actionId: string,
  state: GameState,
): number {
  if (
    !state.fellowship?.disgraced_prior ||
    !(state.priorAssignedActions ?? []).includes(actionId)
  ) {
    return 1;
  }
  const priorLevel = state.disgracedPriorSkills?.level ?? 0;
  return DISGRACED_PRIOR_UPGRADES[priorLevel]?.rewardMultiplier ?? 1;
}

/** Book of Ascension craft mastery multiplier only. */
export function getCraftMasteryMultiplier(
  actionId: CraftUpgradeActionId,
  state: GameState,
): number {
  if (!state.books?.book_of_ascension) return 1;
  return getUpgradeBonusMultiplier(actionId as UpgradeKey, state);
}

/** Mastery-only amount for the level badge ("Produce 3 at a time"). */
export function getCraftMasteryProduceAmount(
  baseAmount: number,
  actionId: CraftUpgradeActionId,
  state: GameState,
): number {
  return Math.floor(baseAmount * getCraftMasteryMultiplier(actionId, state));
}

/**
 * Produce amount shown on the Book of Ascension level badge.
 * Returns mastery scaling only, not Prior or other base bonuses.
 */
export function getCraftProduceAmount(
  upgradeKey: string,
  state: GameState,
): number | undefined {
  if (!isCraftUpgradeAction(upgradeKey)) {
    return undefined;
  }
  return getCraftMasteryProduceAmount(
    CRAFT_BASE_AMOUNTS[upgradeKey],
    upgradeKey,
    state,
  );
}

/**
 * Craft batch output stacks additively:
 * - Prior on base: floor(base × priorMult)  e.g. 1 × 4 = 4
 * - Mastery batch: floor(base × masteryMult) e.g. 1 × 3 = 3
 * - Total: 4 + 3 = 7 (not multiplicative)
 */
export function scaleCraftProduceAmount(
  baseAmount: number,
  actionId: CraftUpgradeActionId,
  state: GameState,
): number {
  let total = 0;

  const priorMult = getCraftPriorMultiplier(actionId, state);
  if (priorMult > 1) {
    total += Math.floor(baseAmount * priorMult);
  }

  const masteryMult = getCraftMasteryMultiplier(actionId, state);
  if (masteryMult > 1) {
    total += Math.floor(baseAmount * masteryMult);
  }

  return total > 0 ? total : baseAmount;
}
