import React from "react";
import { useTranslation } from "react-i18next";
import type { GameState } from "@shared/schema";
import { isBastionTabVisible } from "@shared/repairUnlockFlags";
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
import { hasGamblerAppearedOnce } from "@/game/gamblerSession";
import { bombKnowledgeDamageBonus } from "@/game/rules/skillUpgrades";

export type TooltipStatKey = "luck" | "strength" | "knowledge" | "madness";

/** Poison arrows: +1 damage per 5 knowledge (bombs use bombKnowledgeDamageBonus). */
const POISON_ARROW_DAMAGE_PER_KNOWLEDGE = 5;

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

type StatEffectRow = EffectLine & {
  unlocked: boolean;
};

/** Travelling merchant event or manual call has happened at least once. */
export function hasMerchantAppearedOnce(state: GameState): boolean {
  const seen = state.story?.seen ?? {};
  if (state.eventCooldowns?.merchant != null) return true;
  if (Number(seen.callMerchantUsageCount) > 0) return true;
  if (seen.callMerchantLastEndPlayTime != null) return true;
  if ((state.story?.merchantPurchases ?? 0) > 0) return true;
  return false;
}

/** Bastion tab is visible in the main game UI (flag or bastion-building evidence). */
export function isBastionTabUnlocked(state: GameState): boolean {
  return isBastionTabVisible(state);
}

/** Highest gambler wager amount currently unlocked by the player's luck. */
function getUnlockedWager(luck: number): number {
  let unlocked = 0;
  for (const tier of WAGER_TIERS) {
    if (luck >= WAGER_LUCK_THRESHOLDS[tier]) unlocked = tier;
  }
  return unlocked;
}

function lockedRow(key: string, label: string): StatEffectRow {
  return { key, unlocked: false, primary: label };
}

function getLuckEffectRows(
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): StatEffectRow[] {
  const luck = getTotalLuck(state);
  const lockedLabel = t("sidePanel.statEffectNotUnlockedYet");
  const rows: StatEffectRow[] = [];

  if (isBastionTabUnlocked(state)) {
    const crit = calculateCriticalStrikeChance(luck);
    rows.push({
      key: "crit",
      unlocked: true,
      primary: t("sidePanel.statLuckEffectCrit", { percent: crit }),
      secondary:
        crit < LUCK_CRIT_MAX_PERCENT
          ? t("sidePanel.statEffectMaxPercent", {
            value: LUCK_CRIT_MAX_PERCENT,
          })
          : undefined,
    });
  } else {
    rows.push(lockedRow("crit", lockedLabel));
  }

  if (hasGamblerAppearedOnce(state)) {
    const unlockedWager = getUnlockedWager(luck);
    rows.push({
      key: "gambling",
      unlocked: true,
      primary: t("sidePanel.statLuckEffectGambling", {
        amount: unlockedWager,
      }),
      secondary:
        unlockedWager < MAX_WAGER_TIER
          ? t("sidePanel.statEffectMaxGold", { value: MAX_WAGER_TIER })
          : undefined,
    });
  } else {
    rows.push(lockedRow("gambling", lockedLabel));
  }

  return rows;
}

function getStrengthEffectRows(
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): StatEffectRow[] {
  const lockedLabel = t("sidePanel.statEffectNotUnlockedYet");

  if (!isBastionTabUnlocked(state)) {
    return [lockedRow("bastion", lockedLabel)];
  }

  const strength = getTotalStrength(state);
  const bastionAttack = Math.floor(strength / 2);
  return [
    {
      key: "bastion",
      unlocked: true,
      primary: t("sidePanel.statStrengthEffectBastion", {
        value: bastionAttack,
      }),
    },
  ];
}

function getKnowledgeEffectRows(
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): StatEffectRow[] {
  const knowledge = getTotalKnowledge(state);
  const discountPercent = Math.round(calculateMerchantDiscount(knowledge) * 100);
  const decisionTime = calculateKnowledgeTimeBonus(knowledge);
  const bombDamage = bombKnowledgeDamageBonus(knowledge);
  const arrowDamage = Math.floor(knowledge / POISON_ARROW_DAMAGE_PER_KNOWLEDGE);
  const lockedLabel = t("sidePanel.statEffectNotUnlockedYet");
  const rows: StatEffectRow[] = [];

  if (hasMerchantAppearedOnce(state)) {
    rows.push({
      key: "merchant",
      unlocked: true,
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
  } else {
    rows.push(lockedRow("merchant", lockedLabel));
  }

  rows.push({
    key: "decisionTime",
    unlocked: true,
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
    rows.push({
      key: "combatItems",
      unlocked: true,
      primary: t("sidePanel.statKnowledgeEffectCombatItems", {
        bombDamage,
        arrowDamage,
      }),
    });
  } else {
    rows.push(lockedRow("combatItems", lockedLabel));
  }

  return rows;
}

function getMadnessEffectRows(
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): StatEffectRow[] {
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
  const lockedLabel = t("sidePanel.statEffectNotUnlockedYet");

  const rows: StatEffectRow[] = [
    {
      key: "production",
      unlocked: true,
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
    rows.push({
      key: "combat",
      unlocked: true,
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
  } else {
    rows.push(lockedRow("combat", lockedLabel));
  }

  rows.push({
    key: "deaths",
    unlocked: true,
    primary: t("sidePanel.statMadnessEffectDeaths", {
      percent: deathPercent,
    }),
    secondary:
      deathPercent < maxDeathPercent
        ? t("sidePanel.statEffectMaxPercent", { value: maxDeathPercent })
        : undefined,
  });

  return rows;
}

function getStatEffectRows(
  statKey: TooltipStatKey,
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): StatEffectRow[] {
  switch (statKey) {
    case "luck":
      return getLuckEffectRows(state, t);
    case "strength":
      return getStrengthEffectRows(state, t);
    case "knowledge":
      return getKnowledgeEffectRows(state, t);
    case "madness":
      return getMadnessEffectRows(state, t);
    default:
      return [];
  }
}

/** Unlocked effect lines only (values + caps). */
function getStatEffectLines(
  statKey: TooltipStatKey,
  state: GameState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): EffectLine[] {
  return getStatEffectRows(statKey, state, t)
    .filter((row) => row.unlocked)
    .map(({ key, primary, secondary }) => ({ key, primary, secondary }));
}

/** Stable id list for visible stat effect lines (for side-panel new-item pulse). */
export function getStatEffectLinesSignature(
  statKey: TooltipStatKey,
  state: GameState,
): string {
  const noopT = (key: string) => key;
  return getStatEffectLines(statKey, state, noopT)
    .map((line) => line.key)
    .sort()
    .join(",");
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
  const rows = getStatEffectRows(statKey, state, t);
  if (rows.length === 0) return null;
  return (
    <div className="mt-1 border-t border-border pt-1">
      {rows.map((row) => (
        <div
          key={row.key}
          className={!row.unlocked ? MUTED_SECONDARY_CLASS : undefined}
        >
          {row.primary}
          {row.unlocked && row.secondary != null ? (
            <span className={MUTED_SECONDARY_CLASS}> {row.secondary}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
