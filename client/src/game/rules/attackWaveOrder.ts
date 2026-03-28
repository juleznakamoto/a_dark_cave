/**
 * Canonical attack wave ordering and count for rules + UI.
 * Victory flags in story.seen follow the pattern: `${waveId}Victory` with waveId camelCase.
 */
export const ATTACK_WAVE_IDS = [
  "firstWave",
  "secondWave",
  "thirdWave",
  "fourthWave",
  "fifthWave",
  "sixthWave",
  "seventhWave",
  "eighthWave",
  "ninthWave",
  "tenthWave",
] as const;

export type AttackWaveId = (typeof ATTACK_WAVE_IDS)[number];

export const TOTAL_ATTACK_WAVES = ATTACK_WAVE_IDS.length;

/** Last wave: old sixth-wave combat difficulty lives here; siege-complete unlocks use this victory flag. */
export const FINAL_ATTACK_WAVE_ID: AttackWaveId = "tenthWave";

export function isFinalAttackWave(waveId: AttackWaveId): boolean {
  return waveId === FINAL_ATTACK_WAVE_ID;
}
