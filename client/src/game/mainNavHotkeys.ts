import { getUnclaimedAchievementIds } from "@/achievements";
import type { GameTab } from "@/game/types";

/**
 * Snapshot type for building the main-area tab row (keyboard-eligible tabs only).
 * Trader is never included.
 */
export type MainNavHotkeyStoreSnapshot = {
  flags: {
    villageUnlocked: boolean;
    forestUnlocked: boolean;
    bastionUnlocked: boolean;
  };
  buildings: { darkEstate: number };
  relics: { survivors_notes?: boolean } | null | undefined;
  books: { book_of_trials?: boolean } | null | undefined;
  timedEventTab: { isActive: boolean };
};

export type MainNavHotkeyTarget = {
  tab: GameTab;
  index1Based: number;
  activate: () => void;
};

export type MainNavHotkeyUiHooks = {
  clearTabBlink: (tabId: string) => void;
  setLastViewedUnclaimedAchievementIds: (ids: string[]) => void;
};

/**
 * Fixed order for non-Trader main nav: matches {@link buildMainNavHotkeyTabOrder}
 * and the standard tab strip in `GameContainer`.
 */
export function buildMainNavHotkeyTabOrder(
  s: MainNavHotkeyStoreSnapshot,
): GameTab[] {
  const estateUnlocked = s.buildings.darkEstate >= 1;
  const achievementsUnlocked =
    !!s.relics?.survivors_notes || !!s.books?.book_of_trials;
  const tabs: GameTab[] = ["cave"];
  if (s.flags.villageUnlocked) tabs.push("village");
  if (estateUnlocked) tabs.push("estate");
  if (s.flags.forestUnlocked) tabs.push("forest");
  if (s.flags.bastionUnlocked) tabs.push("bastion");
  if (achievementsUnlocked) tabs.push("achievements");
  if (s.timedEventTab.isActive) tabs.push("timedevent");
  return tabs;
}

type MainNavGetState = () => {
  setActiveTab: (tab: GameTab) => void;
} & MainNavHotkeyStoreSnapshot;

/**
 * Keyboard-eligible main nav: digits 1..N, arrows, no Trader. `getState` should be
 * `useGameStore.getState` (or equivalent) so `activate` uses current `setActiveTab` and
 * world flags. UI hooks cover React-only tab blink and achievements “viewed” tracking.
 */
export function buildMainNavHotkeyTargets(
  getState: MainNavGetState,
  ui: MainNavHotkeyUiHooks,
): MainNavHotkeyTarget[] {
  const order = buildMainNavHotkeyTabOrder(getState());

  return order.map((tab, i) => {
    const index1Based = i + 1;
    const activate = () => {
      const store = getState();
      switch (tab) {
        case "cave":
          store.setActiveTab("cave");
          break;
        case "village":
          ui.clearTabBlink("village");
          store.setActiveTab("village");
          break;
        case "estate":
          ui.clearTabBlink("estate");
          store.setActiveTab("estate");
          break;
        case "forest":
          ui.clearTabBlink("forest");
          store.setActiveTab("forest");
          break;
        case "bastion":
          ui.clearTabBlink("bastion");
          store.setActiveTab("bastion");
          break;
        case "achievements": {
          ui.clearTabBlink("achievements");
          const ids = getUnclaimedAchievementIds(
            !!store.relics?.survivors_notes,
            !!store.books?.book_of_trials,
          );
          ui.setLastViewedUnclaimedAchievementIds(ids);
          store.setActiveTab("achievements");
          break;
        }
        case "timedevent":
          if (store.timedEventTab.isActive) {
            store.setActiveTab("timedevent");
          }
          break;
      }
    };
    return { tab, index1Based, activate };
  });
}
