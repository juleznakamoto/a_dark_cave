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
} from "@/game/rules/effectsStats";
import { getMadnessProductionMultiplier } from "@/game/population";
import { WAGER_TIERS, WAGER_LUCK_THRESHOLDS } from "@/game/diceFifteenGame";

export type TooltipStatKey = "luck" | "strength" | "knowledge" | "madness";

/** Knowledge: forest trade cooldown reduction (mirror of forestTradeActions). */
const TRADE_COOLDOWN_REDUCTION_PER_KNOWLEDGE = 0.5;
const TRADE_COOLDOWN_REDUCTION_MAX_SEC = 15;
/** Knowledge: +1 bomb / poison-arrow damage per 5 knowledge. */
const COMBAT_ITEM_DAMAGE_PER_KNOWLEDGE = 5;

/** Caps for stepped/clamped stat bonuses (shown as "(N max)" in the tooltip). */
const LUCK_CRIT_MAX_PERCENT = 25;
const KNOWLEDGE_MERCHANT_MAX_PERCENT = 25;
const KNOWLEDGE_DECISION_MAX_SEC = 25;
const MADNESS_PRODUCTION_MAX_PERCENT = 50;
const MADNESS_COMBAT_FAIL_MAX_PERCENT = 15;
/** Highest gambler wager tier (luck unlocks tiers via WAGER_LUCK_THRESHOLDS). */
const MAX_WAGER_TIER = WAGER_TIERS[WAGER_TIERS.length - 1];

type EffectLine = { key: string; text: string };

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
  const crit = calculateCriticalStrikeChance(luck);
  const unlockedWager = getUnlockedWager(luck);
  return [
    {
      key: "crit",
      text: t("sidePanel.statLuckEffectCrit", {
        percent: crit,
        maxPercent: LUCK_CRIT_MAX_PERCENT,
      }),
    },
    {
      key: "gambling",
      text: t("sidePanel.statLuckEffectGambling", {
        amount: unlockedWager,
        maxAmount: MAX_WAGER_TIER,
      }),
    },
  ];
}

function getStrengthEffectLines(
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): EffectLine[] {
  const strength = getTotalStrength(state);
  const bastionAttack = Math.floor(strength / 2);
  return [
    {
      key: "bastion",
      text: t("sidePanel.statStrengthEffectBastion", { value: bastionAttack }),
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
  const tradeCooldownReduction = Math.min(
    TRADE_COOLDOWN_REDUCTION_PER_KNOWLEDGE * knowledge,
    TRADE_COOLDOWN_REDUCTION_MAX_SEC,
  );
  const combatItemDamage = Math.floor(
    knowledge / COMBAT_ITEM_DAMAGE_PER_KNOWLEDGE,
  );
  return [
    {
      key: "merchant",
      text: t("sidePanel.statKnowledgeEffectMerchant", {
        percent: discountPercent,
        maxPercent: KNOWLEDGE_MERCHANT_MAX_PERCENT,
      }),
    },
    {
      key: "decisionTime",
      text: t("sidePanel.statKnowledgeEffectDecisionTime", {
        seconds: decisionTime,
        maxSeconds: KNOWLEDGE_DECISION_MAX_SEC,
      }),
    },
    {
      key: "tradeCooldown",
      text: t("sidePanel.statKnowledgeEffectTradeCooldown", {
        seconds: tradeCooldownReduction,
        maxSeconds: TRADE_COOLDOWN_REDUCTION_MAX_SEC,
      }),
    },
    {
      key: "combatItems",
      text: t("sidePanel.statKnowledgeEffectCombatItems", {
        damage: combatItemDamage,
      }),
    },
  ];
}

function getMadnessEffectLines(
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): EffectLine[] {
  const madness = getTotalMadness(state);
  const productionPenalty = Math.round(
    (1 - getMadnessProductionMultiplier(madness, Boolean(state.cruelMode))) *
    100,
  );
  const combatFail = getCombatAttackFailChancePercent(madness);
  return [
    {
      key: "production",
      text: t("sidePanel.statMadnessEffectProduction", {
        percent: productionPenalty,
        maxPercent: MADNESS_PRODUCTION_MAX_PERCENT,
      }),
    },
    {
      key: "combat",
      text: t("sidePanel.statMadnessEffectCombat", {
        percent: combatFail,
        maxPercent: MADNESS_COMBAT_FAIL_MAX_PERCENT,
      }),
    },
    { key: "deaths", text: t("sidePanel.statMadnessEffectDeaths") },
  ];
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
  const lines = getStatEffectLines(statKey, state, t);
  if (lines.length === 0) return null;
  return (
    <div className="mt-1 border-t border-border pt-1">
      <div className="text-gray-500">{t("sidePanel.statEffectsHeader")}</div>
      {lines.map((line) => (
        <div key={line.key} className="text-gray-400">
          {line.text}
        </div>
      ))}
    </div>
  );
}
