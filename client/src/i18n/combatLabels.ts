import { fellowshipEffects } from "@/game/rules/effects";
import { capitalizeWords } from "@/lib/utils";
import { getEffectName, tWithFallback } from "@/i18n/resolveGameText";
import {
  getPalisadesTierLabel,
  getWatchtowerTierLabel,
} from "@/i18n/fortificationLabels";

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

/** Legacy English labels stored in older combat summaries → building ids. */
const LEGACY_DAMAGED_BUILDING_IDS: Record<string, string> = {
  Bastion: "bastion",
  Watchtower: "watchtower",
  Palisades: "palisades",
};

/** Resolve a damaged fortification label (id or legacy English name, optional `/level`). */
export function getDamagedBuildingDisplayName(entry: string): string {
  const normalized = LEGACY_DAMAGED_BUILDING_IDS[entry] ?? entry;
  const slash = normalized.indexOf("/");
  const id = slash >= 0 ? normalized.slice(0, slash) : normalized;
  const level =
    slash >= 0 ? parseInt(normalized.slice(slash + 1), 10) || 1 : 1;

  switch (id) {
    case "bastion":
      return tWithFallback("ui", "fortifications.bastion", "Bastion");
    case "watchtower":
      return getWatchtowerTierLabel(level);
    case "palisades":
      return getPalisadesTierLabel(level);
    default:
      return entry;
  }
}
