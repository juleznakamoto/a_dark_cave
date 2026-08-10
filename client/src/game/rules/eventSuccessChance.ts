import type { GameState } from "@shared/schema";
import {
  getTotalStrength,
  getTotalLuck,
  getTotalKnowledge,
} from "./effectsCalculation";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";

/**
 * Helper function to calculate success chance for event choices
 * @param state - Current game state
 * @param baseChance - Base success probability (0-1)
 * @param stat0 - First stat type and its multiplier (e.g., { type: 'strength', multiplier: 0.01 })
 * @param stat1 - Second stat type and its multiplier (optional)
 * @param cmMultiplier - Cruel mode multiplier (see CRUEL_MODE.successChance.defaultCruelPenalty)
 * @returns Calculated success chance (0-1)
 */
export function calculateSuccessChance(
  state: GameState,
  baseChance: number,
  stat0?: { type: "strength" | "knowledge" | "luck"; multiplier: number },
  stat1?: { type: "strength" | "knowledge" | "luck"; multiplier: number },
  cmMultiplier: number = CRUEL_MODE.successChance.defaultCruelPenalty,
): number {
  let chance = baseChance;

  // Add first stat bonus
  if (stat0) {
    const statValue =
      stat0.type === "strength"
        ? getTotalStrength(state)
        : stat0.type === "knowledge"
          ? getTotalKnowledge(state)
          : getTotalLuck(state);
    chance += statValue * stat0.multiplier;
  }

  // Add second stat bonus
  if (stat1) {
    const statValue =
      stat1.type === "strength"
        ? getTotalStrength(state)
        : stat1.type === "knowledge"
          ? getTotalKnowledge(state)
          : getTotalLuck(state);
    chance += statValue * stat1.multiplier;
  }

  // Apply cruel mode modifier
  chance += cruelModeScale(state) * cmMultiplier;

  // Cap at 100% (1.0)
  return Math.min(chance, 1.0);
}
