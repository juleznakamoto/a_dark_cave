import type { GameState } from "@shared/schema";
import {
  getTotalStrength,
  getTotalLuck,
  getTotalKnowledge,
} from "./effectsCalculation";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";

export type SuccessChanceStatType = "strength" | "knowledge" | "luck";

export type SuccessChanceStatBonus = {
  type: SuccessChanceStatType;
  multiplier: number;
};

export type SuccessChanceFormula = {
  base: number | ((state: GameState) => number);
  stats:
  | SuccessChanceStatBonus[]
  | ((state: GameState) => SuccessChanceStatBonus[]);
  cmMultiplier: number;
  /** When true, chance is 0 and stat bonuses do not apply. */
  forceZero?: (state: GameState) => boolean;
};

export type SuccessChanceFn = ((state: GameState) => number) & {
  formula: SuccessChanceFormula;
};

function getStatValue(state: GameState, type: SuccessChanceStatType): number {
  if (type === "strength") return getTotalStrength(state);
  if (type === "knowledge") return getTotalKnowledge(state);
  return getTotalLuck(state);
}

export function resolveSuccessChanceBase(
  formula: SuccessChanceFormula,
  state: GameState,
): number {
  return typeof formula.base === "function" ? formula.base(state) : formula.base;
}

export function resolveSuccessChanceStats(
  formula: SuccessChanceFormula,
  state: GameState,
): SuccessChanceStatBonus[] {
  return typeof formula.stats === "function" ? formula.stats(state) : formula.stats;
}

export function evaluateSuccessChanceFormula(
  state: GameState,
  formula: SuccessChanceFormula,
): number {
  if (formula.forceZero?.(state)) {
    return 0;
  }

  let chance = resolveSuccessChanceBase(formula, state);
  for (const stat of resolveSuccessChanceStats(formula, state)) {
    chance += getStatValue(state, stat.type) * stat.multiplier;
  }
  chance += cruelModeScale(state) * formula.cmMultiplier;

  return Math.max(0, Math.min(chance, 1.0));
}

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
  stat0?: SuccessChanceStatBonus,
  stat1?: SuccessChanceStatBonus,
  cmMultiplier: number = CRUEL_MODE.successChance.defaultCruelPenalty,
): number {
  return evaluateSuccessChanceFormula(state, {
    base: baseChance,
    stats: [stat0, stat1].filter((stat): stat is SuccessChanceStatBonus => !!stat),
    cmMultiplier,
  });
}

export function defineSuccessChance(formula: {
  base: number | ((state: GameState) => number);
  stats?:
  | SuccessChanceStatBonus[]
  | ((state: GameState) => SuccessChanceStatBonus[]);
  cmMultiplier?: number;
  forceZero?: (state: GameState) => boolean;
  relevantStats?: SuccessChanceStatType[];
}): {
  success_chance: SuccessChanceFn;
  relevant_stats: SuccessChanceStatType[];
  success_formula: SuccessChanceFormula;
} {
  const success_formula: SuccessChanceFormula = {
    base: formula.base,
    stats: formula.stats ?? [],
    cmMultiplier:
      formula.cmMultiplier ?? CRUEL_MODE.successChance.defaultCruelPenalty,
    forceZero: formula.forceZero,
  };

  const success_chance = ((state: GameState) =>
    evaluateSuccessChanceFormula(state, success_formula)) as SuccessChanceFn;
  success_chance.formula = success_formula;

  const relevant_stats =
    formula.relevantStats ??
    (Array.isArray(success_formula.stats)
      ? success_formula.stats.map((stat) => stat.type)
      : []);

  return {
    success_chance,
    relevant_stats,
    success_formula,
  };
}

export function getSuccessChanceFormula(
  successChance?: number | ((state: GameState) => number) | null,
  successFormula?: SuccessChanceFormula,
): SuccessChanceFormula | undefined {
  if (successFormula) return successFormula;
  if (
    typeof successChance === "function" &&
    "formula" in successChance &&
    (successChance as SuccessChanceFn).formula
  ) {
    return (successChance as SuccessChanceFn).formula;
  }
  return undefined;
}

/** Format a 0-1 (or signed) chance as a percent string without trailing zeros. */
export function formatSuccessChancePercent(chance: number): string {
  const pct = chance * 100;
  if (Number.isInteger(pct)) return String(pct);
  return String(Number(pct.toFixed(2)));
}

export type SuccessChanceBreakdownStat = {
  type: SuccessChanceStatType;
  statValue: number;
  percentPerPoint: string;
  contributionPercent: string;
};

export type SuccessChanceBreakdown = {
  forceZero: boolean;
  basePercent: string;
  stats: SuccessChanceBreakdownStat[];
  cruelPercent: string | null;
};

export function getSuccessChanceBreakdown(
  formula: SuccessChanceFormula,
  state: GameState,
): SuccessChanceBreakdown {
  const forceZero = !!formula.forceZero?.(state);
  if (forceZero) {
    return { forceZero: true, basePercent: "0", stats: [], cruelPercent: null };
  }

  const cruelApplies =
    cruelModeScale(state) === 1 && formula.cmMultiplier !== 0;

  return {
    forceZero: false,
    basePercent: formatSuccessChancePercent(resolveSuccessChanceBase(formula, state)),
    stats: resolveSuccessChanceStats(formula, state).map((stat) => {
      const statValue = getStatValue(state, stat.type);
      return {
        type: stat.type,
        statValue,
        percentPerPoint: formatSuccessChancePercent(stat.multiplier),
        contributionPercent: formatSuccessChancePercent(
          statValue * stat.multiplier,
        ),
      };
    }),
    cruelPercent: cruelApplies
      ? formatSuccessChancePercent(formula.cmMultiplier)
      : null,
  };
}
