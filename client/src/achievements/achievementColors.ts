import { tailwindToHex } from "@/lib/tailwindColors";

/** Achievement category IDs */
export type AchievementCategoryId = "building" | "item" | "action";

/** Background: circle charts (Recharts) use hex, bar charts use Tailwind. */
const BACKGROUND_TAILWIND = "neutral-800";
export const BACKGROUND_COLOR_HEX = tailwindToHex(BACKGROUND_TAILWIND);
export const PROGRESS_BAR_BG_CLASS = "bg-neutral-700";

/**
 * Single source of truth for achievement category colors.
 * Used by both circle charts (Recharts) and bar charts (Progress).
 */
const ACHIEVEMENT_COLORS: Record<
  AchievementCategoryId,
  { incomplete: string; complete: string }
> = {
  building: { incomplete: "bg-blue-700/60", complete: "bg-blue-700" },
  item: { incomplete: "bg-red-700/60", complete: "bg-red-700" },
  action: { incomplete: "bg-green-700/60", complete: "bg-green-700" },
};

/** Tailwind classes for Progress bar indicators (incomplete state). */
export const INDICATOR_CLASS_INCOMPLETE: Record<string, string> = {
  building: ACHIEVEMENT_COLORS.building.incomplete,
  item: ACHIEVEMENT_COLORS.item.incomplete,
  action: ACHIEVEMENT_COLORS.action.incomplete,
};

/** Tailwind classes for Progress bar indicators (complete state). */
export const INDICATOR_CLASS_COMPLETE: Record<string, string> = {
  building: ACHIEVEMENT_COLORS.building.complete,
  item: ACHIEVEMENT_COLORS.item.complete,
  action: ACHIEVEMENT_COLORS.action.complete,
};

/** Hex/rgba colors for Recharts (circle charts). Derived from ACHIEVEMENT_COLORS. */
const tailwindColor = (tw: string) => tw.replace(/^bg-/, "");
export const INCOMPLETE_COLOR: Record<string, string> = {
  building: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.building.incomplete)),
  item: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.item.incomplete)),
  action: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.action.incomplete)),
};

export const COMPLETE_COLOR: Record<string, string> = {
  building: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.building.complete)),
  item: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.item.complete)),
  action: tailwindToHex(tailwindColor(ACHIEVEMENT_COLORS.action.complete)),
};
