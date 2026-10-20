import React from "react";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  getJobProductionSourceLabel,
  getOrderedJobProductionGroups,
  type JobProductionResourceComposition,
} from "@/game/jobProductionComposition";
import {
  derivedListEqual,
  useDerivedGameState,
} from "@/game/useGameStoreWithoutTickClock";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { formatTooltipResourceName } from "@/i18n/tooltipLabels";
import { formatSignedNumber } from "@/lib/utils";

export function villageJobProductionTooltipId(jobId: string): string {
  return `village-job-${jobId}-production`;
}

function jobProductionGroupsEqual(
  a: readonly JobProductionResourceComposition[],
  b: readonly JobProductionResourceComposition[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].resource !== b[i].resource || a[i].total !== b[i].total) return false;
    if (!derivedListEqual(a[i].lines, b[i].lines)) return false;
  }
  return true;
}

/**
 * Per-source production for one villager.
 * Resource order matches the job row.
 */
export default function JobProductionTooltip({
  jobId,
}: {
  jobId: string;
}) {
  const { t } = useUiTranslation();
  // Mounted only while the tooltip is open (hover or long-press).
  const groups = useDerivedGameState(
    (s) => getOrderedJobProductionGroups(jobId, 1, s),
    jobProductionGroupsEqual,
  );
  if (groups.length === 0) return null;
  return (
    <div
      className="flex min-w-[7rem] flex-col text-xs"
      data-testid={villageJobProductionTooltipId(jobId)}
    >
      {groups.map((group, index) => (
        <div
          key={group.resource}
          className={index > 0 ? "mt-1.5" : undefined}
        >
          <div className="flex justify-between gap-3">
            <span>{formatTooltipResourceName(group.resource)}</span>
            <span
              translate="no"
              className="notranslate text-right font-mono tabular-nums"
            >
              {formatSignedNumber(group.total)}
            </span>
          </div>
          {group.lines.map((line, lineIndex) => {
            const source = getJobProductionSourceLabel(line.sourceId);
            const effect = formatSignedNumber(line.amount);
            return (
              <div
                key={`${line.sourceId}-${lineIndex}`}
                className="flex justify-between gap-3 text-muted-foreground"
                aria-label={t("sidePanel.bonusSourceEffect", {
                  source,
                  effect,
                  defaultValue: "{{source}}: {{effect}}",
                })}
              >
                <span>{source}</span>
                <span
                  translate="no"
                  className="notranslate text-right font-mono tabular-nums"
                >
                  {effect}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function JobProductionHover({
  jobId,
  className,
  children,
}: {
  jobId: string;
  className: string;
  children: React.ReactElement;
}) {
  return (
    <TooltipWrapper
      tooltipId={villageJobProductionTooltipId(jobId)}
      className={className}
      tooltipTriggerClassName="inline-block max-w-full text-left"
      align="center"
      tooltip={<JobProductionTooltip jobId={jobId} />}
    >
      {children}
    </TooltipWrapper>
  );
}
