import type { GameTab } from "@/game/types";

/**
 * Start on a Steam Deck layout sends this key. Pauses the same way as the
 * footer button. Letter P on a keyboard does the same.
 */
export function isGamePauseHotkey(event: { key: string; code: string }): boolean {
  return event.code === "KeyP" || event.key === "p" || event.key === "P";
}

/** True when the keyboard event target is an editable field. Tab hotkeys should not steal focus from typing. */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export type VisibleHotkeyTabsParams = {
  villageUnlocked: boolean;
  forestUnlocked: boolean;
  bastionUnlocked: boolean;
  /** Used for estate tab visibility (matches tab bar: `estateUnlocked || buildings.darkEstate >= 1`). */
  darkEstate: number;
  achievementsUnlocked: boolean;
  timedEventActive: boolean;
  /** Map tab: cartographer unlock, or the demo-end view of buildings already built. */
  mapTab?: boolean;
  /** Demo-end teaser tabs are on-screen and clickable even while still locked. */
  includeDemoTeaserTabs?: boolean;
};

/** Tabs that receive 1–9 and arrow / A–D navigation, in on-screen order. */
export function getVisibleHotkeyTabs(p: VisibleHotkeyTabsParams): GameTab[] {
  const tabs: GameTab[] = ["cave"];
  if (p.villageUnlocked || p.includeDemoTeaserTabs) tabs.push("village");
  if (p.forestUnlocked || p.includeDemoTeaserTabs) tabs.push("forest");
  if (p.darkEstate >= 1 || p.includeDemoTeaserTabs) tabs.push("estate");
  if (p.bastionUnlocked || p.includeDemoTeaserTabs) tabs.push("bastion");
  if (p.mapTab) tabs.push("map");
  if (p.achievementsUnlocked) tabs.push("achievements");
  if (p.timedEventActive) tabs.push("timedevent");
  return tabs;
}
