import type { GameState } from "@shared/schema";
import {
  isBastionTabVisible,
  isForestTabVisible,
  isVillageTabVisible,
} from "@shared/repairUnlockFlags";
import { isTraderShopUnlocked } from "@/game/stateHelpers";
import { isAchievementsGameTabUnlocked } from "@/achievements/configs/overall";

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

/** Fade-in length when a location tab first appears. */
export const TAB_UNLOCK_FADE_MS = 3000;
/** After the new-tab glow has run this long without a click, switch to the timed-event green pulse. */
export const TAB_UNLOCK_GREEN_PULSE_MS = 15_000;

export function getTabUnlockAttentionClass(options: {
  isAnimating: boolean;
  isFadePhase: boolean;
  isGreenPulse: boolean;
}): string {
  if (!options.isAnimating) return "";
  if (options.isFadePhase) return "tab-fade-in";
  if (options.isGreenPulse) return "timer-tab-pulse-green";
  return "tab-blink-new";
}

export type TabUnlockSnapshot = {
  villageUnlocked: boolean;
  forestUnlocked: boolean;
  estateUnlocked: boolean;
  bastionUnlocked: boolean;
  traderUnlocked: boolean;
  achievementsUnlocked: boolean;
};

export function buildTabUnlockSnapshot(state: {
  flags: GameState["flags"];
  buildings: GameState["buildings"];
  tools?: GameState["tools"];
  weapons?: GameState["weapons"];
  relics?: GameState["relics"];
  books?: GameState["books"];
  story?: GameState["story"];
  hasWonNormalGame?: boolean;
  hasWonCruelGame?: boolean;
  hasSpeedrunWin?: boolean;
  hasWonAnyGame?: boolean;
  lifetimeGamesWon?: number;
  lifetimePlayTimeMs?: number;
  lifetimeStorageMaxHits?: GameState["lifetimeStorageMaxHits"];
  lifetimeEstateUpgradeMaxHits?: GameState["lifetimeEstateUpgradeMaxHits"];
  hasAchievementMaxer?: boolean;
  social_media_rewards?: GameState["social_media_rewards"];
  referralCount?: number;
  referrals?: GameState["referrals"];
  isUserSignedIn?: boolean;
  signupWelcomeGoldClaimed?: boolean;
}): TabUnlockSnapshot {
  return {
    // Flag OR progression evidence (same repair path as hydrateLoadedGameState).
    villageUnlocked: isVillageTabVisible(state),
    forestUnlocked: isForestTabVisible(state),
    estateUnlocked: (state.buildings.darkEstate ?? 0) >= 1,
    bastionUnlocked: isBastionTabVisible(state),
    traderUnlocked: isTraderShopUnlocked({
      story: state.story,
    }),
    achievementsUnlocked: isAchievementsGameTabUnlocked(state as GameState),
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
