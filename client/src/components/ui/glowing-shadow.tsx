import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./glowing-shadow.css";

export type GlowingShadowProps = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Rainbow (default) or cool silver/white. */
  variant?: "default" | "silver";
  /** Demo card, content-sized shell, or full-bleed image frame. */
  size?: "card" | "compact" | "frame";
  /**
   * Decorative border overlay only (no content shell).
   * Use as an absolutely positioned sibling over the share image.
   */
  borderOnly?: boolean;
  /** Hover intensify + pointer cursor. Off for static share imagery. */
  interactive?: boolean;
};

/**
 * Animated glowing border shell (CSS @property + keyframes).
 * Share image: `variant="silver"` + `size="frame"` + `borderOnly`.
 */
export function GlowingShadow({
  children,
  className,
  contentClassName,
  variant = "default",
  size = "card",
  borderOnly = false,
  interactive = true,
}: GlowingShadowProps) {
  const canInteract = interactive && !borderOnly;

  return (
    <div
      className={cn(
        "adc-gs",
        variant === "silver" && "adc-gs--silver",
        size === "compact" && "adc-gs--compact",
        size === "frame" && "adc-gs--frame",
        borderOnly && "adc-gs--border-only",
        canInteract && "adc-gs--interactive",
        className,
      )}
      role={canInteract ? "button" : undefined}
      tabIndex={canInteract ? 0 : undefined}
      aria-hidden={borderOnly || undefined}
    >
      <span className="adc-gs__glow" aria-hidden />
      <div className={cn("adc-gs__content", contentClassName)}>
        {borderOnly ? null : children}
      </div>
    </div>
  );
}
