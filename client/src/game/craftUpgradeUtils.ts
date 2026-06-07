import { GameState } from "@shared/schema";
import { getUpgradeBonusMultiplier, type UpgradeKey } from "./buttonUpgrades";

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
 * Craft output: base → base bonuses (Prior, etc.) → craft mastery on top.
 * floor(floor(baseAmount * baseMult) * masteryMult)
 */
export function applyCraftProduceScaling(
  baseAmount: number,
  actionId: CraftUpgradeActionId,
  state: GameState,
  baseMult: number,
): number {
  const masteryMult = getCraftMasteryMultiplier(actionId, state);
  return Math.floor(Math.floor(baseAmount * baseMult) * masteryMult);
}
