import type { GameState } from "@shared/schema";
import {
  BLOODFLAME_SPHERE_UPGRADES,
  CHAINMASTER_UPGRADES,
  CROWS_EYE_UPGRADES,
  CRUSHING_STRIKE_UPGRADES,
  DISGRACED_PRIOR_UPGRADES,
  FERAL_HOWL_UPGRADES,
  HUNTING_SKILL_UPGRADES,
  SLEEP_INTENSITY_UPGRADES,
  SLEEP_LENGTH_UPGRADES,
} from "@/game/rules/skillUpgrades";

/**
 * Estate-tab upgrade tracks that count toward Upgrade Maxer.
 * Order matches the Estate panel (stable for progress display).
 */
export const ESTATE_UPGRADE_MAXER_KEYS = [
  "sleepLength",
  "sleepIntensity",
  "hunting",
  "crushingStrike",
  "bloodflameSphere",
  "feralHowl",
  "crowsEye",
  "disgracedPrior",
  "chainmaster",
] as const;

export type EstateUpgradeMaxerKey =
  (typeof ESTATE_UPGRADE_MAXER_KEYS)[number];

const ESTATE_UPGRADE_MAX_LEVEL: Record<EstateUpgradeMaxerKey, number> = {
  sleepLength: SLEEP_LENGTH_UPGRADES.length - 1,
  sleepIntensity: SLEEP_INTENSITY_UPGRADES.length - 1,
  hunting: HUNTING_SKILL_UPGRADES.length - 1,
  crushingStrike: CRUSHING_STRIKE_UPGRADES.length - 1,
  bloodflameSphere: BLOODFLAME_SPHERE_UPGRADES.length - 1,
  feralHowl: FERAL_HOWL_UPGRADES.length - 1,
  crowsEye: CROWS_EYE_UPGRADES.length - 1,
  disgracedPrior: DISGRACED_PRIOR_UPGRADES.length - 1,
  chainmaster: CHAINMASTER_UPGRADES.length - 1,
};

function getEstateUpgradeLevel(
  state: GameState,
  key: EstateUpgradeMaxerKey,
): number {
  switch (key) {
    case "sleepLength":
      return state.sleepUpgrades?.lengthLevel ?? 0;
    case "sleepIntensity":
      return state.sleepUpgrades?.intensityLevel ?? 0;
    case "hunting":
      return state.huntingSkills?.level ?? 0;
    case "crushingStrike":
      return state.combatSkills?.crushingStrikeLevel ?? 0;
    case "bloodflameSphere":
      return state.combatSkills?.bloodflameSphereLevel ?? 0;
    case "feralHowl":
      return state.combatSkills?.feralHowlLevel ?? 0;
    case "crowsEye":
      return state.crowsEyeSkills?.level ?? 0;
    case "disgracedPrior":
      return state.disgracedPriorSkills?.level ?? 0;
    case "chainmaster":
      return state.chainmasterSkills?.level ?? 0;
  }
}

/** Keys whose current level is already at the estate-tab max. */
export function getCurrentlyMaxedEstateUpgradeKeys(
  state: GameState,
): EstateUpgradeMaxerKey[] {
  return ESTATE_UPGRADE_MAXER_KEYS.filter(
    (key) => getEstateUpgradeLevel(state, key) >= ESTATE_UPGRADE_MAX_LEVEL[key],
  );
}

export function getEstateUpgradeMaxerTotal(): number {
  return ESTATE_UPGRADE_MAXER_KEYS.length;
}

/**
 * Union of lifetime maxes + current-run levels at max.
 * Order matches ESTATE_UPGRADE_MAXER_KEYS.
 */
export function getLifetimeEstateUpgradeMaxHits(
  state: GameState,
): EstateUpgradeMaxerKey[] {
  const hits = new Set<string>(state.lifetimeEstateUpgradeMaxHits ?? []);
  for (const key of getCurrentlyMaxedEstateUpgradeKeys(state)) {
    hits.add(key);
  }
  return ESTATE_UPGRADE_MAXER_KEYS.filter((key) => hits.has(key));
}

export function getEstateUpgradesAtMaxCount(state: GameState): number {
  return getLifetimeEstateUpgradeMaxHits(state).length;
}

export type EstateUpgradeMaxHitUpdates = {
  lifetimeEstateUpgradeMaxHits?: string[];
};

/**
 * Returns a patch when any estate upgrade track newly reaches max.
 * Writes lifetimeEstateUpgradeMaxHits (persists across restarts).
 */
export function collectEstateUpgradeMaxHitUpdates(
  state: GameState,
): EstateUpgradeMaxHitUpdates {
  const prior = new Set(state.lifetimeEstateUpgradeMaxHits ?? []);
  const newlyMaxed = getCurrentlyMaxedEstateUpgradeKeys(state).filter(
    (key) => !prior.has(key),
  );
  if (newlyMaxed.length === 0) return {};
  return {
    lifetimeEstateUpgradeMaxHits: [
      ...new Set([...prior, ...newlyMaxed]),
    ],
  };
}
