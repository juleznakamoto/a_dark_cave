import type { GameState } from "@shared/schema";
import {
  bookEffects,
  clothingEffects,
  fellowshipEffects,
  toolEffects,
  weaponEffects,
  type EffectDefinition,
} from "@/game/rules/effects";
import { getInsightAmount, isInsightUnlocked } from "@/game/rules/insightReveal";
import { CRUEL_MODE } from "@/game/cruelMode";

/** Insight spent to cleanse one item's madness by 1. */
export const ABSOLUTION_INSIGHT_COST = 250;

/** Madness removed from an item by one Absolution rite. */
export const ABSOLUTION_MADNESS_REDUCTION = 1;

const ABSOLUTION_EXCLUDED_IDS = new Set(["feeding_ring"]);

export function getItemEffectDefinition(
  itemId: string,
): EffectDefinition | undefined {
  return (
    clothingEffects[itemId] ||
    toolEffects[itemId] ||
    weaponEffects[itemId] ||
    fellowshipEffects[itemId] ||
    bookEffects[itemId]
  );
}

export function isItemOwned(
  state: Pick<
    GameState,
    | "clothing"
    | "relics"
    | "tools"
    | "weapons"
    | "fellowship"
    | "blessings"
    | "books"
  >,
  itemId: string,
): boolean {
  const bags = [
    state.clothing,
    state.relics,
    state.tools,
    state.weapons,
    state.fellowship,
    state.blessings,
    state.books,
  ];
  return bags.some((bag) => Boolean((bag as Record<string, boolean> | undefined)?.[itemId]));
}

/** Raw madness an item contributes, including Cruel extra. Negative = reduction. */
export function getItemMadnessAmount(
  state: Pick<GameState, "cruelMode">,
  itemId: string,
): number {
  const effect = getItemEffectDefinition(itemId);
  let madness = effect?.bonuses?.generalBonuses?.madness ?? 0;
  if (
    madness > 0 &&
    state.cruelMode &&
    madness >= CRUEL_MODE.itemMadness.highMadnessThreshold
  ) {
    madness += CRUEL_MODE.itemMadness.highMadnessExtra;
  }
  return madness;
}

export function isItemAbsolved(
  state: Pick<GameState, "absolvedItems">,
  itemId: string,
): boolean {
  return state.absolvedItems?.[itemId] === true;
}

/** Whether this item can ever be cleansed (positive madness, not excluded). */
export function isItemAbsolvableSource(itemId: string, madnessAmount: number): boolean {
  if (ABSOLUTION_EXCLUDED_IDS.has(itemId)) return false;
  return madnessAmount > 0;
}

export function isAbsolutionUnlocked(
  state: Pick<GameState, "books">,
): boolean {
  return state.books?.book_of_absolution === true;
}

/** Show the Insight badge: book owned, item still has uncleansed madness. */
export function shouldShowAbsolveBadge(
  state: Pick<
    GameState,
    | "books"
    | "absolvedItems"
    | "cruelMode"
    | "clothing"
    | "relics"
    | "tools"
    | "weapons"
    | "fellowship"
    | "blessings"
  >,
  itemId: string,
): boolean {
  if (!isAbsolutionUnlocked(state)) return false;
  if (!isItemOwned(state, itemId)) return false;
  if (isItemAbsolved(state, itemId)) return false;
  return isItemAbsolvableSource(itemId, getItemMadnessAmount(state, itemId));
}

export function canAbsolveItem(
  state: Pick<
    GameState,
    | "books"
    | "absolvedItems"
    | "cruelMode"
    | "clothing"
    | "relics"
    | "tools"
    | "weapons"
    | "fellowship"
    | "blessings"
    | "resources"
    | "buildings"
  >,
  itemId: string,
): boolean {
  if (!shouldShowAbsolveBadge(state, itemId)) return false;
  if (!isInsightUnlocked(state as GameState)) return false;
  return getInsightAmount(state as GameState) >= ABSOLUTION_INSIGHT_COST;
}

/** Madness after Absolution (never below 0). */
export function getAbsolvedItemMadnessAmount(
  state: Pick<GameState, "absolvedItems" | "cruelMode">,
  itemId: string,
): number {
  const base = getItemMadnessAmount(state, itemId);
  if (base <= 0) return base;
  if (!isItemAbsolved(state, itemId)) return base;
  return Math.max(0, base - ABSOLUTION_MADNESS_REDUCTION);
}
