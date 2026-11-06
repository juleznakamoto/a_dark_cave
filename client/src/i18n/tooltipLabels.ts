import i18n from "i18next";
import { tWithFallback, getEffectName, getResourceName, getStatName } from "./resolveGameText";
import type { BuildingTooltipEffect } from "@/game/rules/buildingTooltipEffects";
import {
  bookEffects,
  clothingEffects,
  toolEffects,
  weaponEffects,
} from "@/game/rules/effects";
import type { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

type TranslateOptions = Record<string, string | number | boolean | undefined>;

/** English one/other fallback for missing plural catalog keys. */
export function englishCountFallback(
  count: number,
  one: string,
  other: string,
): string {
  return count === 1 ? one : other;
}

/** Translate UI tooltip catalog keys (ui.tooltips.*). */
export function getUiTooltip(
  key: string,
  fallback: string,
  options?: TranslateOptions,
): string {
  return tWithFallback("ui", `tooltips.${key}`, fallback, options);
}

/** Resolve a building tooltip effect entry at render time. */
export function resolveBuildingTooltipEffect(
  effect: string | BuildingTooltipEffect,
): string {
  if (typeof effect === "string") {
    return effect;
  }
  return getUiTooltip(
    `buildings.${effect.key}`,
    effect.fallback,
    effect.options,
  );
}

type ActionTooltipEffects =
  | Array<string | BuildingTooltipEffect>
  | ((state: GameState) => Array<string | BuildingTooltipEffect>);

/** Resolve action tooltip effect entries (static array or state function). */
export function resolveActionTooltipEffects(
  effects: ActionTooltipEffects | undefined,
  state: GameState,
): string[] {
  if (!effects) return [];
  const list = typeof effects === "function" ? effects(state) : effects;
  return list.map((effect) => resolveBuildingTooltipEffect(effect));
}

/** Player-facing cost line for tooltips (e.g. "120 / 50 Gold"). */
export function formatTooltipCostLine(
  amount: number,
  resourceKey: string,
  options: { displayName?: string; available: number },
): string {
  const resource =
    options.displayName ?? formatTooltipResourceName(resourceKey);
  return getUiTooltip("costLine", "{{available}} / {{amount}} {{resource}}", {
    available: formatNumber(options.available),
    amount: formatNumber(amount),
    resource,
  });
}

/** How many of a resource or relic the player currently holds. */
export function tooltipHeldAmount(state: GameState, resourceKey: string): number {
  const held = state.resources[resourceKey as keyof typeof state.resources];
  if (typeof held === "number") return held;
  const relic = state.relics?.[resourceKey as keyof typeof state.relics];
  if (typeof relic === "boolean") return relic ? 1 : 0;
  return 0;
}

/** Villager spend line (e.g. "4 / 2 Free Villagers"). */
export function formatTooltipVillagerCostLine(
  count: number,
  available: number,
  kind: "villager" | "freeVillager",
): string {
  const key = kind === "freeVillager" ? "freeVillagerCost" : "villagerCost";
  const noun =
    kind === "freeVillager"
      ? englishCountFallback(count, "Free Villager", "Free Villagers")
      : englishCountFallback(count, "Villager", "Villagers");
  return getUiTooltip(key, `{{available}} / {{count}} ${noun}`, {
    count,
    available: formatNumber(available),
  });
}

/** Relic, schematic, tool, weapon, or book name when the id is not a resource. */
function ownedItemName(id: string): string | null {
  if (toolEffects[id]) return getEffectName("tools", id, toolEffects[id].name);
  if (weaponEffects[id]) return getEffectName("weapons", id, weaponEffects[id].name);
  if (bookEffects[id]) return getEffectName("books", id, bookEffects[id].name);
  if (clothingEffects[id]) {
    return getEffectName("clothing", id, clothingEffects[id].name);
  }
  return null;
}

export function formatTooltipResourceName(resource: string): string {
  const fallback = resource
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  if (i18n.exists(`common:resources.${resource}`)) {
    return getResourceName(resource, fallback);
  }
  return ownedItemName(resource) ?? getResourceName(resource, fallback);
}

export function formatTooltipStatName(stat: string): string {
  const fallback = stat
    .split(/(?=[A-Z])|_/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  return getStatName(stat, fallback);
}
