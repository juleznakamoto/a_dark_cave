import React from "react";
import { useGameStore } from "@/game/state";
import {
  DISGRACED_PRIOR_SOURCE_ID,
  VILLAGER_UPKEEP_SOURCE_ID,
  getResourceProductionBreakdown,
} from "@/game/population";
import type { GameState } from "@shared/schema";
import {
  getEffectName,
  getVillagerJobName,
  tWithFallback,
} from "@/i18n/resolveGameText";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { capitalizeWords, formatSignedNumber } from "@/lib/utils";

function getResourceFlowSourceLabel(sourceId: string): string {
  if (sourceId === VILLAGER_UPKEEP_SOURCE_ID) {
    return tWithFallback("ui", "village.villagers", "Villagers");
  }
  if (sourceId === DISGRACED_PRIOR_SOURCE_ID) {
    return getEffectName("fellowship", "disgraced_prior", "Disgraced Prior");
  }
  return getVillagerJobName(sourceId, capitalizeWords(sourceId));
}

/**
 * Per-job production/consumption for a side-panel resource row.
 * Format: `Gatherer +10`
 */
export default function ResourceFlowTooltip({
  resourceId,
}: {
  resourceId: string;
}) {
  const { t } = useUiTranslation();
  const state = useGameStore() as unknown as GameState;
  const lines = getResourceProductionBreakdown(state, resourceId);
  if (lines.length === 0) return null;
  return (
    <div className="flex min-w-[7rem] flex-col text-xs">
      {lines.map((line) => {
        const source = getResourceFlowSourceLabel(line.sourceId);
        const amount = formatSignedNumber(Math.round(line.amount));
        return (
          <div
            key={line.sourceId}
            className="flex justify-between gap-3"
            aria-label={t("sidePanel.resourceFlowLine", {
              source,
              amount,
              defaultValue: "{{source}} {{amount}}",
            })}
          >
            <span>{source}</span>
            <span className="text-right font-mono tabular-nums">{amount}</span>
          </div>
        );
      })}
    </div>
  );
}
