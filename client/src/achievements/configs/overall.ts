import type { AchievementChartConfig } from "../achievementTypes";
import type { GameState } from "@shared/schema";
import {
  getResourcesReachedStorageMaxCount,
  getStorageMaxerResourceTotal,
} from "@/game/resourceStorageMax";
import {
  getEstateUpgradeMaxerTotal,
  getEstateUpgradesAtMaxCount,
} from "@/game/estateUpgradeMax";
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
import { getAchievementConfigForEdition } from "../achievementEdition";
import type { DevGameMode } from "@/lib/edition";
import {
  CAVE_VETERAN_WINS,
  SPEEDRUN_WIN_MAX_MS,
} from "@/game/winAchievements";

export { CAVE_VETERAN_WINS, SPEEDRUN_WIN_MAX_MS };

const MS_PER_HOUR = 60 * 60 * 1000;
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
 * Meta / overall (UI: Epic) achievements: persist across new games, never claimable.
 * Counts come from account-level flags / lifetime stats on the game state.
 *
 * Keep UI, progress %, share card, and Steam sync behind this flag so the
 * category can be disabled without ripping out the wiring.
 */
export const isOverallAchievementCategoryEnabled = true;

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
        segmentId: "0-caveVeteran",
        maxCount: CAVE_VETERAN_WINS,
        label: "Cave Veteran",
        getCount: (state: GameState) =>
          Math.min(
            CAVE_VETERAN_WINS,
            Math.max(0, Math.floor(Number(state.lifetimeGamesWon) || 0)),
          ),
      },
      {
        segmentId: "0-speedrunner",
        maxCount: 1,
        label: "Speedrunner",
        detailLabel: `<${SPEEDRUN_WIN_MAX_MS / MS_PER_HOUR} hours`,
        getCount: (state: GameState) => (state.hasSpeedrunWin ? 1 : 0),
      },
      {
        segmentId: "0-endurant",
        maxCount: ENDURANT_HOURS,
        label: "Enduring",
        segments: 10,
        getCount: (state: GameState) =>
          Math.min(
            ENDURANT_HOURS,
            Math.floor((Number(state.lifetimePlayTimeMs) || 0) / MS_PER_HOUR),
          ),
      },
      {
        segmentId: "0-supporter",
        maxCount: SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL,
        label: "Supporter",
        /** Social / account promo track — not available on Steam. */
        webOnly: true,
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
        segmentId: "0-upgradeMaxer",
        maxCount: getEstateUpgradeMaxerTotal(),
        label: "Upgrade Maxer",
        // Keep ring ticks aligned with estate upgrade tracks.
        segments: getEstateUpgradeMaxerTotal(),
        getCount: (state: GameState) =>
          Math.min(
            getEstateUpgradesAtMaxCount(state),
            getEstateUpgradeMaxerTotal(),
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
  // Persisted flag: avoid walking every claimable achievement just to unlock a tab.
  if (state.hasAchievementMaxer) return true;
  const config = getAchievementConfigForEdition(
    overallChartConfig,
    (state as GameState & { devGameMode?: DevGameMode }).devGameMode,
  );
  for (const ring of config.rings) {
    for (const seg of ring) {
      // Achievement Maxer getCount scans every basic/building/item/action
      // segment. Tab-unlock and 4 Hz store subscribers only need "any overall
      // done"; the persisted flag above covers this row.
      if (seg.segmentId === "0-achievementMaxer") continue;
      if (seg.getCount(state) >= seg.maxCount) return true;
    }
  }
  return false;
}

/** Basics category tab: Survivor's Notes or Book of Trials. */
export function isBasicAchievementTabUnlocked(state: GameState): boolean {
  return !!state.relics?.survivors_notes || !!state.books?.book_of_trials;
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
    isBasicAchievementTabUnlocked(state) ||
    isOverallAchievementTabUnlocked(state)
  );
}
