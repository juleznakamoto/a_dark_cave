import * as React from "react";
import { cn } from "@/lib/utils";

type TextShimmerProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds for one shimmer sweep. Default 1.4. */
  duration?: number;
  as?: "span" | "p" | "div";
};

/**
 * Loading / in-progress text: a highlight sweeps across the label.
 * Inherits the parent text color (works on primary and outline buttons).
 */
export function TextShimmer({
  children,
  className,
  duration = 1.4,
  as: Comp = "span",
}: TextShimmerProps) {
  return (
    <Comp
      className={cn("text-shimmer-host inline-block", className)}
      style={
        {
          ["--text-shimmer-duration" as string]: `${duration}s`,
        } as React.CSSProperties
      }
    >
      <span className="text-shimmer">{children}</span>
    </Comp>
  );
}
