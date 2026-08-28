import { isDemoEdition } from "@/lib/edition";

/**
 * Demo editions (Steam demo, Galaxy, CrazyGames) raise click-action *base*
 * grants. Existing bonuses still apply on the scaled base. This is not a
 * bonus source: it must not appear in `getActionBonuses` / side-panel lines.
 */
export const DEMO_ACTION_BASE_REWARD_MULTIPLIER = 1.25;

const DEMO_BASE_REWARD_ACTION_IDS = new Set([
  "chopWood",
  "hunt",
  "exploreCave",
  "ventureDeeper",
  "descendFurther",
  "exploreRuins",
  "exploreTemple",
  "exploreCitadel",
  "mineStone",
  "mineIron",
  "mineCoal",
  "mineSulfur",
  "mineObsidian",
  "mineAdamant",
  "mineMoonstone",
]);

export function getDemoActionBaseRewardMultiplier(actionId: string): number {
  if (!isDemoEdition()) return 1;
  return DEMO_BASE_REWARD_ACTION_IDS.has(actionId)
    ? DEMO_ACTION_BASE_REWARD_MULTIPLIER
    : 1;
}

export function scaleDemoActionBaseReward(
  amount: number,
  actionId: string,
): number {
  const multiplier = getDemoActionBaseRewardMultiplier(actionId);
  return multiplier === 1 ? amount : Math.round(amount * multiplier);
}

export function scaleDemoActionBaseRange(
  min: number,
  max: number,
  actionId: string,
): { min: number; max: number } {
  const multiplier = getDemoActionBaseRewardMultiplier(actionId);
  if (multiplier === 1) return { min, max };
  return {
    min: Math.round(min * multiplier),
    max: Math.round(max * multiplier),
  };
}
