import type { GameTab } from "@/game/types";

/**
 * Location tabs the Steam / Galaxy / CrazyGames demo always shows.
 * Unlocked tabs behave normally; locked ones render as redacted bars
 * (same visual language as locked achievement descriptions).
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

/** Show a redacted placeholder when the demo is active and the tab is still locked. */
export function shouldShowDemoLockedTab(opts: {
  demoEditionActive: boolean;
  unlocked: boolean;
}): boolean {
  return opts.demoEditionActive && !opts.unlocked;
}

export { getRedactedWidthCh as getDemoTeaserTabRedactedWidthCh } from "@/components/game/RedactedHint";
