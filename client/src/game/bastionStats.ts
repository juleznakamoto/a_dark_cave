
import { GameState } from "@shared/schema";

export interface BastionStats {
  defense: number;
  attack: number;
  integrity: number;
}

export function calculateBastionStats(state: GameState): BastionStats {
  let defense = 0;
  let attack = 0;
  let integrity = 0;

  // Base stats from bastion itself
  if (state.buildings.bastion > 0) {
    defense += 10;
    attack += 5;
    integrity += 15;
  }

  // Watchtower contributions (levels provide different bonuses)
  const watchtowerLevel = state.buildings.watchtower || 0;
  if (watchtowerLevel > 0) {
    // Level 1: Watchtower
    defense += 5;
    attack += 3;
    integrity += 5;
    
    if (watchtowerLevel >= 2) {
      // Level 2: Guard Tower
      defense += 8;
      attack += 5;
      integrity += 7;
    }
    
    if (watchtowerLevel >= 3) {
      // Level 3: Fortified Tower
      defense += 12;
      attack += 8;
      integrity += 10;
    }
    
    if (watchtowerLevel >= 4) {
      // Level 4: Cannon Tower
      defense += 15;
      attack += 15;
      integrity += 12;
    }
  }

  // Palisades contributions (levels provide different bonuses)
  const palisadesLevel = state.buildings.palisades || 0;
  if (palisadesLevel > 0) {
    // Level 1: Wooden Palisades
    defense += 8;
    integrity += 6;
    
    if (palisadesLevel >= 2) {
      // Level 2: Fortified Palisades
      defense += 12;
      integrity += 10;
    }
    
    if (palisadesLevel >= 3) {
      // Level 3: Stone Wall
      defense += 20;
      integrity += 18;
    }
    
    if (palisadesLevel >= 4) {
      // Level 4: Reinforced Wall
      defense += 30;
      integrity += 25;
    }
  }

  return {
    defense,
    attack,
    integrity,
  };
}

export function updateBastionStats(state: GameState): Partial<GameState> {
  const bastionStats = calculateBastionStats(state);
  
  return {
    bastion_stats: bastionStats,
  };
}
