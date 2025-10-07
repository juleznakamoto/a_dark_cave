import { GameState } from "@shared/schema";
import { getTotalStrength } from "./rules/effects";

export interface BastionStats {
  defense: number;
  attack: number;
  attackFromFortifications: number;
  attackFromStrength: number;
  integrity: number;
}

export function calculateBastionStats(state: GameState): BastionStats {
  let defense = 0;
  let attackFromFortifications = 0;
  let baseIntegrity = 0;

  // Apply damage multipliers to buildings if damaged
  const bastionDamaged = state.story?.seen?.bastionDamaged || false;
  const bastionMultiplier = bastionDamaged ? 0.5 : 1;

  const watchtowerDamaged = state.story?.seen?.watchtowerDamaged || false;
  const watchtowerMultiplier = watchtowerDamaged ? 0.5 : 1;

  const palisadesDamaged = state.story?.seen?.palisadesDamaged || false;
  const palisadesMultiplier = palisadesDamaged ? 0.5 : 1;

  // Base stats from bastion itself
  if (state.buildings.bastion > 0) {
    defense += Math.floor(5 * bastionMultiplier);
    attackFromFortifications += Math.floor(3 * bastionMultiplier);
    baseIntegrity += Math.floor(20 * bastionMultiplier);
  }

  // Watchtower contributions (levels provide different bonuses)
  const watchtowerLevel = state.buildings.watchtower || 0; 

  if (watchtowerLevel > 0) {
    // Level 1: Basic Watchtower
    defense += Math.floor(1 * watchtowerMultiplier);
    attackFromFortifications += Math.floor(5 * watchtowerMultiplier);
    baseIntegrity += Math.floor(5 * watchtowerMultiplier);

    if (watchtowerLevel >= 2) {
      // Level 2: Guard Tower
      defense += Math.floor(2 * watchtowerMultiplier);
      attackFromFortifications += Math.floor(8 * watchtowerMultiplier);
      baseIntegrity += Math.floor(5 * watchtowerMultiplier);
    }

    if (watchtowerLevel >= 3) {
      // Level 3: Fortified Tower
      defense += Math.floor(3 * watchtowerMultiplier);
      attackFromFortifications += Math.floor(12 * watchtowerMultiplier);
      baseIntegrity += Math.floor(10 * watchtowerMultiplier);
    }

    if (watchtowerLevel >= 4) {
      // Level 4: Cannon Tower
      defense += Math.floor(4 * watchtowerMultiplier);
      attackFromFortifications += Math.floor(20 * watchtowerMultiplier);
      baseIntegrity += Math.floor(10 * watchtowerMultiplier);
    }
  }

  // Palisades contributions (levels provide different bonuses)
  const palisadesLevel = state.buildings.palisades || 0;
  if (palisadesLevel > 0) {
    // Level 1: Wooden Palisades
    defense += Math.floor(4 * palisadesMultiplier);
    baseIntegrity += Math.floor(10 * palisadesMultiplier);

    if (palisadesLevel >= 2) {
      // Level 2: Fortified Palisades
      defense += Math.floor(6 * palisadesMultiplier);
      baseIntegrity += Math.floor(15 * palisadesMultiplier);
    }

    if (palisadesLevel >= 3) {
      // Level 3: Stone Wall
      defense += Math.floor(8 * palisadesMultiplier);
      baseIntegrity += Math.floor(25 * palisadesMultiplier);
    }

    if (palisadesLevel >= 4) {
      // Level 4: Reinforced Wall
      defense += Math.floor(10 * palisadesMultiplier);
      baseIntegrity += Math.floor(35 * palisadesMultiplier);
    }
  }

  // Add strength from stats to attack
  const attackFromStrength = getTotalStrength(state);
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

export function updateBastionStats(state: GameState): Partial<GameState> {
  const bastionStats = calculateBastionStats(state);

  return {
    bastion_stats: bastionStats,
  };
}