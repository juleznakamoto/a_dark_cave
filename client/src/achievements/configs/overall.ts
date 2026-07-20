import type { AchievementChartConfig } from "../achievementTypes";
import type { GameState } from "@shared/schema";
import { isWebBuild } from "@/lib/edition";
import {
  getResourcesReachedStorageMaxCount,
  getStorageMaxerResourceTotal,
} from "@/game/resourceStorageMax";
import {
  SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL,
  isSocialPromoExclusiveRewardComplete,
  socialPromoExclusiveStepsCompleted,
  type SocialPromoExclusiveSlice,
} from "@/game/socialPromoExclusiveReward";
import {
  getNonOverallAchievementTotal,
  getNonOverallAchievementsCompletedCount,
} from "../nonOverallCompletion";

const MS_PER_HOUR = 60 * 60 * 1000;
export const SPEEDRUN_WIN_MAX_MS = 5 * MS_PER_HOUR;
export const ENDURANT_HOURS = 30;

function asSocialPromoSlice(state: GameState): SocialPromoExclusiveSlice {
  const s = state as GameState & SocialPromoExclusiveSlice;
  return {
    social_media_rewards: s.social_media_rewards,
    referralCount: s.referralCount,
    referrals: s.referrals,
    isUserSignedIn: s.isUserSignedIn,
    signupWelcomeGoldClaimed: s.signupWelcomeGoldClaimed,
  };
}

/**
 * Meta / overall achievements: persist across new games, never claimable.
 * Counts come from account-level flags / lifetime stats on the game state.
 *
 * Dev-only until this category is ready to ship — keep UI, progress %, share
 * card, and Steam sync behind this flag.
 */
export const isOverallAchievementCategoryEnabled = import.meta.env.DEV;

export const overallChartConfig: AchievementChartConfig = {
  idPrefix: "overall",
  centerSymbol: "✦",
  claimable: false,
  rings: [
    [
      {
        segmentId: "0-winNormal",
        maxCount: 1,
        label: "Normal Victory",
        getCount: (state: GameState) => (state.hasWonNormalGame ? 1 : 0),
      },
      {
        segmentId: "0-winCruel",
        maxCount: 1,
        label: "Cruel Victory",
        getCount: (state: GameState) => (state.hasWonCruelGame ? 1 : 0),
      },
      {
        segmentId: "0-speedrunner",
        maxCount: 1,
        label: "Speedrunner",
        getCount: (state: GameState) => (state.hasSpeedrunWin ? 1 : 0),
      },
      {
        segmentId: "0-endurant",
        maxCount: ENDURANT_HOURS,
        label: "Endurant",
        segments: 10,
        getCount: (state: GameState) =>
          Math.min(
            ENDURANT_HOURS,
            Math.floor((Number(state.lifetimePlayTimeMs) || 0) / MS_PER_HOUR),
          ),
      },
      ...(isWebBuild
        ? [
          {
            segmentId: "0-supporter",
            maxCount: SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL,
            label: "Supporter",
            getCount: (state: GameState) => {
              const slice = asSocialPromoSlice(state);
              if (isSocialPromoExclusiveRewardComplete(slice)) {
                return SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL;
              }
              return Math.min(
                SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL,
                socialPromoExclusiveStepsCompleted(slice),
              );
            },
          },
        ]
        : []),
      {
        segmentId: "0-resourceMaxer",
        maxCount: getStorageMaxerResourceTotal(),
        label: "Resource Maxer",
        segments: 10,
        getCount: (state: GameState) =>
          Math.min(
            getResourcesReachedStorageMaxCount(state),
            getStorageMaxerResourceTotal(),
          ),
      },
      {
        segmentId: "0-achievementMaxer",
        maxCount: getNonOverallAchievementTotal(),
        label: "Achievement Maxer",
        segments: 20,
        getCount: (state: GameState) => {
          const total = getNonOverallAchievementTotal();
          if (state.hasAchievementMaxer) return total;
          return Math.min(
            getNonOverallAchievementsCompletedCount(state),
            total,
          );
        },
      },
    ],
  ],
};

/** Overall achievements are never claimable — always empty. */
export function getUnclaimedOverallIds(): string[] {
  return [];
}

/** True when at least one overall (general / meta) achievement is fully complete. */
export function hasAnyOverallAchievementReached(state: GameState): boolean {
  for (const ring of overallChartConfig.rings) {
    for (const seg of ring) {
      if (seg.getCount(state) >= seg.maxCount) return true;
    }
  }
  return false;
}

/**
 * Overall (general) category tab: unlocked by Book of Trials, or when any
 * overall achievement is already reached (so it stays available on later runs).
 */
export function isOverallAchievementTabUnlocked(state: GameState): boolean {
  if (!isOverallAchievementCategoryEnabled) return false;
  return !!state.books?.book_of_trials || hasAnyOverallAchievementReached(state);
}

/** Main Achievements game tab: notes, book, or overall progress from a prior run. */
export function isAchievementsGameTabUnlocked(state: GameState): boolean {
  return (
    !!state.relics?.survivors_notes ||
    !!state.books?.book_of_trials ||
    isOverallAchievementTabUnlocked(state)
  );
}
