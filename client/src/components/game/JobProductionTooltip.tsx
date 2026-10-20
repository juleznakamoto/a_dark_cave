import React from "react";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  getJobProductionComposition,
  getJobProductionSourceLabel,
  groupJobProductionComposition,
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

/**
 * Per-source production breakdown for one village job.
 * Same source: effect lines as the side-panel Bonuses tooltips.
 */
export default function JobProductionTooltip({
  jobId,
  count,
}: {
  jobId: string;
  count: number;
}) {
  const { t } = useUiTranslation();
  // Mounted only while the tooltip is open (hover or long-press).
  const lines = useDerivedGameState(
    (s) => getJobProductionComposition(jobId, count, s),
    derivedListEqual,
  );
  const groups = groupJobProductionComposition(lines);
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
  count,
  className,
  children,
}: {
  jobId: string;
  count: number;
  className: string;
  children: React.ReactElement;
}) {
  const workerCount = count > 0 ? count : 1;
  return (
    <TooltipWrapper
      tooltipId={villageJobProductionTooltipId(jobId)}
      className={className}
      tooltipTriggerClassName="inline-block max-w-full text-left"
      align="center"
      tooltip={<JobProductionTooltip jobId={jobId} count={workerCount} />}
    >
      {children}
    </TooltipWrapper>
  );
}
