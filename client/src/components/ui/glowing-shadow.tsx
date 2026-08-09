import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./glowing-shadow.css";

export type GlowingShadowProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Rainbow (default) or cool silver/white. */
  variant?: "default" | "silver";
  /** Large demo card vs content-sized shell (share CTA, etc.). */
  size?: "card" | "compact";
  /** Hover intensify + pointer cursor. Off for static share imagery. */
  interactive?: boolean;
};

/**
 * Animated glowing border shell (CSS @property + keyframes).
 * Use `variant="silver"` + `size="compact"` for the share-image CTA.
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
