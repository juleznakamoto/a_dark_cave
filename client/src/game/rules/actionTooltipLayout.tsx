import React from "react";

export function ActionTooltipSeparator() {
  return <div className="border-t border-border my-1" />;
}

export type ActionTooltipParts = {
  /** Cost lines, resource gains, villager requirements, etc. */
  header?: React.ReactNode;
  /** Flavour text — never includes the action/item title. */
  description?: string;
  /** Stat/effect lines (e.g. after paying insight to reveal). */
  effects?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/** Standard action tooltip order: header → separator → description → separator → effects. */
export function composeActionTooltip({
  header,
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
    push(header);
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
