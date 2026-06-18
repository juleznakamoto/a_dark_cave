import React from "react";
import { cn } from "@/lib/utils";

/** Noto Sans Symbols 2 — north-east sans-serif arrow for building upgrade tooltips. */
export const BUILDING_UPGRADE_GLYPH = "\u{1F815}";

export function BuildingUpgradeTooltipIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-noto-symbols-2 text-sm text-green-700 leading-none shrink-0",
        className,
      )}
      aria-hidden
    >
      {BUILDING_UPGRADE_GLYPH}
    </span>
  );
}
