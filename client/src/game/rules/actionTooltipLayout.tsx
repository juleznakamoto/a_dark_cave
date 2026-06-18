import React from "react";

export function ActionTooltipSeparator() {
  return <div className="border-t border-border my-1" />;
}

export type ActionTooltipParts = {
  /** Cost lines, resource gains, villager requirements, etc. */
  header?: React.ReactNode;
  /** Icon or badge shown at the top-right of the header row (e.g. upgrade 🠕, focus ☩). */
  headerTrailing?: React.ReactNode;
  /** Flavour text — never includes the action/item title. */
  description?: string;
  /** Stat/effect lines (e.g. after paying insight to reveal). */
  effects?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/** Standard action tooltip order: header → separator → description → separator → effects. */
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
  className = "text-xs",
  style,
}: ActionTooltipParts): React.ReactNode | null {
  const hasHeader = header != null;
  const hasDescription = Boolean(description);
  const hasEffects = effects != null;

  if (!hasHeader && !hasDescription && !hasEffects) {
    return null;
  }

  const sections: React.ReactNode[] = [];

  const push = (node: React.ReactNode) => {
    if (sections.length > 0) {
      sections.push(
        <ActionTooltipSeparator key={`sep-${sections.length}`} />,
      );
    }
    sections.push(node);
  };

  if (hasHeader) {
    push(wrapTooltipHeaderWithTrailing(header, headerTrailing));
  }
  if (hasDescription) {
    push(
      <div
        key="description"
        className="text-muted-foreground whitespace-normal"
      >
        {description}
      </div>,
    );
  }
  if (hasEffects) {
    push(<div key="effects">{effects}</div>);
  }

  return (
    <div className={className} style={style}>
      {sections}
    </div>
  );
}
