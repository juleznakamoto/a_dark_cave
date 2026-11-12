import React from "react";
import {
  derivedListEqual,
  useDerivedGameState,
} from "@/game/useGameStoreWithoutTickClock";
import {
  DISGRACED_PRIOR_SOURCE_ID,
  VILLAGER_UPKEEP_SOURCE_ID,
  getResourceProductionBreakdown,
} from "@/game/population";
import {
  getEffectName,
  getVillagerJobName,
  tWithFallback,
} from "@/i18n/resolveGameText";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import {
  getResourceAmountCap,
  isResourceAmountAtCap,
} from "@/game/resourceLimits";
import { capitalizeWords, cn, formatNumber, formatSignedNumber } from "@/lib/utils";

function getResourceFlowSourceLabel(sourceId: string): string {
  if (sourceId === VILLAGER_UPKEEP_SOURCE_ID) {
    return tWithFallback("ui", "village.villagers", "Villagers");
  }
  if (sourceId === DISGRACED_PRIOR_SOURCE_ID) {
    return getEffectName("fellowship", "disgraced_prior", "Disgraced Prior");
  }
  return getVillagerJobName(sourceId, capitalizeWords(sourceId));
}

/** Drop the trailing colon so the label sits beside a right-aligned number. */
function capacityLabelFromCopy(copy: string, formattedLimit: string): string {
  const withoutLimit = formattedLimit ? copy.replace(formattedLimit, "") : copy;
  return withoutLimit.replace(/[\s:：]+$/u, "").trim();
}

function ResourceFlowDivider() {
  return (
    <div
      className="my-1 h-px bg-neutral-600"
      role="separator"
      data-testid="resource-flow-divider"
    />
  );
}

function ResourceFlowLine({
  sourceId,
  amount,
}: {
  sourceId: string;
  amount: number;
}) {
  const { t } = useUiTranslation();
  const source = getResourceFlowSourceLabel(sourceId);
  const formatted = formatSignedNumber(Math.round(amount));
  return (
    <div
      className="flex justify-between gap-3"
      data-testid="resource-flow-line"
      aria-label={t("sidePanel.resourceFlowLine", {
        source,
        amount: formatted,
        defaultValue: "{{source}} {{amount}}",
      })}
    >
      <span>{source}</span>
      <span className="text-right font-mono tabular-nums">{formatted}</span>
    </div>
  );
}

/**
 * Per-source production and consumption for a side-panel resource row.
 * Order: capacity, divider, costs, divider, output, divider, bold sum.
 */
export default function ResourceFlowTooltip({
  resourceId,
}: {
  resourceId: string;
}) {
  const { t } = useUiTranslation();
  const lines = useDerivedGameState(
    (s) => getResourceProductionBreakdown(s, resourceId),
    derivedListEqual,
  );
  const capacityLimit = useDerivedGameState((s) =>
    getResourceAmountCap(resourceId, s),
  );
  const atCapacity = useDerivedGameState((s) => {
    const amount =
      (s.resources as Record<string, number | undefined>)[resourceId] ?? 0;
    return isResourceAmountAtCap(resourceId, amount, s);
  });
  if (lines.length === 0 && capacityLimit == null) return null;

  const costs = lines.filter((line) => line.amount < 0);
  const outputs = lines.filter((line) => line.amount > 0);
  const sum = Math.round(lines.reduce((total, line) => total + line.amount, 0));
  const formattedSum = formatSignedNumber(sum);
  const formattedCapacity =
    capacityLimit != null ? formatNumber(capacityLimit) : "";
  const capacityCopy =
    capacityLimit == null
      ? ""
      : atCapacity
        ? t("sidePanel.atCapacity", {
            limit: formattedCapacity,
            defaultValue: "At capacity: {{limit}}",
          })
        : t("sidePanel.capacity", {
            limit: formattedCapacity,
            defaultValue: "Capacity: {{limit}}",
          });

  return (
    <div className="flex min-w-[7rem] flex-col text-xs">
      {capacityLimit != null ? (
        <div
          data-testid={atCapacity ? "resource-at-capacity" : "resource-capacity"}
          className={cn(
            "flex justify-between gap-3",
            atCapacity && "text-yellow-500",
          )}
          aria-label={capacityCopy}
        >
          <span>{capacityLabelFromCopy(capacityCopy, formattedCapacity)}</span>
          <span
            className="text-right font-mono tabular-nums"
            data-testid="resource-capacity-value"
          >
            {formattedCapacity}
          </span>
        </div>
      ) : null}
      {capacityLimit != null && lines.length > 0 ? <ResourceFlowDivider /> : null}
      {costs.map((line) => (
        <ResourceFlowLine
          key={line.sourceId}
          sourceId={line.sourceId}
          amount={line.amount}
        />
      ))}
      {costs.length > 0 && outputs.length > 0 ? <ResourceFlowDivider /> : null}
      {outputs.map((line) => (
        <ResourceFlowLine
          key={line.sourceId}
          sourceId={line.sourceId}
          amount={line.amount}
        />
      ))}
      {lines.length > 0 ? (
        <>
          <ResourceFlowDivider />
          <div
            className="flex justify-end"
            data-testid="resource-flow-sum"
            aria-label={formattedSum}
          >
            <span className="text-right font-mono font-bold tabular-nums">
              {formattedSum}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
