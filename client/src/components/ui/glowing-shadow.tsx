import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./glowing-shadow.css";

export type GlowingShadowProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Rainbow (default) or cool silver/white. */
  variant?: "default" | "silver";
  /** Demo card, content-sized shell, or full-bleed image frame. */
  size?: "card" | "compact" | "frame";
  /** Hover intensify + pointer cursor. Off for static share imagery. */
  interactive?: boolean;
};

/**
 * Animated glowing border shell around children (original glow-container pattern).
 * Share image: wrap the card with `variant="silver"` + `size="frame"`.
 */
export function GlowingShadow({
  children,
  className,
  contentClassName,
  variant = "default",
  size = "card",
  interactive = true,
}: GlowingShadowProps) {
  return (
    <div
      className={cn(
        "adc-gs",
        variant === "silver" && "adc-gs--silver",
        size === "compact" && "adc-gs--compact",
        size === "frame" && "adc-gs--frame",
        interactive && "adc-gs--interactive",
        className,
      )}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <span className="adc-gs__glow" aria-hidden />
      <div className={cn("adc-gs__content", contentClassName)}>{children}</div>
    </div>
  );
}
