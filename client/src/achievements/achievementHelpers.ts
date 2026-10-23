import { useGameStore } from "@/game/state";
import type { GameState } from "@shared/schema";
import type { DevGameMode } from "@/lib/edition";
import type {
  AchievementBonuses,
  AchievementChartConfig,
} from "./achievementTypes";
import { getAchievementConfigForEdition } from "./achievementEdition";
import {
  getAchievementDescription,
  getAchievementDetailLabel,
  getAchievementLabel,
  interpolateFallback,
} from "@/i18n/resolveGameText";
import {
  formatTooltipResourceName,
  getUiTooltip,
} from "@/i18n/tooltipLabels";

export interface AchievementRow {
  segmentId: string;
  /** Chart category prefix (basic / building / item / action / overall). */
  chartPrefix: AchievementChartConfig["idPrefix"];
  label: string;
  /** English config label — used as save fallback for log re-localization. */
  englishLabel: string;
  /** Short how-to / criteria text from achievements locale. */
  description: string;
  /** Optional muted suffix (e.g. speedrun time gate). */
  detailLabel?: string;
  currentCount: number;
  maxCount: number;
  achievementId: string;
  /** @deprecated Use rewards instead */
  reward?: number;
  /** Computed rewards per resource (e.g. { silver: 250, gold: 10 }) */
  rewards: Record<string, number>;
  /** Permanent bonuses while claimed. */
  bonuses: AchievementBonuses;
  isFull: boolean;
  isClaimed: boolean;
  /** Ring slice weight and progress bar ticks. Defaults to maxCount. */
  segments?: number;
}

/** Computes silver reward for an achievement (matches legacy ring chart logic). */
export function computeSilverReward(
  reward: number | undefined,
  maxCount: number,
  BTP: number
): number {
  const candidate = reward || 0 + BTP * 250;
  return candidate ?? 50 * maxCount;
}

/** Computes all achievement rewards. Supports legacy reward (silver) and new rewards map. */
export function computeAchievementRewards(
  segment: {
    reward?: number;
    rewards?: Record<string, number>;
    bonuses?: AchievementBonuses;
    maxCount: number;
  },
  BTP: number
): Record<string, number> {
  // Explicit rewards map (including `{}` for bonus-only achievements).
  if (segment.rewards != null) {
    const result = { ...segment.rewards };
    if ("silver" in result) {
      result.silver = computeSilverReward(result.silver, segment.maxCount, BTP);
    }
    return result;
  }
  if (segment.bonuses && Object.keys(segment.bonuses).length > 0) {
    return {};
  }
  const silver = computeSilverReward(segment.reward, segment.maxCount, BTP);
  return silver > 0 ? { silver } : {};
}

function formatBonusPercent(value: number): string {
  return String(Number((value * 100).toFixed(2)));
}

/** Formats permanent achievement bonuses for display. */
export function formatAchievementBonusesTooltip(
  bonuses: AchievementBonuses | undefined,
): string {
  if (!bonuses) return "";
  const parts: string[] = [];
  if (bonuses.strangerApproachBonus && bonuses.strangerApproachBonus > 0) {
    parts.push(
      getUiTooltip(
        "buildings.newVillagerChancePercent",
        "+{{percent}}% New Villager Chance",
        { percent: formatBonusPercent(bonuses.strangerApproachBonus) },
      ),
    );
  }
  if (bonuses.craftingCostReduction && bonuses.craftingCostReduction > 0) {
    parts.push(
      getUiTooltip(
        "buildings.craftDiscount",
        "{{percent}}% Craft Discount",
        { percent: formatBonusPercent(bonuses.craftingCostReduction) },
      ),
    );
  }
  if (bonuses.buildingCostReduction && bonuses.buildingCostReduction > 0) {
    parts.push(
      getUiTooltip(
        "buildings.buildDiscount",
        "{{percent}}% Build Discount",
        { percent: formatBonusPercent(bonuses.buildingCostReduction) },
      ),
    );
  }
  return parts.join(", ");
}

/** Formats resource + permanent bonus rewards, e.g. "+250 Food, +1% New Villager Chance". */
export function formatRewardsTooltip(
  rewards: Record<string, number>,
  bonuses?: AchievementBonuses,
): string {
  const entries = Object.entries(rewards).filter(([, amount]) => amount > 0);
  const resourceText = entries
    .map(([key, amount]) => `+${amount} ${formatTooltipResourceName(key)}`)
    .join(", ");
  const bonusText = formatAchievementBonusesTooltip(bonuses);
  return [resourceText, bonusText].filter(Boolean).join(", ");
}

/** Flattens a category config's rings into per-achievement row data. */
export function getAchievementRows(
  config: AchievementChartConfig,
  state: ReturnType<typeof useGameStore.getState>,
  claimedAchievements: string[]
): AchievementRow[] {
  const editionConfig = getAchievementConfigForEdition(
    config,
    (state as { devGameMode?: DevGameMode }).devGameMode,
  );
  const BTP = state.BTP ?? 0;
  const claimable = editionConfig.claimable !== false;
  const rows: AchievementRow[] = [];
  editionConfig.rings.forEach((segments) => {
    segments.forEach((seg) => {
      const currentCount = seg.getCount(state);
      const achievementId = `${editionConfig.idPrefix}-${seg.segmentId}`;
      const isFull = currentCount >= seg.maxCount;
      const isClaimed = claimable
        ? claimedAchievements.includes(achievementId)
        : isFull;
      const rewards = claimable ? computeAchievementRewards(seg, BTP) : {};
      const bonuses = claimable ? (seg.bonuses ?? {}) : {};
      rows.push({
        segmentId: seg.segmentId,
        chartPrefix: editionConfig.idPrefix,
        label: getAchievementLabel(
          editionConfig.idPrefix,
          seg.segmentId,
          seg.label,
        ),
        englishLabel: seg.label,
        description: getAchievementDescription(
          editionConfig.idPrefix,
          seg.segmentId,
        ),
        detailLabel: seg.detailLabel
          ? getAchievementDetailLabel(
            editionConfig.idPrefix,
            seg.segmentId,
            seg.detailLabel,
          )
          : undefined,
        currentCount,
        maxCount: seg.maxCount,
        achievementId,
        reward: claimable ? seg.reward : undefined,
        rewards,
        bonuses,
        isFull,
        isClaimed,
        segments: seg.segments,
      });
    });
  });
  return rows;
}

/** Claims an achievement: grants all rewards, logs, updates claimedAchievements. */
export function claimAchievement(
  achievementId: string,
  segment: {
    fallbackName: string;
    reward?: number;
    rewards?: Record<string, number>;
    bonuses?: AchievementBonuses;
    maxCount: number;
  },
): void {
  const BTP = useGameStore.getState().BTP || 0;
  const rewards = computeAchievementRewards(segment, BTP);
  const bonuses = segment.bonuses ?? {};

  for (const [resource, amount] of Object.entries(rewards)) {
    if (amount > 0) {
      useGameStore
        .getState()
        .updateResource(resource as keyof GameState["resources"], amount, {
          allowOvercap: true,
        });
    }
  }

  const rewardText = formatRewardsTooltip(rewards, bonuses);
  const logTemplate = "{{name}} Achievement complete: {{rewards}}";
  const logVars: Record<string, string | number> = {
    achievementId,
    fallbackName: segment.fallbackName,
    ...Object.fromEntries(
      Object.entries(rewards)
        .filter(([, amount]) => amount > 0)
        .map(([resource, amount]) => [`reward_${resource}`, amount]),
    ),
  };
  if (bonuses.strangerApproachBonus && bonuses.strangerApproachBonus > 0) {
    logVars.bonus_strangerApproachPercent = Number(
      (bonuses.strangerApproachBonus * 100).toFixed(2),
    );
  }
  if (bonuses.craftingCostReduction && bonuses.craftingCostReduction > 0) {
    logVars.bonus_craftingCostPercent = Number(
      (bonuses.craftingCostReduction * 100).toFixed(2),
    );
  }
  if (bonuses.buildingCostReduction && bonuses.buildingCostReduction > 0) {
    logVars.bonus_buildingCostPercent = Number(
      (bonuses.buildingCostReduction * 100).toFixed(2),
    );
  }

  useGameStore.setState((s) => ({
    log: [
      ...s.log,
      {
        id: `achievement-${achievementId}-${Date.now()}`,
        message: interpolateFallback(logTemplate, {
          name: segment.fallbackName,
          rewards: rewardText,
        }),
        logKey: "achievements.completeLog",
        logVars,
        timestamp: Date.now(),
        type: "event" as const,
      },
    ].slice(-100),
    claimedAchievements: [...(s.claimedAchievements || []), achievementId],
  }));

  void import("./nonOverallCompletion").then(
    ({ persistAchievementMaxerIfComplete }) =>
      persistAchievementMaxerIfComplete(),
  );
}
