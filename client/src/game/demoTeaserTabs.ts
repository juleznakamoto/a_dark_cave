import type { GameTab } from "@/game/types";

/**
 * Location tabs the Steam / Galaxy / CrazyGames demo can tease at demo end.
 * During live demo play, locked tabs stay hidden (same as the full game).
 * At demo end, locked ones render as redacted bars.
 * The Map tab is not in this list: at demo end it opens for real and draws
 * the buildings already constructed, even before the cartographer.
 */
export const DEMO_TEASER_TABS = [
  "village",
  "forest",
  "estate",
  "bastion",
] as const;

export type DemoTeaserTabId = (typeof DEMO_TEASER_TABS)[number];

export function isDemoTeaserTab(tab: GameTab): tab is DemoTeaserTabId {
  return (DEMO_TEASER_TABS as readonly string[]).includes(tab);
}

/** Show a redacted placeholder at demo end when the tab is still locked. */
export function shouldShowDemoLockedTab(opts: {
  demoEndCatalogActive: boolean;
  unlocked: boolean;
}): boolean {
  return opts.demoEndCatalogActive && !opts.unlocked;
}

/**
 * Map tab on the location bar.
 * The cartographer opens it for good. At demo end it is also shown while
 * still locked, so the player can look at the buildings already built.
 */
export function shouldShowMapTab(opts: {
  mapUnlocked: boolean;
  demoEndCatalogActive: boolean;
}): boolean {
  return opts.mapUnlocked || opts.demoEndCatalogActive;
}

export { getRedactedWidthCh as getDemoTeaserTabRedactedWidthCh } from "@/components/game/RedactedHint";
