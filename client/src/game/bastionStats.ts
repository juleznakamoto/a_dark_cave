import { GameState } from "@shared/schema";
import { getTotalStrength } from "./rules/effectsCalculation";
import type { BastionStats } from "@/game/types";

// Re-export for convenience
export type { BastionStats } from "@/game/types";

/** Fortification buildings that contribute to Bastion / fortress stats (see `buildingHierarchy`). */
export const FORTIFICATION_BUILDING_KEYS = [
  "bastion",
  "watchtower",
  "palisades",
  "fortifiedMoat",
  "chitinPlating",
] as const;

export type FortificationBuildingKey =
  (typeof FORTIFICATION_BUILDING_KEYS)[number];

export function calculateBastionStats(state: GameState): BastionStats {
  let defense = 0;
  let attackFromFortifications = 0;
  let baseIntegrity = 0;
  const buildings = state.buildings ?? {};

  // Apply damage multipliers to buildings if damaged
  const bastionDamaged = state.story?.seen?.bastionDamaged || false;
  const bastionMultiplier = bastionDamaged ? 0.5 : 1;

  const watchtowerDamaged = state.story?.seen?.watchtowerDamaged || false;
  const watchtowerMultiplier = watchtowerDamaged ? 0.5 : 1;

  const palisadesDamaged = state.story?.seen?.palisadesDamaged || false;
  const palisadesMultiplier = palisadesDamaged ? 0.5 : 1;

  // Bastion
  if ((buildings.bastion ?? 0) > 0) {
    const defenseBonus = Math.floor(10 * bastionMultiplier);
    const attackBonus = Math.floor(10 * bastionMultiplier);
    const integrityBonus = Math.floor(60 * bastionMultiplier);

    defense += defenseBonus;
    attackFromFortifications += attackBonus;
    baseIntegrity += integrityBonus;
  }

  // Watchtower
  const watchtowerLevel = buildings.watchtower || 0;
  if (watchtowerLevel === 1) {
    // Level 1: Basic Watchtower
    defense += Math.floor(2 * watchtowerMultiplier);
    attackFromFortifications += Math.floor(5 * watchtowerMultiplier);
    baseIntegrity += Math.floor(20 * watchtowerMultiplier);
  } else if (watchtowerLevel === 2) {
    // Level 2: Guard Tower
    defense += Math.floor(5 * watchtowerMultiplier);
    attackFromFortifications += Math.floor(10 * watchtowerMultiplier);
    baseIntegrity += Math.floor(30 * watchtowerMultiplier);
  } else if (watchtowerLevel === 3) {
    // Level 3: Fortified Tower
    defense += Math.floor(10 * watchtowerMultiplier);
    attackFromFortifications += Math.floor(15 * watchtowerMultiplier);
    baseIntegrity += Math.floor(40 * watchtowerMultiplier);
  } else if (watchtowerLevel === 4) {
    // Level 4: Cannon Tower
    const defenseBonus = Math.floor(15 * watchtowerMultiplier);
    const attackBonus = Math.floor(25 * watchtowerMultiplier);
    const integrityBonus = Math.floor(60 * watchtowerMultiplier);

    defense += defenseBonus;
    attackFromFortifications += attackBonus;
    baseIntegrity += integrityBonus;
  }

  // Palisades
  const palisadesLevel = buildings.palisades || 0;
  if (palisadesLevel === 1) {
    // Level 1: Wooden Palisades
    defense += Math.floor(5 * palisadesMultiplier);
    baseIntegrity += Math.floor(20 * palisadesMultiplier);
  } else if (palisadesLevel === 2) {
    // Level 2: Fortified Palisades
    defense += Math.floor(10 * palisadesMultiplier);
    baseIntegrity += Math.floor(40 * palisadesMultiplier);
  } else if (palisadesLevel === 3) {
    // Level 3: Stone Wall
    defense += Math.floor(15 * palisadesMultiplier);
    baseIntegrity += Math.floor(60 * palisadesMultiplier);
  } else if (palisadesLevel === 4) {
    // Level 4: Reinforced Wall
    const defenseBonus = Math.floor(20 * palisadesMultiplier);
    const integrityBonus = Math.floor(80 * palisadesMultiplier);

    defense += defenseBonus;
    baseIntegrity += integrityBonus;
  }

  // Fortified Moat (cannot be damaged, no integrity bonus)
  if ((buildings.fortifiedMoat ?? 0) > 0) {
    defense += 10;
  }

  // Chitin Plating
  if ((buildings.chitinPlating ?? 0) > 0) {
    defense += 10;
    baseIntegrity += 20;
  }

  // Half of total Strength contributes to bastion attack (matches UI tooltip)
  const strengthTotal = getTotalStrength(state);
  const attackFromStrength = Math.floor(strengthTotal / 2);
  const totalAttack = attackFromFortifications + attackFromStrength;

  // Integrity is always calculated from buildings and damage flags
  // It is not a mutable state value - only buildings can be damaged (via damage flags)
  return {
    defense,
    attack: totalAttack,
    attackFromFortifications,
    attackFromStrength,
    integrity: baseIntegrity,
  };
}

/**
 * Per-building marginal Attack / Defense / Integrity from that building alone.
 * Attack uses fortification-only attack (excludes the Strength-based portion).
 */
export function getFortificationMarginalStats(
  state: GameState,
  key: FortificationBuildingKey,
): { defense: number; attack: number; integrity: number } | null {
  if ((state.buildings[key] ?? 0) === 0) return null;
  const full = calculateBastionStats(state);
  const buildings = { ...state.buildings, [key]: 0 };
  const without = calculateBastionStats({ ...state, buildings });
  return {
    defense: full.defense - without.defense,
    attack: full.attackFromFortifications - without.attackFromFortifications,
    integrity: full.integrity - without.integrity,
  };
}

export function updateBastionStats(state: GameState): Partial<GameState> {
  const bastionStats = calculateBastionStats(state);

  return {
    bastion_stats: bastionStats,
  };
}