import { tailwindToHex } from "@/lib/tailwindColors";

/** Achievement category IDs */
export type AchievementCategoryId = "building" | "item" | "action" | "basic";

/** Background: circle charts (Recharts) use hex, bar charts use Tailwind. */
const BACKGROUND_TAILWIND = "neutral-800";
export const BACKGROUND_COLOR_HEX = tailwindToHex(BACKGROUND_TAILWIND);
/** Brighter background for selected/active chart tab. */
export const BACKGROUND_SELECTED_COLOR_HEX = tailwindToHex("neutral-700");
export const PROGRESS_BAR_BG_CLASS = "bg-neutral-900";

/**
 * Single source of truth for achievement category colors.
 * Used by both circle charts (Recharts) and bar charts (Progress).
 */
const ACHIEVEMENT_COLORS: Record<
  AchievementCategoryId,
  { incomplete: string; complete: string }
> = {
  building: { incomplete: "bg-blue-800/50", complete: "bg-blue-800" },
  item: { incomplete: "bg-red-800/50", complete: "bg-red-800" },
  action: { incomplete: "bg-green-800/50", complete: "bg-green-800" },
  basic: { incomplete: "bg-amber-600/50", complete: "bg-amber-600" },
};

/** Tailwind classes for Progress bar indicators (incomplete state). */
export const INDICATOR_CLASS_INCOMPLETE: Record<string, string> = {
  building: ACHIEVEMENT_COLORS.building.incomplete,
  item: ACHIEVEMENT_COLORS.item.incomplete,
  action: ACHIEVEMENT_COLORS.action.incomplete,
  basic: ACHIEVEMENT_COLORS.basic.incomplete,
};

/** Tailwind classes for Progress bar indicators (complete state). */
export const INDICATOR_CLASS_COMPLETE: Record<string, string> = {
  building: ACHIEVEMENT_COLORS.building.complete,
  item: ACHIEVEMENT_COLORS.item.complete,
  action: ACHIEVEMENT_COLORS.action.complete,
  basic: ACHIEVEMENT_COLORS.basic.complete,
};

/** Claim button styling per tab (matches bar color). */
export const CLAIM_BUTTON_CLASS: Record<string, string> = {
  building:
    "bg-blue-950/30 hover:bg-blue-950/70 hover:text-foreground border border-border border-blue-800/50 rounded-xl",
  item:
    "bg-red-950/30 hover:bg-red-950/70 hover:text-foreground border border-border border-red-800/50 rounded-xl",
  action:
    "bg-green-950/30 hover:bg-green-950/70 hover:text-foreground border border-border border-green-800/50 rounded-xl",
  basic:
    "bg-amber-950/30 hover:bg-amber-950/70 hover:text-foreground border border-border border-amber-800/50 rounded-xl",
};

/** Hex/rgba colors for Recharts (circle charts). Derived from ACHIEVEMENT_COLORS. */
const tailwindColor = (tw: string) => tw.replace(/^bg-/, "");
export const INCOMPLETE_COLOR: Record<string, string> = {
  building: tailwindToHex(
    tailwindColor(ACHIEVEMENT_COLORS.building.incomplete),
  ),
  item: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.item.incomplete)),
  action: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.action.incomplete)),
  basic: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.basic.incomplete)),
};

export const COMPLETE_COLOR: Record<string, string> = {
  building: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.building.complete)),
  item: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.item.complete)),
  action: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.action.complete)),
  basic: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.basic.complete)),
};
