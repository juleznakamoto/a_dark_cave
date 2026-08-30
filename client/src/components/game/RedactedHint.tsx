import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { cn } from "@/lib/utils";

/** Bar width in `ch` from the hidden label. Always the real character count. */
export function getRedactedWidthCh(label: string): number {
  return label.length;
}

/** Dark bar used for locked achievement copy, demo tabs, and demo-end side-panel rows. */
export function RedactedBar({
  widthCh,
  className,
}: {
  widthCh: number;
  className?: string;
}) {
  return (
    <span className="flex h-[1em] min-w-0 max-w-full items-center" aria-hidden>
      <span
        className="block h-2.5 min-w-0 max-w-full overflow-visible rounded-[2px]"
        style={{ width: `${widthCh}ch` }}
      >
        <span
          className={cn(
            "block h-full w-full rounded-[2px] bg-muted-foreground brightness-50",
            className,
          )}
        />
      </span>
    </span>
  );
}

/** Redacted bar with the shared "Not yet unlocked" tooltip. */
export function RedactedLockedHint({
  label,
  tooltipId,
  widthCh,
  className,
}: {
  label?: string;
  tooltipId: string;
  widthCh?: number;
  className?: string;
}) {
  const { t } = useUiTranslation();
  const hint = t("demoTabs.notYetUnlocked", {
    defaultValue: "Not yet unlocked.",
  });
  return (
    <TooltipWrapper
      tooltip={<div className="text-xs">{hint}</div>}
      disabled={true}
      tooltipId={tooltipId}
      className={cn("inline-flex min-w-0 max-w-full items-center self-center", className)}
    >
      <span aria-label={hint}>
        <RedactedBar widthCh={widthCh ?? getRedactedWidthCh(label ?? "locked")} />
      </span>
    </TooltipWrapper>
  );
}

/** Trailing "..." after a short demo-end action teaser list. */
export function RedactedMoreHint({ tooltipId }: { tooltipId: string }) {
  const { t } = useUiTranslation();
  const hint = t("demoTabs.notYetUnlocked", {
    defaultValue: "Not yet unlocked.",
  });
  return (
    <TooltipWrapper
      tooltip={<div className="text-xs">{hint}</div>}
      disabled={true}
      tooltipId={tooltipId}
      className="inline-flex items-center self-center"
    >
      <span className="text-xs text-muted-foreground" aria-label={hint}>
        ...
      </span>
    </TooltipWrapper>
  );
}
