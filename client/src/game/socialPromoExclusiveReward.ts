import type { GameState } from "@shared/schema";
import { MARKETING_EMAIL_REWARD_KEY } from "@/game/marketingEmailReward";
import { PLAYLIGHT_DISCOVER_REWARD_KEY } from "@/game/playlightDiscoverReward";
import { ACTIVE_SOCIAL_PLATFORMS } from "@/game/socialPlatforms";
import {
  getSocialPlatformRewardEntry,
  isSocialRewardFulfilled,
} from "@/game/socialTaskRewards";
import { SOCIAL_PROMPT_REFERRAL_CAP } from "@/game/socialPromptAuto";
import { useGameStore } from "@/game/state";
import { logger } from "@/lib/logger";
import { INVITE_FRIEND_TASK_ACTIVE } from "@shared/schema";

/** Signed in, email, YouTube, Instagram, Reddit, Playlight. Invite adds one step while that task is on. */
const SOCIAL_PROMO_EXCLUSIVE_BASE_STEPS = 6;

export const SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL =
  SOCIAL_PROMO_EXCLUSIVE_BASE_STEPS + (INVITE_FRIEND_TASK_ACTIVE ? 1 : 0);

export type SocialPromoExclusiveSlice = {
  social_media_rewards?: GameState["social_media_rewards"];
  referralCount?: number;
  referrals?: GameState["referrals"];
  socialPromoExclusiveRewardPending?: boolean;
  /** Account sign-up / session (first rewards task). */
  isUserSignedIn?: boolean;
  /** Welcome gold granted once after creating an account (may be true before email confirm / before UI auth sync). */
  signupWelcomeGoldClaimed?: boolean;
};

export type RewardsTasksUiSlice = SocialPromoExclusiveSlice & {
  clothing?: GameState["clothing"];
  playTime?: number;
};

/** Header Rewards shortcut stays hidden until this much active play time. */
export const REWARDS_TASKS_SHORTCUT_VISIBLE_AFTER_MS = 15 * 60 * 1000;

/** First rewards row: done when gameplay session is active or welcome bonus was already granted. */
export function isSignUpRewardsStepDone(
  state: Pick<
    SocialPromoExclusiveSlice,
    "isUserSignedIn" | "signupWelcomeGoldClaimed"
  >,
): boolean {
  return (
    state.isUserSignedIn === true || state.signupWelcomeGoldClaimed === true
  );
}

/** At least one successful invite. Counts toward the exclusive track only while {@link INVITE_FRIEND_TASK_ACTIVE}. */
export function isExclusiveInviteStepDone(
  state: SocialPromoExclusiveSlice,
): boolean {
  if ((state.referralCount ?? 0) >= 1) return true;
  const refs = state.referrals;
  return Array.isArray(refs) && refs.length >= 1;
}

export function socialPromoExclusiveStepsCompleted(
  state: SocialPromoExclusiveSlice,
): number {
  const rewards = state.social_media_rewards ?? {};
  let n = 0;
  if (isSignUpRewardsStepDone(state)) n++;
  if (isSocialRewardFulfilled(rewards[MARKETING_EMAIL_REWARD_KEY])) n++;
  for (const p of ACTIVE_SOCIAL_PLATFORMS) {
    if (isSocialRewardFulfilled(getSocialPlatformRewardEntry(rewards, p.id)))
      n++;
  }
  if (isSocialRewardFulfilled(rewards[PLAYLIGHT_DISCOVER_REWARD_KEY])) n++;
  if (INVITE_FRIEND_TASK_ACTIVE && isExclusiveInviteStepDone(state)) n++;
  return n;
}

export function getSocialPromoExclusiveProgress(state: SocialPromoExclusiveSlice): {
  completed: number;
  total: number;
  percent: number;
} {
  const completed = socialPromoExclusiveStepsCompleted(state);
  const total = SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL;
  const percent = Math.min(100, Math.round((completed / total) * 100));
  return { completed, total, percent };
}

export function isSocialPromoExclusiveRewardComplete(
  state: SocialPromoExclusiveSlice,
): boolean {
  return socialPromoExclusiveStepsCompleted(state) >= SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL;
}

/** Profile ⯫ shortcut: hidden only when all tasks are done and the ring event granted `gifted_ring`. */
export function isRewardsTasksShortcutVisible(
  state: RewardsTasksUiSlice,
): boolean {
  if ((state.playTime ?? 0) < REWARDS_TASKS_SHORTCUT_VISIBLE_AFTER_MS) {
    return false;
  }
  return (
    !isSocialPromoExclusiveRewardComplete(state) ||
    state.clothing?.gifted_ring !== true
  );
}

/**
 * Floating invite CTA: signed in and under the referral cap.
 */
export function isInviteFriendsFloatingButtonVisible(
  state: SocialPromoExclusiveSlice,
): boolean {
  return (
    state.isUserSignedIn === true &&
    (state.referralCount ?? 0) < SOCIAL_PROMPT_REFERRAL_CAP
  );
}

/**
 * When all exclusive-track steps are done, sets `socialPromoExclusiveRewardPending` once so a future event can grant the item.
 */
export function syncSocialPromoExclusiveRewardPending(): void {
  const s = useGameStore.getState();
  if (!isSocialPromoExclusiveRewardComplete(s)) return;
  if (s.socialPromoExclusiveRewardPending) return;

  useGameStore.setState({ socialPromoExclusiveRewardPending: true });

  void (async () => {
    try {
      const { buildGameState } = await import("@/game/stateHelpers");
      const { saveGame } = await import("@/game/save");
      const gameState = buildGameState(useGameStore.getState());
      await saveGame(gameState, false);
      useGameStore.setState({
        lastSaved: new Date().toLocaleTimeString(),
        isNewGame: false,
      });
    } catch (err) {
      logger.error("Failed to persist socialPromoExclusiveRewardPending:", err);
    }
  })();
}
