import { describe, expect, it } from "vitest";
import { isOverallAchievementCategoryEnabled } from "@/achievements/configs/overall";
import {
  buildTabUnlockSnapshot,
  getNewlyUnlockedTabsForBlink,
  isTabUnlockBlinkSeen,
  TAB_UNLOCK_BLINK_SEEN_KEYS,
} from "./tabUnlockBlink";
import type { GameState } from "@shared/schema";

function minimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    flags: {
      villageUnlocked: false,
      forestUnlocked: false,
      bastionUnlocked: false,
      gameStarted: true,
      hasLitFire: true,
    },
    buildings: { darkEstate: 0 },
    story: { seen: {}, merchantPurchases: 0, heavySleeperHours: 0 },
    relics: {},
    books: {},
    traderDialogOpens: 0,
    ...overrides,
  } as GameState;
}

describe("tabUnlockBlink", () => {
  it("getNewlyUnlockedTabsForBlink skips tabs already marked seen", () => {
    const prev = buildTabUnlockSnapshot(minimalState());
    const next = buildTabUnlockSnapshot(
      minimalState({ flags: { ...minimalState().flags, villageUnlocked: true } }),
    );
    const seenStory = {
      seen: { [TAB_UNLOCK_BLINK_SEEN_KEYS.village]: true },
      merchantPurchases: 0,
      heavySleeperHours: 0,
    };
    expect(
      getNewlyUnlockedTabsForBlink(prev, next, seenStory),
    ).toEqual([]);
  });

  it("getNewlyUnlockedTabsForBlink returns village when newly unlocked", () => {
    const prev = buildTabUnlockSnapshot(minimalState());
    const next = buildTabUnlockSnapshot(
      minimalState({ flags: { ...minimalState().flags, villageUnlocked: true } }),
    );
    expect(getNewlyUnlockedTabsForBlink(prev, next, next.story)).toEqual([
      "village",
    ]);
  });

  it("isTabUnlockBlinkSeen reads story.seen", () => {
    expect(
      isTabUnlockBlinkSeen(
        { seen: { [TAB_UNLOCK_BLINK_SEEN_KEYS.bastion]: true }, merchantPurchases: 0, heavySleeperHours: 0 },
        "bastion",
      ),
    ).toBe(true);
  });

  it("unlocks achievements from social promo fields on the full state", () => {
    const full = minimalState({
      isUserSignedIn: true,
      referralCount: 1,
      social_media_rewards: {
        marketing_email: { claimed: true },
        instagram: { claimed: true },
        reddit: { claimed: true },
        playlight_discover: { claimed: true },
      },
    });
    expect(buildTabUnlockSnapshot(full).achievementsUnlocked).toBe(
      isOverallAchievementCategoryEnabled,
    );

    const { social_media_rewards: _s, referralCount: _r, ...partial } = full;
    expect(buildTabUnlockSnapshot(partial).achievementsUnlocked).toBe(false);
  });
});
