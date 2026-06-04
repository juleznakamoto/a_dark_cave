import React from "react";
import { useTranslation } from "react-i18next";
import type { GameState } from "@shared/schema";
import { useGameStore } from "@/game/state";
import {
  getTotalLuck,
  getTotalStrength,
  getTotalKnowledge,
  getTotalMadness,
} from "@/game/rules/effectsCalculation";
import {
  calculateMerchantDiscount,
  calculateKnowledgeTimeBonus,
  calculateCriticalStrikeChance,
  getCombatAttackFailChancePercent,
  getMadnessDeathChancePerCycle,
  getMadnessDeathChanceMaxPerCycle,
  madnessDeathChanceToTooltipPercent,
} from "@/game/rules/effectsStats";
import { getMadnessProductionMultiplier } from "@/game/population";
import { WAGER_TIERS, WAGER_LUCK_THRESHOLDS } from "@/game/diceFifteenGame";
import {
  GAMBLER_TUTORIAL_PLAYS,
  getGamblerTutorialPlaysRemaining,
} from "@/game/gamblerSession";
import { isStatEffectsRevealed } from "@/game/rules/insightReveal";

export type TooltipStatKey = "luck" | "strength" | "knowledge" | "madness";

/** Knowledge: +1 bomb / poison-arrow damage per 5 knowledge. */
const COMBAT_ITEM_DAMAGE_PER_KNOWLEDGE = 5;

/** Caps for stepped/clamped stat bonuses (shown on a muted secondary line). */
const LUCK_CRIT_MAX_PERCENT = 25;
const KNOWLEDGE_MERCHANT_MAX_PERCENT = 25;
const KNOWLEDGE_DECISION_MAX_SEC = 25;
const MADNESS_COMBAT_FAIL_MAX_PERCENT = 15;
/** Highest gambler wager tier (luck unlocks tiers via WAGER_LUCK_THRESHOLDS). */
const MAX_WAGER_TIER = WAGER_TIERS[WAGER_TIERS.length - 1];

const MUTED_SECONDARY_CLASS = "text-muted-foreground text-gray-400/70";

type EffectLine = {
  key: string;
  primary: string;
  secondary?: string;
};

/** Gambler timed event has rolled at least once, or the player has started gambler rounds. */
export function hasGamblerAppearedOnce(state: GameState): boolean {
  if (state.eventCooldowns?.gambler != null) return true;
  return (
    getGamblerTutorialPlaysRemaining(state.story?.seen) <
    GAMBLER_TUTORIAL_PLAYS
  );
}

/** Travelling merchant event or manual call has happened at least once. */
export function hasMerchantAppearedOnce(state: GameState): boolean {
  const seen = state.story?.seen ?? {};
  if (state.eventCooldowns?.merchant != null) return true;
  if (Number(seen.callMerchantUsageCount) > 0) return true;
  if (seen.callMerchantLastEndPlayTime != null) return true;
  if ((state.story?.merchantPurchases ?? 0) > 0) return true;
  return false;
}

/** Bastion tab is visible in the main game UI (`flags.bastionUnlocked`). */
export function isBastionTabUnlocked(state: GameState): boolean {
  return Boolean(state.flags?.bastionUnlocked);
}

/** Highest gambler wager amount currently unlocked by the player's luck. */
function getUnlockedWager(luck: number): number {
  let unlocked = 0;
  for (const tier of WAGER_TIERS) {
    if (luck >= WAGER_LUCK_THRESHOLDS[tier]) unlocked = tier;
  }
  return unlocked;
}

function getLuckEffectLines(
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): EffectLine[] {
  const luck = getTotalLuck(state);
  const lines: EffectLine[] = [];

  if (isBastionTabUnlocked(state)) {
    const crit = calculateCriticalStrikeChance(luck);
    lines.push({
      key: "crit",
      primary: t("sidePanel.statLuckEffectCrit", { percent: crit }),
      secondary:
        crit < LUCK_CRIT_MAX_PERCENT
          ? t("sidePanel.statEffectMaxPercent", {
            value: LUCK_CRIT_MAX_PERCENT,
          })
          : undefined,
    });
  }

  if (hasGamblerAppearedOnce(state)) {
    const unlockedWager = getUnlockedWager(luck);
    lines.push({
      key: "gambling",
      primary: t("sidePanel.statLuckEffectGambling", {
        amount: unlockedWager,
      }),
      secondary:
        unlockedWager < MAX_WAGER_TIER
          ? t("sidePanel.statEffectMaxGold", { value: MAX_WAGER_TIER })
          : undefined,
    });
  }

  return lines;
}

function getStrengthEffectLines(
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): EffectLine[] {
  if (!isBastionTabUnlocked(state)) return [];
  const strength = getTotalStrength(state);
  const bastionAttack = Math.floor(strength / 2);
  return [
    {
      key: "bastion",
      primary: t("sidePanel.statStrengthEffectBastion", {
        value: bastionAttack,
      }),
    },
  ];
}

function getKnowledgeEffectLines(
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): EffectLine[] {
  const knowledge = getTotalKnowledge(state);
  const discountPercent = Math.round(calculateMerchantDiscount(knowledge) * 100);
  const decisionTime = calculateKnowledgeTimeBonus(knowledge);
  const combatItemDamage = Math.floor(
    knowledge / COMBAT_ITEM_DAMAGE_PER_KNOWLEDGE,
  );

  const lines: EffectLine[] = [];

  if (hasMerchantAppearedOnce(state)) {
    lines.push({
      key: "merchant",
      primary: t("sidePanel.statKnowledgeEffectMerchant", {
        percent: discountPercent,
      }),
      secondary:
        discountPercent < KNOWLEDGE_MERCHANT_MAX_PERCENT
          ? t("sidePanel.statEffectMaxPercent", {
            value: KNOWLEDGE_MERCHANT_MAX_PERCENT,
          })
          : undefined,
    });
  }

  lines.push({
    key: "decisionTime",
    primary: t("sidePanel.statKnowledgeEffectDecisionTime", {
      seconds: decisionTime,
    }),
    secondary:
      decisionTime < KNOWLEDGE_DECISION_MAX_SEC
        ? t("sidePanel.statEffectMaxSeconds", {
          value: KNOWLEDGE_DECISION_MAX_SEC,
        })
        : undefined,
  });

  if (isBastionTabUnlocked(state)) {
    lines.push({
      key: "combatItems",
      primary: t("sidePanel.statKnowledgeEffectCombatItems", {
        damage: combatItemDamage,
      }),
    });
  }

  return lines;
}

function getMadnessEffectLines(
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): EffectLine[] {
  const madness = getTotalMadness(state);
  const cruelMode = Boolean(state.cruelMode);
  const productionPenalty = Math.round(
    (1 - getMadnessProductionMultiplier(madness, cruelMode)) * 100,
  );
  const maxProductionPenalty = Math.round(
    (1 - getMadnessProductionMultiplier(50, cruelMode)) * 100,
  );
  const combatFail = getCombatAttackFailChancePercent(madness);
  const deathChance = getMadnessDeathChancePerCycle(madness, cruelMode);
  const maxDeathChance = getMadnessDeathChanceMaxPerCycle(cruelMode);
  const deathPercent = madnessDeathChanceToTooltipPercent(deathChance);
  const maxDeathPercent = madnessDeathChanceToTooltipPercent(maxDeathChance);

  const lines: EffectLine[] = [
    {
      key: "production",
      primary: t("sidePanel.statMadnessEffectProduction", {
        percent: productionPenalty,
      }),
      secondary:
        productionPenalty < maxProductionPenalty
          ? t("sidePanel.statEffectMaxPercent", {
            value: maxProductionPenalty,
          })
          : undefined,
    },
  ];

  if (isBastionTabUnlocked(state)) {
    lines.push({
      key: "combat",
      primary: t("sidePanel.statMadnessEffectCombat", {
        percent: combatFail,
      }),
      secondary:
        combatFail < MADNESS_COMBAT_FAIL_MAX_PERCENT
          ? t("sidePanel.statEffectMaxPercent", {
            value: MADNESS_COMBAT_FAIL_MAX_PERCENT,
          })
          : undefined,
    });
  }

  lines.push({
    key: "deaths",
    primary: t("sidePanel.statMadnessEffectDeaths", {
      percent: deathPercent,
    }),
    secondary:
      deathPercent < maxDeathPercent
        ? t("sidePanel.statEffectMaxPercent", { value: maxDeathPercent })
        : undefined,
  });

  return lines;
}

/** Stable id list for visible stat effect lines (for side-panel new-item pulse). */
export function getStatEffectLinesSignature(
  statKey: TooltipStatKey,
  state: GameState,
): string {
  if (!isStatEffectsRevealed(state)) return "";
  const noopT = (key: string) => key;
  return getStatEffectLines(statKey, state, noopT)
    .map((line) => line.key)
    .sort()
    .join(",");
}

/** Side-panel stat label pulse: after insight reveal and when effect lines exist. */
export function shouldPulseStatItem(
  statKey: TooltipStatKey,
  state: GameState,
): boolean {
  if (!isStatEffectsRevealed(state)) return false;
  return getStatEffectLinesSignature(statKey, state).length > 0;
}

function getStatEffectLines(
  statKey: TooltipStatKey,
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): EffectLine[] {
  switch (statKey) {
    case "luck":
      return getLuckEffectLines(state, t);
    case "strength":
      return getStrengthEffectLines(state, t);
    case "knowledge":
      return getKnowledgeEffectLines(state, t);
    case "madness":
      return getMadnessEffectLines(state, t);
    default:
      return [];
  }
}

/**
 * Divider + per-stat effect breakdown appended below the short stat flavor text in
 * the side-panel stat tooltips. Shows the current bonus and (where stepped) the cap.
 */
export default function StatEffectsTooltip({
  statKey,
}: {
  statKey: TooltipStatKey;
}) {
  const { t } = useTranslation("ui");
  const state = useGameStore() as unknown as GameState;
  if (!isStatEffectsRevealed(state)) return null;
  const lines = getStatEffectLines(statKey, state, t);
  if (lines.length === 0) return null;
  return (
    <div className="mt-1 border-t border-border pt-1">
      {lines.map((line) => (
        <div key={line.key}>
          {line.primary}
          {line.secondary != null ? (
            <span className={MUTED_SECONDARY_CLASS}> {line.secondary}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
