
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

  // Base stats from bastion itself
  if (state.buildings.bastion > 0) {
    defense += 5;
    attackFromFortifications += 3;
    baseIntegrity += 20;
  }

  // Watchtower contributions (levels provide different bonuses)
  const watchtowerLevel = state.buildings.watchtower || 0;
  if (watchtowerLevel > 0) {
    // Level 1: Watchtower
    defense += 1;
    attackFromFortifications += 4;
    baseIntegrity += 5;
    
    if (watchtowerLevel >= 2) {
      // Level 2: Guard Tower
      defense += 2;
      attackFromFortifications += 8;
      baseIntegrity += 5;
    }
    
    if (watchtowerLevel >= 3) {
      // Level 3: Fortified Tower
      defense += 3;
      attackFromFortifications += 12;
      baseIntegrity += 10;
    }
    
    if (watchtowerLevel >= 4) {
      // Level 4: Cannon Tower
      defense += 4;
      attackFromFortifications += 16;
      baseIntegrity += 10;
    }
  }

  // Palisades contributions (levels provide different bonuses)
  const palisadesLevel = state.buildings.palisades || 0;
  if (palisadesLevel > 0) {
    // Level 1: Wooden Palisades
    defense += 4;
    baseIntegrity += 10;
    
    if (palisadesLevel >= 2) {
      // Level 2: Fortified Palisades
      defense += 6;
      baseIntegrity += 15;
    }
    
    if (palisadesLevel >= 3) {
      // Level 3: Stone Wall
      defense += 8;
      baseIntegrity += 25;
    }
    
    if (palisadesLevel >= 4) {
      // Level 4: Reinforced Wall
      defense += 10;
      baseIntegrity += 35;
    }
  }

  // Add strength from stats to attack
  const attackFromStrength = getTotalStrength(state);
  const totalAttack = attackFromFortifications + attackFromStrength;

  // Current integrity from game state (starts at base, can be damaged)
  const currentIntegrity = state.bastion_stats?.integrity ?? baseIntegrity;

  return {
    defense,
    attack: totalAttack,
    attackFromFortifications,
    attackFromStrength,
    integrity: currentIntegrity,
  };
}

export function updateBastionStats(state: GameState): Partial<GameState> {
  const bastionStats = calculateBastionStats(state);
  
  return {
    bastion_stats: bastionStats,
  };
}
