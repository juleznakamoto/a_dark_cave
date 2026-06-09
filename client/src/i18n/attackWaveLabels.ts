import { tWithFallback } from "@/i18n/resolveGameText";
import type { AttackWaveId } from "@/game/rules/attackWaveOrder";
import { ATTACK_WAVE_DISPLAY_NAMES } from "@/game/rules/eventsAttackWaves";

/** Fortress chart label for an attack wave (e.g. tenthWave → "Zehnte Welle"). */
export function getAttackWaveDisplayName(waveId: AttackWaveId): string {
  return tWithFallback(
    "ui",
    `attackWaves.waves.${waveId}`,
    ATTACK_WAVE_DISPLAY_NAMES[waveId],
  );
}

/** Endless post-completion wave label (wave 11+). */
export function getPostCompletionAttackWaveDisplayName(waveNumber: number): string {
  return tWithFallback(
    "ui",
    "attackWaves.postCompletion",
    `Wave ${waveNumber}`,
    { waveNumber },
  );
}
