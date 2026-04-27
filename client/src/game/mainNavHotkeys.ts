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

/** Top-row `Digit1`–`Digit7` (physical), then `1`–`7` in `e.key`, then numpad. */
export function pauseNavDigitIndexFromKeyboard(
  e: Pick<KeyboardEvent, "key" | "code">,
): number | null {
  const codeDigit = /^Digit([1-7])$/.exec(e.code);
  if (codeDigit) return Number(codeDigit[1]);
  if (/^[1-7]$/.test(e.key)) return Number(e.key);
  const mNumpad = /^Numpad([1-7])$/.exec(e.code);
  if (mNumpad) return Number(mNumpad[1]);
  return null;
}

export function isMainNavArrowKey(e: Pick<KeyboardEvent, "key" | "code">): "left" | "right" | null {
  if (e.code === "ArrowLeft" || e.key === "ArrowLeft") return "left";
  if (e.code === "ArrowRight" || e.key === "ArrowRight") return "right";
  return null;
}

export type MainNavKeydownContext = {
  isTypingInField: boolean;
  isModalOpen: boolean;
  isPaused: boolean;
  hasTradePost: boolean;
  activeTab: GameTab;
  mainNavHotkeyTargets: MainNavHotkeyTarget[];
};

/**
 * Returns true if the key was handled (and `preventDefault` was called when needed).
 * Used by GameContainer and unit-tested. Keeps T / pause digits / arrows in one place.
 */
export function tryHandleMainNavKeydown(
  e: {
    key: string;
    code: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    preventDefault: () => void;
  },
  ctx: MainNavKeydownContext,
  actions: { openTrader: () => void },
): boolean {
  if (ctx.isTypingInField) return false;
  if (ctx.isModalOpen) return false;

  if (
    (e.key === "t" || e.key === "T") &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey
  ) {
    if (!ctx.hasTradePost) return false;
    e.preventDefault();
    actions.openTrader();
    return true;
  }

  if (!ctx.isPaused) return false;
  const { mainNavHotkeyTargets } = ctx;

  const dir = isMainNavArrowKey(e);
  if (dir) {
    if (mainNavHotkeyTargets.length === 0) return false;
    const len = mainNavHotkeyTargets.length;
    let i = mainNavHotkeyTargets.findIndex((x) => x.tab === ctx.activeTab);
    if (i < 0) i = 0;
    const delta = dir === "right" ? 1 : -1;
    const j = (i + delta + len) % len;
    mainNavHotkeyTargets[j].activate();
    e.preventDefault();
    return true;
  }

  const n = pauseNavDigitIndexFromKeyboard(e);
  if (n == null) return false;
  const entry = mainNavHotkeyTargets.find((x) => x.index1Based === n);
  if (entry) {
    entry.activate();
    e.preventDefault();
    return true;
  }
  return false;
}

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
