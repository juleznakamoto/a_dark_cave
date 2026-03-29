import { GameState } from "@shared/schema";

/** Madness reduction from Boneyard (negative number); 0 if inactive or no baseline yet. */
export function getBoneyardBurialMadnessReduction(state: GameState): number {
  if ((state.buildings.boneyard ?? 0) <= 0) return 0;
  const baseline = Number(state.story?.seen?.boneyardDeathBaseline);
  if (!Number.isFinite(baseline)) return 0;
  const lifetime = state.stats?.villagerDeathsLifetime ?? 0;
  const delta = Math.max(0, lifetime - baseline);
  const steps = Math.min(10, Math.floor(delta / 50));
  return steps === 0 ? 0 : -steps;
}
