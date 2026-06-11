import React from "react";
import type { GameState } from "@shared/schema";
import { FOCUS_ELIGIBLE_ACTIONS } from "./actionEffects";
import { cn } from "@/lib/utils";

export const FOCUS_TOOLTIP_SYMBOL = "☩";

export function isFocusGlowActive(actionId: string, state: GameState): boolean {
  return (
    FOCUS_ELIGIBLE_ACTIONS.includes(actionId) &&
    Boolean(state.focusState?.isActive)
  );
}

export function FocusTooltipIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-extrabold text-[10px] leading-none text-teal-400",
        className,
      )}
      aria-hidden
    >
      {FOCUS_TOOLTIP_SYMBOL}
    </span>
  );
}

export function wrapActionTooltipWithFocusIndicator(
  tooltip: React.ReactNode | null,
  actionId: string,
  state: GameState,
): React.ReactNode | null {
  if (tooltip == null || !isFocusGlowActive(actionId, state)) {
    return tooltip;
  }

  return (
    <div className="relative">
      <FocusTooltipIcon className="absolute top-0 right-0" />
      <div className="pr-3">{tooltip}</div>
    </div>
  );
}
