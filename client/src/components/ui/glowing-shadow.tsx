import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./glowing-shadow.css";

export type GlowingShadowProps = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Rainbow (default), cool silver/white, or red construction-queue rim. */
  variant?: "default" | "silver" | "red";
  /** Demo card, content-sized shell, full-bleed image frame, or header slot. */
  size?: "card" | "compact" | "frame" | "slot";
  /** Hover intensify + pointer cursor. Off for static share imagery. */
  interactive?: boolean;
  /**
   * When false, keep hover styles from `interactive` but do not set role=button
   * (e.g. share preview click is handled by a parent).
   */
  buttonRole?: boolean;
};

/**
 * Animated glowing border shell around children.
 * Share image: wrap the card with `variant="silver"` + `size="frame"`.
 */
export function GlowingShadow({
  children,
  className,
  contentClassName,
  variant = "default",
  size = "card",
  interactive = true,
  buttonRole = true,
}: GlowingShadowProps) {
  const isFrame = size === "frame";
  const isSlot = size === "slot";
  const useRim = isFrame || isSlot;
  const asButton = interactive && buttonRole;

  return (
    <div
      className={cn(
        "adc-gs",
        variant === "silver" && "adc-gs--silver",
        variant === "red" && "adc-gs--red",
        size === "compact" && "adc-gs--compact",
        isFrame && "adc-gs--frame",
        isSlot && "adc-gs--slot",
        interactive && "adc-gs--interactive",
        className,
      )}
      role={asButton ? "button" : undefined}
      tabIndex={asButton ? 0 : undefined}
    >
      {useRim ? (
        <div className="adc-gs__rim" aria-hidden>
          <div className="adc-gs__rim-spin" />
        </div>
      ) : (
        <span className="adc-gs__glow" aria-hidden />
      )}
      <div className={cn("adc-gs__content", contentClassName)}>{children}</div>
    </div>
  );
}
