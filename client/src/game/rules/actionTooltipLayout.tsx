import React from "react";
import {
  TOOLTIP_DIVIDER_CLASS,
  TOOLTIP_MUTED_CLASS,
  tooltipDescriptionLayoutStyle,
} from "@/game/tooltipMetrics";

export function ActionTooltipSeparator() {
  return <div className={TOOLTIP_DIVIDER_CLASS} />;
}

export type ActionTooltipParts = {
  /** Cost lines, resource gains, villager requirements, etc. */
  header?: React.ReactNode;
  /** Icon or badge shown at the top-right of the header row (e.g. upgrade 🠕, focus ☩). */
  headerTrailing?: React.ReactNode;
  /** Flavour text — never includes the action/item title. */
  description?: string;
  /** Stat/effect lines for the craft/build result. */
  effects?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/** Standard action tooltip order: header → divider → effects → divider → description. */
/** Matches building upgrade tooltips: trailing icon sits in the header row only. */
export function wrapTooltipHeaderWithTrailing(
  header: React.ReactNode,
  trailing: React.ReactNode | undefined,
): React.ReactNode {
  if (trailing == null) {
    return header;
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">{header}</div>
      <span className="shrink-0 leading-none">{trailing}</span>
    </div>
  );
}

export function composeActionTooltip({
  header,
  headerTrailing,
  description,
  effects,
  className,
  style,
}: ActionTooltipParts): React.ReactNode | null {
  const hasHeader = header != null;
  const hasDescription = Boolean(description);
  const hasEffects = effects != null;

  if (!hasHeader && !hasDescription && !hasEffects) {
    return null;
  }

  return (
    <div className={className} style={style}>
      {hasHeader ? wrapTooltipHeaderWithTrailing(header, headerTrailing) : null}
      {hasEffects ? (
        <>
          {hasHeader ? <ActionTooltipSeparator /> : null}
          <div>{effects}</div>
        </>
      ) : null}
      {hasDescription ? (
        <>
          {hasHeader || hasEffects ? <ActionTooltipSeparator /> : null}
          <div
            className={`whitespace-normal ${TOOLTIP_MUTED_CLASS}`}
            style={tooltipDescriptionLayoutStyle(hasHeader || hasEffects)}
          >
            {description}
          </div>
        </>
      ) : null}
    </div>
  );
}
