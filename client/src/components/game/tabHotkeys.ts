import type { GameTab } from "@/game/types";

/** True when the keyboard event target is an editable field — tab hotkeys should not steal focus from typing. */
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
};

/** Tabs that receive 1–9 and arrow / A–D navigation, in on-screen order. */
export function getVisibleHotkeyTabs(p: VisibleHotkeyTabsParams): GameTab[] {
  const tabs: GameTab[] = ["cave"];
  if (p.villageUnlocked) tabs.push("village");
  if (p.forestUnlocked) tabs.push("forest");
  if (p.darkEstate >= 1) tabs.push("estate");
  if (p.bastionUnlocked) tabs.push("bastion");
  if (p.achievementsUnlocked) tabs.push("achievements");
  if (p.timedEventActive) tabs.push("timedevent");
  return tabs;
}
