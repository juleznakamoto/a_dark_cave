import { tWithFallback, getResourceName, getStatName } from "./resolveGameText";
import type { BuildingTooltipEffect } from "@/game/rules/buildingTooltipEffects";
import type { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

type TranslateOptions = Record<string, string | number | boolean | undefined>;

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

/** Player-facing cost line for tooltips (e.g. "-50 Gold"). */
export function formatTooltipCostLine(
  amount: number,
  resourceKey: string,
  options?: { displayName?: string },
): string {
  const resource =
    options?.displayName ?? formatTooltipResourceName(resourceKey);
  return getUiTooltip("costLine", "-{{amount}} {{resource}}", {
    amount: formatNumber(amount),
    resource,
  });
}

export function formatTooltipResourceName(resource: string): string {
  const fallback = resource
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return getResourceName(resource, fallback);
}

export function formatTooltipStatName(stat: string): string {
  const fallback = stat
    .split(/(?=[A-Z])|_/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  return getStatName(stat, fallback);
}
