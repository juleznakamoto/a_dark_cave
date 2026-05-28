import { fellowshipEffects } from "@/game/rules/effects";
import { capitalizeWords } from "@/lib/utils";
import { getEffectName, tWithFallback } from "@/i18n/resolveGameText";

/** Canonical English combat enemy names → ui.combat.enemies.* catalog keys. */
const COMBAT_ENEMY_I18N_KEYS: Record<string, string> = {
  "Pale Creatures": "paleCreatures",
};

/** Resolve a combat enemy label at render time (stored combat data uses English). */
export function getCombatEnemyDisplayName(englishName: string): string {
  const catalogKey = COMBAT_ENEMY_I18N_KEYS[englishName];
  if (!catalogKey) return englishName;
  return tWithFallback("ui", `combat.enemies.${catalogKey}`, englishName);
}

/** Resolve a fellowship member label from its effect id (e.g. restless_knight). */
export function getFellowshipDisplayName(fellowId: string): string {
  return getEffectName(
    "fellowship",
    fellowId,
    fellowshipEffects[fellowId]?.name ?? capitalizeWords(fellowId),
  );
}
