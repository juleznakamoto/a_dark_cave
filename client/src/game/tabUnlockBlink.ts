import type { GameState } from "@shared/schema";
import { isTraderShopUnlocked } from "@/game/stateHelpers";

/** Persisted in `story.seen` once the unlock blink for a tab was shown or dismissed. */
export const TAB_UNLOCK_BLINK_SEEN_KEYS = {
  village: "tabUnlockBlinkSeen_village",
  forest: "tabUnlockBlinkSeen_forest",
  estate: "tabUnlockBlinkSeen_estate",
  bastion: "tabUnlockBlinkSeen_bastion",
  trader: "tabUnlockBlinkSeen_trader",
  achievements: "tabUnlockBlinkSeen_achievements",
} as const;

export type TabUnlockBlinkId = keyof typeof TAB_UNLOCK_BLINK_SEEN_KEYS;

export type TabUnlockSnapshot = {
  villageUnlocked: boolean;
  forestUnlocked: boolean;
  estateUnlocked: boolean;
  bastionUnlocked: boolean;
  traderUnlocked: boolean;
  achievementsUnlocked: boolean;
};

export function buildTabUnlockSnapshot(state: {
  flags: Pick<
    GameState["flags"],
    "villageUnlocked" | "forestUnlocked" | "bastionUnlocked"
  >;
  buildings: Pick<GameState["buildings"], "darkEstate">;
  relics?: GameState["relics"];
  books?: GameState["books"];
  story?: GameState["story"];
  traderDialogOpens?: number;
}): TabUnlockSnapshot {
  return {
    villageUnlocked: !!state.flags.villageUnlocked,
    forestUnlocked: !!state.flags.forestUnlocked,
    estateUnlocked: (state.buildings.darkEstate ?? 0) >= 1,
    bastionUnlocked: !!state.flags.bastionUnlocked,
    traderUnlocked: isTraderShopUnlocked({
      story: state.story,
      traderDialogOpens: state.traderDialogOpens,
    }),
    achievementsUnlocked:
      !!state.relics?.survivors_notes || !!state.books?.book_of_trials,
  };
}

export function isTabUnlockBlinkSeen(
  story: GameState["story"] | undefined,
  tabId: TabUnlockBlinkId,
): boolean {
  return !!story?.seen?.[TAB_UNLOCK_BLINK_SEEN_KEYS[tabId]];
}

export function withTabUnlockBlinkSeen(
  story: GameState["story"] | undefined,
  tabId: TabUnlockBlinkId,
): GameState["story"] {
  const base = story ?? { seen: {}, merchantPurchases: 0, heavySleeperHours: 0 };
  return {
    ...base,
    seen: {
      ...base.seen,
      [TAB_UNLOCK_BLINK_SEEN_KEYS[tabId]]: true,
    },
  };
}

/** Tabs that just became available and have not yet shown their one-time unlock blink. */
export function getNewlyUnlockedTabsForBlink(
  prev: TabUnlockSnapshot,
  current: TabUnlockSnapshot,
  story: GameState["story"] | undefined,
): TabUnlockBlinkId[] {
  const out: TabUnlockBlinkId[] = [];
  const checks: [TabUnlockBlinkId, keyof TabUnlockSnapshot][] = [
    ["village", "villageUnlocked"],
    ["forest", "forestUnlocked"],
    ["estate", "estateUnlocked"],
    ["bastion", "bastionUnlocked"],
    ["trader", "traderUnlocked"],
    ["achievements", "achievementsUnlocked"],
  ];

  for (const [tabId, field] of checks) {
    if (!prev[field] && current[field] && !isTabUnlockBlinkSeen(story, tabId)) {
      out.push(tabId);
    }
  }

  return out;
}
