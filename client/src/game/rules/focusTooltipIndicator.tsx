import React from "react";
import type { GameState } from "@shared/schema";
import { FOCUS_ELIGIBLE_ACTIONS } from "./actionEffects";
import { cn } from "@/lib/utils";

export const FOCUS_TOOLTIP_SYMBOL = "☩";
export const FOCUS_TOOLTIP_HIGHLIGHT_CLASS = "text-teal-400";

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
        "font-extrabold text-[10px] leading-none",
        FOCUS_TOOLTIP_HIGHLIGHT_CLASS,
        className,
      )}
      aria-hidden
    >
      {FOCUS_TOOLTIP_SYMBOL}
    </span>
  );
}

export function getFocusTooltipHeaderTrailing(
  actionId: string,
  state: GameState,
): React.ReactNode | undefined {
  if (!isFocusGlowActive(actionId, state)) {
    return undefined;
  }

  return <FocusTooltipIcon />;
}
